#!/usr/bin/env bash
# Aplica schema Prisma no Postgres do stack Supabase (one-shot)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Crie infra/docker/.env a partir de .env.production.example"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

MIGRATE_IMAGE="${CR_IMAGE_MIGRATE:-rachao-migrate:latest}"
NETWORK="${RACHAO_BACKEND_NETWORK:-rachao-backend}"

DATABASE_URL="postgresql://supabase_admin:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-postgres}?schema=public"

echo "==> Prisma migrate/push na rede $NETWORK"
docker run --rm \
  --network "$NETWORK" \
  -e "DATABASE_URL=${DATABASE_URL}" \
  "$MIGRATE_IMAGE"

echo "Migrate concluido."
