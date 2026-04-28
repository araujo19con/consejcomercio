-- =============================================================================
-- 021_lockdown_rls.sql
-- Hardening de segurança após audit do Cyber-Chief.
--
-- Corrige CRÍTICO-01 (RLS authenticated_all liberava CRM inteiro pra cliente)
-- Corrige ALTO-04 (escalação via raw_user_meta_data['tipo'])
-- Corrige ALTO-05 parcial (audit_logs append-only)
-- Corrige BAIXO-11 (notificacoes_indicacao restrita a interno)
-- =============================================================================

-- ─── Helper: is_interno() ────────────────────────────────────────────────────
-- Função STABLE SECURITY DEFINER pra evitar recursão em policies.
-- Cacheada por query, performática.
CREATE OR REPLACE FUNCTION public.is_interno()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfis WHERE id = auth.uid() AND tipo = 'interno'
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_interno() TO authenticated;

-- Helper: cliente_id do usuário atual (NULL se for interno)
CREATE OR REPLACE FUNCTION public.current_cliente_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cliente_id FROM perfis WHERE id = auth.uid() AND tipo = 'cliente'
$$;

GRANT EXECUTE ON FUNCTION public.current_cliente_id() TO authenticated;

-- =============================================================================
-- LOCKDOWN: tabelas que devem ser INTERNO-ONLY
-- =============================================================================

-- parceiros
DROP POLICY IF EXISTS "authenticated_all" ON parceiros;
CREATE POLICY "interno_all_parceiros" ON parceiros
  FOR ALL TO authenticated
  USING (public.is_interno()) WITH CHECK (public.is_interno());

-- clientes
DROP POLICY IF EXISTS "authenticated_all" ON clientes;
CREATE POLICY "interno_all_clientes" ON clientes
  FOR ALL TO authenticated
  USING (public.is_interno()) WITH CHECK (public.is_interno());

-- diagnosticos
DROP POLICY IF EXISTS "authenticated_all" ON diagnosticos;
CREATE POLICY "interno_all_diagnosticos" ON diagnosticos
  FOR ALL TO authenticated
  USING (public.is_interno()) WITH CHECK (public.is_interno());

-- contratos
DROP POLICY IF EXISTS "authenticated_all" ON contratos;
CREATE POLICY "interno_all_contratos" ON contratos
  FOR ALL TO authenticated
  USING (public.is_interno()) WITH CHECK (public.is_interno());

-- demandas
DROP POLICY IF EXISTS "authenticated_all" ON demandas;
CREATE POLICY "interno_all_demandas" ON demandas
  FOR ALL TO authenticated
  USING (public.is_interno()) WITH CHECK (public.is_interno());

-- oportunidades
DROP POLICY IF EXISTS "authenticated_all" ON oportunidades;
CREATE POLICY "interno_all_oportunidades" ON oportunidades
  FOR ALL TO authenticated
  USING (public.is_interno()) WITH CHECK (public.is_interno());

-- =============================================================================
-- LEADS: interno faz tudo. Cliente do portal NÃO faz nada direto na tabela —
-- só via RPC enviar_indicacao_portal (criada na 022) que roda SECURITY DEFINER.
-- =============================================================================
DROP POLICY IF EXISTS "authenticated_all" ON leads;
CREATE POLICY "interno_all_leads" ON leads
  FOR ALL TO authenticated
  USING (public.is_interno()) WITH CHECK (public.is_interno());

-- =============================================================================
-- INDICACOES: interno faz tudo. Cliente do portal pode SELECT só as suas.
-- INSERT é via RPC (não direto).
-- =============================================================================
DROP POLICY IF EXISTS "authenticated_all" ON indicacoes;
CREATE POLICY "interno_all_indicacoes" ON indicacoes
  FOR ALL TO authenticated
  USING (public.is_interno()) WITH CHECK (public.is_interno());

CREATE POLICY "cliente_select_proprias_indicacoes" ON indicacoes
  FOR SELECT TO authenticated
  USING (indicante_cliente_id = public.current_cliente_id());

-- =============================================================================
-- AUDIT_LOGS: append-only. Sem UPDATE/DELETE (Postgres bloqueia por RLS default).
-- =============================================================================
DROP POLICY IF EXISTS "authenticated_all" ON audit_logs;
CREATE POLICY "interno_select_audit_logs" ON audit_logs
  FOR SELECT TO authenticated USING (public.is_interno());
CREATE POLICY "interno_insert_audit_logs" ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_interno());
-- SEM UPDATE/DELETE policy → bloqueado para qualquer authenticated.
-- service_role bypass RLS para dump/limpeza administrativa.

-- =============================================================================
-- PERFIS: interno vê todos, cliente vê só o próprio (esconde e-mails da equipe).
-- =============================================================================
DROP POLICY IF EXISTS "perfis visíveis para autenticados" ON perfis;
CREATE POLICY "perfis_visiveis_interno_ou_proprio" ON perfis
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_interno());

-- =============================================================================
-- NOTIFICACOES_INDICACAO: só interno pode ler (BAIXO-11 do audit).
-- erro_mensagem pode conter PII de leads — não expor a clientes.
-- =============================================================================
DROP POLICY IF EXISTS "autenticados leem notificacoes_indicacao" ON notificacoes_indicacao;
CREATE POLICY "interno_select_notificacoes_indicacao" ON notificacoes_indicacao
  FOR SELECT TO authenticated USING (public.is_interno());

-- =============================================================================
-- Sanitiza handle_new_user: signup nunca cria interno via raw_user_meta_data.
-- ALTO-04: bloqueia escalação de privilégio via metadata controlada pelo cliente.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  desired_tipo TEXT;
BEGIN
  desired_tipo := COALESCE(NEW.raw_user_meta_data->>'tipo', 'cliente');

  -- Hardening: signup nunca pode criar interno via metadata controlada pelo cliente.
  -- Internos são criados via Supabase Admin API + UPDATE manual no SQL Editor por
  -- alguém já interno. Nunca via fluxo público de signUp/signInWithOtp.
  IF desired_tipo = 'interno' THEN
    desired_tipo := 'cliente';
  END IF;

  INSERT INTO public.perfis (id, nome, email, tipo, cliente_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    desired_tipo,
    (NEW.raw_user_meta_data->>'cliente_id')::uuid
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
