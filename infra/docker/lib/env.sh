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
