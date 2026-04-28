-- Migration 015: Portal de Indicações — Tokens, Catálogo, Resgates
-- Adiciona suporte a dois tipos de usuário (interno/cliente) e a
-- toda a infraestrutura de tokens do Programa de Indicações CONSEJ.

-- ── 1. Novos campos em perfis ────────────────────────────────────────────────
ALTER TABLE perfis
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'interno'
    CHECK (tipo IN ('interno', 'cliente')),
  ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tokens_saldo INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_historico_total INTEGER NOT NULL DEFAULT 0;

-- ── 2. Atualiza trigger de criação de perfil para ler metadata do convite ────
-- O convite usa signInWithOtp com data: { tipo: 'cliente', cliente_id: '...' }
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, email, tipo, cliente_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'tipo', 'interno'),
    (NEW.raw_user_meta_data->>'cliente_id')::uuid
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 3. Transações de tokens ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_transacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id       UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('credito', 'debito')),
  motivo          TEXT NOT NULL,
  -- motivos de crédito:  'cadastro' | 'indicacao' | 'rd_realizada' | 'contrato_fechado'
  --                      | 'renovacao' | 'nps' | 'depoimento' | 'evento' | 'aniversario' | 'bonus'
  -- motivos de débito:   'resgate'
  valor           INTEGER NOT NULL CHECK (valor > 0),
  referencia_tipo TEXT,   -- 'indicacao' | 'resgate' | 'contrato'
  referencia_id   UUID,
  descricao       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE token_transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cliente vê próprias transações" ON token_transacoes
  FOR SELECT TO authenticated
  USING (perfil_id = auth.uid());

CREATE POLICY "interno vê todas transações" ON token_transacoes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM perfis WHERE id = auth.uid() AND tipo = 'interno'
  ));

CREATE POLICY "interno insere transações" ON token_transacoes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM perfis WHERE id = auth.uid() AND tipo = 'interno'
  ));

-- ── 4. Catálogo de recompensas ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalogo_recompensas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             TEXT NOT NULL,
  descricao        TEXT,
  tier             TEXT NOT NULL CHECK (tier IN ('cortesia', 'desconto', 'servico', 'premium')),
  custo_tokens     INTEGER NOT NULL,
  aprovacao_dupla  BOOLEAN NOT NULL DEFAULT false,
  ativo            BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE catalogo_recompensas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados leem catálogo ativo" ON catalogo_recompensas
  FOR SELECT TO authenticated USING (ativo = true);

CREATE POLICY "interno gerencia catálogo" ON catalogo_recompensas
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM perfis WHERE id = auth.uid() AND tipo = 'interno'
  ));

-- ── 5. Resgates ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resgates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id        UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  catalogo_id      UUID NOT NULL REFERENCES catalogo_recompensas(id),
  tokens_debitados INTEGER NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pendente'
                     CHECK (status IN ('pendente', 'aprovado', 'entregue', 'cancelado')),
  aprovado_por_id  UUID REFERENCES perfis(id),
  notas            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE resgates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cliente vê próprios resgates" ON resgates
  FOR SELECT TO authenticated USING (perfil_id = auth.uid());

CREATE POLICY "cliente insere resgates" ON resgates
  FOR INSERT TO authenticated WITH CHECK (perfil_id = auth.uid());

CREATE POLICY "interno gerencia resgates" ON resgates
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM perfis WHERE id = auth.uid() AND tipo = 'interno'
  ));

-- ── 6. Catálogo padrão (seed) ────────────────────────────────────────────────
INSERT INTO catalogo_recompensas (nome, descricao, tier, custo_tokens, aprovacao_dupla) VALUES
  ('E-book CONSEJ',                        'Material jurídico exclusivo em PDF',                              'cortesia',  200,  false),
  ('Modelo de Contrato',                   'Template editável de contrato empresarial',                       'cortesia',  350,  false),
  ('5% de desconto no próximo contrato',   'Desconto aplicado na renovação ou novo serviço',                  'desconto',  750,  false),
  ('10% de desconto no próximo contrato',  'Desconto aplicado na renovação ou novo serviço',                  'desconto',  1500, false),
  ('Revisão gratuita de 1 contrato',       'Análise e sugestão de ajustes em contrato existente',             'desconto',  2000, false),
  ('Pacote de 3 demandas avulsas',         '3 demandas jurídicas avulsas incluídas sem custo adicional',      'servico',   3000, false),
  ('Consultoria mensal por 3 meses',       'Acesso a consultoria jurídica mensal durante 3 meses',            'servico',   4500, false),
  ('Mês gratuito de assessoria',           'Um mês de assessoria jurídica completa sem cobrança',             'premium',   5500, true),
  ('Mentoria com presidência CONSEJ',      'Sessão exclusiva de 1h com a presidência da CONSEJ',              'premium',   8000, true)
ON CONFLICT DO NOTHING;
