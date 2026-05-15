#!/usr/bin/env bash
# Deploy/atualiza SOMENTE o stack App (carrega .env automaticamente)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
STACK="${APP_STACK_NAME:-rachao-app}"

# shellcheck source=lib/env.sh
source "$SCRIPT_DIR/lib/env.sh"
env_load_all "$ENV_FILE"
env_ensure_database_url

env_require_vars \
  POSTGRES_PASSWORD JWT_SECRET ANON_KEY SERVICE_ROLE_KEY \
  WEB_DOMAIN API_DOMAIN SUPABASE_DOMAIN DATABASE_URL

docker stack deploy -c "$SCRIPT_DIR/docker-compose-swarm-app.yml" "$STACK"

echo "Stack $STACK enviado. Acompanhe: docker stack services $STACK"
