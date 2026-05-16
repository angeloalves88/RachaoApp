#!/usr/bin/env bash
# Diagnostico da imagem rachao-api antes do deploy no Swarm
set -euo pipefail

IMAGE="${CR_IMAGE_API:-rachao-api:latest}"

echo "=== Imagem: $IMAGE ==="
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "ERRO: imagem nao existe. Rode: ./build-images.sh"
  exit 1
fi

echo "--- Criada em ---"
docker image inspect "$IMAGE" --format '{{.Created}}'

echo "--- CMD / Entrypoint ---"
docker image inspect "$IMAGE" --format 'CMD: {{json .Config.Cmd}}'

echo "--- Teste: server.mjs existe? ---"
docker run --rm --entrypoint sh "$IMAGE" -c 'ls -la /app/server.mjs && head -c 80 /app/server.mjs | wc -c'

echo "--- Teste: @prisma/client existe? ---"
docker run --rm --entrypoint sh "$IMAGE" -c 'ls /app/node_modules/@prisma/client/package.json'

echo "--- Teste: node carrega server (5s, pode falhar sem env) ---"
docker run --rm --entrypoint sh "$IMAGE" -c 'timeout 3 node /app/server.mjs 2>&1 | head -5 || true'

echo "=== OK: imagem parece valida. Proximo: ./stack-deploy-app.sh ==="
