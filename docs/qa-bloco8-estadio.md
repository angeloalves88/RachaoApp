# QA — Bloco 8: Dono do Estádio (T26/T27/T28/T29/T30)

> Casos de teste manuais para validar o fluxo do perfil "Dono do Estádio".

## Setup

1. Usuário A: já cadastrado, ativado como **Presidente**.
2. Usuário B: cria conta nova e ativa o perfil **Dono do Estádio**.
3. Confirmar acesso ao bucket Supabase `estadios` para upload de fotos.
4. Confirmar que a migração com `publicoBuscas` e `SolicitacaoVinculo` foi aplicada.

---

## T27 — Perfil do Estádio (Informações / Fotos / Horários)

### Caso A — Cadastro inicial
1. Logar como Dono (B) e acessar `/estadio/perfil`.
2. Aba **Informações**: aparece como rascunho (ativo = false).
3. Preencher: nome, endereço, cidade, estado (UF), tipo, capacidade.
4. Selecionar 1 ou mais tipos de piso e comodidades.
5. Toggle "Aparecer em buscas" → ON.
6. Salvar → toast "Informações salvas".
7. Recarregar a página — campos persistem.
8. Verificar que o estádio agora é `ativo: true` no backend (`GET /api/me/estadio`).

### Caso B — Fotos
1. Aba **Fotos** → fazer upload de 2 imagens (PNG/JPG ≤ 5 MB).
2. Marcar a primeira como capa → preview atualiza.
3. Excluir uma foto → confirmar diálogo.
4. Tentar upload de arquivo > 5 MB → toast de erro.
5. Tentar upload de PDF → toast de erro (apenas imagens).
6. Recarregar — fotos persistem com a URL pública do bucket.

### Caso C — Horários
1. Aba **Horários** → marcar dias úteis (seg-sex) com 18:00-22:00, intervalo 60 min.
2. Adicionar bloqueio para o próximo sábado, motivo "Manutenção".
3. Salvar → toast "Horários atualizados".
4. Recarregar — horários e bloqueios persistem.

---

## T26 — Dashboard

### Caso D — Estado vazio
1. Logar como Dono sem ter configurado o estádio.
2. Acessar `/estadio/dashboard` → mostra "Complete seu estádio para ativá-lo".

### Caso E — Estado normal
1. Após configurar o estádio (Caso A), acessar o dashboard.
2. Cards visíveis: Próximas partidas (vazio se ainda não houve solicitação), Pendentes (badge laranja), Stats mensais.
3. Stats: deve mostrar 0 partidas/mês inicialmente, taxa de ocupação 0%.

---

## T28 — Agenda

### Caso F — Calendário do mês
1. Acessar `/estadio/agenda` → calendário mensal aparece centrado em hoje.
2. Dias com partidas aprovadas: indicador verde.
3. Dias com partidas pendentes: indicador laranja.
4. Datas bloqueadas (Caso C): indicador cinza/X.

### Caso G — Visão diária
1. Clicar em um dia com partida.
2. Lista cronológica das partidas do dia, com horário e grupo.
3. Bloqueios também aparecem listados com motivo.

---

## T29 — Solicitações

### Setup adicional
1. Como Presidente (A): criar uma partida, escolher "Estádio cadastrado" no Step 2 e selecionar o estádio do B.
2. Confirmar criação → cria `SolicitacaoVinculo` automaticamente.

### Caso H — Aprovar partida
1. Logar como Dono (B) e acessar `/estadio/solicitacoes`.
2. Tab "Pendentes" → aparece a solicitação do A com nome do grupo, data, capacidade.
3. Clicar **Aprovar** → toast "Partida aprovada".
4. Tab "Aprovadas" → item aparece lá.
5. Como Presidente (A), abrir a partida — `statusEstadio` deve ser `aprovado` (indicador verde no header).

### Caso I — Recusar partida com motivo
1. Criar outra solicitação como A.
2. Como B, clicar **Recusar** → modal abre com textarea.
3. Digitar motivo: "Horário em manutenção".
4. Confirmar → toast "Partida recusada".
5. Como A: notificação recebida e `statusEstadio` = `recusado`. Motivo visível.

### Caso J — Conflito de horário
1. Criar duas solicitações para o mesmo dia/horário com grupos diferentes.
2. Aprovar a primeira.
3. Abrir a segunda → banner amarelo "Conflito com outra partida aprovada".
4. Clicar Aprovar → confirm() do navegador alerta sobre conflito.
5. Confirmar → aprova mesmo assim (admin sabe o que está fazendo).

### Caso K — Cancelar aprovação
1. Tab "Aprovadas" → clicar **Cancelar aprovação**.
2. Prompt do navegador pede motivo (opcional).
3. Confirmar → toast "Aprovação cancelada".
4. Como Presidente: notificação recebida, `statusEstadio` = `cancelado`.

---

## T30 — Página pública

### Caso L — Estádio público visitado por anônimo
1. Sair da sessão (anônimo).
2. Acessar `/estadios/{slug}` do estádio do B.
3. Verificar: capa, nome, endereço, tipo de piso, comodidades, horários disponíveis, galeria.
4. CTA "Solicitar horário" presente.
5. Clicar → redireciona para `/login?redirect=...`.

### Caso M — Estádio inativo
1. No backend, desativar o `publicoBuscas` do estádio.
2. Reabrir `/estadios/{slug}` anonimamente → erro 404.

### Caso N — Integração com wizard
1. Logar como Presidente (A) e abrir `/estadios/{slug}` do estádio do B.
2. Clicar "Solicitar horário" → vai para `/partidas/nova?estadioId=...`.
3. Wizard inicia no Step 1 com o estádio pré-selecionado.
4. Step 2 mostra o estádio como "Estádio cadastrado" já preenchido.
5. Concluir o wizard → cria partida + solicitação automaticamente.

---

## T28 / T29 — Integrações cruzadas

### Caso O — Edição de horários afeta página pública
1. Como B, ir em `/estadio/perfil` → Aba Horários → adicionar segunda 18-22.
2. Anônimo, abrir `/estadios/{slug}` → segunda 18:00-22:00 aparece na lista.

### Caso P — Toggle de buscas
1. Em `/estadio/perfil` → desativar "Aparecer em buscas".
2. Como Presidente, ir em `/partidas/nova` → Step 2 → buscar pelo nome do estádio → não aparece.
3. Reativar — volta a aparecer.

---

## Smoke checks

- [ ] `pnpm --filter @rachao/api typecheck` passa
- [ ] `pnpm --filter @rachao/web typecheck` passa
- [ ] `pnpm prisma migrate status` (sem migrations pendentes)
- [ ] Bucket Supabase `estadios` com policy de leitura pública e write autenticado
