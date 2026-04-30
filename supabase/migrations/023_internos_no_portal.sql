-- =============================================================================
-- 023_internos_no_portal.sql
-- Permite que perfis com tipo='interno' (consultores da CONSEJ) participem
-- do Portal de Indicacoes: indicar leads, acumular tokens e fazer resgates.
--
-- Mudancas:
--  1. Nova coluna indicacoes.indicante_perfil_id (rastreia interno indicante).
--  2. CHECK constraint indicacoes_must_have_referrer aceita perfil_id tambem.
--  3. RPC enviar_indicacao_portal aceita interno (sem cliente_id).
--  4. RPC solicitar_resgate_portal aceita interno.
-- =============================================================================

-- ── 1. Coluna nova em indicacoes ─────────────────────────────────────────────
ALTER TABLE indicacoes
  ADD COLUMN IF NOT EXISTS indicante_perfil_id UUID REFERENCES perfis(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_indicacoes_indicante_perfil
  ON indicacoes(indicante_perfil_id);

-- ── 2. Atualiza CHECK constraint para aceitar indicante_perfil_id ───────────
ALTER TABLE indicacoes DROP CONSTRAINT IF EXISTS indicacoes_must_have_referrer;
ALTER TABLE indicacoes
  ADD CONSTRAINT indicacoes_must_have_referrer
    CHECK (
      indicante_cliente_id  IS NOT NULL OR
      indicante_parceiro_id IS NOT NULL OR
      indicante_perfil_id   IS NOT NULL
    );

-- ── 3. RPC enviar_indicacao_portal (aceita interno) ──────────────────────────
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
  v_origem_lead  TEXT;
  v_nota_lead    TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_perfil FROM perfis WHERE id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'perfil_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_perfil.tipo NOT IN ('cliente', 'interno') THEN
    RAISE EXCEPTION 'tipo_invalido_para_indicar' USING ERRCODE = '42501';
  END IF;
  IF v_perfil.tipo = 'cliente' AND v_perfil.cliente_id IS NULL THEN
    RAISE EXCEPTION 'perfil_sem_cliente_vinculado' USING ERRCODE = '23503';
  END IF;

  -- Validar inputs minimos
  IF p_nome IS NULL OR length(trim(p_nome)) = 0 THEN
    RAISE EXCEPTION 'nome_obrigatorio' USING ERRCODE = '23502';
  END IF;
  IF p_empresa IS NULL OR length(trim(p_empresa)) = 0 THEN
    RAISE EXCEPTION 'empresa_obrigatoria' USING ERRCODE = '23502';
  END IF;
  IF p_telefone IS NULL OR length(trim(p_telefone)) = 0 THEN
    RAISE EXCEPTION 'telefone_obrigatorio' USING ERRCODE = '23502';
  END IF;

  -- Cap: 10 indicacoes ativas (filtra pelo perfil indicante, abrange ambos os tipos)
  IF (SELECT count(*) FROM indicacoes
      WHERE (
        indicante_perfil_id = v_user_id OR
        (v_perfil.cliente_id IS NOT NULL AND indicante_cliente_id = v_perfil.cliente_id)
      )
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

  IF v_perfil.tipo = 'interno' THEN
    v_origem_lead := 'indicacao_consultor';
    v_nota_lead   := 'Recebido via Portal de Indicacoes (consultor)';
  ELSE
    v_origem_lead := 'indicacao_cliente';
    v_nota_lead   := 'Recebido via Portal de Indicacoes';
  END IF;

  -- 1. Cria lead no pipeline
  INSERT INTO leads (
    nome, empresa, segmento, telefone, email, origem, status,
    referido_por_cliente_id, notas
  )
  VALUES (
    p_nome, p_empresa, v_segmento, p_telefone, p_email,
    v_origem_lead, 'novo_lead',
    v_perfil.cliente_id, v_nota_lead
  )
  RETURNING id INTO v_lead_id;

  -- 2. Cria indicacao vinculada (preenche indicante_perfil_id sempre)
  INSERT INTO indicacoes (
    indicante_cliente_id, indicante_perfil_id,
    indicado_nome, indicado_empresa,
    indicado_telefone, indicado_email, lead_id, status, notas
  )
  VALUES (
    v_perfil.cliente_id, v_user_id,
    p_nome, p_empresa,
    p_telefone, p_email, v_lead_id, 'pendente',
    CASE WHEN p_segmento IS NOT NULL AND length(trim(p_segmento)) > 0
         THEN 'Segmento: ' || p_segmento
         ELSE NULL END
  )
  RETURNING id INTO v_indicacao_id;

  -- 3. Credito de tokens (valor server-side)
  INSERT INTO token_transacoes (
    perfil_id, tipo, motivo, valor, referencia_tipo, referencia_id, descricao
  )
  VALUES (
    v_user_id, 'credito', 'indicacao', v_tokens,
    'indicacao', v_indicacao_id,
    'Indicacao de ' || p_nome || ' — ' || p_empresa
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

-- ── 4. RPC solicitar_resgate_portal (aceita interno) ─────────────────────────
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
  IF NOT FOUND OR v_perfil.tipo NOT IN ('cliente', 'interno') THEN
    RAISE EXCEPTION 'tipo_invalido_para_resgatar' USING ERRCODE = '42501';
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

  -- 2. Registra debito
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
