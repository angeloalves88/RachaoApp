# RachãoApp — Política de notificações por canal e modelo de planos

> **Status:** Especificação de produto e precificação (V2 de mensageria)  
> **Última revisão:** maio de 2026  
> **Relacionado:** `docs/documentacao-usuario-final.md` · `Prompt/rachaoapp-prd-v1.md` §7 e §8

Este documento consolida decisões de **quais canais usar em cada momento**, **limites por plano** e **economia de custo** (e-mail, SMS, WhatsApp API). Serve para produto, comercial, implementação e atualização da UI de `/planos`.

---

## 1. Princípios

1. **Nada ilimitado** em canais com custo variável (SMS, WhatsApp API).
2. **E-mail e notificação in-app** são a base barata; incluir quotas generosas no plano.
3. **WhatsApp automático** só onde a taxa de conversão compensa o custo — lembrete final, preferencialmente só para **pendentes**.
4. **`wa.me` manual** (presidente abre conversa no próprio WhatsApp) permanece **sem custo para a plataforma** em todos os planos.
5. **Não duplicar** o mesmo evento no mesmo canal para o mesmo destinatário na mesma janela (deduplicação).

---

## 2. Estado atual (V1 implementada) vs alvo (V2)

| Recurso | V1 (código hoje) | V2 (alvo desta política) |
|---------|------------------|---------------------------|
| Convite boleiro — e-mail | Resend (`enviarConviteEmail`) | Mantém + quota por plano |
| Convite boleiro — WhatsApp | Links `wa.me` abertos pelo **presidente** (manual) | Mantém grátis + opcional API no lembrete |
| Convite boleiro — SMS | Não implementado | 1º toque para quem **não tem e-mail** |
| Lembrete 24h — presidente | Job `partida_24h` → notificação **in-app** | Mantém + e-mail opcional ao presidente |
| Lembrete 24h — boleiro | Não (só in-app ao presidente) | **WhatsApp API** (ou SMS) só se **pendente** |
| Vaquinha — cobrança | `wa.me` manual / lote | Fora do funil automático no plano base |
| Limites de plano na API | Não enforced (só UI em `/planos`) | Enforcement por `entitlements` |
| Preços UI | R$ 19,90 “ilimitado” (marketing) | Substituir por limites desta política |

Referências no código:

- Reenvio WhatsApp manual: `apps/web/app/(presidente)/partidas/[id]/presencas/reenviar-modal.tsx`
- E-mail: `apps/api/src/lib/email.ts`
- Jobs in-app: `apps/api/src/plugins/notifications-jobs.ts`
- Valores Asaas: `apps/api/src/routes/assinaturas.ts` (`VALOR_POR_PLANO`)

---

## 3. Funil de notificações (estratégia aprovada)

### Visão geral

```
Criar partida / 1º convite
    → E-mail (quem tem e-mail)
    → SMS (quem NÃO tem e-mail, tem celular)
    → wa.me manual (presidente, qualquer plano, sem custo plataforma)

Durante a semana
    → Presidente: in-app (+ e-mail opcional)
    → Boleiro: sem spam em canal pago

48h antes (opcional, canal barato)
    → E-mail e/ou SMS apenas para PENDENTES

24h antes (lembrete final)
    → WhatsApp API apenas para PENDENTES
    → Convidados avulsos: prioridade WA (costumam ter só celular)
```

### 3.1 Primeiro toque — convite / reenvio (T16)

| Condição do boleiro | Canal automático | Observação |
|---------------------|------------------|------------|
| Tem e-mail cadastrado | **E-mail** com link `/confirmar/[token]` | Texto completo, botão de confirmação |
| Sem e-mail, com celular (11 dígitos) | **SMS** | Mensagem curta + link encurtado |
| Sem e-mail e sem celular válido | Nenhum automático | Presidente usa `wa.me` ou corrige cadastro |
| Presidente escolhe “WhatsApp” no reenvio | **`wa.me`** (V1) | Não consome quota API |

**Não enviar WhatsApp API no primeiro toque** — reduz custo e evita classificação “marketing” em massa.

### 3.2 Lembrete intermediário (opcional) — ~48h antes

| Destinatário | Status convite | Canal |
|--------------|----------------|--------|
| Boleiro | `pendente` | E-mail (se tiver) ou **SMS** (fallback) |
| Boleiro | `confirmado` / `recusado` / `departamento_medico` | **Não enviar** |
| Presidente | — | In-app (e e-mail se preferência ativa) |

**Não usar WhatsApp API nesta etapa** — reservar para 24h.

### 3.3 Lembrete final — 24h antes (janela 23h–25h, como job atual)

| Destinatário | Status convite | Canal |
|--------------|----------------|--------|
| Boleiro fixo | `pendente` | **WhatsApp API** (1 template por partida/celular) |
| Convidado avulso | `pendente` | **WhatsApp API** (prioridade: só celular) |
| Boleiro | `confirmado` | Não enviar WA (opcional: e-mail “nos vemos amanhã”) |
| Presidente | — | In-app `partida_24h` (já existe) |

**Uma única mensagem WhatsApp API** por partida por celular na janela de lembrete (deduplicar 48h).

### 3.4 Eventos pontuais

| Evento | Destinatário | Canal recomendado |
|--------|--------------|-------------------|
| Presença confirmada/recusada | Presidente | In-app (+ e-mail se prefs) |
| Promoção lista de espera | Boleiro promovido | E-mail ou SMS; WA só se add-on |
| Vaquinha pendente | Presidente | In-app (`vaquinha_pendente` job) |
| Cobrança vaquinha ao boleiro | Boleiro | `wa.me` manual (V1); API só add-on |
| Estádio aprovado/recusado | Presidente | In-app + e-mail |
| Nova solicitação estádio | Dono | In-app + e-mail |

---

## 4. Regras de negócio (implementação futura)

### 4.1 Deduplicação

Registrar envio em tabela de trilha (ex.: `MensagemEnviada`):

- Campos sugeridos: `destinatario`, `canal`, `tipo` (`convite` | `lembrete_48h` | `lembrete_24h`), `partidaId`, `conviteId`, `criadoEm`.
- Unique lógico: não reenviar mesmo `(canal, tipo, conviteId)` em 48h.

### 4.2 Opt-in e LGPD

- Cadastro de celular no grupo implica uso para **avisos da pelada** (texto no formulário de boleiro).
- Toggles em `/configuracoes/notificacoes` passam a refletir **canais reais** quando API existir.
- Boleiro sem conta: opt-out via link no e-mail ou resposta ao presidente.

### 4.3 SMS — formato

- Máximo ~140 caracteres úteis + URL curta (evitar 2 segmentos).
- Exemplo: `Pelada [Grupo] - [data]. Confirme: https://rachao.app/c/xxxxx`

### 4.4 WhatsApp — templates

- Aprovar templates na Meta (BSP): `convite_lembrete_24h`, categoria **utility** quando possível.
- Conteúdo: nome grupo, data/hora, link confirmação, sem tom promocional.

---

## 5. Economia de custo (referência para precificação)

Valores **indicativos** para planejamento — cotar BSP (WhatsApp) e SMS (Zenvia, Twilio, TotalVoice, etc.) antes de fixar preço final.

| Canal | Faixa por envio (BR) | Uso no funil |
|-------|----------------------|--------------|
| E-mail | R$ 0,001 – 0,01 | Convite, lembrete 48h |
| SMS | R$ 0,06 – 0,15 | Fallback sem e-mail |
| WhatsApp API | R$ 0,08 – 0,35+ | Só lembrete 24h pendentes |
| `wa.me` | R$ 0 | Presidente envia manualmente |
| In-app | ~R$ 0 | Presidente / dono |

### Exemplo — 1 partida, 35 convidados, 10 pendentes no lembrete

| Estratégia | Custo mensageria aprox. |
|------------|-------------------------|
| 2× WhatsApp para todos (70 msgs) | R$ 17 – 25 |
| E-mail 35 + SMS 10 + WA 10 pendentes | R$ 4 – 8 |
| Só e-mail + WA 10 pendentes | R$ 2,50 – 5 |

### Exemplo — presidente ativo (4 partidas/mês, 30 jogadores, ~8 pendentes/partida)

| Item | Quantidade/mês | Custo aprox. (WA R$ 0,25) |
|------|----------------|---------------------------|
| E-mails convite | ~120 | < R$ 2 |
| SMS fallback (30% sem email) | ~36 | R$ 3 – 5 |
| WhatsApp 24h pendentes | ~32 | R$ 8 |
| **Total** | | **~R$ 13 – 15** |

Conclusão: plano **R$ 19,90 com “WhatsApp ilimitado”** é inviável; funil acima cabe em **R$ 24,90 – 39,90** com margem se quotas forem respeitadas.

---

## 6. Modelo de planos (proposta)

### 6.1 Entitlements (campos sugeridos no `Usuario` ou tabela `PlanoEntitlement`)

| Entitlement | Tipo | Descrição |
|-------------|------|-----------|
| `maxGrupos` | int | Grupos ativos |
| `maxBoleirosPorGrupo` | int | Ex.: 40 |
| `maxPartidasPorMes` | int | Ex.: 4 (= 1/semana) |
| `maxPartidasPorSemana` | int | Opcional, mais restritivo |
| `emailQuotaMensal` | int | Envios automáticos |
| `smsQuotaMensal` | int | Fallback sem e-mail |
| `whatsappQuotaMensal` | int | Templates API (lembrete 24h) |
| `historicoDias` | int | 30 / 90 / ilimitado |
| `shareLinksPublicos` | bool | Escalação/resumo público |
| `podeComprarExtras` | bool | Add-ons |

Contadores mensais: `emailEnviadosMes`, `smsEnviadosMes`, `whatsappEnviadosMes` (reset no ciclo da assinatura).

### 6.2 Plano Presidente Starter (proposta)

| Item | Valor |
|------|--------|
| Preço | **R$ 24,90/mês** (ou 30 dias trial depois pago) |
| Grupos | **1** |
| Boleiros | **até 40** por grupo |
| Partidas | **4/mês** (≈ 1 por semana) |
| E-mail/mês | **400** |
| SMS/mês | **80** |
| WhatsApp API/mês | **0** (lembrete WA só com add-on) |
| Histórico | 90 dias |
| Share links | não |
| `wa.me` | ilimitado (manual) |

### 6.3 Plano Presidente Pro (proposta)

| Item | Valor |
|------|--------|
| Preço | **R$ 49,90/mês** |
| Grupos | **3** |
| Boleiros | **40** por grupo |
| Partidas | **12/mês** |
| E-mail/mês | **1.200** |
| SMS/mês | **200** |
| WhatsApp API/mês | **300** (≈ lembretes 24h pendentes) |
| Histórico | completo |
| Share links | sim |

### 6.4 Extras (pay-as-you-go)

| Extra | Preço sugerido | Observação |
|-------|----------------|------------|
| +1 grupo/mês | R$ 12,90 | |
| +4 partidas/mês | R$ 14,90 | Pacote mensal |
| Pacote +300 WhatsApp API | R$ 24,90 | Repasse × 1,5–2 + margem |
| Pacote +500 SMS | R$ 19,90 | |

### 6.5 Trial (entrada)

| Item | Valor |
|------|--------|
| Duração | **14 ou 30 dias** |
| Grupos | 1 |
| Partidas | **1/semana** ou 4/mês |
| Boleiros | 15–20 (teste) ou 40 (se quiser conversão forte) |
| E-mail | 100 total no trial |
| SMS | 20 |
| WhatsApp API | **0** |
| Objetivo | Provar wizard + presença; upsell add-on WA |

### 6.6 Dono do Estádio e Combo

- **Dono do Estádio:** preço separado (R$ 29,90+); quotas de mensagem **não** misturar com presidente ou cobrar combo com teto claro.
- **Combo:** somar entitlements, não “ilimitar” mensageria.

---

## 7. Enforcement (checklist de implementação)

Ao criar partida / enviar convite / rodar job 24h:

1. Resolver plano + quotas restantes do presidente.
2. Se `emailQuota` esgotada → só SMS/WA conforme regra ou bloquear com mensagem “upgrade”.
3. Se `whatsappQuota` esgotada → lembrete 24h vira **SMS** ou só in-app ao presidente.
4. Contar **1 envio** por destinatário por tipo, não por tentativa de reenvio duplicado.
5. Logar falhas do provedor sem duplicar cobrança interna de quota.

Rotas sugeridas para checagem:

- `POST /api/partidas` (criação + disparo convites)
- `POST /api/partidas/:id/reenviar-convites`
- Job `rodarLembrete24h` em `notifications-jobs.ts` (estender para boleiros pendentes via fila)

---

## 8. Impacto na documentação e marketing

Atualizar quando planos forem implementados:

| Artefato | Ação |
|----------|------|
| `apps/web/app/(conta)/planos/planos-client.tsx` | Trocar “Ilimitados” por quotas desta política |
| `docs/documentacao-usuario-final.md` §10 e §11 | Referenciar este doc; corrigir trial/planos |
| `docs/divulgacao-instagram-presidente-cards.md` | Não prometer “WhatsApp automático ilimitado” |
| `Prompt/rachaoapp-prd-v1.md` | Alinhar § planos e § notificações (V2) |

Texto sugerido para usuário final:

> *Convites por e-mail. Quem não tem e-mail recebe SMS. Lembrete final por WhatsApp só para quem ainda não confirmou — incluso no plano Pro ou pacote à parte. Você também pode enviar pelo seu WhatsApp a qualquer momento (grátis).*

---

## 9. Provedores (a definir)

| Canal | Provedor candidato | Variável de ambiente |
|-------|-------------------|----------------------|
| E-mail | Resend (atual) | `RESEND_API_KEY` |
| SMS | Zenvia / Twilio / TotalVoice | `SMS_PROVIDER_*` |
| WhatsApp API | Meta Cloud API + BSP | `WHATSAPP_*` |

Modo simulado (como e-mail hoje) quando chaves ausentes — não consumir quota em dev.

---

## 10. Histórico de decisões

| Data | Decisão |
|------|---------|
| 2026-05 | Funil: 1º toque e-mail/SMS; lembrete final WA só pendentes (~24h); `wa.me` grátis; planos com quotas, sem ilimitado em mensageria paga |
| 2026-05 | Presidente Starter: 1 grupo, 4 partidas/mês, 40 boleiros; extras pagos |

---

## Apêndice — Mapa evento × canal

| Evento | E-mail | SMS | WA API | wa.me | In-app |
|--------|--------|-----|--------|-------|--------|
| Convite inicial | ✓ | fallback | — | ✓ manual | — |
| Reenvio convite | ✓ | fallback | — | ✓ manual | — |
| Lembrete 48h pendente | ✓ | fallback | — | — | presidente |
| Lembrete 24h pendente | opcional | se sem WA quota | ✓ | — | presidente |
| Lista espera promovido | ✓ | opcional | add-on | ✓ | presidente |
| Vaquinha cobrança | — | — | add-on | ✓ | presidente |
| Presença confirmada | — | — | — | — | presidente |

---

*Documento de produto. Valores em R$ e quotas são proposta até cotação de provedores e testes de conversão.*
