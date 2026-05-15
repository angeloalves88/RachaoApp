# QA — Escalação v2 (reservas, DM, sync de boleiros, UX)

Checklist manual. Ambiente: API + web + Postgres. Usuário presidente com pelo menos um grupo, alguns boleiros e uma partida `agendada`.

> Antes de testar: aplicar migração com `pnpm --filter @rachao/db db:push` e regerar o client com `db:generate`. No Windows, parar o `pnpm dev` antes se ocorrer EPERM em `query_engine-windows.dll.node`.

## Fase A — Bugs corrigidos

### A1 — Modo manual: drop no primeiro time (Time A)

- [ ] Em `/partidas/:id/escalacao` aba **Manual**, arrastar um boleiro do **Disponíveis** sobre o **Time A** (primeiro card) faz o drop entrar no time, mesmo quando o pool está colado ao card.
- [ ] Repetir com **toque longo** no celular (~280ms) — drop em Time A funciona igual aos demais.
- [ ] Card de time inteiro é uma zona droppable (não só a lista interna): dropping sobre cabeçalho/cor também funciona.
- [ ] IDs dos containers começam com `col:` no DOM (verificável via DevTools); nenhum container colide com IDs de convite.

### A2 — Modo automático: limite por time e remoção

- [ ] `POST /api/partidas/:id/escalacao/sortear` distribui titulares respeitando `boleirosPorTime` (nenhum time excede o limite).
- [ ] Quando há **mais elegíveis que vagas** (titular + reserva), a resposta inclui `excedentes > 0` e a UI exibe um aviso amarelo no auto-mode.
- [ ] Após sortear, **Remover** está visível em cada card (antes era oculto) e remove o boleiro do draft local; **Confirmar escalação** salva sem ele.

## Fase B — `reservasPorTime`

### B1/B2 — Modelo e wizard

- [ ] Criar nova partida pelo wizard: step 1 mostra **Reservas por time** (default 0, máximo 5).
- [ ] Step 6 (revisão) mostra `N times × M boleiros por time + K reservas`.
- [ ] Step 3 (boleiros) calcula `capacidade = N × (M + K)` e indica corretamente quantos vão para lista de espera quando excede.
- [ ] Convite criado em lote: boleiros até a capacidade ficam `pendente`; o restante vai para `lista_espera` com `posicaoEspera` crescente.
- [ ] GET partida retorna `reservasPorTime` e `resumo.vagasTotais = N × (M + K)`.

### B3 — Lista de espera

- [ ] Boleiro recusa (`recusado`) → próximo da lista de espera é promovido a `pendente` até completar a nova capacidade total (titular + reserva).
- [ ] Boleiro marcado como `departamento_medico` → comportamento idêntico (libera vaga e promove).
- [ ] DM e recusados **não** contam como ocupados na promoção.

### B4/B5 — Save e UI duas listas

- [ ] Card de cada time no manual exibe duas sub-zonas: **Titulares (X/M)** e **Reservas (Y/K)** quando `reservasPorTime > 0`.
- [ ] Drag entre pool ↔ titulares ↔ reservas funciona; toasts respeitam os caps específicos de cada zona.
- [ ] No automático, botões **↓** (titular → reserva) e **↑** (reserva → titular) movem entre as listas, respeitando limites com toast.
- [ ] **Confirmar escalação** envia `conviteIds` (titulares) e `conviteIdsReservas` (reservas) no PUT.
- [ ] API rejeita time com mais que `boleirosPorTime` titulares ou `reservasPorTime` reservas com erro 400 e mensagem amigável.
- [ ] GET escalação devolve cada time com `conviteIds`, `conviteIdsReservas` e `boleiros[*].reserva` correto após reload.

## Fase C — Departamento médico

- [ ] Boleiro recebe convite e acessa `/confirmar/:token`. Aparecem três ações: **Vou jogar**, **Não posso ir** e **Estou no departamento médico**.
- [ ] Clicar em DM salva status `departamento_medico` (POST público). Badge muda para "Você está no departamento médico" (variante warning).
- [ ] Página de presenças do presidente tem aba **DM** e contagem dedicada (`resumo.departamentoMedico`).
- [ ] Menu de ações por boleiro permite **Marcar como DM** (presidente). Volta para `pendente` via "Voltar para pendente".
- [ ] Sorteio (POST `/escalacao/sortear`) usa apenas convites `confirmado`: boleiros em DM ficam de fora automaticamente.
- [ ] Listagem do GET escalação não inclui DM nos `elegiveis` (só `confirmado`).

## Fase D — Sync de novos boleiros

- [ ] Criar uma partida com 2-3 boleiros do grupo. Em seguida, adicionar um **novo boleiro** no grupo via `POST /api/grupos/:id/boleiros`.
- [ ] Resposta retorna `partidasAgendadasSincronizadas > 0` quando havia partidas `agendada` sem convite para esse boleiro.
- [ ] Abrir a partida criada: o novo boleiro aparece em **Presenças** com status `pendente` (sem precisar recriar a partida).
- [ ] Se a partida estava cheia (capacidade esgotada): novo boleiro entra em `lista_espera` com `posicaoEspera = max + 1`.
- [ ] Partidas `em_andamento`, `encerrada` ou `cancelada` não recebem novo convite.

## Fase E — Posição + ícones últimos 5

- [ ] Cada card no time (auto e manual) mostra ao lado do nome um badge com a posição (`GOL`/`ZAG`/`MEI`/`ATA`) quando preenchida.
- [ ] Mini-strip de 5 bolinhas aparece ao lado do nome:
  - **verde** = confirmou naquela partida encerrada;
  - **vermelho** = recusou;
  - **cinza** = pendente, DM, lista de espera ou sem convite.
- [ ] Ordem: mais antiga à esquerda, mais recente à direita. Convidados avulsos não exibem strip.
- [ ] GET escalação responde com `ultimasPartidas` (até 5) e `presencaUltimos5` por `boleiroGrupoId`.

## Fase F — Confirmação por partida

- [ ] Convite é **por partida**: cada link `/confirmar/:token` afeta apenas um `ConvitePartida`.
- [ ] Mudar resposta em uma partida não altera status em outras partidas do mesmo grupo.
- [ ] Reenviar convite (`POST /api/partidas/:id/convites/reenviar`) gera novo token para aquela partida apenas.

## Smoke final

- [ ] `pnpm -r typecheck` passa em todos os pacotes.
- [ ] Aplicar `pnpm --filter @rachao/db db:push` em ambiente fresh e rodar smoke completo: criar partida com `reservasPorTime=2`, confirmar 22 boleiros (3 times × 6 + 4 reservas = 22), sortear automático, verificar duas listas no card.
- [ ] Adicionar novo boleiro no grupo → ele aparece na partida agendada com status `pendente`.
- [ ] Boleiro confirma em uma partida e marca DM em outra — somente a segunda mostra DM.
