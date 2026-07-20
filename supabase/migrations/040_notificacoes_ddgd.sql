-- ============================================================
-- NOTIFICACOES_DDGD
-- Auditoria e idempotência dos disparos de "Passagem de Bastão"
-- (lead fechado no comercial → Slack da DDGD).
-- ============================================================

CREATE TABLE IF NOT EXISTS notificacoes_ddgd (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  status_gatilho  TEXT NOT NULL,                    -- ganho_assessoria | ganho_consultoria
  slack_channel   TEXT,
  slack_ts        TEXT,                              -- ts da mensagem postada (usar para thread_replies)
  payload_hash    TEXT,                              -- sha256 do payload enviado (debug)
  status          TEXT NOT NULL DEFAULT 'pendente',  -- pendente | enviado | erro
  erro_mensagem   TEXT,
  tentativas      INTEGER NOT NULL DEFAULT 0,
  enviado_em      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_ddgd_status ON notificacoes_ddgd(status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_ddgd_created_at ON notificacoes_ddgd(created_at DESC);

CREATE TRIGGER notificacoes_ddgd_updated_at
  BEFORE UPDATE ON notificacoes_ddgd
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: apenas autenticados leem; escrita somente pela service_role (Edge Function).
ALTER TABLE notificacoes_ddgd ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notificacoes_ddgd vis\u00edveis para autenticados" ON notificacoes_ddgd
  FOR SELECT TO authenticated USING (true);

-- View auxiliar para dashboard de falhas
CREATE OR REPLACE VIEW notificacoes_ddgd_falhas AS
SELECT n.id, n.lead_id, l.nome AS lead_nome, l.empresa, n.status_gatilho,
       n.erro_mensagem, n.tentativas, n.created_at, n.updated_at
FROM notificacoes_ddgd n
LEFT JOIN leads l ON l.id = n.lead_id
WHERE n.status = 'erro'
ORDER BY n.updated_at DESC;
