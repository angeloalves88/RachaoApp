# QA — Fase 3 (Bloco 3 · Agendamento de Partida)

Cobre as telas:

- **T13** — `/partidas/nova` — Wizard de criação de partida (6 steps)
- **T14** — `/partidas/[id]` — Detalhe da partida (header + cards de ação + seções)

> **Smoke E2E — 10/05/2026:** rodada com `python smoke.py --headless`,
> **13/13 passos verdes** em ~40s. Os passos 09 (criar partida) e 10
> (validar detalhe) cobrem o fluxo feliz com defaults — sem vaquinha,
> sem regras especiais, sem recorrência, com 1 boleiro selecionado via
> "Selecionar todos". Itens marcados com `[x]` abaixo são exercitados
> pelo smoke; os demais (negativos, formulários condicionais e edge cases)
> seguem manuais.
>
> Ambiente verificado também via `pnpm -r typecheck` (4/4 OK) e
> `pnpm --filter web lint` (sem warnings/erros).

---

## 3.0 Decisões aplicadas neste bloco

- **Envio de convites:** wired ao **Resend** via `apps/api/src/lib/email.ts`.
  Sem `RESEND_API_KEY` o servidor entra em modo simulado (apenas loga). Webhook
  em `POST /api/webhooks/resend` (validação de assinatura ainda não final).
- **Estádio cadastrado:** Step 2 do wizard exibe o toggle, mas leva a uma
  tela em branco com badge "Em breve". Fluxo de aprovação ficará para o módulo
  de Estádio dedicado.
- **Recorrência (Bloco 3, ajuste pós-plan):** Step 1 ganhou toggle "Repetir
  toda semana" + stepper de ocorrências; criação dispara N partidas
  ligadas por `Partida.serieId`. Cancelamento aceita `?escopo=apenas|serie`.

---

## 3.1 Wizard — Step 1 (Dados básicos)

- [x] Acessar `/partidas/nova` autenticado leva ao wizard.
- [x] Sem grupos, redireciona para `/grupos/novo`.
- [x] Header com botão **X** (sair) e StepperBar 1/6 visíveis.
- [x] Selecionar data/horário e avançar para Step 2 (validação ok).
- [ ] Tentar avançar com data no passado bloqueia com mensagem.
- [ ] Selecionar 3 ou 4 times exibe a dica "o que perder sai e o próximo entra".
- [ ] Stepper de "Boleiros por time" aceita só 3..11 (limites visíveis).
- [ ] Tempo total < 2× tempo de partida mostra alerta amarelo.
- [ ] Trocar de grupo no select reseta corretamente os boleiros do step 3.
- [ ] Toggle "Repetir toda semana" habilita stepper de ocorrências (2..24).
- [ ] Wizard com recorrência ligada cria N partidas com mesmo `serieId`
      (validar via API `GET /api/partidas?grupoId=...`).

## 3.2 Wizard — Step 2 (Local)

- [x] Heading "Onde vai ser?" exibido.
- [x] Default é **Campo livre**; nome do local é editável.
- [ ] Toggle "Estádio cadastrado" aparece com badge "Em breve" e mostra placeholder.
- [ ] Avançar com Campo livre vazio bloqueia com mensagem.
- [ ] Cidade é opcional (avançar sem cidade funciona).

## 3.3 Wizard — Step 3 (Boleiros e convidados)

- [x] Heading "Quem vai jogar?" exibido.
- [x] "Selecionar todos" marca todos os boleiros do grupo.
- [x] Avançar com pelo menos 1 boleiro funciona.
- [ ] Avançar sem nenhum boleiro nem convidado bloqueia.
- [ ] Busca por nome/apelido filtra a lista.
- [ ] Adicionar convidado avulso com nome+celular cria item na lista.
- [ ] Adicionar convidado avulso só com e-mail também funciona.
- [ ] Convidado sem celular **e** sem e-mail bloqueia com erro inline.
- [ ] Selecionar mais boleiros que vagas aparece banner azul "lista de espera".
- [ ] Remover convidado (ícone X) atualiza contadores.
- [ ] Barra de progresso reflete (selecionados / vagas).

## 3.4 Wizard — Step 4 (Regras)

- [x] Heading "Como vai ser o jogo?" exibido.
- [x] Avançar sem ativar nenhuma regra funciona.
- [ ] Ativar "Cartão Azul" mostra stepper de duração (1..20 min).
- [ ] Ativar "Limite de pênaltis" mostra stepper de máximo por tempo (1..5).
- [ ] Switch on/off altera visual (fundo highlight + ícone laranja).

## 3.5 Wizard — Step 5 (Vaquinha)

- [x] Heading "Vai ter vaquinha?" exibido.
- [x] Toggle desativado por padrão; avançar sem ativar funciona.
- [ ] Ativar a vaquinha exibe formulário (chave Pix, valor, etc.).
- [ ] Selecionar tipo de chave Pix (CPF/CNPJ/telefone/email/aleatória) funciona.
- [ ] Diferenciar **Vaquinha desta partida** vs **Mensalidade** (mês);
      mensalidade cobra também convidados avulsos.
- [ ] "Mesmo valor para convidados" oculta o input adicional.
- [ ] Total esperado calcula `valor × n participantes`.
- [ ] Avançar sem chave Pix bloqueia.
- [ ] Avançar sem tipo de chave Pix bloqueia.

## 3.6 Wizard — Step 6 (Revisão)

- [x] Heading "Tudo certo?" exibido.
- [x] Botão "Criar partida e enviar convites" submete e redireciona para `/partidas/[id]`.
- [ ] Cards de cada seção exibem o resumo correto.
- [ ] Botão lápis em cada card volta para o step correspondente.
- [ ] "Criar sem enviar agora" (futuro) — não há diferença visual no V1.
- [ ] Saída via X mostra confirmação ("As informações não serão salvas.").
- [x] Estado do wizard é persistido no `localStorage` chave `rachao-partida-wizard`
      e é limpo após a criação bem-sucedida.
      *(o smoke valida o seed/limpeza ao percorrer o wizard até o sucesso)*

## 3.7 Detalhe (T14)

- [x] Badge **AGENDADA** azul exibido no hero header.
- [x] Local livre digitado aparece no header.
- [x] Seção "Boleiros" mostra ao menos um nome confirmado.
- [x] Card "Presenças" exibido na grade de ações.
- [ ] Status **EM ANDAMENTO** (laranja, pulsante) — exige mudança via API.
- [ ] Status **ENCERRADA** (cinza) — exige mudança via API.
- [ ] Status **CANCELADA** mostra banner vermelho no topo.
- [ ] Cards 2x2 mudam conforme o status (cancelada exibe "Reagendar", etc.).
- [ ] "Vaquinha" exibe barra de progresso e chave Pix (quando configurada).
- [ ] "Vaquinha" exibe "Sem vaquinha nesta partida" quando não configurada.
- [ ] Menu (⋮) abre com itens "Nova partida deste grupo" e "Cancelar partida".
- [ ] Cancelar partida (avulsa) exige confirmação e atualiza status para "cancelada".
- [ ] Cancelar partida em série abre dialog com opções "Apenas esta" e
      "Esta e todas as próximas da série".
- [ ] Botão voltar (←) leva para `/grupos/[id]`.
- [ ] Regras ativas aparecem como badges em "Regras ativas" (após criar com regras).
- [x] Hero da partida acessível direto via URL retornada do POST.

## 3.8 Convites e e-mails

- [ ] Sem `RESEND_API_KEY`, log da API mostra `[email/simulado]` para cada
      convite com email cadastrado.
- [ ] Com `RESEND_API_KEY` válida, e-mails reais são enviados (verificar inbox).
- [ ] Boleiros sem email cadastrado não geram tentativa de envio (silenciosamente).
- [ ] `POST /api/webhooks/resend` aceita JSON com `type` e `data.email_id` e
      registra log informativo.
- [ ] `POST /api/webhooks/resend` retorna 401 se `RESEND_WEBHOOK_SECRET` está
      definido e `svix-signature` ausente.

## 3.9 API — endpoints (testes via Insomnia/Bruno/curl)

- [ ] `POST /api/partidas` 401 sem JWT.
- [ ] `POST /api/partidas` 403 se usuário não é presidente do grupo.
- [ ] `POST /api/partidas` 400 com payload inválido (data passado, time count).
- [x] `POST /api/partidas` 201 com convites pendentes e (se vaquinha) vaquinha.
      *(coberto pelo smoke; resposta inclui `partida.id`, `convites[]`, `vaquinha`, `serie`)*
- [ ] Excedente da capacidade entra com `status=lista_espera` e `posicaoEspera` 1..N.
- [x] `GET /api/partidas/:id` retorna `resumo` com contadores corretos.
      *(usado pela página de detalhe e validado no step 10)*
- [ ] `GET /api/partidas?status=encerrada` filtra apenas as encerradas.
- [ ] `PATCH /api/partidas/:id` permite alterar regras e local.
- [ ] `DELETE /api/partidas/:id` muda status para `cancelada` (soft).
- [ ] `DELETE /api/partidas/:id?escopo=serie` cancela a corrente e todas as
      futuras pendentes da mesma série.
- [ ] `DELETE /api/partidas/:id?hard=true` exige papel `criador` e remove de fato.
- [ ] `POST /api/partidas/:id/convidados-avulsos` cria convidado e convite, ou
      reaproveita por celular único.
- [ ] `DELETE /api/partidas/:id/convites/:conviteId` remove o convite e
      promove a lista de espera (Bloco 4).

---

## Como rodar o smoke

```bash
cd scripts/e2e
python smoke.py            # browser visivel (default)
python smoke.py --headless  # headless (CI)
```

Ao final, todos os **13 steps** devem terminar com `[XX] OK`. O fluxo
de Bloco 3 corresponde aos steps **09 e 10**; após o `[10]` o smoke imprime
a URL do detalhe da partida criada (ex.: `http://localhost:3001/partidas/<id>`)
para reprodução manual dos cenários `[ ]` listados acima.
