# QA — Patch v1.2 (Telas + PRD): Vaquinha, Convidados, Boleiro

Roteiro de casos para validar o patch v1.2. Cobre tipo de cobrança no Step 1,
sincronização de pagamentos para mensalidade com dedupe por grupo/mês,
fluxo celular-first para convidados e boleiros, ficha financeira do boleiro
e regras de bloqueio por inadimplência.

## Setup

- Grupo A com 4 boleiros fixos ativos (B1, B2, B3, B4) e
  `tipoCobrancaPadrao = "mensalidade"`.
- Grupo B com 3 boleiros fixos ativos (C1, C2, C3) e
  `tipoCobrancaPadrao = "por_partida"` (ou null).
- Convidado avulso global X com celular conhecido (ex.: já criado por outra
  partida).
- Pré-condição: rodar `pnpm --filter @rachao/db db:push` ou aplicar migration
  para garantir a coluna `Vaquinha.dataLimitePagamentoConvidados`.

## 1. Wizard — Step 1 (tipo de cobrança)

1. Abrir `/partidas/nova` selecionando o grupo A.
2. Esperado: Step 1 inicia com o seletor "Mensalidade" marcado por padrão
   (vem de `tipoCobrancaPadrao`).
3. Trocar para "Por partida": o hint muda e o Step 5 (Vaquinha) deve mostrar
   o badge "Por partida" sem oferecer escolher o tipo.
4. Voltar para "Mensalidade" e prosseguir: o payload de criação envia
   `tipoCobranca: "mensalidade"` no nível da partida (independente da
   vaquinha estar ativa). Confirmar no DB que `Partida.tipoCobranca` foi
   persistido corretamente.

## 2. Wizard — Step 3 (convidado avulso celular-first)

1. No Step 3, abrir "Adicionar convidado".
2. Digitar 11 dígitos do convidado X já existente: após ~400 ms o card de
   resultado deve aparecer com nome, posição (se houver) e contagem de
   partidas como convidado.
3. Clicar em "Usar este cadastro": ele deve aparecer na lista de convidados
   com `convidadoAvulsoId` (não cria novo `ConvidadoAvulso`).
4. Voltar e digitar um celular sem cadastro: o form completo aparece para
   criar do zero.
5. Criar a partida; verificar que apenas um `ConvidadoAvulso` existe para o
   celular reutilizado.

## 3. Sincronização — Mensalidade + dedupe mensal

1. Criar partida P1 no grupo A com `mensalidade`, vaquinha ativa, valor fixo
   R$ 50 e valor convidado R$ 10. Confirmar 1 convidado avulso.
2. Esperado: ao abrir a vaquinha, todos os 4 boleiros fixos ativos têm um
   `Pagamento` pendente (independente de estarem na lista de convites de P1)
   e o convidado avulso confirmado também.
3. Criar segunda partida P2 no mesmo mês para o grupo A, também com
   `mensalidade`.
4. Esperado: nenhum dos boleiros B1–B4 recebe um segundo `Pagamento` em P2
   enquanto o de P1 estiver `pendente` ou `pago` (dedupe por
   grupo + `mesReferencia` + boleiro).
5. Marcar todos os pagamentos da P1 como `pago` e criar P3 ainda no mesmo
   mês: continua sem criar novos `Pagamento` (já há pago no mês para cada
   fixo).
6. Cancelar/excluir a vaquinha de P1 e sincronizar P3: agora os pagamentos
   devem ser criados em P3.

## 4. Vaquinha por partida — só confirmados

1. Criar partida no grupo B com `por_partida` e convites em estado
   `pendente`/`confirmado`/`lista_espera`.
2. Esperado: apenas convites `confirmado` geram `Pagamento`. Convites
   pendentes não criam cobrança.

## 5. Datas-limite

1. Mensalidade: ao salvar vaquinha sem preencher datas, conferir que
   `dataLimitePagamento` recebe o último instante do mês de referência e
   `dataLimitePagamentoConvidados` recebe o dia da partida (server-side).
2. Editar a vaquinha alterando os dois campos no modal T25: confirmar que
   ambos são persistidos.
3. Avançar manualmente o relógio (ou simular com data passada) e chamar
   `sincronizar-pagamentos`: fixos com prazo vencido viram `inadimplente`,
   convidados idem na própria data.

## 6. Tela T23 — vaquinha por partida vs mensalidade

1. Mensalidade: header tem o badge "Mensalidade", lista mostra o segmentado
   "Todos / Fixos / Convidados" e os filtros de status seguem funcionando.
2. Quando há outra vaquinha de mensalidade no mesmo mês do grupo, o aviso
   amarelo aparece logo abaixo do card.
3. Por partida: o segmentado "Fixos/Convidados" não é exibido.

## 7. Modal T25 — config da vaquinha

1. Abrir "Editar configurações": o tipo de cobrança aparece como badge e o
   campo de mensalidade some.
2. Tentar enviar payload com `tipoCobranca` divergente da partida no POST
   `/api/partidas/:id/vaquinha` (via cURL): deve retornar 400 com mensagem
   coerente.

## 8. T12 — Cadastro de boleiro com busca

1. Abrir "Adicionar boleiro" no grupo A.
2. Digitar 11 dígitos do convidado X (que ainda não é fixo): clicar
   "Buscar". O card "Já jogou aqui como convidado" deve aparecer.
3. Clicar "Cadastrar como fixo no grupo": o form abre com nome/posição
   pré-preenchidos e o WhatsApp travado no campo.
4. Digitar um celular de boleiro já existente no grupo: o card "Já existe
   boleiro com este contato no grupo" aparece (com link visual indicando
   editar pela lista).
5. Digitar celular novo, clicar "Não encontrado — cadastrar novo": o form
   completo abre vazio com WhatsApp pré-preenchido.

## 9. T11 — Ficha do boleiro / financeiro

1. Abrir a ficha do boleiro B1.
2. Conferir as duas abas "Por partida" e "Mensalidades".
3. Após rodar os passos 3 e 4, B1 deve ter pelo menos uma linha em
   "Mensalidades" e (se houve `por_partida`) outras em "Por partida".

## 10. Bloqueio por inadimplência

1. Ativar `bloqueio_inadimplente` na partida.
2. Mensalidade: deixar pagamento do mês de B1 como `pendente`/`inadimplente`
   em qualquer partida do mês. Tentar escalar B1 em outra partida do mesmo
   mês: deve aparecer como bloqueado.
3. Por partida: deixar pagamento `pendente`/`inadimplente` da partida atual.
   B1 deve ser bloqueado nesta partida (não em outras).

## Critérios de pronto

- Nenhum erro de TypeScript em `apps/api` e `apps/web`.
- DB com `dataLimitePagamentoConvidados` aplicado.
- Todos os passos acima reproduzíveis sem regressões em fluxos pré-v1.2.
