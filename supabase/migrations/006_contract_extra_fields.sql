-- Add extra observacao fields to contratos (from Pipefy migration)
ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS observacoes_demanda TEXT,
  ADD COLUMN IF NOT EXISTS observacoes_vp       TEXT;
