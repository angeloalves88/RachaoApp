# QA — Bloco 7: Vaquinha (T23/T24/T25)

> Casos de teste manuais para validar o fluxo financeiro da partida.

## Setup

1. Logado como Presidente de um grupo com ao menos 6 boleiros fixos.
2. Criar uma partida com vaquinha desativada (não preencher Step 5).
3. Criar outra partida com vaquinha ativada (Step 5 preenchido, R$ 20 fixo).

---

## T25 — Configurar Vaquinha

### Caso A — Criar vaquinha em partida que não tinha
1. Abra `/partidas/{id}/vaquinha` da partida criada SEM vaquinha.
2. Estado vazio: "Nenhuma vaquinha configurada" + botão "Configurar vaquinha".
3. Clique em "Configurar vaquinha" → modal abre.
4. Preencha: tipo CPF, chave `12345678900`, valor R$ 25.
5. Salvar → toast "Vaquinha criada", tela recarrega com pagadores listados.

### Caso B — Editar vaquinha existente
1. Abra a vaquinha de uma partida que já tinha.
2. Menu (⋮) → "Editar configurações" → modal abre com valores atuais.
3. Mude o valor para R$ 30 → Salvar → toast "Configurações atualizadas".
4. Pagamentos pendentes devem refletir o novo valor (R$ 30).
5. Pagamentos já marcados como `pago` NÃO devem mudar (mantém histórico).

### Caso C — Remover vaquinha
1. Menu (⋮) → "Remover vaquinha" → confirm() do browser.
2. Confirmar → toast "Vaquinha removida".
3. Tela volta para estado vazio.

---

## T23 — Gerenciar Vaquinha (lista + pagamentos)

### Caso D — Marcar como pago + desfazer
1. Abra a vaquinha com pagadores pendentes.
2. Clique no botão ✓ verde de um pagador.
3. **Esperado:** linha muda para "Pago em DD/MM" (verde) imediatamente.
4. Toast aparece "[Nome] marcado como pago" + botão "Desfazer" (10s).
5. Clique em "Desfazer" → linha volta a pendente.
6. Toast "Pagamento desfeito".

### Caso E — Copiar chave Pix
1. No card de resumo, clique em "Copiar".
2. Toast "Chave Pix copiada".
3. Cole em outro app — chave deve estar correta.

### Caso F — Filtros por tab
1. Tabs: Todos / Pagos / Pendentes / Inadimplentes.
2. Marque 2 pagadores como pagos.
3. Tab "Pagos" → mostra só os 2 pagos.
4. Tab "Pendentes" → mostra os outros.
5. Tab "Todos" → mostra todos.

### Caso G — Inadimplente automático
1. Edite a vaquinha definindo data limite como ontem.
2. Recarregue a página (GET sincroniza pagamentos).
3. **Esperado:** pagadores `pendente` mudam para `inadimplente` (badge vermelha).
4. Pill "Inadimplentes" reflete o count.
5. Marcar um inadimplente como pago ainda funciona normalmente.

### Caso H — WhatsApp individual
1. Clique no botão de WhatsApp ao lado de um pagador pendente.
2. **Esperado:** abre nova aba `wa.me/55XXXXXXXXXXX?text=...` com mensagem pré-preenchida.
3. Se o pagador não tem celular válido (11 dígitos), toast "Boleiro sem WhatsApp válido".

---

## T24 — Cobrança em lote

### Caso I — Cobrar todos pendentes
1. Com ao menos 3 pendentes, clique no FAB "Cobrar X pendente(s)".
2. Sheet abre com modo "Pendentes" pré-selecionado.
3. Mensagem padrão visível com tags `[Nome] [data] [X] [chave]`.
4. Clicar "Enviar para X" → abre 1 aba por boleiro com intervalo curto.
5. Toast "X cobranças abertas no WhatsApp".

### Caso J — Modo manual
1. Trocar modo para "Manual".
2. Lista de pagadores (não pagos) com checkboxes.
3. Selecionar 2.
4. Botão muda para "Enviar para 2".
5. Confirmar abre 2 abas.

### Caso K — Mensagem editada
1. Editar a mensagem (ex.: adicionar emoji extra).
2. Tags continuam funcionando — cada aberta deve ter `[Nome]` substituído pelo nome do boleiro correspondente.

### Caso L — Boleiros sem WhatsApp
1. Cadastre 1 boleiro só com email no grupo (sem celular válido).
2. Marcar pago/pendente vai criar Pagamento.
3. Ao tentar cobrar em lote, aviso amarelo "X boleiro(s) sem WhatsApp não receberão a cobrança".
4. Botão envia apenas para os com WhatsApp válido.

---

## Sincronização

### Caso M — Confirma presença → cria pagamento
1. Crie partida com vaquinha ativa.
2. Boleiro fixo está como `pendente` no convite.
3. Boleiro confirma via link público.
4. Abra `/partidas/{id}/vaquinha`.
5. **Esperado:** o boleiro confirmado aparece na lista, status `pendente` (precisa pagar).

### Caso N — Novo boleiro adicionado ao grupo
1. Em uma partida agendada com vaquinha ativa, vá em "Boleiros do grupo".
2. Adicione um novo boleiro.
3. Volte para `/partidas/{id}/vaquinha`.
4. **Esperado:** novo boleiro aparece na lista de pagadores (status pendente).

### Caso O — Recusa libera vaga (não cria pagamento adicional)
1. Boleiro X confirma → cria pagamento pendente.
2. Boleiro X muda para "Recusado" via link público.
3. **Esperado:** pagamento ainda existe (histórico), mas não é mostrado se X está fora.
   - Observação: sincronização atual mantém o Pagamento mesmo após recusa (histórico). Aceitável.

---

## Edge cases

### Caso P — Vaquinha sem boleiros
1. Crie vaquinha em partida sem confirmados ainda (todos pendentes).
2. Pagadores listados = todos pendentes.
3. Total esperado refletido corretamente.

### Caso Q — Editar valor com pagamentos já realizados
1. Marque 2 boleiros como pagos com valor R$ 20.
2. Edite vaquinha para R$ 30.
3. **Esperado:** boleiros já pagos continuam com valor R$ 20 (histórico).
4. Pendentes atualizam para R$ 30.
5. Total esperado/arrecadado reflete os valores corretos.

---

## Smoke final

- [ ] Criar vaquinha, marcar 3 pagos, cobrar 2 pendentes em lote.
- [ ] Sem erros no console / network.
- [ ] Voltar para `/partidas/{id}` mostra card "Vaquinha" com totais corretos.
- [ ] Card de Vaquinha em `/partidas/{id}` está visível e clicável em qualquer status (agendada / em_andamento / encerrada).
