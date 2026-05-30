#!/usr/bin/env bash
# Fluxo completo: build API + migrate -> validar imagem -> deploy Swarm
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck source=lib/env.sh
source "$SCRIPT_DIR/lib/env.sh"
env_load_all "$SCRIPT_DIR/.env"
env_ensure_database_url

GIT_REVISION="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || date +%s)"
export GIT_REVISION

echo "==> Build API (revision ${GIT_REVISION:-unknown})"
docker build -f "$SCRIPT_DIR/Dockerfile.api" \
  --build-arg "GIT_REVISION=${GIT_REVISION}" \
  ${DOCKER_BUILD_NO_CACHE:+--no-cache} \
  -t "${CR_IMAGE_API:-rachao-api:latest}" \
  "$REPO_ROOT"

echo "==> Build Migrate (schema Prisma)"
docker build -f "$SCRIPT_DIR/Dockerfile.migrate" -t "${CR_IMAGE_MIGRATE:-rachao-migrate:latest}" "$REPO_ROOT"

echo "==> Aplicar migrations no Postgres"
"$SCRIPT_DIR/run-migrate.sh"

echo "==> Validar imagem (boot + /health)"
"$SCRIPT_DIR/verify-api-image.sh"

echo "==> Deploy stack app"
"$SCRIPT_DIR/stack-deploy-app.sh"

sleep 12
docker stack services rachao-app
echo ""
curl -sf "https://${API_DOMAIN:-api.rachaoapp.dafetech.com.br}/health" && echo "" || echo "AVISO: curl externo falhou (Traefik?)"
curl -sf "https://${API_DOMAIN:-api.rachaoapp.dafetech.com.br}/health/db" && echo "" || true
