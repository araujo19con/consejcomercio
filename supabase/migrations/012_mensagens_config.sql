-- Migration 012: Add mensagens configuration column
ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS mensagens JSONB NOT NULL DEFAULT '{}';
