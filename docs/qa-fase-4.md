# QA — Fase 4 (Bloco 4 · Presenças, Convites públicos e Notificações)

Cobre as telas:

- **T15** — `/partidas/[id]/presencas` — Lista de presença do Presidente.
- **T16** — Modal "Reenviar convites" (e-mail Resend + links `wa.me`).
- **T17** — `/notificacoes` + Sino no header (Presidente).
- **Confirmação pública** — `/confirmar/[token]` (boleiro) + endpoints
  `GET/POST /api/convites/publico/:token`.

> **Smoke E2E + smoke-api — 10/05/2026:** rodada com `python smoke.py --headless`
> **13/13 passos verdes** em ~40s; o passo **11** abre `/partidas/[id]/presencas`
> e valida heading/pills/tabs, e o passo **12** clica no sino e valida
> `/notificacoes`. Em paralelo, `powershell -File scripts/e2e/smoke-api.ps1`
> roda 11 casos contra a API e **todos passaram** (códigos 200/400/401/404
> conforme esperado). Itens marcados com `[x]` abaixo são automatizados;
> os `[ ]` permanecem manuais (regras de negócio que exigem fixtures
> específicas, links externos, multi-usuário).

---

## 4.0 Decisões aplicadas neste bloco

- **Confirmação pública:** o boleiro responde via `/confirmar/[token]` e o
  presidente vê a resposta refletida na T15. O presidente também pode
  sobrescrever manualmente o status pelo dropdown da linha.
- **Promoção da lista de espera:** automatizada — qualquer recusa, exclusão de
  convite ou troca para `lista_espera` dispara `promoverListaEspera()` e tenta
  preencher vagas usando a menor `posicaoEspera`. Promovidos recebem e-mail.
- **WhatsApp (T16):** sem provedor pago, geramos links `wa.me` com texto
  pré-preenchido e o navegador abre o primeiro automaticamente. Os demais
  ficam no resultado da chamada (toast informa quantos sobraram).
- **Jobs periódicos (T17 escopo médio):** plugin Fastify roda a cada
  `NOTIFICATION_JOBS_INTERVAL_MIN` (default 30 min) duas tarefas idempotentes:
  - `partida_24h`: lembrete às partidas agendadas em ~24h (janela 23h–25h).
  - `vaquinha_pendente`: vaquinhas com pagamento `pendente|inadimplente`,
    1× por dia por partida.
- **Categorias de notificação:** `partidas`, `financeiro`, `estadio`, `grupo`.
  As tabs em `/notificacoes` filtram por categoria.

---

## 4.1 API — Confirmação pública

- [ ] `GET /api/convites/publico/:token` retorna 200 com dados mínimos do
      grupo, partida, boleiro, status, `expirado`, `partidaCancelada` e
      `podeResponder`. *(precisa fixture com token válido)*
- [x] Token inexistente → 404. *(smoke-api: `GET .../INVALIDO` → 404)*
- [ ] Token expirado (`tokenExpiresAt` no passado) → `expirado=true` e
      `podeResponder=false`.
- [ ] Partida `cancelada` ou `encerrada` → `partidaCancelada=true`.
- [ ] `POST .../responder` com `status='confirmado'` atualiza convite e
      marca `confirmadoEm`.
- [ ] `POST .../responder` com `status='recusado'` libera vaga e promove o
      próximo da lista de espera (se houver).
- [ ] `POST .../responder` com link expirado → 410.
- [ ] `POST .../responder` em partida não-`agendada` → 409.
- [x] `POST .../responder` com token inexistente → 404.
      *(smoke-api: `POST .../INVALIDO/responder` → 404)*
- [x] `POST .../responder` com payload Zod inválido → 400.
      *(smoke-api: body `{"status":"INVALIDO"}` → 400)*
- [ ] Qualquer resposta cria `Notificacao` (categoria `partidas`) para os
      presidentes do grupo.

## 4.2 UI — `/confirmar/[token]`

- [ ] Acessando o link, exibe nome do grupo, data/hora formatada e local.
- [ ] Botões "Vou jogar" / "Não posso ir" enviam a resposta.
- [ ] Após responder, a tela mostra o badge atual (Confirmado/Recusado) e
      permite trocar enquanto o convite estiver válido.
- [ ] Recado opcional aparece de volta na próxima carga.
- [ ] Token expirado mostra estado dedicado (sem botões).
- [ ] Partida cancelada mostra estado dedicado.
- [ ] Página é responsiva e renderiza bem em mobile.

## 4.3 API — PATCH convite e reenvio (Presidente)

- [x] `PATCH /api/partidas/:id/convites/:conviteId` exige autenticação
      (401 sem JWT). *(smoke-api PASS)*
- [ ] `PATCH ...` retorna 403 se o usuário não é presidente do grupo.
- [ ] Mudar status para `recusado` libera vaga e dispara promoção da lista
      de espera.
- [ ] Promovidos recebem `Notificacao` (`lista_espera_promovido`) e e-mail
      de convite (se cadastrado).
- [x] `POST /api/partidas/:id/convites/reenviar` exige autenticação
      (401 sem JWT). *(smoke-api PASS)*
- [ ] Resend envia (ou simula) emails — verificar log com `[email/simulado]`.
- [ ] Canal `whatsapp` retorna `whatsappLinks[]` com `wa.me` válidos para
      cada celular cadastrado.
- [ ] Canal `both` envia e-mails **e** retorna links de WhatsApp.
- [ ] `mensagemPersonalizada` substitui o corpo padrão no e-mail.
- [ ] `DELETE /api/partidas/:id/convites/:conviteId` libera vaga e tenta
      promover a lista de espera.

## 4.4 UI — T15 (`/partidas/[id]/presencas`)

- [x] Header mostra nome do grupo + data/hora + botão de voltar.
      *(smoke step 11)*
- [x] Pills de resumo: Confirmados, Recusados, Pendentes, Lista de espera.
      *(smoke step 11 valida "Confirmados" e "Pendentes")*
- [ ] Barra de progresso reflete (confirmados+pendentes)/total.
- [ ] Banner "Partida completa" quando confirmados ≥ vagas.
- [ ] Banner "Você tem N vagas em aberto" quando confirmados < metade.
- [x] Tabs Todos/Confirmados/Pendentes/Recusados/Lista de espera filtram
      a lista. *(smoke step 11 valida `tab "Todos"`)*
- [ ] Linha mostra Avatar, nome, badge Fixo/Convidado, badge de status,
      links de WhatsApp/E-mail.
- [ ] Dropdown 3-pontos com: Marcar confirmado, Marcar recusado, Voltar
      para pendente, Reenviar convite, Remover da partida.
- [ ] Botão "Reenviar para pendentes" abre o modal já com pendentes
      selecionados.
- [ ] Partida `encerrada`/`cancelada` exibe lista somente leitura (sem
      ações).
- [ ] Acessar com `?reenviar=true` abre o modal automaticamente.

## 4.5 UI — T16 (Modal Reenviar convites)

- [ ] Chips: "Todos os pendentes (N)", "Todos os boleiros (N)",
      "Selecionar manualmente".
- [ ] Em modo manual, lista com checkboxes funciona.
- [ ] Segmented Canal: E-mail / WhatsApp / Ambos.
- [ ] Textarea de mensagem aceita até 500 caracteres.
- [ ] Em E-mail, toast confirma "N e-mails reenviados" e avisa quantos
      sem e-mail cadastrado.
- [ ] Em WhatsApp, abre nova aba para o primeiro link e informa quantos
      restam.
- [ ] Modal fecha automaticamente ao concluir.

## 4.6 API — Notificações

- [x] `GET /api/notificacoes` retorna 401 sem JWT. *(smoke-api PASS)*
- [ ] Com JWT, retorna paginada (default 30) ordenada por `criadoEm desc`.
- [ ] `categoria` filtra por categoria (todas, partidas, financeiro,
      estadio, grupo).
- [ ] `cursor` permite paginação infinita.
- [x] `GET /api/notificacoes/contagem` retorna 401 sem JWT. *(smoke-api PASS)*
- [ ] Com JWT, retorna `{ naoLidas }` com contagem real.
- [x] `PATCH /api/notificacoes/:id/lida` retorna 401 sem JWT.
      *(smoke-api PASS)*
- [ ] Marca uma como lida (ignora se já lida ou se for de outro usuário).
- [x] `POST /api/notificacoes/marcar-todas-lidas` retorna 401 sem JWT.
      *(smoke-api PASS)*
- [ ] Zera todas as não lidas do usuário autenticado.

## 4.7 UI — T17 (`/notificacoes` + sino)

- [x] Sino no header existe e leva a `/notificacoes` ao clicar.
      *(smoke step 12 abre `/notificacoes` via clique no sino)*
- [x] `/notificacoes` carrega o heading "Notificacoes". *(smoke step 12)*
- [ ] Badge mostra contagem de não lidas e atualiza a cada 60s e ao voltar
      o foco.
- [ ] Tabs "Todas / Partidas / Financeiro / Estádio" filtram corretamente.
- [ ] Item não lido tem destaque visual (`Nova` badge + fundo).
- [ ] Clicar em item com `link` navega e marca como lida.
- [ ] "Marcar todas como lidas" zera o badge.
- [ ] Empty state amigável quando não há notificações.

## 4.8 Jobs periódicos

- [ ] Subir a API com `ENABLE_NOTIFICATION_JOBS=true` cria notificações
      `partida_24h` para partidas agendadas em ~24h.
- [ ] Re-rodar o tick não duplica (dedup por `partidaId`+`tipo` em 48h).
- [ ] Vaquinhas com pagamentos pendentes geram `vaquinha_pendente` 1×/dia.
- [ ] `ENABLE_NOTIFICATION_JOBS=false` desliga ambos os jobs.

---

## 4.9 Smoke E2E

- [x] `scripts/e2e/smoke.py` agora roda **13 passos**, incluindo:
  - Step **11**: abre `/partidas/[id]/presencas` e valida heading +
    pills (Confirmados/Pendentes) + tab "Todos".
  - Step **12**: clica no sino do header (`a[aria-label*='otifica']`)
    e valida `/notificacoes`.
- [x] `scripts/e2e/smoke-api.ps1` cobre 11 casos de status HTTP nos
      endpoints novos (códigos 200/400/401/404). Para rodar:
      `powershell -File scripts/e2e/smoke-api.ps1`.

## 4.10 Verificação estática

- [x] `pnpm -r typecheck` — 4/4 OK (`@rachao/db`, `@rachao/shared`,
      `@rachao/api`, `@rachao/web`).
- [x] `pnpm --filter web lint` — sem warnings/erros (`next lint`).
- [ ] Lint do `apps/api` requer migração para `eslint.config.js` (ESLint v9);
      pendência herdada do bloco anterior, sem impacto em build/tests.
