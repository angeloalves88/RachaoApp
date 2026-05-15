#!/usr/bin/env bash
# Deploy/atualiza SOMENTE o stack Supabase (carrega .env automaticamente)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
STACK="${SUPABASE_STACK_NAME:-rachao-supabase}"
BACKEND_NETWORK="${RACHAO_BACKEND_NETWORK:-rachao-backend}"
TRAEFIK_NETWORK="${TRAEFIK_NETWORK:-PDRCOREBOT}"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose-swarm-supabase.yml"
RESOLVED_FILE="${SCRIPT_DIR}/.stack-resolved.supabase.yml"

# shellcheck source=lib/env.sh
source "$SCRIPT_DIR/lib/env.sh"
env_load_all "$ENV_FILE"
TRAEFIK_NETWORK="${TRAEFIK_NETWORK:-PDRCOREBOT}"

env_require_vars \
  POSTGRES_PASSWORD JWT_SECRET ANON_KEY SERVICE_ROLE_KEY \
  SUPABASE_DOMAIN SITE_URL API_EXTERNAL_URL SUPABASE_PUBLIC_URL

echo "POSTGRES_PASSWORD: ${#POSTGRES_PASSWORD} caracteres"
echo "TRAEFIK_NETWORK: ${TRAEFIK_NETWORK}"

docker network inspect "$BACKEND_NETWORK" >/dev/null 2>&1 \
  || docker network create -d overlay --attachable "$BACKEND_NETWORK"

docker network inspect "$TRAEFIK_NETWORK" >/dev/null 2>&1 \
  || { echo "ERRO: rede Traefik '${TRAEFIK_NETWORK}' nao existe." >&2; exit 1; }

# Swarm: docker compose config nao valida deploy/labels; sed substitui rede Traefik
sed "s/__TRAEFIK_NETWORK__/${TRAEFIK_NETWORK}/g" "$COMPOSE_FILE" > "$RESOLVED_FILE"
chmod 600 "$RESOLVED_FILE"

docker stack deploy -c "$RESOLVED_FILE" "$STACK"

echo "Stack $STACK enviado. Acompanhe: docker stack services $STACK"
echo "Se o banco foi criado antes com senha errada: ./reset-postgres-volume.sh"
