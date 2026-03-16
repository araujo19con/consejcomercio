-- ============================================================
-- CONSEJ CRM — Initial Schema
-- ============================================================

-- Helper: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PARCEIROS
-- ============================================================
CREATE TABLE IF NOT EXISTS parceiros (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT NOT NULL,
  tipo          TEXT NOT NULL,  -- escritorio_contabilidade | aceleradora_mej | hub_inovacao | associacao_empresarial | outro
  contato_nome  TEXT,
  contato_email TEXT,
  contato_phone TEXT,
  website       TEXT,
  status        TEXT NOT NULL DEFAULT 'ativo',  -- ativo | inativo
  notas         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER parceiros_updated_at
  BEFORE UPDATE ON parceiros
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                      TEXT NOT NULL,
  empresa                   TEXT NOT NULL,
  segmento                  TEXT NOT NULL,
  telefone                  TEXT NOT NULL,
  email                     TEXT,
  origem                    TEXT NOT NULL,  -- indicacao_cliente | indicacao_parceiro | evento | redes_sociais | site | mej | outro
  status                    TEXT NOT NULL DEFAULT 'novo_lead',
  -- pipeline: novo_lead | diagnostico_agendado | diagnostico_realizado | proposta_enviada | em_negociacao | contrato_assinado | perdido
  data_diagnostico          TIMESTAMPTZ,
  motivo_perda              TEXT,
  servicos_interesse        TEXT[] DEFAULT '{}',
  investimento_estimado     TEXT,
  responsavel               TEXT,
  referido_por_cliente_id   UUID,  -- FK adicionada após criação de clientes (ver ALTER TABLE abaixo)
  referido_por_parceiro_id  UUID REFERENCES parceiros(id) ON DELETE SET NULL,
  notas                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON leads(status);

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    UUID REFERENCES leads(id) ON DELETE SET NULL,
  nome       TEXT NOT NULL,
  empresa    TEXT NOT NULL,
  segmento   TEXT NOT NULL,
  telefone   TEXT,
  email      TEXT,
  status     TEXT NOT NULL DEFAULT 'ativo',  -- ativo | em_renovacao | encerrado
  notas      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Now that clientes exists, add the FK on leads
ALTER TABLE leads
  ADD CONSTRAINT leads_referido_por_cliente_id_fkey
    FOREIGN KEY (referido_por_cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;

-- ============================================================
-- DIAGNOSTICOS
-- ============================================================
CREATE TABLE IF NOT EXISTS diagnosticos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id               UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  -- Direito Civil
  civil_q1              TEXT,
  civil_q2              TEXT,
  civil_q3              TEXT,
  -- Empresarial
  empresarial_q1        TEXT,
  empresarial_q2        TEXT,
  -- Contratual
  contratual_q1         TEXT,
  contratual_q2         TEXT,
  contratual_q3         TEXT,
  -- Digital
  digital_q1            TEXT,
  -- Trabalhista
  trabalhista_q1        TEXT,
  trabalhista_q2        TEXT,
  -- Propriedade Intelectual / Investimento
  pi_q1                 TEXT,
  investimento_q1       TEXT,
  -- Resultado
  cluster_recomendado   TEXT,
  servicos_urgentes     TEXT[] DEFAULT '{}',
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER diagnosticos_updated_at
  BEFORE UPDATE ON diagnosticos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CONTRATOS
-- ============================================================
CREATE TABLE IF NOT EXISTS contratos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id           UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo                 TEXT NOT NULL,  -- assessoria | consultoria | resgate
  modelo_precificacao  TEXT NOT NULL,  -- mensal | por_demanda | hibrido
  areas_direito        TEXT[] NOT NULL DEFAULT '{}',
  valor_total          NUMERIC(12,2),
  valor_mensal         NUMERIC(12,2),
  data_inicio          DATE,
  data_fim             DATE,
  status               TEXT NOT NULL DEFAULT 'ativo',   -- ativo | encerrado | suspenso
  rm_status            TEXT NOT NULL DEFAULT 'em_dia',  -- em_dia | atencao | critico
  notas                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contratos_data_fim ON contratos(data_fim);

CREATE TRIGGER contratos_updated_at
  BEFORE UPDATE ON contratos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- DEMANDAS
-- ============================================================
CREATE TABLE IF NOT EXISTS demandas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id     UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  cliente_id      UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  titulo          TEXT NOT NULL,
  descricao       TEXT,
  tipo            TEXT NOT NULL DEFAULT 'simples',  -- simples | complexa
  valor           NUMERIC(12,2) GENERATED ALWAYS AS (
                    CASE tipo
                      WHEN 'complexa' THEN 500.00
                      ELSE 200.00
                    END
                  ) STORED,
  status          TEXT NOT NULL DEFAULT 'aberta',   -- aberta | em_andamento | concluida | cancelada
  area_direito    TEXT,
  data_abertura   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_conclusao  TIMESTAMPTZ,
  responsavel     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_demandas_status ON demandas(status);

CREATE TRIGGER demandas_updated_at
  BEFORE UPDATE ON demandas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- INDICACOES
-- ============================================================
CREATE TABLE IF NOT EXISTS indicacoes (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicante_cliente_id     UUID REFERENCES clientes(id) ON DELETE SET NULL,
  indicante_parceiro_id    UUID REFERENCES parceiros(id) ON DELETE SET NULL,
  indicado_nome            TEXT NOT NULL,
  indicado_telefone        TEXT NOT NULL,
  indicado_empresa         TEXT,
  indicado_email           TEXT,
  lead_id                  UUID REFERENCES leads(id) ON DELETE SET NULL,
  status                   TEXT NOT NULL DEFAULT 'pendente',  -- pendente | contatado | em_negociacao | convertido | perdido
  tipo_recompensa          TEXT,  -- desconto_contrato | presente_especial
  recompensa_descricao     TEXT,
  recompensa_entregue      BOOLEAN NOT NULL DEFAULT FALSE,
  data_recompensa          TIMESTAMPTZ,
  notas                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- At least one referrer required
  CONSTRAINT indicacoes_must_have_referrer
    CHECK (
      indicante_cliente_id IS NOT NULL OR
      indicante_parceiro_id IS NOT NULL
    )
);

CREATE INDEX idx_indicacoes_status ON indicacoes(status);

CREATE TRIGGER indicacoes_updated_at
  BEFORE UPDATE ON indicacoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- OPORTUNIDADES
-- ============================================================
CREATE TABLE IF NOT EXISTS oportunidades (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id       UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  contrato_id      UUID REFERENCES contratos(id) ON DELETE SET NULL,
  tipo             TEXT NOT NULL,  -- upsell | cross_sell | renovacao
  servico_alvo     TEXT NOT NULL,
  titulo           TEXT NOT NULL,
  descricao        TEXT,
  status           TEXT NOT NULL DEFAULT 'identificada',  -- identificada | abordada | em_proposta | convertida | descartada
  valor_estimado   NUMERIC(12,2),
  data_alerta      TIMESTAMPTZ,
  responsavel      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oportunidades_status ON oportunidades(status);

CREATE TRIGGER oportunidades_updated_at
  BEFORE UPDATE ON oportunidades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela       TEXT NOT NULL,
  registro_id  UUID NOT NULL,
  acao         TEXT NOT NULL,  -- INSERT | UPDATE | DELETE
  campo        TEXT,
  valor_antes  JSONB,
  valor_depois JSONB,
  usuario      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tabela ON audit_logs(tabela);
CREATE INDEX idx_audit_logs_registro ON audit_logs(registro_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE parceiros      ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosticos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicacoes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE oportunidades  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs     ENABLE ROW LEVEL SECURITY;

-- Authenticated users have full access to all tables
CREATE POLICY "authenticated_all" ON parceiros
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON diagnosticos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON contratos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON demandas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON indicacoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON oportunidades
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON audit_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
