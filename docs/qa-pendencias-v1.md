# QA — Pendências V1 (consolidado)

Smoke test de aceite das 12 pendências do plano `rachaoapp_pendencias_v1`.

## Fase 1 — Telas pendentes

### T10 — Tabs Partidas e Estatísticas do Grupo

1. Acessar `/grupos/<id>` > aba **Partidas**.
   - Esperado: lista de partidas com filtros por status (`proximas`/`encerradas`/`canceladas`).
   - Cliques em card abrem `/partidas/<id>`.
2. Aba **Estatísticas**.
   - Esperado: 4 mini-cards (gols, cartões, partidas, presença média).
   - Seletor `30d/90d/tudo`.
   - 3 rankings em accordion (artilheiros, cartões, presença).

### T11 — Rota dedicada da ficha do boleiro

1. Em `/grupos/<id>`, abrir a ficha do boleiro pelo sheet.
2. Clicar em **Abrir ficha completa**.
   - Esperado: navega para `/grupos/<id>/boleiros/<boleiroId>` em página inteira.
   - Mantém estatísticas e bloco financeiro (idênticos ao sheet).
3. Verificar que `FichaPlaceholders` foi removida (busca em `boleiro-ficha-sheet.tsx`).

### T13 Step 6 — Estádio real na revisão

1. Criar partida via `/partidas/nova` selecionando um estádio cadastrado.
2. Avançar até Step 6.
   - Esperado: nome do estádio, cidade/estado exibidos (não mais "em breve").

### T28 — Agenda do estádio (semana + bloquear)

1. Em `/estadio/agenda`, alternar para a view **Semana**.
   - Esperado: grade 7 dias × hora aberta do estádio. Eventos coloridos.
2. Clicar num slot vazio.
   - Esperado: abre `BloquearHorarioDialog` com data pré-preenchida.
3. Submeter > slot fica cinza.

### T30 — Lightbox da galeria pública

1. Acessar `/estadios/<slug>` (página pública).
2. Clicar em qualquer foto da galeria.
   - Esperado: abre modal lightbox em tela cheia.
   - Setas ← → navegam; ESC ou clique fora fecham.
   - Swipe horizontal no mobile alterna entre fotos.

### T34 — Bloco Suporte real

1. Acessar `/configuracoes`.
2. Conferir bloco **Suporte**:
   - Botão **Falar no WhatsApp** (link `wa.me/55...?text=...`) — só aparece se `NEXT_PUBLIC_SUPORTE_WHATSAPP` setado.
   - Botão **E-mail de suporte** (`mailto:...`).

## Fase 2 — Assinatura Asaas

Veja [docs/asaas-setup.md](./asaas-setup.md) para smoke test completo.

Resumo:

- `prisma db push` aplica `Usuario.asaasCustomerId`, `Assinatura`, `EventoBilling`.
- `/planos` exibe estado real (`/api/me/assinatura`).
- Botão **Assinar** abre modal Pix/Cartão > redireciona para checkout Asaas.
- Webhook `POST /api/webhooks/asaas` atualiza `status` e `Usuario.plano`.
- Reenvio do mesmo webhook não duplica nada (idempotente via `EventoBilling`).

## Fase 3 — PWA + offline

Veja [docs/qa-pwa-offline.md](./qa-pwa-offline.md) para smoke test detalhado.

Resumo:

- `manifest.webmanifest` + ícones SVG em `/icons/`.
- `sw.js` com cache-first (assets), SWR (GET /api/\*) e network-only (mutações).
- IndexedDB persistente para fila de eventos ao vivo.
- Retry exponencial (1s, 3s, 9s, max 5x), erros 4xx vão para banner com retry/descartar.
- Endpoints `POST /api/partidas/:id/eventos` e `POST /api/partidas/:id/cronometro` idempotentes.

## Variáveis novas

```env
# apps/web/.env.local
NEXT_PUBLIC_SUPORTE_WHATSAPP=
NEXT_PUBLIC_SUPORTE_EMAIL=suporte@rachao.app
NEXT_PUBLIC_PWA_ENABLED=false

# apps/api/.env.local
ASAAS_API_KEY=
ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=
```
