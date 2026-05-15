#!/usr/bin/env bash
# Remove stack Supabase e volume do Postgres para reinicializar com senha correta.
# ATENCAO: apaga todos os dados do banco RachaoApp/Supabase.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK="${SUPABASE_STACK_NAME:-rachao-supabase}"
VOLUME="${POSTGRES_VOLUME_NAME:-${STACK}_rachao_postgres_data}"

echo "!!! Isso apagara o volume ${VOLUME} e todos os dados do Postgres !!!"
read -r -p "Digite APAGAR para continuar: " confirm
[[ "$confirm" == "APAGAR" ]] || { echo "Cancelado."; exit 1; }

echo "==> Removendo stack ${STACK}..."
docker stack rm "$STACK" 2>/dev/null || true

echo "Aguardando servicos pararem..."
for _ in $(seq 1 60); do
  if ! docker stack services "$STACK" &>/dev/null; then
    break
  fi
  sleep 2
done
sleep 5

echo "==> Removendo volume ${VOLUME}..."
docker volume rm "$VOLUME" 2>/dev/null || docker volume rm rachao_postgres_data 2>/dev/null || true

echo "Volume removido. Suba de novo com: ./stack-deploy-supabase.sh"
