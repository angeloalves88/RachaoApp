# RachãoApp — Mapa de Telas — Blocos 3 e 4: Agendamento + Lista de Presença

> **Versão:** 1.0 | **Data:** Maio de 2026

---

# BLOCO 3 — Agendamento de Partida

---

## T13 — Criar Partida (Wizard Multi-Step)

**Propósito:** Guiar o Presidente pela criação completa de uma partida em etapas claras e progressivas.  
**URL:** `/partidas/nova`  
**Acesso:** Presidente / Co-Presidente autenticado

### Estrutura do Wizard

```
Step 1 — Dados básicos
Step 2 — Local
Step 3 — Boleiros e convidados
Step 4 — Regras da partida
Step 5 — Vaquinha (opcional)
Step 6 — Revisão e confirmação
```

**Barra de progresso no topo:** indicador visual dos 6 steps com label do step atual.  
**Navegação:** botão "Continuar" avança, botão "Voltar" retrocede sem perder dados.  
**Saída:** botão X no canto superior direito — modal de confirmação "Deseja sair? As informações não serão salvas."

---

### Step 1 — Dados Básicos

**Título do step:** "Quando e como vai ser?"

**Campos:**
- **Data da partida** (obrigatório): date picker — calendário inline no mobile, popup no desktop
  - Não permite datas no passado
  - Destaca dia atual
- **Horário de início** (obrigatório): time picker em intervalos de 15 minutos
- **Número de times** (obrigatório): seletor segmentado — 2 / 3 / 4
  - Hint contextual: "Com 3+ times, o que perder sai e o próximo entra"
- **Boleiros por time** (obrigatório): seletor numérico com - e + — range 3 a 11
  - Calcula automaticamente: "Total de vagas: X boleiros"
- **Tempo por partida** (obrigatório): seletor numérico — 10 / 15 / 20 / 25 / 30 min (ou personalizado)
- **Tempo total do evento** (obrigatório): seletor numérico em minutos — 60 / 90 / 120 (ou personalizado)
  - Hint de consistência: se tempo total < tempo por partida × número mínimo de jogos, exibe aviso amarelo

**Botão:** "Continuar"

---

### Step 2 — Local

**Título do step:** "Onde vai ser?"

**Opção A — Campo livre (padrão):**
- Input texto: "Nome ou endereço do local"
- Campo cidade: auto-preenchido pelo perfil, editável

**Opção B — Estádio cadastrado na plataforma:**
- Toggle/aba: "Usar estádio cadastrado no RachãoApp"
- Barra de busca: "Buscar estádio por nome ou cidade"
- Cards de resultado: nome + endereço + tipo de piso + foto miniatura
  - Badge de disponibilidade: "✅ Disponível neste horário" ou "⚠️ Horário não confirmado"
- Ao selecionar: exibe detalhes do estádio selecionado + nota "O Dono do Estádio precisará aprovar o vínculo"

**Botão:** "Continuar"

---

### Step 3 — Boleiros e Convidados

**Título do step:** "Quem vai jogar?"

**Seção A — Boleiros do grupo:**
- Lista completa dos boleiros ativos do grupo com checkbox
- Seleção rápida: "Selecionar todos" / "Limpar seleção"
- Busca inline por nome/apelido
- Indicadores visuais junto a cada boleiro:
  - 🔴 Bloqueado (vermelho) — cartão vermelho na última partida (se regra ativa)
  - 💸 Inadimplente (amarelo) — vaquinha em aberto (se regra ativa)
  - Boleiros bloqueados: checkbox desabilitado com tooltip explicando o motivo
- Contador no topo: "X selecionados de Y vagas"
- Barra de progresso: vagas preenchidas vs total

**Seção B — Convidados avulsos:**
- Título: "Adicionar convidados para esta partida"
- Hint: "Convidados não fazem parte do grupo fixo — apenas desta partida"
- Botão: "＋ Adicionar convidado"
  - Mini-formulário inline: Nome + WhatsApp ou E-mail + Posição (opcional)
- Lista de convidados adicionados com botão de remover (X)

**Lista de espera:**
- Se número de selecionados > total de vagas: excedentes entram automaticamente na lista de espera
- Banner informativo: "X boleiros na lista de espera — serão notificados se uma vaga abrir"

**Botão:** "Continuar"

---

### Step 4 — Regras da Partida

**Título do step:** "Como vai ser o jogo?"

**Apresentação:** Grid de cards de regras, cada um com toggle on/off

| Card de Regra | Ícone | Título | Descrição curta |
|---------------|-------|--------|-----------------|
| Cartão Azul | 🟦 | Cartão Azul | Suspensão temporária em vez de expulsão |
| Bloqueio Vermelho | 🟥 | Bloquear após vermelho | Quem levou vermelho na última partida não joga |
| Bloqueio Inadimplente | 💸 | Bloquear inadimplente | Boleiro com vaquinha em aberto não é escalado |
| Gol Olímpico Duplo | ⭐ | Gol olímpico vale 2 | Gol direto de escanteio conta como dois |
| Impedimento | 🚩 | Impedimento ativo | Regra de offside aplicada |
| Obrigatoriedade de Goleiro | 🧤 | Goleiro obrigatório | Todo time precisa de um goleiro escalado |
| Time Incompleto Joga | ⚽ | Time incompleto joga | Partida não cancela com um time menor |
| Limite de Pênaltis | 🥅 | Limite de pênaltis | Máximo de cobranças de pênalti por tempo |

**Cartão Azul (expansão ao ativar):**
- Campo extra: "Duração da suspensão" — seletor numérico — 2 / 3 / 5 / 10 minutos

**Limite de Pênaltis (expansão ao ativar):**
- Campo extra: "Máximo por tempo" — seletor numérico — 1 / 2 / 3

**Dica na parte inferior:** "Estas regras podem ser editadas até o início da partida"

**Botão:** "Continuar"

---

### Step 5 — Vaquinha (Opcional)

**Título do step:** "Vai ter vaquinha?"

**Toggle principal:** "Configurar vaquinha para esta partida" (off por padrão)

**Quando ativado — campos exibidos:**
- **Chave Pix** (obrigatório se ativar): input texto
  - Tipos: CPF / CNPJ / Telefone / E-mail / Chave aleatória — seletor + input
- **Valor por boleiro fixo** (obrigatório): input numérico com prefixo "R$"
- **Valor para convidados avulsos**: input numérico com prefixo "R$"
  - Toggle: "Mesmo valor dos boleiros fixos" (atalho)
- **Tipo de cobrança**: seletor segmentado — "Por esta partida" / "Mensalidade"
- **Data limite de pagamento**: date picker — padrão: dia da partida

**Preview automático:**
- Cálculo ao vivo: "Total esperado: R$ X,00 (Y boleiros × R$ Z,00)"

**Nota:** "O controle de pagamentos é manual — você marca quem pagou depois da partida"

**Botão:** "Continuar" (ou "Pular" se toggle desativado)

---

### Step 6 — Revisão e Confirmação

**Título do step:** "Tudo certo?"

**Card de revisão completo:**

**Seção: Quando e como**
- Data, horário, número de times, boleiros por time, tempo por partida, tempo total

**Seção: Local**
- Nome/endereço ou nome do estádio vinculado (com badge de status de aprovação se aplicável)

**Seção: Boleiros confirmados**
- Avatares/iniciais dos X primeiros + "e mais N" + total
- Convidados avulsos listados separadamente

**Seção: Regras ativas**
- Lista compacta de badges das regras ligadas (apenas as ativas)
- Se nenhuma: "Nenhuma regra especial"

**Seção: Vaquinha**
- Se configurada: chave Pix + valores + tipo
- Se não: "Sem vaquinha nesta partida"

**Botão de edição em cada seção:** ícone lápis → volta para o step correspondente

**Botão principal:** "Criar partida e enviar convites" (laranja, full width)
- Subtext abaixo: "X boleiros receberão o convite por WhatsApp/e-mail"

**Botão secundário:** "Criar sem enviar convites agora" (outline)

### Estados do Wizard
- **Dados obrigatórios faltando:** botão "Continuar" desabilitado + campos destacados em vermelho ao tentar avançar
- **Inconsistência de tempo:** aviso amarelo não bloqueante (pode continuar mesmo assim)
- **Estádio vinculado sem aprovação:** badge amarelo "Aguardando aprovação do Dono do Estádio" na revisão
- **Partida criada com sucesso:** toast "Partida criada! Convites enviados para X boleiros" + redirect para T14

---

## T14 — Detalhe da Partida

**Propósito:** Hub de gerenciamento de uma partida específica — todas as ações do Presidente antes, durante e depois do jogo.  
**URL:** `/partidas/[id]`  
**Acesso:** Presidente / Co-Presidente

### Layout

**Header da partida:**
- Badge de status: "AGENDADA" (azul) / "EM ANDAMENTO" (laranja pulsante) / "ENCERRADA" (cinza)
- Data e horário em Barlow Condensed grande
- Local (clicável para abrir maps se endereço)
- Formato: "X times · Y boleiros · Z min"
- Menu (⋮): Editar partida / Cancelar partida / Compartilhar

**Cards de ação rápida (grid 2x2 — variam por status da partida):**

| Status | Card 1 | Card 2 | Card 3 | Card 4 |
|--------|--------|--------|--------|--------|
| Agendada | 👥 Presenças (X/Y) | ⚽ Escalação | 💰 Vaquinha | ✉️ Reenviar convites |
| Em andamento | 🔴 Ao vivo | ⚽ Escalação | 💰 Vaquinha | — |
| Encerrada | 📊 Resumo | 💰 Vaquinha | 🔁 Repetir partida | — |

**Seção: Boleiros confirmados**
- Lista compacta com status de cada boleiro: ✅ / ❌ / ⏳
- Link "Ver todos →" → T15 (Lista de Presença)

**Seção: Regras ativas**
- Badges compactos das regras ligadas

**Seção: Vaquinha (resumo)**
- Se configurada: barra de progresso "R$ X arrecadado de R$ Y esperado"
- Link "Gerenciar →" → T20 (Vaquinha)

### Estados
- **Partida cancelada:** banner vermelho no topo + botão "Reativar partida"
- **Com estádio vinculado não aprovado:** banner amarelo "Aguardando aprovação do Dono do Estádio"

---

# BLOCO 4 — Lista de Presença

---

## T15 — Gerenciar Presenças

**Propósito:** Visualizar e controlar a confirmação de presença de todos os boleiros de uma partida.  
**URL:** `/partidas/[id]/presencas`  
**Acesso:** Presidente / Co-Presidente

### Layout

**Header:**
- Título: "Lista de Presença"
- Subtítulo: "[Nome do grupo] · [Data da partida]"
- Botão: "＋ Adicionar convidado" (adiciona avulso diretamente desta tela)

**Painel de resumo (4 pills horizontais):**
- ✅ Confirmados: X (verde)
- ❌ Recusados: X (vermelho)
- ⏳ Pendentes: X (amarelo)
- 🪑 Lista de espera: X (cinza)

**Barra de progresso:**
- "X de Y vagas preenchidas" — barra laranja

**Filtros em tabs:** Todos | Confirmados | Pendentes | Recusados | Lista de espera

**Lista de boleiros:**

Cada item contém:
- Avatar com inicial
- Nome + apelido
- Tipo: badge "Fixo" (cinza) ou "Convidado" (laranja outline)
- Contato: ícone WhatsApp ou e-mail (clicável — abre app diretamente)
- Status: badge colorido — Confirmado / Recusado / Pendente / Lista de espera
- Mensagem do boleiro (se deixou recado): ícone de balão clicável → tooltip com texto
- Ações rápidas (swipe no mobile, hover no desktop):
  - ✅ Marcar como confirmado (manual)
  - ❌ Marcar como recusado (manual)
  - 📲 Reenviar convite
  - 🗑️ Remover da partida

**Boleiros bloqueados (se regra ativa):**
- Aparecem no fim da lista com ícone de cadeado 🔒
- Tooltip: "Bloqueado por [motivo]"
- Ação disponível: "Remover bloqueio manualmente" (Presidente pode sobrescrever)

**Botão flutuante (FAB) no mobile:**
- "📲 Reenviar para pendentes" — envia lembrete para todos com status Pendente

### Estados
- **Todas as vagas preenchidas:** banner verde "Partida completa! Todas as vagas confirmadas"
- **Menos da metade confirmado:** banner amarelo com sugestão "Você tem X vagas em aberto. [Reenviar convites pendentes]"
- **Lista de espera com vaga abrindo (alguém recusou):** banner azul "1 vaga abriu — [Nome] foi notificado da lista de espera"
- **Partida encerrada:** lista vira somente-leitura com banner "Presença final registrada"

---

## T16 — Reenviar Convites (Modal)

**Propósito:** Selecionar boleiros para reenvio de convite ou envio de lembrete.  
**URL:** modal em `/partidas/[id]/presencas`  
**Acesso:** Presidente / Co-Presidente

### Layout (sheet deslizante de baixo no mobile)

**Título:** "Reenviar convites"

**Seleção rápida (chips):**
- "Todos os pendentes" (pré-selecionado)
- "Todos os boleiros"
- "Selecionar manualmente"

**Lista de boleiros (se "selecionar manualmente"):**
- Checkboxes com nome + status atual

**Preview da mensagem:**
- Caixa de texto editável com mensagem padrão pré-preenchida:
  > "E aí, [Nome]! 👋 O Rachão de [data] tá chegando. Confirma se você vai? [link]"
- Hint: "O link de confirmação é único para cada boleiro"

**Canal de envio:**
- Toggle: "WhatsApp" / "E-mail" / "Ambos"
- Boleiros sem WhatsApp: apenas e-mail disponível (indicado visualmente)

**Botão:** "Enviar para X boleiros" (laranja)

### Estados
- **Nenhum boleiro com canal de contato:** botão desabilitado + mensagem "Adicione WhatsApp ou e-mail aos boleiros para enviar convites"
- **Envio em progresso:** spinner + "Enviando..."
- **Sucesso:** toast "Convites enviados para X boleiros"

---

## T17 — Notificações

**Propósito:** Central de notificações do Presidente — confirmações de presença, aprovações de estádio, pendências financeiras.  
**URL:** `/notificacoes`  
**Acesso:** Usuário autenticado (qualquer perfil)

### Layout

**Header:** "Notificações" + botão "Marcar todas como lidas"

**Filtro em tabs:** Todas | Partidas | Financeiro | Estádio

**Lista de notificações:**

Cada item:
- Ícone colorido por tipo: ✅ presença / 💰 financeiro / 🏟️ estádio / ⚠️ alerta
- Texto da notificação (ex: "João Silva confirmou presença no Rachão de sábado")
- Timestamp relativo: "há 5 min" / "ontem"
- Fundo levemente destacado se não lida
- Toque → navega para a tela relacionada

**Tipos de notificação V1:**
- Boleiro confirmou/recusou presença
- Vaga abriu na lista de espera
- Dono do Estádio aprovou/recusou vínculo
- Vaquinha pendente (lembrete automático)
- Partida em 24 horas (lembrete)
- Co-Presidente adicionado ao grupo

### Estados
- **Sem notificações:** ilustração central + "Tudo em dia por aqui!"
- **Loading:** skeletons de 5 itens
