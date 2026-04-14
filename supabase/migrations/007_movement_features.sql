-- 007_movement_features.sql
-- Movement Chief recommendations: NPS, indicação chain, casos manifesto, pós-juniors

-- ── clientes: NPS + indicado por ─────────────────────────────────────────────
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS nps_score          SMALLINT CHECK (nps_score BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS nps_updated_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS indicado_por_cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;

-- ── contratos: caso manifesto ────────────────────────────────────────────────
ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS caso_manifesto            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS caso_manifesto_descricao  TEXT,
  ADD COLUMN IF NOT EXISTS valor_protegido           NUMERIC(12,2);

-- ── pos_juniors: ex-membros da CONSEJ ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_juniors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                TEXT NOT NULL,
  email               TEXT,
  telefone            TEXT,
  empresa             TEXT,
  cargo               TEXT,
  area_atuacao        TEXT,
  anos_consej         INTEGER,
  semestre_saida      TEXT,
  disponivel_mentoria BOOLEAN NOT NULL DEFAULT FALSE,
  linkedin            TEXT,
  notas               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for pos_juniors (same pattern as other tables)
ALTER TABLE pos_juniors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pos_juniors' AND policyname = 'pos_juniors_auth'
  ) THEN
    EXECUTE 'CREATE POLICY pos_juniors_auth ON pos_juniors FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END$$;
