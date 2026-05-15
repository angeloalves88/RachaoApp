# RachãoApp — Base de conhecimento e Smoke Test E2E

Documento-índice de **tudo que foi implantado** no RachãoApp até hoje, com mapeamento de fases, modelos, APIs, telas, integrações e o smoke test Playwright que valida o fluxo principal ponta-a-ponta.

> Mantenha esse README como **fonte única de verdade operacional**: quando uma fase/patch novo for entregue, registre aqui antes de fechar o PR.

- [1. Stack e organização do monorepo](#1-stack-e-organização-do-monorepo)
- [2. Mapa do produto entregue](#2-mapa-do-produto-entregue)
- [3. Modelos Prisma](#3-modelos-prisma)
- [4. APIs Fastify (`apps/api`)](#4-apis-fastify-appsapi)
- [5. Frontend Next.js (`apps/web`)](#5-frontend-nextjs-appsweb)
- [6. PWA + Offline-first (Fase 3 das pendências v1)](#6-pwa--offline-first-fase-3-das-pendências-v1)
- [7. Assinatura Asaas (Fase 2 das pendências v1)](#7-assinatura-asaas-fase-2-das-pendências-v1)
- [8. Variáveis de ambiente](#8-variáveis-de-ambiente)
- [9. Documentação relacionada (`/docs`)](#9-documentação-relacionada-docs)
- [10. Smoke Test E2E Playwright](#10-smoke-test-e2e-playwright)
- [11. Gotchas conhecidos](#11-gotchas-conhecidos)
- [12. Glossário de domínio](#12-glossário-de-domínio)

---

## 1. Stack e organização do monorepo

| Camada     | Tecnologia |
|------------|------------|
| Frontend   | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v3 · shadcn/ui · Zustand · React Hook Form + Zod |
| Backend    | Fastify 5 (Node 22) · Prisma 5 · Zod · `@fastify/jwt` (Supabase HS256) |
| Banco      | PostgreSQL 15 via Supabase self-hosted (Docker) |
| Auth       | Supabase Auth (GoTrue) — email/senha + Google OAuth |
| Storage    | Supabase Storage (self-hosted) |
| E-mail     | Resend (modo simulado se sem `RESEND_API_KEY`) |
| Pagamentos | Asaas sandbox/prod (modo simulado se sem `ASAAS_API_KEY`) |
| Pacote     | pnpm 9 (workspaces) |

```text
RachaoApp/
├── apps/
│   ├── web/   # Next.js 15 (UI + páginas públicas + PWA)
│   └── api/   # Fastify REST API
├── packages/
│   ├── db/      # Prisma schema + cliente compartilhado
│   └── shared/  # Schemas Zod, enums e tipos compartilhados
├── infra/
│   └── supabase/  # docker-compose self-hosted
├── scripts/
│   └── e2e/   # Smoke test Playwright (este README)
└── docs/      # QA por fase/bloco/patch
```

Veja o [README raiz](../../README.md) para setup inicial (Docker, Supabase, pnpm).

---

## 2. Mapa do produto entregue

### Roadmap original (Fases 0–9)

| Fase | Escopo | Doc QA | Status |
|------|--------|--------|--------|
| 0 | Setup monorepo, schema base, Supabase Docker, design tokens | — | ✅ |
| 1–2 | Auth + Onboarding + Grupos + Boleiros + Convidados Avulsos | [`docs/qa-fases-1-2.md`](../../docs/qa-fases-1-2.md) | ✅ |
| 3 | Wizard `/partidas/nova` (6 steps) + criação | [`docs/qa-fase-3.md`](../../docs/qa-fase-3.md) | ✅ |
| 4 | Lista de presença + convites + reenvio | [`docs/qa-fase-4.md`](../../docs/qa-fase-4.md) | ✅ |
| 5 | Escalação de times (auto + manual + drag-n-drop + compartilhamento v2) | [`docs/qa-fase-5.md`](../../docs/qa-fase-5.md) · [`docs/qa-escalacao-v2.md`](../../docs/qa-escalacao-v2.md) | ✅ |
| 6 | Registro ao vivo (gols, cartões, substituições, cronômetro) | [`docs/qa-fase-6.md`](../../docs/qa-fase-6.md) | ✅ |
| 7 | Vaquinha (por partida + mensalidade) | [`docs/qa-bloco7-vaquinha.md`](../../docs/qa-bloco7-vaquinha.md) | ✅ |
| 8 | Dono do Estádio (perfil, agenda, vínculos) | [`docs/qa-bloco8-estadio.md`](../../docs/qa-bloco8-estadio.md) | ✅ |
| 9 | Configurações, planos, finalização | [`docs/qa-bloco9-config-perfil.md`](../../docs/qa-bloco9-config-perfil.md) | ✅ |

### Patch v1.2 (Vaquinha + Convidados + Boleiro)

- Sincronização de pagamentos mensais corrigida em `apps/api/src/lib/vaquinha.ts`.
- `Vaquinha.dataLimitePagamentoConvidados` para travar acesso à partida.
- Reorganização de status de presença na rota `/partidas/[id]/presencas`: **três botões/emoji** (`confirmado`, `recusado`, `departamento_medico`) inline; menu mantém só **Reenviar convite** e **Remover da partida**.
- QA: [`docs/qa-patch-v1.2.md`](../../docs/qa-patch-v1.2.md).

### Pendências V1 (plano `rachaoapp_pendencias_v1`)

Plano consolidado de 12 tarefas, agrupado em 3 fases, todas entregues. Smoke test consolidado: [`docs/qa-pendencias-v1.md`](../../docs/qa-pendencias-v1.md).

#### Fase 1 — Telas pendentes

| ID  | Tema | Entregas |
|-----|------|----------|
| T10 | Tabs `Partidas` e `Estatísticas` do grupo | `GET /api/grupos/:id/estatisticas` (totais, artilheiros, cartões, presença) · filtros `30d/90d/tudo` · 3 rankings em accordion |
| T11 | Rota dedicada da ficha do boleiro | `/grupos/[id]/boleiros/[boleiroId]` (page + client) · sheet vira atalho · `FichaPlaceholders` morto removido · `FichaFinanceiroBloco` extraído para componente reutilizável |
| T13 Step 6 | Exibição do estádio na revisão | Wizard guarda `estadioNome/Cidade/Estado` no Zustand persist (`version: 4` + migração) · Step 6 mostra dados reais (sem mais "em breve") |
| T28 | View **Semana** na agenda do estádio | Grade 7d × hora configurada · clique em slot vazio abre `BloquearHorarioDialog` · chama `addMeuBloqueio` |
| T30 | Lightbox da galeria pública | `components/ui/lightbox.tsx` (Radix Dialog full-screen, setas/ESC/swipe) · usado em `(public)/estadios/[slug]/galeria.tsx` |
| T34 | Bloco **Suporte** real em `/configuracoes` | CTAs WhatsApp + e-mail via `NEXT_PUBLIC_SUPORTE_WHATSAPP` / `_EMAIL` |

#### Fase 2 — Assinatura Asaas

| ID  | Entregas |
|-----|----------|
| `f2-schema` | Schema Prisma: `Usuario.asaasCustomerId @unique`, modelos `Assinatura` e `EventoBilling` (com `@@unique([gateway, externalId])` para idempotência) |
| `f2-lib-endpoints` | `apps/api/src/lib/asaas.ts` (lazy + simulado) · rotas `GET/POST/DELETE /api/me/assinatura` · webhook `POST /api/webhooks/asaas` com verificação de `asaas-access-token` e gravação em `EventoBilling` |
| `f2-ui` | `/planos` reescrito: status real (ativa/pendente/inadimplente), banner "Modo simulado" se sem API key, `EscolherFormaPagamentoDialog` (Pix/Cartão), redirect para checkout Asaas, "Cancelar ao fim do ciclo" |

Setup detalhado: [`docs/asaas-setup.md`](../../docs/asaas-setup.md).

#### Fase 3 — PWA + offline

| ID  | Entregas |
|-----|----------|
| `f3-backend` | `Evento.clientId` como coluna real com `@@unique([partidaId, clientId])` · `POST /api/partidas/:id/eventos` usa `upsert` + captura `P2002` · `DELETE` idempotente · novo `POST /api/partidas/:id/cronometro` com `ultimaAcaoClientId` (estado em `Partida.cronometroEstado` JSON) |
| `f3-queue` | `apps/web/lib/offline-queue.ts` em **IndexedDB persistente** · retry exponencial (1s/3s/9s, max 5x) · separação de erros 401/403/4xx/5xx · `discardFailed`/`retryFailed` · banner de falhados em `ao-vivo-client.tsx` |
| `f3-sw` | `public/manifest.webmanifest` + ícones SVG · `public/sw.js` (cache-first, SWR para GET API, network-only para mutações) · `public/offline.html` · `app/sw-register.tsx` com flag `NEXT_PUBLIC_PWA_ENABLED` e toast "Nova versão" |

Smoke test PWA detalhado: [`docs/qa-pwa-offline.md`](../../docs/qa-pwa-offline.md).

---

## 3. Modelos Prisma

Schema completo em [`packages/db/prisma/schema.prisma`](../../packages/db/prisma/schema.prisma). Resumo dos modelos principais:

| Modelo | Função | Observações |
|--------|--------|-------------|
| `Usuario` | Conta + plano + customer Asaas | `asaasCustomerId @unique` (criado lazy), `plano`, `planoExpiraEm` |
| `Grupo` | Grupo de pelada | Multi-tenant por `presidenteId` |
| `BoleiroGrupo` | Boleiro fixo de um grupo | Status `ativo/arquivado` |
| `ConvidadoAvulso` | Boleiro avulso (sem cadastro fixo) | Cria-se sob demanda na convocação |
| `Partida` | Pelada agendada | `status`, `regras` (JSON), **`cronometroEstado`** (JSON com `status/iniciadoEm/segundosAcumulados/ultimaAcaoClientId`) |
| `ConvitePartida` | Convite individual para uma partida | Status `pendente/confirmado/recusado/lista_espera/departamento_medico` |
| `Time` | Time numa partida | Cor + nome |
| `Escalacao` | Boleiro alocado num time | Posição + ordem |
| `Evento` | Gol/cartão/substituição/azul ao vivo | **`clientId`** (string) + `@@unique([partidaId, clientId])` para idempotência |
| `Vaquinha` | Vaquinha de uma partida | `dataLimitePagamentoConvidados` |
| `PagamentoVaquinha` | Linha de pagamento por boleiro/convidado | Tipo `por_partida` ou `mensalidade` |
| `Estadio` | Cadastro de estádio | Slug público, status `pendente/aprovado/recusado` |
| `Bloqueio` | Janela bloqueada na agenda do estádio | Usado na view Semana |
| `Notificacao` | Centro de notificações | Lido/não-lido + categoria |
| **`Assinatura`** | Assinatura Asaas espelhada | `externalId @unique`, `status`, `proximoVencimento`, `cancelaEmFimCiclo` |
| **`EventoBilling`** | Cada webhook recebido | `@@unique([gateway, externalId])` para idempotência forte |

Para aplicar mudanças localmente:

```powershell
pnpm --filter @rachao/db exec prisma db push           # dev
pnpm --filter @rachao/db exec prisma generate          # após qualquer mudança no schema
```

> ⚠️ Quando o `db push` reclamar de unique constraint sobre dados existentes, use `--accept-data-loss` (dev) ou crie uma migration manual (prod).

---

## 4. APIs Fastify (`apps/api`)

Bootstrap em [`apps/api/src/app.ts`](../../apps/api/src/app.ts). Cada domínio em `apps/api/src/routes/*.ts`. Bibliotecas auxiliares em `apps/api/src/lib/*.ts`.

### Endpoints por domínio

| Domínio | Rotas principais |
|---------|------------------|
| **Health** | `GET /health`, `GET /health/db` |
| **Auth/Sync** | `POST /api/me/sync` (cria/atualiza `Usuario` a partir do JWT Supabase) |
| **Perfil** | `GET /api/me`, `PATCH /api/me`, `GET /api/me/plano`, `POST /api/me/plano-trial` |
| **Grupos** | `GET/POST /api/grupos`, `GET/PATCH/DELETE /api/grupos/:id`, **`GET /api/grupos/:id/estatisticas`** |
| **Boleiros** | `GET/POST /api/grupos/:id/boleiros`, `GET/PATCH/DELETE /api/grupos/:id/boleiros/:bid`, `GET /api/grupos/:id/boleiros/:bid/ficha` |
| **Convidados Avulsos** | `POST /api/grupos/:id/convidados-avulsos`, `PATCH/DELETE` análogos |
| **Partidas** | `GET/POST /api/partidas`, `GET/PATCH/DELETE /api/partidas/:id`, `POST /api/partidas/:id/encerrar` |
| **Convites** | `POST /api/partidas/:id/convites`, `PATCH /api/partidas/:id/convites/:cid`, `POST /api/partidas/:id/convites/:cid/reenviar`, `GET /api/convites/publico/:token` |
| **Times/Escalação** | `POST /api/partidas/:id/times`, `POST/PATCH /api/partidas/:id/escalacao` |
| **Eventos ao vivo** | **`POST /api/partidas/:id/eventos`** (idempotente via `clientId`), `GET /api/partidas/:id/eventos`, **`DELETE` idempotente** |
| **Cronômetro** | **`GET/POST /api/partidas/:id/cronometro`** (idempotente via `ultimaAcaoClientId`) |
| **Vaquinha** | `GET /api/partidas/:id/vaquinha`, `PATCH /api/vaquinha/:id`, `POST /api/vaquinha/:id/pagamentos/:pid/marcar-pago` |
| **Estádios** | `GET/POST /api/estadios`, `PATCH/DELETE /api/estadios/:id`, `GET /api/estadios/publico/:slug`, agenda + bloqueios |
| **Notificações** | `GET /api/notificacoes`, `PATCH /api/notificacoes/:id/lida` |
| **Assinaturas (Asaas)** | **`GET/POST/DELETE /api/me/assinatura`** |
| **Webhooks** | **`POST /api/webhooks/asaas`**, `POST /api/webhooks/resend` |

### Bibliotecas-chave (`apps/api/src/lib`)

- `auth.ts` — middleware JWT Supabase (HS256, valida `aud=authenticated`).
- `prisma.ts` — singleton do `PrismaClient`.
- `email.ts` — Resend lazy + modo simulado.
- `asaas.ts` — cliente Asaas lazy + modo simulado (mesmo padrão).
- `vaquinha.ts` — `sincronizarPagamentos` (por partida e mensalidade), totalizadores, `dataLimitePagamentoConvidados`.
- `resumo.ts` — `agregarResumo` (estatísticas por boleiro, usado em ficha + grupo).
- `estatisticas-grupo.ts` — `agregarEstatisticasGrupo` (totais + top 10 artilheiros/cartões/presença).
- `convites.ts` — geração de token, envio de e-mail, reenvio.

---

## 5. Frontend Next.js (`apps/web`)

App Router com **groups** por contexto:

- `(auth)` — login, signup, recuperar-senha, onboarding.
- `(presidente)` — dashboard, grupos, partidas (presidente logado).
- `(estadio)` — área do dono do estádio.
- `(conta)` — configurações, perfil, planos.
- `(public)` — convite público, página pública do estádio.

### Telas mais relevantes

| Rota | Componente | Observações |
|------|------------|-------------|
| `/dashboard` | server + `dashboard-client.tsx` | Saudação + lista de grupos |
| `/grupos/[id]` | + `grupo-tabs.tsx` | **Tabs Partidas e Estatísticas com dados reais (T10)** |
| `/grupos/[id]/boleiros/[boleiroId]` | + `ficha-client.tsx` | **Rota dedicada (T11)** — sheet ainda existe como atalho |
| `/partidas/nova` | wizard com `wizard-store.ts` (Zustand persist v4) | 6 steps; review mostra **estádio real (T13)** |
| `/partidas/[id]` | + `partida-client.tsx` | Header + ações + boleiros |
| `/partidas/[id]/presencas` | + `presencas-client.tsx` | **3 botões inline + menu enxuto** |
| `/partidas/[id]/escalacao` | + `escalacao-client.tsx` | Auto + manual + drag-n-drop |
| `/partidas/[id]/ao-vivo` | + `ao-vivo-client.tsx` | Cronômetro + eventos + **fila offline** com banner de falhados |
| `/estadio/agenda` | + `agenda-client.tsx` | Views Mês/**Semana**/Dia · **`BloquearHorarioDialog` (T28)** |
| `/estadios/[slug]` (público) | + `galeria.tsx` | **Lightbox de galeria (T30)** |
| `/configuracoes` | + `SuporteBloco` | **CTAs WhatsApp/E-mail (T34)** |
| `/planos` | + `planos-client.tsx` | **Integração Asaas com EscolherFormaPagamentoDialog** |

### Bibliotecas-chave (`apps/web/lib`)

- `api.ts` — `apiFetch`, `apiFetchServerSafe` (lê JWT do cookie e injeta `Authorization`).
- `*-actions.ts` — wrappers tipados para cada domínio (`grupos`, `partidas`, `boleiros`, `assinatura`, etc.).
- **`offline-queue.ts`** — fila persistente em **IndexedDB** com retry exponencial.
- **`offline-db.ts`** — wrapper minimalista sobre IndexedDB.
- `supabase-browser.ts` / `supabase-server.ts` — clientes Supabase (cookie-based).
- `types.ts` — tipos compartilhados de UI (inclui `EstatisticasGrupoData`, `AssinaturaResponse`).

### Componentes de UI relevantes

- `components/ui/*` — shadcn/ui customizado (Button, Dialog, Tabs, Sheet, etc.).
- **`components/ui/lightbox.tsx`** — modal full-screen para galerias.
- `components/boleiros/boleiro-ficha-sheet.tsx` — sheet + botão "Abrir ficha completa".
- **`components/boleiros/ficha-financeiro-bloco.tsx`** — reutilizado entre sheet e rota dedicada.
- `components/notificacoes/*` — sino, lista, painel.
- `app/sw-register.tsx` — registra `/sw.js` se `NEXT_PUBLIC_PWA_ENABLED=true`.

---

## 6. PWA + Offline-first (Fase 3 das pendências v1)

### Service Worker (`apps/web/public/sw.js`)

| Padrão de cache | Aplicado a |
|-----------------|------------|
| `cache-first` | `/_next/static/*`, `/icons/*`, `/fonts/*`, `/manifest.webmanifest`, imagens |
| `stale-while-revalidate` | `GET /api/partidas/*`, `GET /api/grupos/*`, `GET /api/me/*` |
| `network-only` | Qualquer `POST/PUT/PATCH/DELETE` (mutações ficam para a fila IndexedDB) |
| Fallback `offline.html` | Navegações com rede offline |

Atualização do SW: mensagem `SKIP_WAITING` + toast "Nova versão disponível — Recarregar" (em `sw-register.tsx`).

### Fila offline (IndexedDB)

`apps/web/lib/offline-queue.ts`:

- Schema da store `eventos_pendentes`: `{ partidaId, clientId (PK), payload, criadoEm, tentativas, status }`.
- Estados: `pending` (na fila), `flushing` (em envio), `failed` (4xx ou 5x tentativas).
- Retry exponencial: 1s → 3s → 9s → 27s → 81s (`MAX_TENTATIVAS = 5`).
- Discriminação de erros:
  - `401/403` → para o flush, mantém na fila (re-login).
  - `400/409/422` (4xx genéricos) → marca como `failed` com mensagem, exibe banner com **Tentar novamente** / **Descartar**.
  - `5xx` ou erro de rede → mantém e tenta de novo no próximo flush.
- `flushPending` processa todos os itens (exceto `failed`) em ordem de `criadoEm`.

### Idempotência server-side

- `POST /api/partidas/:id/eventos`: usa `prisma.evento.create` + try/catch em `P2002`; quando há colisão de `(partidaId, clientId)`, retorna o evento existente com `idempotent: true`.
- `DELETE /api/partidas/:id/eventos/:eventoId`: sempre 200, mesmo se já foi deletado.
- `POST /api/partidas/:id/cronometro`: usa `Partida.cronometroEstado.ultimaAcaoClientId` para detectar replay e devolver o estado atual sem re-aplicar.

### Smoke test recomendado

DevTools > **Application** > **Service Workers** > **Offline** → registrar 3 gols + 1 amarelo + 1 sub → desmarcar Offline → ver fila zerar e refetch de eventos.

Veja [`docs/qa-pwa-offline.md`](../../docs/qa-pwa-offline.md) para o passo-a-passo completo (8 checagens com critério de aceite).

---

## 7. Assinatura Asaas (Fase 2 das pendências v1)

### Fluxo geral

```text
   Usuario clica em "Assinar"
            │
            ▼
   EscolherFormaPagamentoDialog (Pix/Cartão)
            │
            ▼
   POST /api/me/assinatura  ── (lazy) criarCliente(usuario) ──▶ Asaas
            │                ── criarAssinatura(...) ────────▶ Asaas
            │
            ▼
   { assinatura, linkPagamento }
            │
            ▼
   window.open(linkPagamento, '_blank')  → checkout Asaas
            │
            ▼
   (Asaas dispara webhooks de PAYMENT_*)
            │
            ▼
   POST /api/webhooks/asaas
     ├─ valida asaas-access-token
     ├─ grava em EventoBilling (idempotente)
     └─ atualiza Assinatura + Usuario.plano
```

### Modo simulado

Sem `ASAAS_API_KEY`, todas as funções de `apps/api/src/lib/asaas.ts` retornam respostas determinísticas com `simulado: true`. A UI mostra um banner amarelo em `/planos` quando isso acontece.

### Cancelamento

`DELETE /api/me/assinatura` → marca `cancelaEmFimCiclo=true` e chama o cancelamento no Asaas (que respeita o fim do ciclo atual). Quando o Asaas dispara `SUBSCRIPTION_DELETED`, o webhook reseta `Usuario.plano`.

Detalhes em [`docs/asaas-setup.md`](../../docs/asaas-setup.md).

---

## 8. Variáveis de ambiente

### `apps/web/.env.local`

```env
WEB_PORT=3000
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_API_URL=http://localhost:3333
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Suporte (T34) — CTAs em /configuracoes
NEXT_PUBLIC_SUPORTE_WHATSAPP=
NEXT_PUBLIC_SUPORTE_EMAIL=suporte@rachao.app

# PWA — habilita SW/manifest em dev (default: false)
NEXT_PUBLIC_PWA_ENABLED=false
```

### `apps/api/.env`

```env
DATABASE_URL=postgresql://...
SUPABASE_JWT_SECRET=<jwt-secret>
CORS_ORIGIN=http://localhost:3000
RESEND_API_KEY=                          # opcional → modo simulado se vazio
RESEND_FROM=Rachao <noreply@rachao.app>

# Asaas (Fase 2 pendências v1)
ASAAS_API_KEY=                            # opcional → modo simulado
ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=                      # tem que bater com o token configurado no painel Asaas
```

### `packages/db/.env`

```env
DATABASE_URL=postgresql://...
```

---

## 9. Documentação relacionada (`/docs`)

| Arquivo | Cobertura |
|---------|-----------|
| `qa-fases-1-2.md` | Auth + Onboarding + Grupos + Boleiros |
| `qa-fase-3.md` | Wizard `/partidas/nova` |
| `qa-fase-4.md` | Lista de presença + convites |
| `qa-fase-5.md` | Escalação automática |
| `qa-escalacao-v2.md` | Escalação manual + compartilhamento v2 |
| `qa-fase-6.md` | Registro ao vivo (eventos + cronômetro) |
| `qa-bloco7-vaquinha.md` | Vaquinha por partida + mensalidade |
| `qa-bloco8-estadio.md` | Cadastro/agenda do estádio |
| `qa-bloco9-config-perfil.md` | Configurações + planos básico |
| `qa-patch-v1.2.md` | Patch v1.2 (sync vaquinha + presença com 3 botões) |
| **`qa-pendencias-v1.md`** | **Consolidado das 12 pendências (Fases 1/2/3 do plano)** |
| **`asaas-setup.md`** | **Setup Asaas + smoke test do gateway** |
| **`qa-pwa-offline.md`** | **Smoke test offline + idempotência + SW** |

---

## 10. Smoke Test E2E Playwright

Script Python (Playwright) que roda um fluxo ponta-a-ponta em browser real (`scripts/e2e/smoke.py`).

### Pré-requisitos

- Stack rodando: `pnpm dev` (web em `localhost:3001`, API em `localhost:3333`) e `pnpm supabase:up`.
- Python 3.10+ no PATH.

### Setup (uma vez)

```powershell
cd scripts/e2e
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m playwright install chromium
```

### Execução

```powershell
# Padrão: browser visível (acompanhar a execução)
python smoke.py

# Sem janela (CI ou quando não precisa ver o fluxo)
python smoke.py --headless

# Slow motion (debug)
python smoke.py --slowmo=300
```

Cada execução cria um usuário novo (`e2e-<timestamp>@rachao.local`, senha `Senha@12345`) e dois grupos. O usuário fica no banco — você pode logar nele depois para inspecionar.

### Smoke API rápido (PowerShell)

`smoke-api.ps1` faz uma bateria curta direto contra `/api/*` (sem browser). Útil para CI/CD ou troubleshooting de endpoint isolado.

```powershell
.\smoke-api.ps1
```

### Etapas testadas pelo `smoke.py`

| # | Step | Cobre |
|---|------|-------|
| 00 | Health da API | API up |
| 01 | Signup | Cadastro + sync usuário |
| 02 | Onboarding | Seleção Presidente + criação grupo inicial |
| 03 | Dashboard | Saudação + listagem de grupos |
| 04 | Criar grupo | Form com esporte/nível/descrição |
| 05 | Lista + busca | Filtro client-side com debounce |
| 06 | Editar grupo | Update via PATCH |
| 07 | Adicionar boleiro | Modal + criação |
| 08 | Ficha do boleiro | Sheet detalhada |
| 09 | Criar partida | Wizard `/partidas/nova` (T13) — 6 steps + criação |
| 10 | Detalhe da partida | `/partidas/[id]` (T14) — header, ações, boleiros |
| 11 | Lista de presença | `/partidas/[id]/presencas` (T15) — pills + tabs |
| 12 | Centro de notificações | Sino → `/notificacoes` (T17) |
| 13 | Logout | Limpeza de sessão |

### Em caso de falha

- Screenshot é salvo em `scripts/e2e/screenshots/<timestamp>-fail-<step>.png`.
- A URL atual e os primeiros ~1500 caracteres do HTML são impressos no stderr.

### Próximos passos sugeridos para o E2E

Pontos ainda não cobertos pelo `smoke.py` que valem o esforço de adicionar:

- **Escalação de times** (auto + manual) — Fase 5.
- **Registro ao vivo offline** — toggle DevTools offline + enfileirar eventos + reconectar (Fase 3 pendências).
- **Vaquinha** — marcar pagamento + ver totais (Bloco 7).
- **Assinatura Asaas em modo simulado** — clicar Assinar > escolher Pix > validar redirect mock.
- **Lightbox da galeria pública** (T30) — abrir foto + navegar com setas.
- **Bloquear horário na agenda do estádio** (T28).

---

## 11. Gotchas conhecidos

Padrões de seletor e armadilhas que **já quebraram o teste** e como o script trata:

- **Formulário de grupo (nome vs descrição):** o placeholder da descrição começa com o mesmo texto do nome; `get_by_placeholder` faz match parcial. O smoke usa `exact=True` no campo nome.
- **Após "Criar grupo":** o glob `**/grupos/**` também casa com `/grupos/novo`. Além disso a app pode redirecionar para `/grupos` (lista); o script espera sair de `/grupos/novo` e, se estiver na lista, abre o grupo pelo nome antes de guardar a URL do detalhe. Veja `_GRUPO_DETALHE_URL_RE`.
- **Formulário de boleiro:** o componente `Field` não associa `<label>` ao input (`htmlFor`). O smoke usa `input[name="nome"]`, `input[name="apelido"]` e o placeholder do WhatsApp.
- **Logout:** existem dois `<header>` na página de detalhe do grupo (layout sticky + hero do grupo). Ambos podem ter `aria-haspopup="menu"`. O clique no menu do usuário fica restrito a `header.sticky`.
- **Wizard de partida (T13):** `<input type="date">` controlados pelo React não recebem eventos via `page.fill()` em headless (Chrome interpreta segmentos errados quando `keyboard.type` envia dígitos). O smoke pré-popula a chave do Zustand persist (`localStorage["rachao-partida-wizard"]`) com `data`/`hora` já prontos antes de navegar para `/partidas/nova`. Ver helper `_seed_wizard_storage`. **Importante:** mantenha a `version` do payload alinhada com a `version` do `wizard-store.ts` (hoje **4** — atualize aqui sempre que o store mudar).
- **Após "Criar partida":** o glob `**/partidas/**` casa com `/partidas/nova`. O smoke usa o regex `_PARTIDA_DETALHE_URL_RE` que rejeita "nova" seguido de `/`, `?`, `#` ou fim de string.
- **Conflito `TIPOS_PISO`:** já existia duplicado entre `packages/shared/src/enums.ts` (4 valores) e `packages/shared/src/zod.ts` (7 valores). A versão canônica é a de `zod.ts`; o duplicado em `enums.ts` foi removido. Se o `pnpm -r typecheck` voltar a falhar com `Module './enums.js' has already exported a member named 'TIPOS_PISO'`, é regressão — não reintroduzir.
- **Prisma `EPERM` no Windows:** comum após Ctrl+C no `pnpm dev`. Mate processos `node.exe` órfãos com `Stop-Process -Name node -Force` antes de rodar `prisma generate`.
- **`EADDRINUSE` em 3001/3333:** mesmo problema do Prisma. Identifique com `netstat -ano | findstr :3001` e mate o PID.
- **`prisma db push` com warning de data loss:** ao adicionar unique constraint em coluna existente, use `--accept-data-loss` em dev. Em prod, gere migration manual e migre os dados antes.

---

## 12. Glossário de domínio

- **Presidente** — perfil de usuário que organiza grupos e partidas.
- **Dono do Estádio** — perfil que cadastra estádios e gerencia agenda.
- **Boleiro** — jogador. **Boleiro fixo** está vinculado a um grupo (`BoleiroGrupo`); **Convidado avulso** é cadastrado ad-hoc por partida (`ConvidadoAvulso`).
- **Partida** — pelada agendada de um grupo. Tem `status`, regras, times e (opcional) vaquinha.
- **Convite** — `ConvitePartida` ligando um boleiro (fixo ou avulso) a uma partida com status de presença.
- **Vaquinha** — esquema de cobrança da partida. Pode ser `por_partida` (cada um paga sua parte) ou `mensalidade` (boleiro fixo paga mensal e isenta partidas do mês).
- **Cartão azul** — regra opcional que tira o jogador por X minutos sem expulsar.
- **Departamento médico** — status de convite para boleiros lesionados; não conta como recusa.
- **Trial** — período gratuito do plano Presidente antes da assinatura Asaas.
