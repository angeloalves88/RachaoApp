-- Corrige Storage self-hosted em DBs ja existentes (apos migrations do storage-api).
-- Rode: Get-Content infra/supabase/scripts/fix-storage-grants.sql | docker exec -i rachao-supabase-db psql -U supabase_admin -d postgres

GRANT anon TO supabase_storage_admin;
GRANT authenticated TO supabase_storage_admin;
GRANT service_role TO supabase_storage_admin;

ALTER ROLE anon SET search_path TO storage, public, extensions;
ALTER ROLE authenticated SET search_path TO storage, public, extensions;
ALTER ROLE service_role SET search_path TO storage, public, extensions;

GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA storage TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON TABLES TO service_role;
