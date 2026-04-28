-- =============================================================================
-- 016_regras_e_campanhas.sql
-- Adiciona regras configuráveis de tokens + campanhas promocionais
-- =============================================================================

-- 1. Regras de tokens (motivos + valores configuráveis)
CREATE TABLE IF NOT EXISTS regras_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motivo        TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  descricao     TEXT,
  valor_tokens  INTEGER NOT NULL CHECK (valor_tokens > 0),
  ativo         BOOLEAN NOT NULL DEFAULT true,
  ordem         INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE regras_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados leem regras" ON regras_tokens
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "interno gerencia regras" ON regras_tokens FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND tipo = 'interno'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND tipo = 'interno'));

-- Seed padrão
INSERT INTO regras_tokens (motivo, label, descricao, valor_tokens, ordem) VALUES
  ('cadastro',         'Boas-vindas ao programa',          'Crédito ao entrar no portal',                    100,  1),
  ('indicacao',        'Enviar uma indicação',             'Por cada indicação enviada pelo portal',         100,  2),
  ('rd_realizada',     'Indicado realizar diagnóstico',    'Quando a empresa indicada faz a RD',             200,  3),
  ('contrato_fechado', 'Indicado fechar contrato',         'Valor base — pode ser ajustado por contrato',   1500,  4),
  ('renovacao',        'Renovação de contrato',            'Por cada renovação fechada',                     500,  5),
  ('nps',              'Avaliação NPS respondida',         'Por cada questionário NPS respondido',           100,  6),
  ('depoimento',       'Depoimento ou case',               'Vídeo, escrito ou caso usado em material',       300,  7),
  ('evento',           'Participação em evento CONSEJ',    'Por cada evento presencial',                     200,  8),
  ('aniversario',      'Aniversário do cliente',           'Concedido manualmente no aniversário',           100,  9),
  ('bonus',            'Bônus especial',                   'Crédito discricionário da equipe',                50, 10)
ON CONFLICT (motivo) DO NOTHING;

-- 2. Campanhas promocionais
CREATE TABLE IF NOT EXISTS campanhas_promocionais (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       TEXT NOT NULL,
  descricao    TEXT NOT NULL,
  cor          TEXT NOT NULL DEFAULT '#f59e0b',
  icone        TEXT NOT NULL DEFAULT 'sparkles',
  data_inicio  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_fim     TIMESTAMPTZ NOT NULL,
  ativa        BOOLEAN NOT NULL DEFAULT true,
  destaque     BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE campanhas_promocionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados leem campanhas ativas" ON campanhas_promocionais
  FOR SELECT TO authenticated USING (ativa = true AND data_fim >= NOW());

CREATE POLICY "interno gerencia campanhas" ON campanhas_promocionais FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND tipo = 'interno'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND tipo = 'interno'));

-- Trigger updated_at em ambas tabelas
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS regras_tokens_updated_at ON regras_tokens;
CREATE TRIGGER regras_tokens_updated_at BEFORE UPDATE ON regras_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS campanhas_promocionais_updated_at ON campanhas_promocionais;
CREATE TRIGGER campanhas_promocionais_updated_at BEFORE UPDATE ON campanhas_promocionais
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Política para admin atualizar tokens de outros perfis
DROP POLICY IF EXISTS "interno atualiza tokens de clientes" ON perfis;
CREATE POLICY "interno atualiza tokens de clientes" ON perfis FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.tipo = 'interno'))
  WITH CHECK (true);
