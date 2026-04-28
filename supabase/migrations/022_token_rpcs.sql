-- =============================================================================
-- 022_token_rpcs.sql
-- Hardening de tokens (CRÍTICO-02 do audit do Cyber-Chief).
--
-- Cliente NUNCA mais escreve direto em token_transacoes nem em perfis.tokens_*.
-- Tudo passa por RPCs SECURITY DEFINER que:
--  - Validam o tipo do caller
--  - Lêem valor de regras_tokens NO SERVIDOR (não confiam no cliente)
--  - Fazem tudo atomicamente em uma transação
-- =============================================================================

-- =============================================================================
-- RPC 1: enviar_indicacao_portal
-- Cria lead + indicação + crédito de tokens. Substitui o fluxo direto
-- em src/hooks/usePortal.ts useEnviarIndicacaoPortal.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.enviar_indicacao_portal(
  p_nome     TEXT,
  p_empresa  TEXT,
  p_telefone TEXT,
  p_email    TEXT DEFAULT NULL,
  p_segmento TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      UUID := auth.uid();
  v_perfil       perfis%ROWTYPE;
  v_tokens       INTEGER;
  v_lead_id      UUID;
  v_indicacao_id UUID;
  v_segmento     TEXT;
BEGIN
  -- Auth
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_perfil FROM perfis WHERE id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'perfil_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_perfil.tipo != 'cliente' THEN
    RAISE EXCEPTION 'apenas_cliente_pode_indicar' USING ERRCODE = '42501';
  END IF;
  IF v_perfil.cliente_id IS NULL THEN
    RAISE EXCEPTION 'perfil_sem_cliente_vinculado' USING ERRCODE = '23503';
  END IF;

  -- Validar inputs mínimos
  IF p_nome IS NULL OR length(trim(p_nome)) = 0 THEN
    RAISE EXCEPTION 'nome_obrigatorio' USING ERRCODE = '23502';
  END IF;
  IF p_empresa IS NULL OR length(trim(p_empresa)) = 0 THEN
    RAISE EXCEPTION 'empresa_obrigatoria' USING ERRCODE = '23502';
  END IF;
  IF p_telefone IS NULL OR length(trim(p_telefone)) = 0 THEN
    RAISE EXCEPTION 'telefone_obrigatorio' USING ERRCODE = '23502';
  END IF;

  -- Cap: 10 indicações ativas (não convertidas/perdidas)
  IF (SELECT count(*) FROM indicacoes
      WHERE indicante_cliente_id = v_perfil.cliente_id
        AND status NOT IN ('convertido', 'perdido')) >= 10 THEN
    RAISE EXCEPTION 'limite_indicacoes_atingido' USING ERRCODE = 'P0001';
  END IF;

  -- Valor de tokens lido NO SERVIDOR (regras_tokens.indicacao)
  SELECT valor_tokens INTO v_tokens
  FROM regras_tokens
  WHERE motivo = 'indicacao' AND ativo = true
  LIMIT 1;
  v_tokens := COALESCE(v_tokens, 100);

  v_segmento := COALESCE(NULLIF(trim(p_segmento), ''), 'A definir');

  -- 1. Cria lead no pipeline
  INSERT INTO leads (
    nome, empresa, segmento, telefone, email, origem, status,
    referido_por_cliente_id, notas
  )
  VALUES (
    p_nome, p_empresa, v_segmento, p_telefone, p_email,
    'indicacao_cliente', 'novo_lead',
    v_perfil.cliente_id, 'Recebido via Portal de Indicações'
  )
  RETURNING id INTO v_lead_id;

  -- 2. Cria indicação vinculada
  INSERT INTO indicacoes (
    indicante_cliente_id, indicado_nome, indicado_empresa,
    indicado_telefone, indicado_email, lead_id, status, notas
  )
  VALUES (
    v_perfil.cliente_id, p_nome, p_empresa,
    p_telefone, p_email, v_lead_id, 'pendente',
    CASE WHEN p_segmento IS NOT NULL AND length(trim(p_segmento)) > 0
         THEN 'Segmento: ' || p_segmento
         ELSE NULL END
  )
  RETURNING id INTO v_indicacao_id;

  -- 3. Crédito de tokens (valor server-side)
  INSERT INTO token_transacoes (
    perfil_id, tipo, motivo, valor, referencia_tipo, referencia_id, descricao
  )
  VALUES (
    v_user_id, 'credito', 'indicacao', v_tokens,
    'indicacao', v_indicacao_id,
    'Indicação de ' || p_nome || ' — ' || p_empresa
  );

  -- 4. Atualiza saldo no perfil
  UPDATE perfis SET
    tokens_saldo = tokens_saldo + v_tokens,
    tokens_historico_total = tokens_historico_total + v_tokens
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'lead_id', v_lead_id,
    'indicacao_id', v_indicacao_id,
    'tokens_creditados', v_tokens
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.enviar_indicacao_portal(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =============================================================================
-- RPC 2: solicitar_resgate_portal
-- =============================================================================
CREATE OR REPLACE FUNCTION public.solicitar_resgate_portal(p_catalogo_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_perfil     perfis%ROWTYPE;
  v_catalogo   catalogo_recompensas%ROWTYPE;
  v_resgate_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_perfil FROM perfis WHERE id = v_user_id;
  IF NOT FOUND OR v_perfil.tipo != 'cliente' THEN
    RAISE EXCEPTION 'apenas_cliente_pode_resgatar' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_catalogo FROM catalogo_recompensas
  WHERE id = p_catalogo_id AND ativo = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'recompensa_indisponivel' USING ERRCODE = 'P0002';
  END IF;

  IF v_perfil.tokens_saldo < v_catalogo.custo_tokens THEN
    RAISE EXCEPTION 'saldo_insuficiente' USING ERRCODE = 'P0001';
  END IF;

  -- 1. Cria resgate
  INSERT INTO resgates (perfil_id, catalogo_id, tokens_debitados, status)
  VALUES (v_user_id, p_catalogo_id, v_catalogo.custo_tokens, 'pendente')
  RETURNING id INTO v_resgate_id;

  -- 2. Registra débito
  INSERT INTO token_transacoes (
    perfil_id, tipo, motivo, valor, referencia_tipo, referencia_id, descricao
  )
  VALUES (
    v_user_id, 'debito', 'resgate', v_catalogo.custo_tokens,
    'resgate', v_resgate_id, v_catalogo.nome
  );

  -- 3. Decrementa saldo
  UPDATE perfis SET tokens_saldo = tokens_saldo - v_catalogo.custo_tokens
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'resgate_id', v_resgate_id,
    'tokens_debitados', v_catalogo.custo_tokens,
    'aprovacao_dupla', v_catalogo.aprovacao_dupla
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.solicitar_resgate_portal(UUID) TO authenticated;

-- =============================================================================
-- RPC 3: creditar_tokens_admin
-- Substitui o fluxo direto em src/hooks/usePortalAdmin.ts useCreditarTokens.
-- Apenas internos podem chamar.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.creditar_tokens_admin(
  p_perfil_id UUID,
  p_motivo    TEXT,
  p_valor     INTEGER,
  p_descricao TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      UUID := auth.uid();
  v_perfil_alvo  perfis%ROWTYPE;
BEGIN
  -- Apenas interno
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM perfis WHERE id = v_user_id AND tipo = 'interno') THEN
    RAISE EXCEPTION 'apenas_interno_pode_creditar' USING ERRCODE = '42501';
  END IF;

  -- Validar valor (cap defensivo: 100k tokens)
  IF p_valor IS NULL OR p_valor <= 0 OR p_valor > 100000 THEN
    RAISE EXCEPTION 'valor_invalido' USING ERRCODE = '23514';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) = 0 THEN
    RAISE EXCEPTION 'motivo_obrigatorio' USING ERRCODE = '23502';
  END IF;

  -- Perfil alvo deve existir
  SELECT * INTO v_perfil_alvo FROM perfis WHERE id = p_perfil_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'perfil_nao_encontrado' USING ERRCODE = 'P0002';
  END IF;

  -- 1. Registra crédito
  INSERT INTO token_transacoes (perfil_id, tipo, motivo, valor, descricao)
  VALUES (p_perfil_id, 'credito', p_motivo, p_valor, p_descricao);

  -- 2. Atualiza saldo
  UPDATE perfis SET
    tokens_saldo = tokens_saldo + p_valor,
    tokens_historico_total = tokens_historico_total + p_valor
  WHERE id = p_perfil_id;

  -- 3. Audit log
  INSERT INTO audit_logs (tabela, registro_id, acao, valor_depois, usuario)
  VALUES (
    'perfis', p_perfil_id, 'credito_tokens',
    jsonb_build_object('valor', p_valor, 'motivo', p_motivo, 'creditado_por', v_user_id),
    (SELECT email FROM perfis WHERE id = v_user_id)
  );

  RETURN jsonb_build_object('ok', true, 'valor', p_valor);
END;
$$;

GRANT EXECUTE ON FUNCTION public.creditar_tokens_admin(UUID, TEXT, INTEGER, TEXT) TO authenticated;

-- =============================================================================
-- LOCKDOWN: bloqueia INSERT direto em token_transacoes e UPDATE direto
-- em perfis.tokens_*. Tudo passa pelas RPCs SECURITY DEFINER acima.
-- =============================================================================

-- Remove policies antigas que permitiam INSERT direto (cliente e interno)
DROP POLICY IF EXISTS "cliente insere próprias transações" ON token_transacoes;
DROP POLICY IF EXISTS "interno insere transações" ON token_transacoes;
-- SELECT continua via policies existentes (cliente vê próprias, interno vê todas).
-- INSERT só via SECURITY DEFINER (que bypassa RLS rodando como postgres).

-- =============================================================================
-- Trigger: bloqueia UPDATE direto em perfis.tokens_saldo / tokens_historico_total
-- Permite apenas:
--   1. SECURITY DEFINER functions (current_user IN postgres/supabase_admin)
--   2. service_role (bypass RLS, mas current_user vira authenticator)
-- Bloqueia clientes (atalho via update direto) e até internos (forçando uso da RPC).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.protect_tokens_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.tokens_saldo IS DISTINCT FROM OLD.tokens_saldo)
     OR (NEW.tokens_historico_total IS DISTINCT FROM OLD.tokens_historico_total) THEN
    -- SECURITY DEFINER functions executam como postgres → permitido
    IF current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'tokens_saldo_e_historico_so_via_rpc' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_tokens_columns_trigger ON perfis;
CREATE TRIGGER protect_tokens_columns_trigger
  BEFORE UPDATE ON perfis
  FOR EACH ROW EXECUTE FUNCTION public.protect_tokens_columns();

-- =============================================================================
-- Limpa policy antiga "interno atualiza tokens de clientes" (016) — não é mais
-- necessária: créditos passam pela RPC creditar_tokens_admin.
-- A policy "usuário atualiza próprio perfil" (004) continua, mas o trigger
-- protect_tokens_columns_trigger bloqueia mexer em tokens_saldo.
-- =============================================================================
DROP POLICY IF EXISTS "interno atualiza tokens de clientes" ON perfis;
