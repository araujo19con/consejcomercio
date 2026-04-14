-- ============================================================
-- Migration 009 — Supabase Storage: bucket 'avatars'
-- ============================================================
-- Creates the public 'avatars' bucket for profile photos.
-- Max file size: 5 MB. Allowed types: JPEG, PNG, WebP, GIF.
-- ============================================================

-- 1. Create the bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS policies (safe create pattern)
DO $$
BEGIN
  -- Allow authenticated users to upload their own avatar
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_insert'
  ) THEN
    EXECUTE '
      CREATE POLICY avatars_insert ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
          bucket_id = ''avatars'' AND
          auth.uid()::text = (storage.foldername(name))[1]
        )
    ';
  END IF;

  -- Allow anyone to read avatars (public bucket)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_select'
  ) THEN
    EXECUTE '
      CREATE POLICY avatars_select ON storage.objects
        FOR SELECT TO public
        USING (bucket_id = ''avatars'')
    ';
  END IF;

  -- Allow users to update/replace their own avatar
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_update'
  ) THEN
    EXECUTE '
      CREATE POLICY avatars_update ON storage.objects
        FOR UPDATE TO authenticated
        USING (
          bucket_id = ''avatars'' AND
          auth.uid()::text = (storage.foldername(name))[1]
        )
    ';
  END IF;

  -- Allow users to delete their own avatar
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_delete'
  ) THEN
    EXECUTE '
      CREATE POLICY avatars_delete ON storage.objects
        FOR DELETE TO authenticated
        USING (
          bucket_id = ''avatars'' AND
          auth.uid()::text = (storage.foldername(name))[1]
        )
    ';
  END IF;
END
$$;
