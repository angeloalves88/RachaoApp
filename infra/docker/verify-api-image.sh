#!/usr/bin/env bash
# Diagnostico da imagem rachao-api — falha se algo estiver errado
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
IMAGE="${CR_IMAGE_API:-rachao-api:latest}"

# shellcheck source=lib/env.sh
source "$SCRIPT_DIR/lib/env.sh"
env_load_all "$ENV_FILE"
env_ensure_database_url

echo "=== Imagem: $IMAGE ==="
docker image inspect "$IMAGE" >/dev/null 2>&1 || {
  echo "ERRO: imagem nao existe. Rode: docker build -f Dockerfile.api -t $IMAGE ../.."
  exit 1
}

echo "--- Criada: $(docker image inspect "$IMAGE" --format '{{.Created}}') ---"
echo "--- CMD: $(docker image inspect "$IMAGE" --format '{{json .Config.Cmd}}') ---"

echo "--- Arquivos na imagem ---"
docker run --rm --entrypoint sh "$IMAGE" -c '
  test -s /app/server.cjs || { echo "FALTA server.cjs"; exit 1; }
  test -f /app/node_modules/@prisma/client/package.json || { echo "FALTA @prisma/client"; exit 1; }
  ls -la /app/server.cjs
'

echo "--- Boot real (env de producao do .env) ---"
# shellcheck disable=SC2090
docker run --rm \
  -e NODE_ENV=production \
  -e "PORT=3333" \
  -e "HOST=0.0.0.0" \
  -e "CORS_ORIGIN=https://${WEB_DOMAIN}" \
  -e "WEB_URL=https://${WEB_DOMAIN}" \
  -e "DATABASE_URL=${DATABASE_URL}" \
  -e "SUPABASE_URL=https://${SUPABASE_DOMAIN}" \
  -e "SUPABASE_JWT_SECRET=${JWT_SECRET}" \
  -e "SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}" \
  --entrypoint sh "$IMAGE" -c '
    timeout 8 node /app/server.cjs 2>&1 &
    sleep 4
    wget -qO- http://127.0.0.1:3333/health || { echo "FALHA: /health"; exit 1; }
    echo ""
    echo "OK: API respondeu /health dentro do container"
  '

echo "=== Imagem validada. Pode rodar: ./stack-deploy-app.sh ==="
