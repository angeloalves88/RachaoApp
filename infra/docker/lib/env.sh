#!/usr/bin/env bash
# Le variaveis do .env sem `source` (evita quebra com espacos, $, <, etc.)
# Uso: env_load_file "/path/to/.env" VAR1 VAR2 ...

# Remove comentario inline (ex.: true # false) — fora de aspas.
env_strip_inline_comment() {
  local v="$1"
  if [[ "$v" =~ ^\".*\"$ || "$v" =~ ^\'.*\'$ ]]; then
    printf '%s' "$v"
    return
  fi
  v="${v%%[[:space:]]#*}"
  v="${v%"${v##*[![:space:]]}"}"
  printf '%s' "$v"
}

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
    value=$(env_strip_inline_comment "$value")
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
    value=$(env_strip_inline_comment "$value")

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

# URLs Postgres dos servicos Supabase (auth/rest/storage) com senha URL-encoded.
# Evita GoTrue crash quando POSTGRES_PASSWORD contem @ # $ etc.
env_ensure_supabase_service_db_urls() {
  : "${POSTGRES_PASSWORD:?Defina POSTGRES_PASSWORD em infra/docker/.env}"
  local enc_pass db host
  enc_pass=$(env_urlencode "$POSTGRES_PASSWORD")
  db="${POSTGRES_DB:-postgres}"
  host="${SUPABASE_DB_HOST:-db}"
  export GOTRUE_DB_DATABASE_URL="postgres://supabase_auth_admin:${enc_pass}@${host}:5432/${db}"
  export PGRST_DB_URI="postgres://authenticator:${enc_pass}@${host}:5432/${db}"
  export SUPABASE_STORAGE_DATABASE_URL="postgres://supabase_storage_admin:${enc_pass}@${host}:5432/${db}"
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
env_swarm_wait_service_idle() {
  local service_name="$1"
  local max_wait="${2:-180}"
  local i state has_busy

  for ((i = 0; i < max_wait; i += 2)); do
    state=$(docker service inspect "$service_name" --format '{{if .UpdateStatus}}{{.UpdateStatus.State}}{{else}}completed{{end}}' 2>/dev/null || echo "unknown")
    has_busy=$(docker service ps "$service_name" --no-trunc --format '{{.CurrentState}}' 2>/dev/null \
      | grep -cE 'Preparing|Starting|Updating|Pending|Assigned' || true)

    if [[ "$state" == "completed" || "$state" == "unknown" || -z "$state" ]] && [[ "$has_busy" -eq 0 ]]; then
      return 0
    fi

    if (( i == 0 )); then
      echo "    aguardando ${service_name} (state=${state:-idle}, tasks=${has_busy})..."
    fi
    sleep 2
  done

  echo "AVISO: timeout aguardando ${service_name} estabilizar (${max_wait}s)" >&2
  return 0
}

env_swarm_refresh_image() {
  local service_name="$1"
  local image_name="$2"
  local base="${image_name%:*}"
  local unique_tag="${base}:deploy-$(date +%Y%m%d-%H%M%S)"
  local attempt out max_attempts=6

  if ! docker image inspect "$image_name" >/dev/null 2>&1; then
    echo "ERRO: imagem local '${image_name}' nao existe. Rode o build antes." >&2
    return 1
  fi

  docker tag "$image_name" "$unique_tag"
  echo "==> Swarm: ${service_name} <- ${unique_tag} (de ${image_name})"

  for ((attempt = 1; attempt <= max_attempts; attempt++)); do
    env_swarm_wait_service_idle "$service_name"

    if out=$(docker service update \
      --image "$unique_tag" \
      --force \
      --detach=false \
      --update-order stop-first \
      "$service_name" 2>&1); then
      [[ -n "$out" ]] && echo "$out"
      return 0
    fi

    if [[ "$out" == *"update out of sequence"* || "$out" == *"update paused"* ]]; then
      echo "    ${service_name}: conflito de update (tentativa ${attempt}/${max_attempts}), aguardando..."
      sleep $((attempt * 4))
      continue
    fi

    echo "$out" >&2
    return 1
  done

  echo "ERRO: ${service_name} nao convergiu apos ${max_attempts} tentativas." >&2
  return 1
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
