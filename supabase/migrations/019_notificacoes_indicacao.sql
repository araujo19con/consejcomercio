-- ============================================================
-- NOTIFICACOES_INDICACAO
-- Auditoria e idempotência dos disparos para o Slack
-- quando uma indicação entra no pipeline (via portal ou CRM).
-- ============================================================

CREATE TABLE IF NOT EXISTS notificacoes_indicacao (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicacao_id    UUID NOT NULL UNIQUE REFERENCES indicacoes(id) ON DELETE CASCADE,
  origem          TEXT NOT NULL,                    -- 'cliente' | 'parceiro' | 'desconhecida'
  slack_channel   TEXT,
  slack_ts        TEXT,
  payload_hash    TEXT,
  status          TEXT NOT NULL DEFAULT 'pendente', -- pendente | enviado | erro
  erro_mensagem   TEXT,
  tentativas      INTEGER NOT NULL DEFAULT 0,
  enviado_em      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_indicacao_status ON notificacoes_indicacao(status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_indicacao_created_at ON notificacoes_indicacao(created_at DESC);

-- Reaproveita o trigger genérico já existente (set_updated_at de 016 ou update_updated_at de migrations anteriores)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    EXECUTE 'CREATE TRIGGER notificacoes_indicacao_updated_at BEFORE UPDATE ON notificacoes_indicacao FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
  ELSIF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    EXECUTE 'CREATE TRIGGER notificacoes_indicacao_updated_at BEFORE UPDATE ON notificacoes_indicacao FOR EACH ROW EXECUTE FUNCTION update_updated_at()';
  END IF;
END $$;

ALTER TABLE notificacoes_indicacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados leem notificacoes_indicacao" ON notificacoes_indicacao
  FOR SELECT TO authenticated USING (true);

-- View de falhas para monitoria
CREATE OR REPLACE VIEW notificacoes_indicacao_falhas AS
SELECT n.id, n.indicacao_id, i.indicado_nome, i.indicado_empresa,
       n.origem, n.erro_mensagem, n.tentativas, n.created_at, n.updated_at
FROM notificacoes_indicacao n
LEFT JOIN indicacoes i ON i.id = n.indicacao_id
WHERE n.status = 'erro'
ORDER BY n.updated_at DESC;
