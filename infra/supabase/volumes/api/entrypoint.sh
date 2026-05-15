#!/usr/bin/env bash
# Entrypoint do Kong: copia o template `temp.yml` para `kong.yml` substituindo
# os placeholders pelas variaveis de ambiente. Usa `sed` em vez de `eval echo`
# para evitar problemas com `:`, `*` e aspas duplas dentro do YAML.
set -e

cp /home/kong/temp.yml /home/kong/kong.yml

sed -i "s|\$SUPABASE_ANON_KEY|${SUPABASE_ANON_KEY}|g" /home/kong/kong.yml
sed -i "s|\$SUPABASE_SERVICE_KEY|${SUPABASE_SERVICE_KEY}|g" /home/kong/kong.yml
sed -i "s|\$DASHBOARD_USERNAME|${DASHBOARD_USERNAME}|g" /home/kong/kong.yml
sed -i "s|\$DASHBOARD_PASSWORD|${DASHBOARD_PASSWORD}|g" /home/kong/kong.yml

exec /docker-entrypoint.sh kong docker-start