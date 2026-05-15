# Asaas — Setup e fluxo de teste

Integração de assinaturas (T32 / Fase 2). Suporta Pix recorrente e Cartão de crédito, com webhook idempotente.

## 1. Variáveis de ambiente

Adicione em `apps/api/.env.local`:

```env
ASAAS_API_KEY=<sua_api_key_sandbox>
ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=<token_aleatorio_para_validar_webhook>
```

> Sem `ASAAS_API_KEY`, o cliente roda em **modo simulado** (gera IDs fake e retorna links `https://sandbox-checkout/...`). Útil para dev local sem credenciais reais.

## 2. Banco de dados

Schema já contém:

- `Usuario.asaasCustomerId` — cacheia o customer Asaas (criado lazy).
- `model Assinatura` — espelha a assinatura no Asaas (`externalId` unique).
- `model EventoBilling` — registra cada webhook com `@@unique([gateway, externalId])` para idempotência forte.

Após pull, rode:

```bash
pnpm --filter @rachao/db exec prisma db push
pnpm --filter @rachao/db exec prisma generate
```

## 3. Endpoints

- `GET /api/me/assinatura` — devolve a assinatura ativa do usuário (ou `null`).
- `POST /api/me/assinatura` — body `{ plano, billingType: 'PIX' | 'CREDIT_CARD' }`. Cria customer se necessário, cria assinatura no Asaas e retorna `{ assinatura, linkPagamento }`.
- `DELETE /api/me/assinatura` — marca `cancelaEmFimCiclo=true` e chama cancelamento no Asaas.
- `POST /api/webhooks/asaas` — recebe eventos do Asaas. Valida `asaas-access-token`, grava `EventoBilling` (com `@@unique` em `gateway+externalId`) e atualiza `Assinatura` + `Usuario.plano`.

## 4. Configurar webhook no Asaas

1. Sandbox Asaas > Integrações > Webhooks.
2. URL: `https://<dominio>/api/webhooks/asaas` (ou `http://localhost:3333/api/webhooks/asaas` via ngrok para testes locais).
3. Token: copie o valor de `ASAAS_WEBHOOK_TOKEN`.
4. Eventos: marque ao menos `SUBSCRIPTION_CREATED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `SUBSCRIPTION_DELETED`.

## 5. Smoke test

### Modo simulado (sem `ASAAS_API_KEY`)

1. Logar como presidente em trial.
2. Acessar `/planos`.
3. Banner amarelo **"Modo simulado"** deve aparecer.
4. Clicar em **Assinar** num plano > escolher **Pix**.
5. Esperado: redirect para `https://sandbox-checkout/...` (mock).
6. Assinatura criada no banco com `status='pendente'`.

### Modo real (sandbox Asaas)

1. Configure `ASAAS_API_KEY` válido.
2. Clique em **Assinar** > **Pix**.
3. Esperado: redireciona para checkout real do Asaas.
4. Pague o Pix usando o simulador do sandbox.
5. O webhook deve disparar `PAYMENT_RECEIVED`:
   - `Assinatura.status` muda para `ativa`.
   - `Usuario.plano` atualiza.
   - `Usuario.planoExpiraEm` recebe `proximoVencimento`.
6. Reenvie o mesmo webhook (botão "Reenviar" no painel Asaas).
   - Esperado: 200 retornado, sem efeito duplicado (idempotência via `EventoBilling`).

### Cancelamento

1. Em `/planos`, clicar **Cancelar ao fim do ciclo**.
2. Esperado: `Assinatura.cancelaEmFimCiclo=true`, `status` ainda `ativa`.
3. Quando o ciclo encerrar, o Asaas dispara `SUBSCRIPTION_DELETED` e `Usuario.plano` volta para `trial`/`free`.

## 6. Plano por produto

| Plano               | Asaas value | Ciclo   |
|---------------------|-------------|---------|
| `presidente_mensal` | R$ 29,90    | MONTHLY |
| `estadio_mensal`    | R$ 49,90    | MONTHLY |
| `combo_mensal`      | R$ 69,90    | MONTHLY |

Os valores são fonte de verdade no backend (`apps/api/src/lib/asaas.ts`). A UI lê de `/api/me/plano`.

## 7. Troubleshooting

- **Webhook 401**: confira `ASAAS_WEBHOOK_TOKEN` igual em `.env` e no Asaas.
- **Customer duplicado**: `Usuario.asaasCustomerId` é unique. Não rode `criarCliente` manualmente.
- **`EventoBilling` violou unique**: assinatura recebida 2x — esperado e desejado.
- **Modo simulado quando deveria ser real**: cheque `process.env.ASAAS_API_KEY` no boot do API (`/var/log` ou stdout do `pnpm dev`).
