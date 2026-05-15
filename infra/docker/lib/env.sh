#!/usr/bin/env bash
# Le variaveis do .env sem `source` (evita quebra com espacos, $, <, etc.)
# Uso: env_load_file "/path/to/.env" VAR1 VAR2 ...

env_load_file() {
  local file="$1"
  shift
  [[ -f "$file" ]] || return 0

  local key line value
  for key in "$@"; do
    line=$(grep -E "^${key}=" "$file" | tail -1 || true)
    [[ -n "$line" ]] || continue
    value="${line#*=}"
    # remove aspas simples ou duplas ao redor
    if [[ "$value" =~ ^\".*\"$ ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" =~ ^\'.*\'$ ]]; then
      value="${value:1:${#value}-2}"
    fi
    printf -v "$key" '%s' "$value"
    export "$key"
  done
}

# Exporta todas as variaveis do .env (para docker stack deploy, que nao tem --env-file
# em versoes antigas do Docker). Nao usa `source` — seguro com espacos, $ e <.
env_load_all() {
  local file="$1"
  [[ -f "$file" ]] || return 0

  local line key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line//[[:space:]]/}" ]] && continue
    [[ "$line" != *"="* ]] && continue

    key="${line%%=*}"
    key="${key//[[:space:]]/}"
    value="${line#*=}"
    value="${value#"${value%%[![:space:]]*}"}"

    if [[ "$value" =~ ^\".*\"$ ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" =~ ^\'.*\'$ ]]; then
      value="${value:1:${#value}-2}"
    fi

    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    export "$key=$value"
  done < "$file"
}

# Percent-encode para usuario/senha em connection string PostgreSQL
env_urlencode() {
  local s="$1" i c hex out=""
  for ((i = 0; i < ${#s}; i++)); do
    c="${s:i:1}"
    case "$c" in
      [a-zA-Z0-9.~_-]) out+="$c" ;;
      *) printf -v hex '%%%02X' "'$c"; out+="$hex" ;;
    esac
  done
  printf '%s' "$out"
}

# Monta DATABASE_URL com senha escapada (evita P1013 com $ # @ etc.)
# Se DATABASE_URL ja existir no .env, mantem.
env_ensure_database_url() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    export DATABASE_URL
    return 0
  fi

  : "${POSTGRES_PASSWORD:?Defina POSTGRES_PASSWORD em infra/docker/.env}"

  local user="${DATABASE_USER:-supabase_admin}"
  local host="${DATABASE_HOST:-db}"
  local port="${DATABASE_PORT:-5432}"
  local db="${POSTGRES_DB:-postgres}"
  local enc_pass
  enc_pass=$(env_urlencode "$POSTGRES_PASSWORD")
  export DATABASE_URL="postgresql://${user}:${enc_pass}@${host}:${port}/${db}?schema=public"
}
