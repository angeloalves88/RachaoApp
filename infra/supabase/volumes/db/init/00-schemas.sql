-- =============================================================================
-- RachaoApp - Inicializacao do Postgres
-- =============================================================================
-- Cria roles e schemas usados pelo stack Supabase self-hosted.
-- Este script eh executado UMA VEZ na primeira subida do container db.
-- =============================================================================

-- Schemas usados pelo Supabase
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS _realtime;
CREATE SCHEMA IF NOT EXISTS graphql_public;
CREATE SCHEMA IF NOT EXISTS extensions;

-- Extensoes utilizadas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgjwt WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =============================================================================
-- ROLES
-- =============================================================================
DO $$
BEGIN
  -- Role base anonima (PostgREST)
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;

  -- Role autenticado (PostgREST)
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;

  -- Role service (PostgREST com bypass de RLS)
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;

  -- Role usado pelo PostgREST para autenticar e trocar de role via JWT
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD 'rachao-dev-password-change-me';
  END IF;

  -- Role admin do GoTrue
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin LOGIN CREATEROLE PASSWORD 'rachao-dev-password-change-me';
  END IF;

  -- Role admin do Storage
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    CREATE ROLE supabase_storage_admin LOGIN PASSWORD 'rachao-dev-password-change-me';
  END IF;

  -- Role admin geral (postgres-meta, realtime)
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin LOGIN SUPERUSER PASSWORD 'rachao-dev-password-change-me';
  END IF;

  -- Role `postgres`: nao existe na imagem supabase/postgres, mas algumas
  -- migrations do GoTrue (e scripts oficiais) referenciam `postgres` como
  -- alvo de grants. Criamos como NOLOGIN apenas para satisfazer os grants.
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'postgres') THEN
    CREATE ROLE postgres NOLOGIN INHERIT;
  END IF;

  -- Role do Realtime
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_realtime_admin') THEN
    CREATE ROLE supabase_realtime_admin NOLOGIN;
  END IF;
END
$$;

-- Permissoes do authenticator
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- Schemas: ownership
ALTER SCHEMA auth OWNER TO supabase_auth_admin;
ALTER SCHEMA storage OWNER TO supabase_storage_admin;
ALTER SCHEMA realtime OWNER TO supabase_admin;
ALTER SCHEMA _realtime OWNER TO supabase_admin;

-- =============================================================================
-- search_path por role
-- O GoTrue cria a tabela `schema_migrations` no primeiro schema do search_path,
-- por isso `auth` precisa vir antes de `public`. Mesma logica para Storage.
-- =============================================================================
ALTER ROLE supabase_auth_admin SET search_path TO auth, extensions, public;
ALTER ROLE supabase_storage_admin SET search_path TO storage, extensions, public;
ALTER ROLE supabase_admin SET search_path TO public, extensions;
ALTER ROLE authenticator SET search_path TO public, extensions;

-- =============================================================================
-- Permissoes basicas no schema public
-- =============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- =============================================================================
-- Schema auth: GoTrue precisa criar/alterar tabelas livremente
-- =============================================================================
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON FUNCTIONS TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO supabase_auth_admin;

-- Roles de leitura no schema auth (pra views/joins se necessario)
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

-- =============================================================================
-- Schema storage: Storage API precisa criar/alterar tabelas
-- =============================================================================
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON TABLES TO supabase_storage_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON FUNCTIONS TO supabase_storage_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON SEQUENCES TO supabase_storage_admin;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

-- Storage API roda migrations contra o database configurado em DATABASE_URL.
-- Sem privilegios suficientes no database alvo, o container entra em loop com 42501.
GRANT CREATE, CONNECT, TEMPORARY ON DATABASE postgres TO supabase_storage_admin;
