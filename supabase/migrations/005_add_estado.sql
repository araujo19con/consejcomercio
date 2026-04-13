-- Migration 005: Add estado (UF) field to leads and clientes
-- Run this in Supabase SQL Editor

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS estado TEXT;

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS estado TEXT;

COMMENT ON COLUMN leads.estado IS 'Brazilian state code (UF), e.g. SP, RJ, MG';
COMMENT ON COLUMN clientes.estado IS 'Brazilian state code (UF), e.g. SP, RJ, MG';
