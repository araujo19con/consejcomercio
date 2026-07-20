-- ============================================================================
-- Migration 042 — Integração Google Calendar (follow-ups → agenda do consultor)
-- ============================================================================
-- Objetivo: quando um compromisso datado (Tarefa com data_vencimento, ou uma
-- Reunião) é criado/editado/concluído/excluído, refletir isso como evento no
-- Google Calendar do consultor RESPONSÁVEL (tarefas.atribuido_a_id /
-- reunioes.responsavel_id), num calendário dedicado "CONSEJ Follow-ups".
--
-- Modelo escolhido: OAuth por consultor. Cada um conecta a própria conta 1x;
-- o refresh_token fica numa tabela lockada (só service_role lê). O status
-- legível pela UI fica em perfis.google_calendar_conectado.
--
-- Sincronização: automática + ciclo completo, via trigger pg_net que chama a
-- edge function `sync-calendar` (mesmo padrão dos crons 034/038 — secret no
-- Vault, net.http_post não-bloqueante).
-- ============================================================================

-- ─── 1. Status de conexão legível pela UI (perfis) ──────────────────────────
-- IMPORTANTE: o refresh_token NUNCA fica em perfis (o cliente authenticated lê
-- perfis via RLS). Aqui só flags/label não-sensíveis.
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS google_calendar_conectado boolean NOT NULL DEFAULT false;
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS google_calendar_email     text;

-- ─── 2. Tabela lockada com o refresh_token (só service_role) ────────────────
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  perfil_id     uuid PRIMARY KEY REFERENCES perfis(id) ON DELETE CASCADE,
  refresh_token text NOT NULL,
  calendar_id   text,               -- id do calendário dedicado "CONSEJ Follow-ups"
  google_email  text,
  scope         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;
-- SEM policies para authenticated/anon → ninguém além de service_role lê o
-- refresh_token. As edge functions (service_role) bypassam RLS legitimamente.
-- O consultor enxerga o status via perfis.google_calendar_conectado.

-- ─── 3. Guardar o event id do Google no registro de origem (idempotência) ───
ALTER TABLE tarefas  ADD COLUMN IF NOT EXISTS google_event_id text;
ALTER TABLE reunioes ADD COLUMN IF NOT EXISTS google_event_id text;

-- ─── 4. pg_net (idempotente — já habilitado por crons anteriores) ───────────
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── 5. Dispatcher: POST não-bloqueante para a edge function sync-calendar ──
CREATE OR REPLACE FUNCTION public.google_calendar_sync_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret TEXT;
  v_url    TEXT := 'https://wfnriqwkzdazdbuzbyug.supabase.co/functions/v1/sync-calendar';
BEGIN
  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
   WHERE name = 'webhook_calendar_secret';

  -- Sem secret configurado ainda → no-op silencioso (não bloqueia a escrita).
  IF v_secret IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  PERFORM net.http_post(
    url     := v_url,
    body    := jsonb_build_object(
      'type',       TG_OP,
      'table',      TG_TABLE_NAME,
      'record',     CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
      'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END
    ),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_secret
    )
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Sync de calendário NUNCA pode derrubar a escrita da tarefa/reunião.
  RAISE WARNING 'google_calendar_sync_dispatch falhou: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ─── 6. Triggers em tarefas ─────────────────────────────────────────────────
-- INSERT: sempre (a function filtra: sem data_vencimento ou consultor não
--         conectado → skip). UPDATE: só quando campos que afetam o evento mudam
--         (exclui o write-back de google_event_id → evita loop de trigger).
--         DELETE: sempre (limpa o evento).
DROP TRIGGER IF EXISTS trg_gcal_sync_tarefas_ins ON tarefas;
CREATE TRIGGER trg_gcal_sync_tarefas_ins
  AFTER INSERT ON tarefas
  FOR EACH ROW EXECUTE FUNCTION public.google_calendar_sync_dispatch();

DROP TRIGGER IF EXISTS trg_gcal_sync_tarefas_upd ON tarefas;
CREATE TRIGGER trg_gcal_sync_tarefas_upd
  AFTER UPDATE ON tarefas
  FOR EACH ROW
  WHEN (
    OLD.titulo          IS DISTINCT FROM NEW.titulo          OR
    OLD.descricao       IS DISTINCT FROM NEW.descricao       OR
    OLD.data_vencimento IS DISTINCT FROM NEW.data_vencimento OR
    OLD.status          IS DISTINCT FROM NEW.status          OR
    OLD.atribuido_a_id  IS DISTINCT FROM NEW.atribuido_a_id
  )
  EXECUTE FUNCTION public.google_calendar_sync_dispatch();

DROP TRIGGER IF EXISTS trg_gcal_sync_tarefas_del ON tarefas;
CREATE TRIGGER trg_gcal_sync_tarefas_del
  AFTER DELETE ON tarefas
  FOR EACH ROW EXECUTE FUNCTION public.google_calendar_sync_dispatch();

-- ─── 7. Triggers em reunioes ────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_gcal_sync_reunioes_ins ON reunioes;
CREATE TRIGGER trg_gcal_sync_reunioes_ins
  AFTER INSERT ON reunioes
  FOR EACH ROW EXECUTE FUNCTION public.google_calendar_sync_dispatch();

DROP TRIGGER IF EXISTS trg_gcal_sync_reunioes_upd ON reunioes;
CREATE TRIGGER trg_gcal_sync_reunioes_upd
  AFTER UPDATE ON reunioes
  FOR EACH ROW
  WHEN (
    OLD.data_hora       IS DISTINCT FROM NEW.data_hora       OR
    OLD.duracao_minutos IS DISTINCT FROM NEW.duracao_minutos OR
    OLD.status          IS DISTINCT FROM NEW.status          OR
    OLD.responsavel_id  IS DISTINCT FROM NEW.responsavel_id
  )
  EXECUTE FUNCTION public.google_calendar_sync_dispatch();

DROP TRIGGER IF EXISTS trg_gcal_sync_reunioes_del ON reunioes;
CREATE TRIGGER trg_gcal_sync_reunioes_del
  AFTER DELETE ON reunioes
  FOR EACH ROW EXECUTE FUNCTION public.google_calendar_sync_dispatch();

-- ============================================================================
-- SETUP MANUAL NECESSÁRIO (fora desta migração — ver docs/google-calendar-integration.md):
--   1. Vault: SELECT vault.create_secret('<random>', 'webhook_calendar_secret');
--      (o MESMO valor vira o secret WEBHOOK_CALENDAR_SECRET da edge function)
--   2. Secrets das edge functions: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET,
--      WEBHOOK_CALENDAR_SECRET, APP_URL (já existe).
--   3. Vercel: VITE_GOOGLE_CLIENT_ID (mesmo client id).
-- ============================================================================
