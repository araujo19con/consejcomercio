-- Migration 013: Histórico de interações enviadas ao lead (WhatsApp / e-mail / LinkedIn)

CREATE TABLE IF NOT EXISTS interacoes_lead (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  canal           TEXT NOT NULL,          -- whatsapp | email | linkedin
  stage_msg       TEXT NOT NULL,          -- primeiro_contato | followup | diagnostico | proposta | negociacao | pos_fechamento | reativacao
  setor           TEXT NOT NULL,          -- geral | societario | contratual | digital_lgpd | trabalhista | marca_pi
  variacao_idx   INTEGER NOT NULL DEFAULT 0,
  assunto         TEXT,
  corpo           TEXT NOT NULL,
  telefone_usado  TEXT,
  pipeline_antes  TEXT,
  pipeline_depois TEXT,
  enviada_por_id  UUID REFERENCES perfis(id) ON DELETE SET NULL,
  enviada_por     TEXT,
  enviada_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interacoes_lead_id ON interacoes_lead(lead_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_enviada ON interacoes_lead(enviada_em DESC);

ALTER TABLE interacoes_lead ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON interacoes_lead
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
