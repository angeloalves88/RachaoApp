#!/bin/bash
# Sincroniza senhas dos roles Supabase com POSTGRES_PASSWORD do container.
# Executado uma vez na primeira inicializacao do volume (docker-entrypoint-initdb.d).
set -euo pipefail

if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
  echo "01-sync-role-passwords.sh: POSTGRES_PASSWORD vazio — abortando init." >&2
  exit 1
fi

# Escape de aspas simples para SQL
pw="${POSTGRES_PASSWORD//\'/\'\'}"

psql -v ON_ERROR_STOP=1 --username supabase_admin --dbname "${POSTGRES_DB:-postgres}" <<EOSQL
ALTER ROLE authenticator PASSWORD '${pw}';
ALTER ROLE supabase_auth_admin PASSWORD '${pw}';
ALTER ROLE supabase_storage_admin PASSWORD '${pw}';
ALTER ROLE supabase_admin PASSWORD '${pw}';
EOSQL

echo "01-sync-role-passwords.sh: roles Supabase alinhados com POSTGRES_PASSWORD."
