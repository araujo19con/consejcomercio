-- 008_configuracoes.sql
-- Move app settings from localStorage to DB (single-row pattern)

CREATE TABLE IF NOT EXISTS configuracoes (
  id                     TEXT PRIMARY KEY DEFAULT 'default',
  alerta_renovacao_dias  INTEGER NOT NULL DEFAULT 60,
  servicos               JSONB NOT NULL DEFAULT '[
    {"id":"simples","nome":"Demanda Simples","tipo":"simples","valor":200},
    {"id":"complexa","nome":"Demanda Complexa","tipo":"complexa","valor":500}
  ]'::jsonb,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Always ensure the default row exists
INSERT INTO configuracoes (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'configuracoes' AND policyname = 'configuracoes_auth'
  ) THEN
    EXECUTE 'CREATE POLICY configuracoes_auth ON configuracoes FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END$$;
