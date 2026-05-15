#!/usr/bin/env bash
# Build das imagens RachaoApp (executar na raiz do repo ou em infra/docker)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

WEB_IMAGE="${CR_IMAGE_WEB:-rachao-web:latest}"
API_IMAGE="${CR_IMAGE_API:-rachao-api:latest}"
MIGRATE_IMAGE="${CR_IMAGE_MIGRATE:-rachao-migrate:latest}"

: "${NEXT_PUBLIC_SUPABASE_URL:?Defina NEXT_PUBLIC_SUPABASE_URL em infra/docker/.env}"
: "${NEXT_PUBLIC_SUPABASE_ANON_KEY:?Defina NEXT_PUBLIC_SUPABASE_ANON_KEY}"
: "${NEXT_PUBLIC_API_URL:?Defina NEXT_PUBLIC_API_URL}"
: "${NEXT_PUBLIC_APP_URL:?Defina NEXT_PUBLIC_APP_URL}"

echo "==> Build API: $API_IMAGE"
docker build -f "$SCRIPT_DIR/Dockerfile.api" -t "$API_IMAGE" "$REPO_ROOT"

echo "==> Build Web: $WEB_IMAGE"
docker build -f "$SCRIPT_DIR/Dockerfile.web" -t "$WEB_IMAGE" "$REPO_ROOT" \
  --build-arg "NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}" \
  --build-arg "NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  --build-arg "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}" \
  --build-arg "NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}" \
  --build-arg "NEXT_PUBLIC_SUPORTE_EMAIL=${NEXT_PUBLIC_SUPORTE_EMAIL:-suporte@rachao.app}" \
  --build-arg "NEXT_PUBLIC_SUPORTE_WHATSAPP=${NEXT_PUBLIC_SUPORTE_WHATSAPP:-}" \
  --build-arg "NEXT_PUBLIC_PWA_ENABLED=${NEXT_PUBLIC_PWA_ENABLED:-false}"

echo "==> Build Migrate: $MIGRATE_IMAGE"
docker build -f "$SCRIPT_DIR/Dockerfile.migrate" -t "$MIGRATE_IMAGE" "$REPO_ROOT"

echo "OK: $WEB_IMAGE | $API_IMAGE | $MIGRATE_IMAGE"
