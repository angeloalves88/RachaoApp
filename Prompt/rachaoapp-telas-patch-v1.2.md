# RachãoApp — Patch de Telas v1.2: Vaquinha + Convidados

> **Atualização sobre:** T12, T13 (Steps 1, 3 e 5), T23, T24, T25  
> **Data:** Maio de 2026

---

## T12 — Adicionar / Editar Boleiro — REVISADO

### Mudança: busca por celular antes de cadastrar

**Novo fluxo de adição:**

**Passo 1 — Busca:**
- Campo único inicial: "Celular do boleiro" com máscara `(XX) XXXXX-XXXX`
- Botão: "Buscar"
- **Se encontrar cadastro existente:**
  - Card de resultado: avatar com inicial + nome + apelido + "X partidas como convidado"
  - Botão: "Adicionar este boleiro ao grupo" (laranja)
  - Link: "Não é esta pessoa? Cadastrar novo"
- **Se não encontrar:**
  - Mensagem: "Nenhum boleiro encontrado com este número"
  - Botão: "Cadastrar novo boleiro" → abre o formulário completo

**Passo 2 — Formulário (apenas se não encontrado ou cadastro novo):**
- Celular já preenchido (vindo do passo 1)
- Nome completo (obrigatório)
- Apelido (opcional)
- Posição preferida: GOL / ZAG / MEI / ATA
- E-mail (opcional)

**Nota:** O campo celular é obrigatório (substitui WhatsApp como campo principal)

---

## T13 — Wizard de Criação de Partida — REVISADO

### Step 1 — Dados Básicos (atualizado)

**Campo adicionado após "Tempo total do evento":**

- **Tipo de cobrança** (obrigatório):
  - Seletor segmentado: "💳 Por Partida" / "📅 Mensalidade"
  - **Se "Por Partida":**
    - Hint: "Apenas boleiros confirmados nesta partida serão cobrados"
  - **Se "Mensalidade":**
    - Hint: "Todos os boleiros fixos do grupo pagam o mês de [Mês atual], mesmo que não joguem"
    - Banner informativo amarelo: "A mensalidade de [Mês] já foi gerada para este grupo" (se já existir cobrança do mês)
  - Se o grupo tem padrão configurado: vem pré-selecionado com badge "padrão do grupo"

---

### Step 3 — Boleiros e Convidados (atualizado)

**Seção B — Convidados avulsos (REVISADO):**

**Novo fluxo de adição de convidado:**

1. Botão "＋ Adicionar convidado" abre mini-formulário inline
2. **Campo inicial:** "Celular do convidado" com máscara
3. Ao digitar 11 dígitos → busca automática (sem precisar clicar em botão)
4. **Se encontrar:**
   - Card de resultado inline: nome + apelido + "Já jogou X vezes como convidado"
   - Botão "Adicionar" (verde)
5. **Se não encontrar:**
   - Campos expandem: Nome (obrigatório) + Apelido (opcional) + Posição (opcional)
   - Botão "Adicionar convidado"
6. Convidado adicionado aparece na lista com:
   - Nome + apelido + posição
   - Badge laranja "Convidado"
   - Valor que vai pagar: "R$ [valor avulso]" (definido no step 5)
   - Botão remover (X)

**Nota sobre convidados e mensalidade:**
- Se tipo de cobrança = Mensalidade: badge informativo nos convidados: "Paga por partida — R$ [valor a definir no step 5]"

---

### Step 5 — Vaquinha (REVISADO)

**Layout quando tipo = "Por Partida":**
- Valor por boleiro fixo: R$
- Valor por convidado avulso: R$ (campo separado obrigatório se houver convidados)
- Chave Pix
- Data limite de pagamento

**Layout quando tipo = "Mensalidade":**
- **Card informativo no topo:**
  > "📅 Mensalidade de [Mês Atual]
  > Todos os X boleiros fixos do grupo serão cobrados independente de comparecerem."
- Valor da mensalidade (por boleiro fixo): R$
- **Separador visual: "Convidados Avulsos — cobrados por partida"**
- Valor por convidado avulso: R$ (campo separado — sempre por partida)
- Chave Pix (única para ambos os tipos)
- Data limite — mensalidade: padrão último dia do mês / partida avulsa: data da partida

**Preview ao vivo (mensalidade):**
```
Mensalidade: X boleiros × R$ Y = R$ Total
Convidados:  Z convidados × R$ W = R$ Subtotal
─────────────────────────────────────────
Total esperado: R$ [soma]
```

---

## T23 — Gerenciar Vaquinha — REVISADO

### Mudança: contexto visual diferente por tipo de cobrança

**Header adicional (abaixo do título):**
- Badge tipo: "💳 Por Partida" ou "📅 Mensalidade — [Mês Ano]"

**Card de resumo financeiro:**
- Mantém estrutura atual, mas com contexto do tipo:
  - Por Partida: "Arrecadado desta partida"
  - Mensalidade: "Mensalidade de [Mês] — X boleiros fixos"

**Lista de boleiros — separação visual:**

Quando mensalidade, a lista é dividida em duas seções:

**Seção 1: Boleiros Fixos — Mensalidade [Mês]**
- Todos os boleiros ativos do grupo
- Valor cobrado: R$ [valor_mensalidade]
- Status: Pago / Pendente / Inadimplente

**Seção 2: Convidados desta Partida — Por Partida**
- Apenas os convidados avulsos desta partida
- Valor cobrado: R$ [valor_convidado]
- Status: Pago / Pendente

**Separador entre seções** com título e contador de cada

**Quando Por Partida:**
- Lista única sem separação
- Badge de tipo em cada item: "Fixo" ou "Convidado"

---

## T25 — Configurar Vaquinha (Modal) — REVISADO

**Campos reorganizados por tipo:**

**Toggle principal:** "Configurar vaquinha para esta partida"

**Quando ativado:**

**Tipo (vem do Step 1, somente-leitura aqui):**
- Badge: "💳 Por Partida" ou "📅 Mensalidade"
- Link: "Alterar tipo → editar partida"

**Chave Pix** (obrigatório): tipo + valor

**Se Por Partida:**
- Valor por boleiro fixo: R$
- Valor por convidado avulso: R$
- Data limite: date picker

**Se Mensalidade:**
- Valor da mensalidade (por boleiro fixo): R$
- Mês de referência: somente-leitura (gerado automaticamente)
- Separador "Convidados desta partida"
- Valor por convidado avulso (por partida): R$
- Data limite da mensalidade: padrão último dia do mês
- Data limite convidados: padrão data da partida

**Preview ao vivo:** cálculo conforme tipo

---

## T11 — Ficha do Boleiro — REVISADO

### Histórico Financeiro (seção atualizada)

**Tabs dentro da seção financeira:**
- "Por Partida" | "Mensalidades"

**Tab Por Partida:**
- Lista de partidas com cobrança individual
- Data + valor + status (Pago / Pendente)

**Tab Mensalidades:**
- Lista por mês: "Maio 2026 — R$ X — Pago em DD/MM"
- Meses em aberto destacados em vermelho
- Total em aberto consolidado no topo

**Banner de inadimplência (atualizado):**
- Por Partida: "💸 Vaquinha em aberto — partida de [data]"
- Mensalidade: "💸 Mensalidade em aberto — [Mês]"
