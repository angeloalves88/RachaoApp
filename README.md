# RachãoApp

> Plataforma SaaS para gestão de peladas de futebol amador no Brasil — **mobile-first, dark mode**.

**Status:** Fase 0 (Setup) ✅ · Fase 1 (Auth/Onboarding) 🔜

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | Next.js 15 (App Router) · TypeScript · Tailwind v3 · shadcn/ui |
| **Backend** | Fastify 5 (separado do front, em Node 22) |
| **Banco** | PostgreSQL 15 via Supabase self-hosted (Docker) |
| **ORM** | Prisma 5 |
| **Auth** | Supabase Auth (GoTrue) - email/senha + Google OAuth |
| **Storage** | Supabase Storage (self-hosted) |
| **Email** | Resend (a configurar na Fase 1) |
| **Estado** | Zustand · React Hook Form + Zod |
| **Pacote** | pnpm 9 (workspaces) |

---

## Estrutura do monorepo

```
RachaoApp/
├── apps/
│   ├── web/                 # Next.js 15 (UI + telas publicas)
│   └── api/                 # Fastify (REST API com Prisma)
├── packages/
│   ├── db/                  # Prisma schema + cliente compartilhado
│   └── shared/              # Schemas Zod, enums e tipos
├── infra/
│   └── supabase/            # docker-compose self-hosted (db, auth, storage, kong, studio)
└── Prompt/                  # PRD, identidade visual e specs (entrada do projeto)
```

---

## Setup inicial (uma vez)

### 1. Pre-requisitos

- **Node** ≥ 20 (testado com 22.22.0)
- **pnpm** ≥ 9 (`npm install -g pnpm@9.15.0`)
- **Docker Desktop** rodando
- Portas livres: `3000` (web), `3333` (api), `8000` (kong/studio), `15432` (postgres no host — configurável; no Windows evite 54290–54389)

### 2. Instalar dependencias

```powershell
pnpm install
```

### 3. Subir o stack Supabase

```powershell
# Criar arquivo de env do Supabase
Copy-Item infra\supabase\.env.example infra\supabase\.env

# Subir os containers
pnpm supabase:up

# Acompanhar inicializacao (espere ~30s ate estar tudo OK)
pnpm supabase:logs
```

Apos subir:
- **Studio Dashboard:** http://localhost:8000 — login `supabase` / `rachao`
- **API Gateway (Kong):** http://localhost:8000
- **Postgres direto:** `127.0.0.1:15432` (user **`supabase_admin`**, senha `POSTGRES_PASSWORD` do `infra/supabase/.env` — a imagem não cria o role `postgres`)

### 4. Configurar env do app

```powershell
Copy-Item apps\web\.env.example apps\web\.env.local
Copy-Item apps\api\.env.example apps\api\.env
Copy-Item packages\db\.env.example packages\db\.env
```

### 5. Aplicar schema no banco

```powershell
pnpm db:generate    # gera o client do Prisma
pnpm db:push        # cria as tabelas no Postgres (modo dev, sem migrations)
```

> Quando estabilizar o schema, rode `pnpm db:migrate` para criar migrations versionadas.

---

## Desenvolvimento dia a dia

```powershell
# Roda web (Next.js) e api (Fastify) em paralelo
pnpm dev

# Ou um de cada vez
pnpm dev:web        # http://localhost:3000  (ajustavel via WEB_PORT no apps/web/.env.local)
pnpm dev:api        # http://localhost:3333
```

> A porta do Next eh lida de `WEB_PORT` (em `apps/web/.env.local`), com fallback para 3000.
> Se a 3000 estiver ocupada, defina `WEB_PORT=3001` (ou outra) e ajuste `NEXT_PUBLIC_APP_URL`
> e `CORS_ORIGIN` (em `apps/api/.env`) para o mesmo valor.

Acessos uteis:
- **App:** http://localhost:3000 (ou `WEB_PORT`)
- **API health:** http://localhost:3333/health
- **API health DB:** http://localhost:3333/health/db
- **Prisma Studio:** `pnpm db:studio` → http://localhost:5555
- **Supabase Studio:** http://localhost:8000

---

## Comandos uteis

| Comando | Descricao |
|---------|-----------|
| `pnpm dev` | web + api em paralelo |
| `pnpm build` | build de todos os pacotes |
| `pnpm typecheck` | TypeScript strict em tudo |
| `pnpm lint` | ESLint em tudo |
| `pnpm db:generate` | gera Prisma Client |
| `pnpm db:push` | sincroniza schema com o banco (dev) |
| `pnpm db:migrate` | cria nova migration |
| `pnpm db:studio` | abre Prisma Studio |
| `pnpm supabase:up` | sobe stack Docker |
| `pnpm supabase:down` | para stack (mantem dados) |
| `pnpm supabase:reset` | apaga volumes (CUIDADO - limpa banco) |
| `pnpm supabase:logs` | acompanha logs do stack |

---

## Arquitetura: como web fala com api e Supabase

```
┌────────────────────┐
│  Browser (Next.js) │
└─────────┬──────────┘
          │
          │  1. Login: POST direto pro Supabase Auth via @supabase/ssr
          │     -> recebe JWT + cookie httpOnly
          │
          │  2. Calls de dominio: fetch -> Fastify
          │     com Authorization: Bearer <jwt-supabase>
          ▼
┌────────────────────┐         ┌───────────────────────────┐
│  Fastify (apps/api)│ ──────▶ │  Postgres (Supabase Docker)│
│  - valida JWT HS256│   prisma│  - schema rachao          │
│  - Prisma queries  │         │  - schema auth (GoTrue)   │
└─────────┬──────────┘         └───────────────────────────┘
          │
          │  Para upload de imagens, web fala direto com:
          ▼
┌─────────────────────────┐
│  Supabase Storage       │
│  via Kong em :8000      │
└─────────────────────────┘
```

**Por que Fastify separado** (e não Route Handlers):
- API isolada permite escalar independente
- Tipagem 1ª classe com Prisma + Zod
- Plug-ins maduros (`@fastify/jwt`, helmet, cors, sensible)
- Mantém o front leve (Next só renderiza UI)

---

## Roadmap de fases

| Fase | Escopo | Status |
|------|--------|--------|
| **0** | Setup do monorepo, schema Prisma, Supabase Docker, design tokens | ✅ |
| **1** | Auth + Onboarding (login, cadastro, perfis, recuperar-senha) | ⏳ |
| **2** | Grupos e Boleiros (CRUD, multi-grupo, convidados avulsos) | ⏳ |
| **3** | Wizard de criação de partida (6 steps) | ⏳ |
| **4** | Lista de presença + sistema de convites | ⏳ |
| **5** | Escalação de times (auto + manual + compartilhamento) | ⏳ |
| **6** | Registro de partida ao vivo (offline-first) | ⏳ |
| **7** | Vaquinha (por partida + mensalidade) | ⏳ |
| **8** | Dono do Estádio (perfil, agenda, vínculos) | ⏳ |
| **9** | Configurações, planos e finalização | ⏳ |

---

## Identidade visual (resumo)

- **Fundo:** `#0f1b2d` (Azul Noite)
- **Acento:** `#e8530a` (Laranja Fogo)
- **Display font:** Barlow Condensed (títulos, placar, logo)
- **Body font:** Inter (todo o resto)
- **Border radius cards:** 12px · botões 8px · badges 9999px
- **Mobile-first:** bottom nav no celular, sidebar no desktop

Spec completa em [`Prompt/rachaoapp-identidade-visual.md`](Prompt/rachaoapp-identidade-visual.md).
