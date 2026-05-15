#!/usr/bin/env bash
# Aplica schema Prisma no Postgres do stack Supabase (one-shot)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Crie infra/docker/.env a partir de .env.production.example"
  exit 1
fi

# shellcheck source=lib/env.sh
source "$SCRIPT_DIR/lib/env.sh"

env_load_file "$ENV_FILE" \
  CR_IMAGE_MIGRATE POSTGRES_PASSWORD POSTGRES_DB RACHAO_BACKEND_NETWORK DATABASE_URL \
  DATABASE_USER DATABASE_HOST DATABASE_PORT SUPABASE_STACK_NAME

# Remonta URL com host do Swarm (db / rachao-supabase_db)
if [[ "${DATABASE_URL:-}" == *"@db:"* ]] || [[ "${DATABASE_URL:-}" == *"@rachao-supabase_db:"* ]]; then
  unset DATABASE_URL
fi

env_ensure_database_url

MIGRATE_IMAGE="${CR_IMAGE_MIGRATE:-rachao-migrate:latest}"
NETWORK="${RACHAO_BACKEND_NETWORK:-rachao-backend}"

env_wait_for_postgres "$NETWORK"

echo "==> Prisma migrate/push (${DATABASE_URL%%@*}@***)"
docker run --rm \
  --network "$NETWORK" \
  -e "DATABASE_URL=${DATABASE_URL}" \
  "$MIGRATE_IMAGE"

echo "Migrate concluido."
