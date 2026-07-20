-- ============================================================================
-- Migration 043 — Cadência automática → Tarefa de follow-up (→ Google Agenda)
-- ============================================================================
-- Objetivo: quando um lead ENTRA (INSERT), MUDA DE ETAPA/responsável, ou recebe
-- uma INTERAÇÃO, o sistema materializa automaticamente UMA tarefa de follow-up
-- refletindo o próximo ponto da cadência CONSEJ (D1/D3/D5/D7/D10), atribuída ao
-- consultor responsável. Essa tarefa REAL então sincroniza pra agenda pelos
-- triggers da migration 042 (google-calendar).
--
-- Replica src/lib/cadencia.ts: âncora = data da última interação (ou created_at
-- se não houver); próximo ponto = primeiro D >= dias desde a âncora. Terminal,
-- stand_by (pausado) ou sem responsável → nenhuma tarefa (remove a existente).
--
-- Dedup: mantém no máximo 1 tarefa auto-gerada aberta por lead (flag
-- gerada_automaticamente). Nova mudança atualiza a data; terminal/fim da cadência
-- deleta (o que remove o evento do calendário via trigger 042).
-- ============================================================================

-- ─── 1. Flag pra identificar tarefas auto-geradas (não tocar nas manuais) ────
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS gerada_automaticamente boolean NOT NULL DEFAULT false;

-- ─── 2. Materializador da cadência ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cadencia_materializar(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead      RECORD;
  v_anchor    date;
  v_has_inter boolean;
  v_dias      int;
  v_next_dia  int;
  v_venc      timestamptz;
  v_titulo    text;
  v_existing  uuid;
  v_terminais text[] := ARRAY['ganho_assessoria','ganho_consultoria','perdido','cancelado','stand_by'];
BEGIN
  SELECT id, nome, status, responsavel_id, created_at
    INTO v_lead
    FROM leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Tarefa auto-cadência aberta já existente pra esse lead
  SELECT id INTO v_existing
    FROM tarefas
   WHERE entidade_tipo = 'lead' AND entidade_id = p_lead_id
     AND gerada_automaticamente = true
     AND status IN ('aberta','em_andamento')
   ORDER BY created_at DESC
   LIMIT 1;

  -- Sem responsável, terminal ou stand_by → remove a tarefa (e o evento)
  IF v_lead.responsavel_id IS NULL OR v_lead.status = ANY(v_terminais) THEN
    IF v_existing IS NOT NULL THEN DELETE FROM tarefas WHERE id = v_existing; END IF;
    RETURN;
  END IF;

  -- Âncora = última interação; senão created_at
  SELECT MAX(enviada_em)::date INTO v_anchor FROM interacoes_lead WHERE lead_id = p_lead_id;
  v_has_inter := v_anchor IS NOT NULL;
  IF NOT v_has_inter THEN v_anchor := v_lead.created_at::date; END IF;

  v_dias := CURRENT_DATE - v_anchor;

  -- Próximo ponto da cadência (replica cadencia.ts)
  IF NOT v_has_inter THEN
    -- Sem interações: D1 ativo só se criado há 0 ou 1 dia
    IF v_dias <= 1 THEN v_next_dia := 1; ELSE v_next_dia := NULL; END IF;
  ELSE
    -- Com interações: primeiro D >= dias desde a última
    SELECT MIN(d) INTO v_next_dia FROM unnest(ARRAY[1,3,5,7,10]) AS d WHERE d >= v_dias;
  END IF;

  -- Cadência encerrada (passou D10 ou D1 expirado) → remove tarefa existente
  IF v_next_dia IS NULL THEN
    IF v_existing IS NOT NULL THEN DELETE FROM tarefas WHERE id = v_existing; END IF;
    RETURN;
  END IF;

  -- Vencimento: âncora + dia, às 09:00 America/Sao_Paulo
  v_venc   := ((v_anchor + v_next_dia) + time '09:00:00') AT TIME ZONE 'America/Sao_Paulo';
  v_titulo := 'Follow-up cadência (D' || v_next_dia || '): ' || COALESCE(v_lead.nome, 'Lead');

  IF v_existing IS NOT NULL THEN
    UPDATE tarefas
       SET titulo = v_titulo,
           data_vencimento = v_venc,
           atribuido_a_id = v_lead.responsavel_id
     WHERE id = v_existing;
  ELSE
    INSERT INTO tarefas
      (titulo, descricao, tipo, entidade_tipo, entidade_id, atribuido_a_id,
       prioridade, status, data_vencimento, notificar, gerada_automaticamente)
    VALUES
      (v_titulo,
       'Gerada automaticamente pela cadência CONSEJ (D' || v_next_dia || ').',
       'followup', 'lead', p_lead_id, v_lead.responsavel_id,
       'media', 'aberta', v_venc, false, true);
  END IF;
END;
$$;

-- ─── 3. Dispatcher de trigger (funciona pra leads e interacoes_lead) ────────
CREATE OR REPLACE FUNCTION public.cadencia_trigger_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'leads' THEN
    v_lead_id := COALESCE(NEW.id, OLD.id);
  ELSE  -- interacoes_lead
    v_lead_id := COALESCE(NEW.lead_id, OLD.lead_id);
  END IF;

  PERFORM public.cadencia_materializar(v_lead_id);
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Materialização NUNCA pode derrubar a escrita do lead/interação
  RAISE WARNING 'cadencia_trigger_dispatch falhou: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ─── 4. Triggers ────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_cadencia_leads_ins ON leads;
CREATE TRIGGER trg_cadencia_leads_ins
  AFTER INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION public.cadencia_trigger_dispatch();

-- Só quando muda etapa OU responsável (evita churn em edições de outros campos)
DROP TRIGGER IF EXISTS trg_cadencia_leads_upd ON leads;
CREATE TRIGGER trg_cadencia_leads_upd
  AFTER UPDATE ON leads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status
        OR OLD.responsavel_id IS DISTINCT FROM NEW.responsavel_id)
  EXECUTE FUNCTION public.cadencia_trigger_dispatch();

-- Nova interação desloca a âncora da cadência → re-materializa
DROP TRIGGER IF EXISTS trg_cadencia_interacoes_ins ON interacoes_lead;
CREATE TRIGGER trg_cadencia_interacoes_ins
  AFTER INSERT ON interacoes_lead
  FOR EACH ROW EXECUTE FUNCTION public.cadencia_trigger_dispatch();

-- ============================================================================
-- NÃO faz backfill de leads existentes (evita criar dezenas de tarefas/eventos
-- de uma vez). A cadência materializa a partir da próxima mudança/interação de
-- cada lead. Pra materializar um lead manualmente: SELECT cadencia_materializar('<lead_id>');
-- ============================================================================
