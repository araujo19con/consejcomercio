-- Migration 010: Gamification
-- Adds fechado_por_id to leads (who closed the deal, distinct from responsavel_id = who prospected)
-- Adds metas JSONB to configuracoes (team monthly goals + configurable point values)

-- ── leads: quem fechou o deal ────────────────────────────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fechado_por_id UUID REFERENCES perfis(id) ON DELETE SET NULL;

-- ── configuracoes: metas e pontos ────────────────────────────────────────────
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS metas JSONB DEFAULT jsonb_build_object(
  'meta_leads_mes',         5,
  'meta_mrr_mes',           5000,
  'meta_diagnosticos_mes',  8,
  'meta_reunioes_mes',      6,
  'pontos_lead_criado',     5,
  'pontos_proposta',        15,
  'pontos_negociacao',      20,
  'pontos_diagnostico',     20,
  'pontos_reuniao',         15,
  'pontos_ganho_assessoria',100,
  'pontos_ganho_consultoria',60,
  'pontos_indicacao',       30,
  'recompensa_descricao',   ''
);

-- Back-fill the default row if metas is still null
UPDATE configuracoes
SET metas = jsonb_build_object(
  'meta_leads_mes',         5,
  'meta_mrr_mes',           5000,
  'meta_diagnosticos_mes',  8,
  'meta_reunioes_mes',      6,
  'pontos_lead_criado',     5,
  'pontos_proposta',        15,
  'pontos_negociacao',      20,
  'pontos_diagnostico',     20,
  'pontos_reuniao',         15,
  'pontos_ganho_assessoria',100,
  'pontos_ganho_consultoria',60,
  'pontos_indicacao',       30,
  'recompensa_descricao',   ''
)
WHERE id = 'default' AND metas IS NULL;
