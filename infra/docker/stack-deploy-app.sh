#!/usr/bin/env bash
# Deploy/atualiza SOMENTE o stack App (carrega .env automaticamente)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
STACK="${APP_STACK_NAME:-rachao-app}"
TRAEFIK_NETWORK="${TRAEFIK_NETWORK:-PDRCOREBOT}"
API_IMAGE="${CR_IMAGE_API:-rachao-api:latest}"
WEB_IMAGE="${CR_IMAGE_WEB:-rachao-web:latest}"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose-swarm-app.yml"
RESOLVED_FILE="${SCRIPT_DIR}/.stack-resolved.app.yml"

# shellcheck source=lib/env.sh
source "$SCRIPT_DIR/lib/env.sh"
env_load_all "$ENV_FILE"
env_ensure_database_url
TRAEFIK_NETWORK="${TRAEFIK_NETWORK:-PDRCOREBOT}"

env_require_vars \
  POSTGRES_PASSWORD JWT_SECRET ANON_KEY SERVICE_ROLE_KEY \
  WEB_DOMAIN API_DOMAIN SUPABASE_DOMAIN DATABASE_URL

docker network inspect "$TRAEFIK_NETWORK" >/dev/null 2>&1 \
  || { echo "ERRO: rede Traefik '${TRAEFIK_NETWORK}' nao existe." >&2; exit 1; }

sed "s/__TRAEFIK_NETWORK__/${TRAEFIK_NETWORK}/g" "$COMPOSE_FILE" > "$RESOLVED_FILE"
chmod 600 "$RESOLVED_FILE"

docker stack deploy -c "$RESOLVED_FILE" "$STACK"

# Obrigatorio apos rebuild local com mesma tag :latest
env_swarm_refresh_image "${STACK}_rachao-api" "$API_IMAGE"
env_swarm_refresh_image "${STACK}_rachao-web" "$WEB_IMAGE"

echo ""
echo "Stack $STACK atualizado. Confira:"
echo "  docker stack services $STACK"
echo "  docker service logs ${STACK}_rachao-api --tail 10"
echo "  (deve ser server.cjs — nao server.mjs)"
