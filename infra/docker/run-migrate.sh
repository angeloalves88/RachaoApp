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
  CR_IMAGE_MIGRATE POSTGRES_PASSWORD POSTGRES_DB RACHAO_BACKEND_NETWORK

MIGRATE_IMAGE="${CR_IMAGE_MIGRATE:-rachao-migrate:latest}"
NETWORK="${RACHAO_BACKEND_NETWORK:-rachao-backend}"
POSTGRES_DB="${POSTGRES_DB:-postgres}"

: "${POSTGRES_PASSWORD:?Defina POSTGRES_PASSWORD em infra/docker/.env}"

DATABASE_URL="postgresql://supabase_admin:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public"

echo "==> Prisma migrate/push na rede $NETWORK"
docker run --rm \
  --network "$NETWORK" \
  -e "DATABASE_URL=${DATABASE_URL}" \
  "$MIGRATE_IMAGE"

echo "Migrate concluido."
