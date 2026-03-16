-- Tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS perfis (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL DEFAULT '',
  cargo       TEXT,
  bio         TEXT,
  foto_url    TEXT,
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfis visíveis para autenticados" ON perfis
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "usuário gerencia próprio perfil" ON perfis
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "usuário atualiza próprio perfil" ON perfis
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Adiciona responsavel_id nas tabelas principais
ALTER TABLE leads      ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES perfis(id) ON DELETE SET NULL;
ALTER TABLE reunioes   ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES perfis(id) ON DELETE SET NULL;
ALTER TABLE contratos  ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES perfis(id) ON DELETE SET NULL;

-- Bucket de avatares (execute separadamente no Storage se necessário)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
-- ON CONFLICT DO NOTHING;
