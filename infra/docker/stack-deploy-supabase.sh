#!/usr/bin/env bash
# Deploy/atualiza SOMENTE o stack Supabase (carrega .env automaticamente)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
STACK="${SUPABASE_STACK_NAME:-rachao-supabase}"
BACKEND_NETWORK="${RACHAO_BACKEND_NETWORK:-rachao-backend}"

# shellcheck source=lib/env.sh
source "$SCRIPT_DIR/lib/env.sh"
env_load_all "$ENV_FILE"

env_require_vars \
  POSTGRES_PASSWORD JWT_SECRET ANON_KEY SERVICE_ROLE_KEY \
  SUPABASE_DOMAIN SITE_URL API_EXTERNAL_URL SUPABASE_PUBLIC_URL

echo "POSTGRES_PASSWORD: ${#POSTGRES_PASSWORD} caracteres (nao vazio)"

docker network inspect "$BACKEND_NETWORK" >/dev/null 2>&1 \
  || docker network create -d overlay --attachable "$BACKEND_NETWORK"

docker stack deploy -c "$SCRIPT_DIR/docker-compose-swarm-supabase.yml" "$STACK"

echo "Stack $STACK enviado. Acompanhe: docker stack services $STACK"
