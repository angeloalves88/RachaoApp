-- =============================================================================
-- RachaoApp — Storage: buckets + RLS em storage.objects
-- =============================================================================
-- Rode DEPOIS das migrations Prisma (tabelas public."Estadio" e public."Usuario").
--
--   docker exec -i rachao-supabase-db psql -U supabase_admin -d postgres -f - < infra/supabase/scripts/storage-rls.sql
--   (ou copie/cole no psql / Studio SQL)
--
-- Remove o erro: "new row violates row-level security policy" no upload
-- (apps/web/lib/storage.ts → buckets estadios-fotos e avatares).
-- =============================================================================

-- Buckets (id = name no Storage API)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'estadios-fotos',
    'estadios-fotos',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  (
    'avatares',
    'avatares',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Politicas nomeadas (prefixo rachao_) para nao colidir com defaults do Studio
DROP POLICY IF EXISTS "rachao_estadios_fotos_select" ON storage.objects;
DROP POLICY IF EXISTS "rachao_estadios_fotos_insert" ON storage.objects;
DROP POLICY IF EXISTS "rachao_estadios_fotos_update" ON storage.objects;
DROP POLICY IF EXISTS "rachao_estadios_fotos_delete" ON storage.objects;
DROP POLICY IF EXISTS "rachao_avatares_select" ON storage.objects;
DROP POLICY IF EXISTS "rachao_avatares_insert" ON storage.objects;
DROP POLICY IF EXISTS "rachao_avatares_update" ON storage.objects;
DROP POLICY IF EXISTS "rachao_avatares_delete" ON storage.objects;

-- Leitura publica (URLs publicas dos buckets)
CREATE POLICY "rachao_estadios_fotos_select"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'estadios-fotos');

CREATE POLICY "rachao_avatares_select"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'avatares');

-- Upload: pasta = estadioId; apenas dono do estadio (Usuario.id = auth.uid())
CREATE POLICY "rachao_estadios_fotos_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'estadios-fotos'
    AND EXISTS (
      SELECT 1
      FROM public."Estadio" e
      WHERE e.id = (storage.foldername(name))[1]
        AND e."donoId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "rachao_estadios_fotos_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'estadios-fotos'
    AND EXISTS (
      SELECT 1
      FROM public."Estadio" e
      WHERE e.id = (storage.foldername(name))[1]
        AND e."donoId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "rachao_estadios_fotos_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'estadios-fotos'
    AND EXISTS (
      SELECT 1
      FROM public."Estadio" e
      WHERE e.id = (storage.foldername(name))[1]
        AND e."donoId" = (SELECT auth.uid())::text
    )
  );

-- Avatar: pasta = usuarioId = JWT sub
CREATE POLICY "rachao_avatares_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatares'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "rachao_avatares_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatares'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "rachao_avatares_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatares'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
