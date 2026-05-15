#!/usr/bin/env bash
# Deploy/atualiza SOMENTE o stack Supabase (carrega .env automaticamente)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
STACK="${SUPABASE_STACK_NAME:-rachao-supabase}"
BACKEND_NETWORK="${RACHAO_BACKEND_NETWORK:-rachao-backend}"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose-swarm-supabase.yml"
RESOLVED_FILE="${SCRIPT_DIR}/.stack-resolved.supabase.yml"

# shellcheck source=lib/env.sh
source "$SCRIPT_DIR/lib/env.sh"
env_load_all "$ENV_FILE"

env_require_vars \
  POSTGRES_PASSWORD JWT_SECRET ANON_KEY SERVICE_ROLE_KEY \
  SUPABASE_DOMAIN SITE_URL API_EXTERNAL_URL SUPABASE_PUBLIC_URL

echo "POSTGRES_PASSWORD: ${#POSTGRES_PASSWORD} caracteres"

docker network inspect "$BACKEND_NETWORK" >/dev/null 2>&1 \
  || docker network create -d overlay --attachable "$BACKEND_NETWORK"

# Gera YAML com variaveis ja substituidas (Swarm antigo as vezes ignora ${VAR} do shell)
COMPOSE_DEPLOY="$COMPOSE_FILE"
if docker compose version >/dev/null 2>&1; then
  echo "==> Resolvendo compose (docker compose config)..."
  if docker compose -f "$COMPOSE_FILE" config > "$RESOLVED_FILE" 2>/dev/null; then
    COMPOSE_DEPLOY="$RESOLVED_FILE"
    if grep -q 'POSTGRES_PASSWORD: ""' "$RESOLVED_FILE" 2>/dev/null; then
      echo "ERRO: POSTGRES_PASSWORD vazio no compose resolvido." >&2
      exit 1
    fi
  else
    echo "AVISO: docker compose config falhou; usando YAML + variaveis do shell."
    rm -f "$RESOLVED_FILE"
  fi
else
  echo "AVISO: docker compose nao encontrado; usando YAML com interpolacao do shell."
fi

docker stack deploy -c "$COMPOSE_DEPLOY" "$STACK"

echo "Stack $STACK enviado. Acompanhe: docker stack services $STACK"
echo "Se o banco foi criado antes com senha errada: ./reset-postgres-volume.sh"
