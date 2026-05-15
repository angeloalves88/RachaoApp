#!/usr/bin/env bash
# Deploy completo no Swarm (supabase + migrate + app)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
SUPABASE_STACK="${SUPABASE_STACK_NAME:-rachao-supabase}"
APP_STACK="${APP_STACK_NAME:-rachao-app}"
BACKEND_NETWORK="${RACHAO_BACKEND_NETWORK:-rachao-backend}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Crie infra/docker/.env a partir de .env.production.example"
  exit 1
fi

# shellcheck source=lib/env.sh
source "$SCRIPT_DIR/lib/env.sh"

# docker stack deploy (versoes antigas) nao aceita --env-file; variaveis no shell.
env_load_all "$ENV_FILE"
env_ensure_database_url

echo "==> Rede overlay $BACKEND_NETWORK (se nao existir)"
docker network inspect "$BACKEND_NETWORK" >/dev/null 2>&1 \
  || docker network create -d overlay --attachable "$BACKEND_NETWORK"

echo "==> Stack Supabase: $SUPABASE_STACK"
docker stack deploy -c "$SCRIPT_DIR/docker-compose-swarm-supabase.yml" "$SUPABASE_STACK"

echo "Aguardando Postgres (30s)..."
sleep 30

echo "==> Migrate"
"$SCRIPT_DIR/run-migrate.sh"

echo "==> Stack App: $APP_STACK"
docker stack deploy -c "$SCRIPT_DIR/docker-compose-swarm-app.yml" "$APP_STACK"

echo "Deploy enviado. Verifique:"
echo "  docker stack services $SUPABASE_STACK"
echo "  docker stack services $APP_STACK"
echo "  https://${WEB_DOMAIN:-rachaoapp.dafetech.com.br}"
