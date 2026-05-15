# RachãoApp — PRD Patch v1.2: Financeiro + Convidados + Multi-grupo

> **Atualização sobre:** Módulo Vaquinha, Cadastro de Convidados e Boleiro Multi-grupo  
> **Data:** Maio de 2026  
> **Aplica-se sobre:** rachaoapp-prd-v1.md (substitui seções 3.8 e parte da seção 6)

---

## Mudanças nesta versão

1. **Vaquinha:** dois modelos de cobrança — Por Partida e Mensalidade
2. **Convidado avulso:** cadastro global por celular, reutilizável entre partidas
3. **Boleiro multi-grupo:** clareza sobre isolamento de bloqueios e inadimplência por grupo

---

## 3.8 Módulo: Vaquinha (Financeiro) — REVISADO

### Tipos de cobrança

#### Por Partida
- Cada partida tem seu próprio valor de cobrança
- Somente boleiros **confirmados e presentes** na partida são cobrados
- Convidados avulsos sempre pagam por partida, com valor definido na criação do jogo
- Inadimplência é por partida — não quitou a partida X, está em aberto só para aquela

#### Mensalidade
- O grupo tem uma cobrança mensal fixa, independente do número de partidas no mês
- **Todos os boleiros fixos ativos do grupo pagam a mensalidade do mês**, mesmo que não tenham jogado nenhuma partida
- Gerada automaticamente no início de cada mês para todos os boleiros ativos do grupo
- Convidados avulsos **nunca entram na mensalidade** — sempre pagam por partida (valor definido na criação da partida)
- Inadimplência é por mês — boleiro em aberto no mês fica bloqueado em **todas** as partidas daquele mês no grupo

---

### Configuração da Vaquinha por Partida

| Parâmetro | Por Partida | Mensalidade |
|-----------|-------------|-------------|
| Chave Pix | ✅ obrigatório | ✅ obrigatório |
| Valor — boleiros fixos | Valor por partida | Valor da mensalidade do mês |
| Valor — convidados avulsos | Valor por partida (independente) | Valor por partida (independente) |
| Mês de referência | — | Preenchido automaticamente (ex: "Maio 2026") |
| Data limite de pagamento | Data da partida (editável) | Último dia do mês (editável) |
| Gera cobrança para quem | Confirmados na partida | Todos os boleiros ativos do grupo |

---

### Regras de Bloqueio por Inadimplência

| Tipo de cobrança | Quando bloqueia | Quando desbloqueia |
|-----------------|----------------|-------------------|
| Por Partida | Vaquinha daquela partida em aberto | Presidente marca como pago |
| Mensalidade | Mensalidade do mês atual em aberto | Presidente marca o mês como pago |

> **Importante:** bloqueio por inadimplência só se aplica quando a regra "Bloquear inadimplente" está ativa na partida.

---

### Configuração da Vaquinha no Wizard de Criação de Partida

O tipo de cobrança é definido no **Step 1 — Dados Básicos** da partida (não no step de vaquinha), pois impacta quem é cobrado e como.

**Campo adicionado ao Step 1:**
- **Tipo de cobrança:** seletor segmentado — "Por Partida" / "Mensalidade"
  - Se o grupo já tem um tipo padrão configurado, vem pré-selecionado
  - Hint para "Mensalidade": "Todos os boleiros fixos do grupo serão cobrados pelo mês [Mês atual], independente de comparecerem"
  - Hint para "Por Partida": "Apenas os boleiros confirmados nesta partida serão cobrados"

---

## 3.10 Módulo: Convidados Avulsos (NOVO)

### Conceito
Convidados avulsos são pessoas que jogam ocasionalmente mas **não fazem parte do grupo fixo**. Eles têm um **cadastro global** no RachãoApp — vinculado ao celular — que persiste entre partidas e grupos.

### Cadastro Global por Celular
- Ao adicionar um convidado avulso (em qualquer partida de qualquer grupo), o Presidente informa o **celular**
- O sistema busca se já existe um convidado com aquele celular
- **Se encontrar:** exibe nome + histórico de partidas — Presidente confirma e adiciona
- **Se não encontrar:** abre formulário para cadastrar: Nome + Celular + Apelido (opcional)
- O cadastro do convidado pertence ao app — fica disponível para qualquer Presidente que tenha o celular

### Dados do Convidado Avulso

| Campo | Obrigatoriedade | Observação |
|-------|----------------|------------|
| Nome | Obrigatório | |
| Celular | Obrigatório (único) | Chave de busca e envio de convites |
| Apelido | Opcional | |
| Posição preferida | Opcional | |

### Promoção a Boleiro Fixo
- Após uma partida, o Presidente pode "promover" um convidado recorrente a boleiro fixo do grupo
- Ação disponível na Ficha do Boleiro (T11) e no resumo da partida (T22)
- Ao promover: convidado passa a fazer parte do grupo com todos os seus dados já preenchidos

### Histórico do Convidado
- Cada convidado tem um histórico global: quantas partidas jogou, em quais grupos, gols marcados
- Visível para o Presidente ao adicionar o convidado a uma partida

---

## 3.11 Regras de Isolamento Multi-grupo (NOVO)

Um boleiro pode estar em múltiplos grupos simultaneamente. As seguintes regras garantem que cada grupo seja independente:

| Regra | Comportamento |
|-------|--------------|
| **Bloqueio por cartão vermelho** | Bloqueio válido apenas dentro do grupo onde ocorreu o cartão |
| **Bloqueio por inadimplência** | Inadimplência de um grupo não afeta o status em outro grupo |
| **Estatísticas** | Gols e cartões são contabilizados separadamente por grupo |
| **Mensalidade** | Mensalidade do Grupo A é independente da mensalidade do Grupo B |
| **Posição e apelido** | Um boleiro pode ter apelido e posição diferentes em cada grupo |

---

## 6. Modelo de Dados — REVISADO

```
ConvidadoAvulso (cadastro global)
├── id
├── nome
├── celular (único — chave de busca e envio de convites)
├── apelido (opcional)
├── posicao (opcional)
└── historico_partidas[] → ConvitePartida[]

BoleiroGrupo (pertence a um grupo específico)
├── id
├── convidado_ref_id → ConvidadoAvulso (nullable — apenas se veio de convite avulso)
├── grupo_id
├── nome, apelido, posicao
├── celular
└── status: ativo | arquivado

Partida
├── id, data_hora, grupo_id, estadio_id (nullable)
├── num_times, boleiros_por_time, tempo_partida, tempo_total
├── tipo_cobrança: por_partida | mensalidade   ← NOVO
├── presidentes[] → Usuario
├── regras: { cartao_azul, bloqueio_vermelho, bloqueio_inadimplente, ... }
└── status: agendada | em_andamento | encerrada

ConvitePartida
├── id, partida_id
├── boleiro_grupo_id (nullable — boleiro fixo)
├── convidado_avulso_id (nullable — convidado avulso)
├── tipo: fixo | convidado_avulso
├── token_confirmacao (único, expirável)
└── status: pendente | confirmado | recusado | lista_espera

Vaquinha
├── id
├── partida_id
├── tipo: por_partida | mensalidade
├── mes_referencia (ex: "2026-05" — preenchido se tipo = mensalidade)
├── chave_pix
├── valor_boleiro_fixo
├── valor_convidado_avulso   ← sempre por partida, independente do tipo
├── data_limite_pagamento
└── pagamentos[]
    ├── id
    ├── boleiro_grupo_id (nullable)
    ├── convidado_avulso_id (nullable)
    ├── tipo_pagador: fixo | convidado_avulso
    ├── valor_cobrado
    ├── status: pago | pendente | inadimplente
    └── data_pagamento (nullable)
```

---

## Glossário — adições

| Termo | Significado |
|-------|------------|
| **Convidado Avulso** | Jogador não fixo, cadastrado globalmente pelo celular, paga sempre por partida |
| **Mensalidade** | Cobrança mensal fixa para boleiros fixos, independente de comparecimento |
| **Isolamento de grupo** | Bloqueios e inadimplência de um grupo não afetam outros grupos do mesmo boleiro |
