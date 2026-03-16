-- Add AI analysis field to diagnosticos
-- Run this if migration 001 was already executed
ALTER TABLE diagnosticos ADD COLUMN IF NOT EXISTS analise_ia TEXT;
