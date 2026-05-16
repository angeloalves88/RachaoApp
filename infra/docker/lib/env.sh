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

  local stack="${SUPABASE_STACK_NAME:-rachao-supabase}"
  local user="${DATABASE_USER:-supabase_admin}"
  # No Swarm o DNS e <stack>_db; alias "db" nem sempre resolve em docker run
  local host="${DATABASE_HOST:-${stack}_db}"
  local port="${DATABASE_PORT:-5432}"
  local db="${POSTGRES_DB:-postgres}"
  local enc_pass
  enc_pass=$(env_urlencode "$POSTGRES_PASSWORD")
  export DATABASE_URL="postgresql://${user}:${enc_pass}@${host}:${port}/${db}?schema=public"
}

# Aguarda Postgres na rede overlay (migrate / troubleshooting)
env_wait_for_postgres() {
  local network="${1:-${RACHAO_BACKEND_NETWORK:-rachao-backend}}"
  local stack="${SUPABASE_STACK_NAME:-rachao-supabase}"
  local hosts=()
  [[ -n "${DATABASE_HOST:-}" ]] && hosts+=("$DATABASE_HOST")
  hosts+=("${stack}_db" "db" "rachao-postgres")

  echo "==> Aguardando Postgres na rede ${network}..."
  local i host h
  for i in $(seq 1 90); do
    for h in "${hosts[@]}"; do
      [[ -z "$h" ]] && continue
      if docker run --rm --network "$network" busybox:1.36.1 sh -c "nc -z -w 2 $h 5432" 2>/dev/null; then
        echo "    Postgres OK em: $h"
        if [[ "${DATABASE_HOST:-}" != "$h" ]]; then
          export DATABASE_HOST="$h"
          unset DATABASE_URL
          env_ensure_database_url
        fi
        return 0
      fi
    done
    sleep 2
  done

  echo "ERRO: Postgres nao responde na rede ${network}."
  echo "  docker stack services ${stack}"
  echo "  docker service ps ${stack}_db --no-trunc"
  echo "  docker service logs ${stack}_db --tail 80"
  return 1
}

# Swarm em VPS sem registry: tag :latest nao atualiza tasks apos docker build.
# Solucao: criar tag unica local (deploy-YYYYMMDD-HHMMSS) e apontar o servico para ela.
# NAO usar imagem@sha256:id — o Swarm tenta registry e falha com "No such image".
env_swarm_refresh_image() {
  local service_name="$1"
  local image_name="$2"
  local base="${image_name%:*}"
  local unique_tag="${base}:deploy-$(date +%Y%m%d-%H%M%S)"

  if ! docker image inspect "$image_name" >/dev/null 2>&1; then
    echo "ERRO: imagem local '${image_name}' nao existe. Rode o build antes." >&2
    return 1
  fi

  docker tag "$image_name" "$unique_tag"
  echo "==> Swarm: ${service_name} <- ${unique_tag} (de ${image_name})"
  docker service update \
    --image "$unique_tag" \
    --force \
    --detach=false \
    --update-order stop-first \
    "$service_name"
}

# Falha se alguma variavel obrigatoria estiver vazia (evita stack deploy sem POSTGRES_PASSWORD)
env_require_vars() {
  local v missing=()
  for v in "$@"; do
    if [[ -z "${!v:-}" ]]; then
      missing+=("$v")
    fi
  done
  if ((${#missing[@]} > 0)); then
    echo "ERRO: variavel(is) vazia(s). Antes do stack deploy rode:"
    echo "  source ./lib/env.sh && env_load_all .env"
    printf '  - %s\n' "${missing[@]}"
    exit 1
  fi
}
