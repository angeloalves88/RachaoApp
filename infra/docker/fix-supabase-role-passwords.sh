#!/usr/bin/env bash
# Alinha senhas dos roles Supabase com POSTGRES_PASSWORD do .env (sem apagar volume).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
STACK="${SUPABASE_STACK_NAME:-rachao-supabase}"

# shellcheck source=lib/env.sh
source "$SCRIPT_DIR/lib/env.sh"
env_load_all "$ENV_FILE"
: "${POSTGRES_PASSWORD:?Defina POSTGRES_PASSWORD}"

DB_CID=$(docker ps -q -f "name=${STACK}_db" | head -1)
if [[ -z "$DB_CID" ]]; then
  echo "ERRO: container ${STACK}_db nao encontrado." >&2
  exit 1
fi

pw_sql="${POSTGRES_PASSWORD//\'/\'\'}"

echo "==> Atualizando roles no Postgres (stack ${STACK})..."
docker exec "$DB_CID" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "${POSTGRES_DB:-postgres}" <<EOSQL
ALTER ROLE authenticator PASSWORD '${pw_sql}';
ALTER ROLE supabase_auth_admin PASSWORD '${pw_sql}';
ALTER ROLE supabase_storage_admin PASSWORD '${pw_sql}';
ALTER ROLE supabase_admin PASSWORD '${pw_sql}';
EOSQL

echo "OK. Redeploy: ./stack-deploy-supabase.sh"
