-- ============================================================
-- Migration 016 — Passagem de Bastão (Dossiê Digital do Cliente)
-- Armazena informações estruturadas + mídias (áudio/vídeo)
-- que o Closer prepara para repassar à DDGD.
-- ============================================================

-- 1. Dossiê principal (1:1 com lead)
CREATE TABLE IF NOT EXISTS passagem_bastao (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id               UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  dores_expectativas    TEXT,
  perfil_comunicacao    TEXT,
  info_financeira       TEXT,
  prazos_marcos         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_id         UUID REFERENCES perfis(id) ON DELETE SET NULL,
  atualizado_por_id     UUID REFERENCES perfis(id) ON DELETE SET NULL
);

CREATE TRIGGER passagem_bastao_updated_at
  BEFORE UPDATE ON passagem_bastao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE passagem_bastao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "passagem_bastao select autenticado" ON passagem_bastao
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "passagem_bastao insert autenticado" ON passagem_bastao
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "passagem_bastao update autenticado" ON passagem_bastao
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "passagem_bastao delete autenticado" ON passagem_bastao
  FOR DELETE TO authenticated USING (true);

-- 2. Mídias (N por passagem)
CREATE TABLE IF NOT EXISTS passagem_bastao_midias (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passagem_id       UUID NOT NULL REFERENCES passagem_bastao(id) ON DELETE CASCADE,
  lead_id           UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tipo              TEXT NOT NULL,           -- audio | video
  nome_arquivo      TEXT NOT NULL,
  storage_path      TEXT NOT NULL UNIQUE,    -- caminho no bucket handoff-media
  mime_type         TEXT,
  tamanho_bytes     BIGINT,
  slack_file_id     TEXT,                    -- id do file no Slack após upload
  slack_permalink   TEXT,
  enviado_slack_em  TIMESTAMPTZ,
  erro_slack        TEXT,
  enviado_por_id    UUID REFERENCES perfis(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passagem_midias_lead_id ON passagem_bastao_midias(lead_id);
CREATE INDEX IF NOT EXISTS idx_passagem_midias_passagem_id ON passagem_bastao_midias(passagem_id);

CREATE TRIGGER passagem_bastao_midias_updated_at
  BEFORE UPDATE ON passagem_bastao_midias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE passagem_bastao_midias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "passagem_midias select autenticado" ON passagem_bastao_midias
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "passagem_midias insert autenticado" ON passagem_bastao_midias
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "passagem_midias update autenticado" ON passagem_bastao_midias
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "passagem_midias delete autenticado" ON passagem_bastao_midias
  FOR DELETE TO authenticated USING (true);

-- 3. Bucket de Storage para mídias do dossiê
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'handoff-media',
  'handoff-media',
  false,     -- privado; front usa signed URLs
  52428800,  -- 50 MB
  ARRAY[
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/x-m4a',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS do bucket — autenticados podem tudo (CRM interno)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'handoff_media_insert'
  ) THEN
    EXECUTE '
      CREATE POLICY handoff_media_insert ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = ''handoff-media'')
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'handoff_media_select'
  ) THEN
    EXECUTE '
      CREATE POLICY handoff_media_select ON storage.objects
        FOR SELECT TO authenticated
        USING (bucket_id = ''handoff-media'')
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'handoff_media_update'
  ) THEN
    EXECUTE '
      CREATE POLICY handoff_media_update ON storage.objects
        FOR UPDATE TO authenticated
        USING (bucket_id = ''handoff-media'')
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'handoff_media_delete'
  ) THEN
    EXECUTE '
      CREATE POLICY handoff_media_delete ON storage.objects
        FOR DELETE TO authenticated
        USING (bucket_id = ''handoff-media'')
    ';
  END IF;
END
$$;
