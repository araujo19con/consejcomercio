CREATE TABLE IF NOT EXISTS reunioes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_hora TIMESTAMPTZ NOT NULL,
  duracao_minutos INTEGER DEFAULT 60,
  local TEXT,
  link_video TEXT,
  participantes TEXT[] DEFAULT '{}',
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'agendada' CHECK (status IN ('agendada', 'realizada', 'cancelada')),
  slack_ts TEXT,
  slack_channel TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reunioes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users can manage reunioes" ON reunioes FOR ALL TO authenticated USING (true) WITH CHECK (true);
