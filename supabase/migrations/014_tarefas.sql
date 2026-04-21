-- Migration 014: Primitivo unificado de tarefas (time + individual)
--
-- As tarefas são o "to-do" canônico do CRM. Cada tarefa é atribuída a alguém
-- (atribuido_a_id → perfis) e pode opcionalmente apontar para uma entidade do
-- sistema (lead, cliente, contrato, oportunidade, reuniao, indicacao) via
-- (entidade_tipo, entidade_id). Isso evita explodir novas tabelas por tipo.

CREATE TABLE IF NOT EXISTS tarefas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo            TEXT NOT NULL,
  descricao         TEXT,
  tipo              TEXT NOT NULL DEFAULT 'generica',
    -- generica | followup | reuniao_prep | renovacao | upsell | diagnostico | proposta | cobranca
  entidade_tipo     TEXT,    -- lead | cliente | contrato | oportunidade | reuniao | indicacao | null
  entidade_id       UUID,
  atribuido_a_id    UUID REFERENCES perfis(id) ON DELETE SET NULL,
  criado_por_id     UUID REFERENCES perfis(id) ON DELETE SET NULL,
  prioridade        TEXT NOT NULL DEFAULT 'media',  -- baixa | media | alta | critica
  status            TEXT NOT NULL DEFAULT 'aberta', -- aberta | em_andamento | concluida | cancelada
  data_vencimento   TIMESTAMPTZ,
  data_conclusao    TIMESTAMPTZ,
  notas             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarefas_atribuido     ON tarefas(atribuido_a_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_status        ON tarefas(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_vencimento    ON tarefas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_tarefas_entidade      ON tarefas(entidade_tipo, entidade_id);

CREATE TRIGGER tarefas_updated_at
  BEFORE UPDATE ON tarefas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON tarefas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
