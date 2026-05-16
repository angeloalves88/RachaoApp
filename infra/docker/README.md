# RachaoApp — Deploy VPS (Docker Swarm + Traefik)

Deploy completo na VPS com Portainer/Swarm, alinhado ao padrao Traefik do CoreBot (`PDRCOREBOT`, `letsencryptresolver`).

## Arquitetura

| URL | Servico | Stack |
|-----|---------|-------|
| `https://rachaoapp.dafetech.com.br` | Next.js (web) | `rachao-app` |
| `https://api.rachaoapp.dafetech.com.br` | Fastify (api) | `rachao-app` |
| `https://sb.rachaoapp.dafetech.com.br` | Kong (Supabase) | `rachao-supabase` |

Rede interna compartilhada: **`rachao-backend`** (Postgres, API, servicos Supabase).

## Pre-requisitos na VPS

1. Docker Swarm inicializado (`docker swarm init`).
2. Traefik ja rodando com rede overlay **`PDRCOREBOT`** (ou ajuste `TRAEFIK_NETWORK` no `.env`).
3. Repo clonado, ex.: `/opt/rachaoapp`.
4. DNS (registros A/AAAA para a VPS):
   - `rachaoapp.dafetech.com.br`
   - `api.rachaoapp.dafetech.com.br`
   - `sb.rachaoapp.dafetech.com.br`
5. RAM recomendada: **8 GB+** (stack Supabase + app).

## 1. Configurar ambiente

```bash
cd /opt/rachaoapp/infra/docker
cp .env.production.example .env
nano .env
```

**Formato do `.env`:** valores com espacos, `$`, `#` ou `<` devem ir entre aspas duplas, por exemplo `POSTGRES_PASSWORD="minha$enha#1"` e `STUDIO_DEFAULT_PROJECT="RachaoApp Producao"`. Os scripts carregam o arquivo de forma segura (sem `source`) antes do `docker stack deploy`.

**Obrigatorio alterar em producao:**

- `POSTGRES_PASSWORD`, `JWT_SECRET`
- `ANON_KEY` e `SERVICE_ROLE_KEY` (gerar com o [gerador Supabase](https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys) usando o mesmo `JWT_SECRET`)
- `DASHBOARD_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = mesmo valor de `ANON_KEY`
- SMTP real se `ENABLE_EMAIL_AUTOCONFIRM=false`

## 2. Build das imagens (OBRIGATORIO antes de cada deploy de codigo)

`docker stack deploy` e `docker service update` **NAO rebuildam** imagens.
Se voce so fez `git pull` + `stack-deploy-app.sh`, o Swarm continua com a imagem antiga.

```bash
chmod +x build-images.sh verify-api-image.sh redeploy-app.sh
./build-images.sh
./verify-api-image.sh
```

Ou tudo de uma vez:

```bash
./redeploy-app.sh
```

Imagens: `rachao-web:latest`, `rachao-api:latest`, `rachao-migrate:latest`.

> Se usar registry privado, ajuste `CR_IMAGE_*` no `.env` e faca push antes do stack deploy.

## 3. Deploy

### Automatico (recomendado na primeira vez)

```bash
./deploy.sh
```

### Manual (Portainer ou passo a passo)

```bash
# Rede interna
docker network create -d overlay --attachable rachao-backend

# Preferir scripts que carregam o .env (evita Postgres sem POSTGRES_PASSWORD):
chmod +x stack-deploy-supabase.sh stack-deploy-app.sh
./stack-deploy-supabase.sh

# Ou manual — OBRIGATORIO carregar .env no MESMO terminal antes do deploy:
source ./lib/env.sh
env_load_all .env
echo "senha tem ${#POSTGRES_PASSWORD} chars"   # deve ser > 0
docker stack deploy -c docker-compose-swarm-supabase.yml rachao-supabase

# Aguardar Postgres (~30–60s)
docker stack services rachao-supabase

# Schema Prisma
./run-migrate.sh

# App
source ./lib/env.sh && env_load_all .env && env_ensure_database_url
./stack-deploy-app.sh
```

## 4. Verificacao

```bash
docker stack services rachao-supabase
docker stack services rachao-app
curl -s https://api.rachaoapp.dafetech.com.br/health
curl -s https://api.rachaoapp.dafetech.com.br/health/db
```

No browser:

1. `https://rachaoapp.dafetech.com.br` — app carrega.
2. Cadastro/login — Supabase em `sb.*`.
3. Studio (opcional): `https://sb.rachaoapp.dafetech.com.br` — basic auth Kong (`DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`).

## Portainer

1. **Stacks** → Add stack → Web editor ou Git.
2. Cole `docker-compose-swarm-supabase.yml` / `docker-compose-swarm-app.yml`.
3. Env file: conteudo de `.env` (nao commitar).
4. Bind mounts do Kong exigem o repo em `/opt/rachaoapp` no **manager** do Swarm.

## Atualizar versao do app

```bash
cd /opt/rachaoapp
git pull
cd infra/docker
./build-images.sh
docker service update --image rachao-api:latest rachao-app_rachao-api
docker service update --image rachao-web:latest rachao-app_rachao-web
```

Se o schema mudou:

```bash
./run-migrate.sh
```

## Google OAuth (quando habilitar)

No Google Cloud Console, redirect URI:

`https://sb.rachaoapp.dafetech.com.br/auth/v1/callback`

No `.env`: `ENABLE_GOOGLE_PROVIDER=true`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## Webhooks externos

Configure no painel do provedor apontando para a **API**:

- Asaas: `https://api.rachaoapp.dafetech.com.br/api/webhooks/asaas`
- Resend: `https://api.rachaoapp.dafetech.com.br/api/webhooks/resend`

## Por que varios erros seguidos na API?

| Erro | Causa real |
|------|------------|
| `dist/server.js` not found | `tsc` no monorepo gera `dist/apps/api/src/`, nao `dist/server.js` |
| `Cannot find package fastify` | Imagem antiga sem `node_modules` pnpm completo |
| `Dynamic require node:events` | Bundle ESM + Fastify |
| `import.meta.url` undefined | `env.ts` + esbuild CJS; corrigido: sem dotenv em `production` |
| `git pull` sem efeito | Falta **`docker build`** — Swarm nao rebuilda imagem |
| verify OK mas Swarm com `server.mjs` | Mesma tag `:latest` — rode `env_swarm_refresh_image` (incluso no `stack-deploy-app.sh`) |

**Fluxo unico que funciona:** `git pull` → `docker build` → `./verify-api-image.sh` → `./stack-deploy-app.sh`

Ou: `./redeploy-app.sh` (faz os tres passos).

## Arquivos desta pasta

| Arquivo | Uso |
|---------|-----|
| `Dockerfile.web` | Next.js standalone |
| `Dockerfile.api` | Fastify + Prisma |
| `Dockerfile.migrate` | Job Prisma (migrate deploy / db push) |
| `docker-compose-swarm-supabase.yml` | Postgres, Auth, Kong, Storage… |
| `docker-compose-swarm-app.yml` | Web + API + labels Traefik |
| `.env.production.example` | Template de variaveis |
| `build-images.sh` | Build local das 3 imagens |
| `run-migrate.sh` | Aplica schema no Postgres |
| `deploy.sh` | Orquestra rede + stacks + migrate |

## Troubleshooting

| Problema | Acao |
|----------|------|
| API `health/db` falha | Postgres ainda subindo; conferir `docker service logs rachao-supabase_db` |
| Login "Failed to fetch" | `NEXT_PUBLIC_SUPABASE_URL` no build da imagem web; refazer `build-images.sh` |
| Prisma P1013 invalid port | Senha com `$` ou `#` na URL; rode `env_ensure_database_url` |
| Prisma P1001 Can't reach db | Postgres `0/1` ou host errado; use `DATABASE_HOST=rachao-supabase_db`; veja logs do `_db` |
| Postgres "password is not specified" | `docker stack deploy` sem `env_load_all .env`; use `./stack-deploy-supabase.sh` |
| `password authentication failed` (auth_admin) | Volume init com senha fixa antiga; roles devem usar `POSTGRES_PASSWORD` — rode `./reset-postgres-volume.sh` e `./stack-deploy-supabase.sh` |
| Servico 0/1 replicas | `docker service ps NOME_DO_SERVICO --no-trunc` e `docker service logs NOME --tail 50` |
| CORS na API | `CORS_ORIGIN` usa `WEB_DOMAIN`; redeploy app stack |
| Certificado SSL | Traefik + DNS corretos; labels `letsencryptresolver` |
| Kong 502 | `docker service logs rachao-supabase_kong`; volumes `infra/supabase/volumes/api/*` no manager |

## Dev local (inalterado)

```bash
pnpm supabase:up
pnpm dev
```

O compose em `infra/supabase/docker-compose.yml` continua sendo o ambiente de desenvolvimento na maquina local.
