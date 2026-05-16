#!/usr/bin/env bash
# Build API + verificacao + deploy app (fluxo completo)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> 1/3 Build imagens (API + Web se necessario)"
"$SCRIPT_DIR/build-images.sh"

echo "==> 2/3 Verificar imagem API"
"$SCRIPT_DIR/verify-api-image.sh"

echo "==> 3/3 Deploy stack app"
"$SCRIPT_DIR/stack-deploy-app.sh"

echo "==> Aguardando API (15s)..."
sleep 15
docker stack services rachao-app
echo ""
docker service logs rachao-app_rachao-api --tail 25 2>&1 || true
