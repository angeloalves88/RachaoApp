# Supabase Self-Hosted - RachaoApp

Stack Supabase rodando localmente via Docker Compose. Inclui:

- **db** - Postgres 15 com extensoes Supabase
- **auth** - GoTrue (autenticacao email/senha + Google OAuth)
- **rest** - PostgREST (REST API automatica do schema)
- **realtime** - Subscriptions WebSocket
- **storage** - Upload de imagens
- **imgproxy** - Transformacao de imagens (resize, etc)
- **meta** - Postgres-meta (introspeccao usada pelo Studio)
- **studio** - Dashboard admin
- **kong** - API Gateway

---

## Pre-requisitos

- Docker Desktop rodando
- Portas livres: `8000` (Kong/Studio), `15432` (Postgres no host — ajustável via `POSTGRES_HOST_PORT` em `.env`)

---

## Subir o stack

A partir da raiz do monorepo:

```powershell
# 1. Copie o env de exemplo
Copy-Item infra\supabase\.env.example infra\supabase\.env

# 2. Suba os containers (usa o script raiz)
pnpm supabase:up

# 3. Acompanhe os logs ate ver "ready"
pnpm supabase:logs
```

Apos ~30s o stack estara disponivel:

| Servico | URL | Notas |
|---------|-----|-------|
| Studio Dashboard | http://localhost:8000 | Login: `supabase` / `rachao` |
| API Gateway (Kong) | http://localhost:8000 | Roteia /auth, /rest, /realtime, /storage |
| Postgres direto | `127.0.0.1:15432` | User **`supabase_admin`**, senha = `POSTGRES_PASSWORD` no `.env` |

---

## Variaveis de ambiente para o app

As chaves abaixo (do `.env.example`) ja estao validas para dev. Cole no
`apps/web/.env.local` e `apps/api/.env`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxNzk5NTM1NjAwfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
DATABASE_URL=postgresql://supabase_admin:rachao-dev-password-change-me@127.0.0.1:15432/postgres?schema=public
```

---

## Comandos uteis

```powershell
pnpm supabase:up        # Sobe tudo em background
pnpm supabase:down      # Para tudo (mantem dados)
pnpm supabase:reset     # Para tudo e apaga volumes (CUIDADO: limpa o banco)
pnpm supabase:logs      # Acompanha logs em tempo real
```

Para acessar o Postgres direto:

```powershell
docker exec -it rachao-supabase-db psql -U supabase_admin -d postgres
```

---

## Storage (fotos do estadio / avatar)

Se o upload retornar `new row violates row-level security policy`, aplique as politicas **depois** das migrations Prisma (tabelas `Estadio` e `Usuario` no schema `public`):

```powershell
Get-Content infra\supabase\scripts\storage-rls.sql -Raw | docker exec -i rachao-supabase-db psql -U supabase_admin -d postgres
```

Ou copie o SQL de [`infra/supabase/scripts/storage-rls.sql`](scripts/storage-rls.sql) no SQL Editor do Studio. Stacks criadas antes deste arquivo precisam rodar o script uma vez (nao executa automaticamente no `docker compose up`).

---

## Windows: erro ao bind da porta do Postgres

Se aparecer *"bind ... permissões de acesso"* ao subir o `db`:

1. O Windows (Hyper-V / WSL) costuma **reservar intervalos de portas**. Rode no PowerShell:
   ```powershell
   netsh interface ipv4 show excludedportrange protocol=tcp
   ```
   Evite portas dentro desses intervalos. Por exemplo, aqui costuma haver bloqueio em torno de **54290–54389** (inclui a porta clássica `54322` do Supabase local).
2. **Defina outra porta** em `infra/supabase/.env`: `POSTGRES_HOST_PORT=15432` (padrão do projeto) ou outro valor fora dos intervalos listados.
3. **Alinhe o app** — em `apps/api/.env` e `packages/db/.env`, use `DATABASE_URL` com user **`supabase_admin`** e a mesma porta (`127.0.0.1:15432`).
4. Reinicie: `pnpm supabase:down` e `pnpm supabase:up`.

---

## Configurar Google OAuth (Fase 1)

1. Crie um OAuth Client em https://console.cloud.google.com/apis/credentials
2. Authorized redirect URI: `http://localhost:8000/auth/v1/callback`
3. Edite `infra/supabase/.env`:
   ```
   ENABLE_GOOGLE_PROVIDER=true
   GOOGLE_CLIENT_ID=<seu-client-id>
   GOOGLE_CLIENT_SECRET=<seu-secret>
   ```
4. Reinicie: `pnpm supabase:down; pnpm supabase:up`

---

## Producao

Antes de publicar:

1. Gere novas chaves (JWT_SECRET com 32+ chars aleatorios; ANON_KEY e SERVICE_ROLE_KEY assinados):
   - https://supabase.com/docs/guides/self-hosting/docker#generating-api-keys
2. Troque `POSTGRES_PASSWORD` e `DASHBOARD_PASSWORD`
3. Configure SMTP real (Resend, SendGrid)
4. Habilite TLS no Kong ou rode atras de um proxy reverso (Caddy, Nginx)
