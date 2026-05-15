# RachãoApp — Documento de Requisitos do Produto (PRD) V1

> **Versão:** 1.1  
> **Data:** Maio de 2026  
> **Tipo:** Web App (mobile-first, responsivo)  
> **Objetivo:** Plataforma SaaS para gestão de peladas amadoras e campos/quadras esportivas

---

## 1. Visão Geral

**RachãoApp** é um web app SaaS com dois tipos de assinante pagante:

- **Presidente** — organiza a pelada e gerencia os boleiros, independentemente do local
- **Dono do Estádio** — gerencia seu espaço físico, disponibiliza horários e recebe Presidentes

A plataforma funciona como um **marketplace esportivo B2B2C**: Donos do Estádio atraem Presidentes, e Presidentes levam Boleiros — criando um ciclo de engajamento contínuo no futebol amador brasileiro.

---

## 2. Perfis de Usuário

### 2.1 Presidente (Organizador de Jogo)

Pessoa responsável por organizar peladas regulares ou avulsas. Pode organizar jogos em qualquer campo (cadastrado ou não na plataforma).

**Responsabilidades:**
- Criar e gerenciar grupos de Boleiros
- Agendar partidas
- Controlar lista de presença
- Escalar times
- Registrar partidas e estatísticas
- Gerenciar a vaquinha financeira

**Observação:** Um jogo pode ter **mais de um Presidente** com permissões iguais de gestão.

---

### 2.2 Dono do Estádio (Dono de Campo/Quadra)

Pessoa física ou jurídica que possui ou administra um espaço esportivo.

**Responsabilidades:**
- Cadastrar o espaço com informações e fotos
- Definir horários disponíveis para agendamento
- Visualizar peladas agendadas no seu espaço
- *(V2)* Criar campeonatos entre times frequentadores

---

### 2.3 Boleiro (Jogador Convidado — sem login)

Pessoa convidada para uma partida específica. **Não precisa ter conta no app.**

**Fluxo:**
- Recebe notificação (WhatsApp ou e-mail) com link único da partida
- Confirma ou recusa presença pelo link (sem necessidade de cadastro)
- Pode ser fixo de um grupo ou convidado avulso de uma partida específica

---

## 3. Módulos do Sistema — V1

---

### 3.1 Autenticação e Onboarding

**Funcionalidades:**
- Cadastro com e-mail e senha ou login social (Google)
- Seleção de perfil no onboarding: Presidente ou Dono do Estádio
- Um usuário pode ter ambos os perfis (ex: Dono do Estádio que também é Presidente)
- Recuperação de senha

**Telas:**
- Tela de login / cadastro
- Onboarding de seleção de perfil
- Configurações de perfil pessoal

---

### 3.2 Módulo: Grupos de Boleiros (Presidente)

Um **Grupo** é o núcleo da pelada. Representa o conjunto fixo de Boleiros que se reúne regularmente.

**Funcionalidades:**
- Criar grupo (nome, esporte, nível: casual/intermediário/competitivo, foto)
- Adicionar Boleiros ao grupo (nome, apelido, posição preferida, contato — WhatsApp ou e-mail)
- Convidar co-Presidentes (com permissão total de gestão do grupo)
- Arquivar ou remover Boleiros
- Visualizar ficha do Boleiro (histórico de presença, gols, cartões)

**Regras de negócio:**
- Um Boleiro pode estar em múltiplos grupos
- O criador do grupo é o Presidente principal; co-Presidentes têm as mesmas permissões
- Boleiros sem conta no app são representados por um cadastro local (nome + contato)

---

### 3.3 Módulo: Agendamento de Partida (Presidente)

Cada **Partida** é criada dentro de um Grupo e pode estar vinculada a um Estádio cadastrado ou não.

#### 3.3.1 Dados Básicos da Partida

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Data e horário | DateTime | Data e hora de início |
| Local | Texto livre ou Estádio vinculado | Endereço ou estádio selecionado da plataforma |
| Número de times | Número | Ex: 2, 3, 4 |
| Boleiros por time | Número | Ex: 5, 6, 7, 8, 11 |
| Tempo por partida | Minutos | Duração de cada confronto (ex: 15 min) |
| Tempo total de jogo | Minutos | Duração total do evento (ex: 90 min) |
| Observações | Texto livre | Informações extras para os Boleiros |

#### 3.3.2 Boleiros da Partida

- **Boleiros do grupo:** selecionados da lista fixa do grupo
- **Convidados avulsos:** adicionados especificamente para aquela partida (nome + contato)
- O Presidente define a **capacidade máxima** de vagas da partida
- Cada convidado avulso recebe link único para confirmar/recusar presença

#### 3.3.3 Regras da Partida (ativáveis/desativáveis)

O Presidente pode ligar ou desligar cada regra individualmente ao criar ou editar a partida:

| Regra | Descrição |
|-------|-----------|
| **Cartão Azul** | Suspensão temporária de X minutos (sem expulsão) |
| **Bloqueio por cartão vermelho** | Boleiro com vermelho na última partida está automaticamente bloqueado |
| **Bloqueio por inadimplência** | Boleiro com vaquinha em aberto não pode ser escalado |
| **Gol olímpico vale duplo** | Gol direto de escanteio conta como 2 |
| **Impedimento ativo** | Regra de impedimento aplicada (para campos maiores) |
| **Pênalti máximo por tempo** | Limite de cobranças de pênalti por período |
| **Time com menos jogadores joga** | Partida não é cancelada mesmo com um time incompleto |
| **Obrigatoriedade de goleiro** | Cada time precisa obrigatoriamente de um goleiro escalado |

> **Nota de implementação:** O conjunto de regras é extensível. Novas regras podem ser adicionadas sem alteração estrutural.

---

### 3.4 Módulo: Lista de Presença

**Funcionalidades:**
- Visualização da lista com status de cada Boleiro: ✅ Confirmado / ❌ Recusado / ⏳ Pendente
- Envio de convite via WhatsApp (link com mensagem pré-formatada) ou e-mail
- Link único por Boleiro para confirmar presença sem login
- Boleiros podem justificar ausência (opcional, campo de texto livre)
- O Presidente pode marcar presença manualmente
- Contador de confirmados × vagas disponíveis em tempo real
- **Lista de espera:** Boleiros além do limite ficam em fila e são notificados se uma vaga abre

**Notificações enviadas automaticamente:**
- Convite inicial (com data, local e link de confirmação)
- Lembrete 24h antes da partida
- Notificação de vaga disponível (para lista de espera)

---

### 3.5 Módulo: Escalação de Times

Acessível após a lista de presença ser suficientemente preenchida.

**Modos de escalação:**

#### Modo Automático (Sorteio)
- Distribui Boleiros confirmados aleatoriamente entre os times
- Opção de balanceamento por posição (ex: distribuir goleiros, zagueiros e atacantes igualmente)
- Gera nova escalação a cada clique em "Novo Sorteio"
- Respeita regras ativas (ex: não inclui Boleiros bloqueados)

#### Modo Manual
- Interface de arrastar e soltar Boleiros entre times
- Times nomeáveis (ex: Time A / Preto / Colete)
- Validação em tempo real: alerta se um time tiver mais ou menos Boleiros que o configurado
- Bloqueio visual de Boleiros impedidos (inadimplentes ou suspensos)

**Compartilhamento da escalação:**
- Geração de imagem/card com os times para compartilhar no WhatsApp
- Link da escalação acessível sem login

---

### 3.6 Módulo: Registro de Partida

Ativado no dia e horário da partida (ou manualmente pelo Presidente).

#### 3.6.1 Placar em Tempo Real
- Botões de incremento/decremento por time
- Cronômetro integrado (contador regressivo ou progressivo, configurável)
- Registro do tempo de cada gol

#### 3.6.2 Eventos da Partida

| Evento | Dados registrados |
|--------|-------------------|
| Gol | Boleiro, time, minuto |
| Cartão Amarelo | Boleiro, time, minuto |
| Cartão Vermelho | Boleiro, time, minuto (aplica bloqueio automático se regra ativa) |
| Cartão Azul | Boleiro, time, minuto, duração da suspensão |
| Substituição | Boleiro que sai, Boleiro que entra, time, minuto |

#### 3.6.3 Resultado e Rotação
- Para formatos com 3+ times: controle de rodízio (quem entra e quem espera)
- Resultado final registrado com MVP votado pelos Boleiros (opcional)
- Encerramento da partida gera resumo automático

---

### 3.7 Módulo: Histórico e Estatísticas

**Por Grupo:**
- Lista de partidas realizadas (data, placar, local)
- Artilharia do grupo (gols por Boleiro)
- Sequência de vitórias/derrotas por time (para grupos com times fixos)
- Presença: % de comparecimento por Boleiro

**Por Partida:**
- Resumo completo: escalação, eventos, placar final
- Lista de presenças efetivas
- Estatísticas individuais da partida

**Por Boleiro (ficha individual):**
- Total de partidas
- Gols, cartões
- Histórico de presenças e faltas
- Status financeiro (vaquinhas pagas/pendentes)

---

### 3.8 Módulo: Vaquinha (Financeiro)

**Funcionalidades:**

#### Configuração por Partida

| Parâmetro | Descrição |
|-----------|-----------|
| Chave Pix | Chave Pix do Presidente para recebimento |
| Valor padrão (Boleiros fixos) | Valor a ser pago por Boleiros do grupo |
| Valor para convidados avulsos | Valor diferenciado para Boleiros convidados |
| Tipo de cobrança | Por partida ou mensalidade |
| Data limite de pagamento | Deadline para quitação |

#### Controle de Pagamentos
- Lista de Boleiros confirmados com status: 💰 Pago / ⏳ Pendente / ❌ Inadimplente
- Presidente marca pagamento manualmente
- Cálculo automático: total arrecadado × total esperado
- Histórico financeiro por partida e por Boleiro
- Se a regra de **bloqueio por inadimplência** estiver ativa, Boleiros com pendências aparecem bloqueados na escalação

#### Compartilhamento
- Geração de mensagem de cobrança para WhatsApp (ex: "Fala [Nome], sua pelada de [data] está em aberto. Valor: R$ [X]. Pix: [chave]")

---

### 3.9 Módulo: Perfil do Estádio (Dono do Estádio)

**Funcionalidades:**
- Cadastro do espaço: nome, endereço completo, tipo de piso (grama natural, sintético, salão, areia), capacidade por time, foto de capa e galeria
- Definição de horários disponíveis por dia da semana (grade de disponibilidade)
- Visualização de partidas agendadas no espaço (somente-leitura, sem dados dos Boleiros)
- Aprovação de vínculo: Dono do Estádio pode aprovar ou recusar solicitações de Presidentes que querem vincular a partida ao espaço
- Página pública do Estádio (acessível sem login) com informações e horários disponíveis

**Vínculo Presidente ↔ Estádio:**
1. Presidente pesquisa estádio por nome ou localização
2. Seleciona data e horário disponível
3. Dono do Estádio recebe notificação e aprova/recusa
4. Partida aparece no calendário do estádio após aprovação

---

## 4. Fluxos Principais

### Fluxo 1: Presidente cria e realiza uma pelada

```
1. Cria grupo → adiciona Boleiros
2. Agenda partida → define configurações e regras
3. Envia convites → Boleiros confirmam via link (sem login)
4. No dia: acessa escalação → sorteia ou monta times
5. Inicia partida → registra gols e eventos
6. Encerra partida → visualiza resumo e estatísticas
7. Cobra vaquinha → marca pagamentos
```

### Fluxo 2: Dono do Estádio vincula Presidente

```
1. Dono do Estádio cadastra espaço → define horários disponíveis
2. Presidente pesquisa estádio → solicita vínculo para data/hora
3. Dono do Estádio aprova → partida aparece no calendário do espaço
4. Dono do Estádio visualiza agenda de partidas no seu espaço
```

### Fluxo 3: Boleiro confirma presença (sem login)

```
1. Recebe link via WhatsApp ou e-mail
2. Abre link → vê detalhes da partida (data, local, Presidente)
3. Clica em "Confirmar" ou "Não vou"
4. Confirmação registrada → Presidente é notificado
```

---

## 5. Requisitos Não Funcionais

| Requisito | Especificação |
|-----------|---------------|
| **Plataforma** | Web App responsivo (mobile-first) — funciona em celular, tablet e desktop via navegador |
| **Autenticação** | JWT com refresh token, login social (Google OAuth2) |
| **Notificações** | WhatsApp (link com mensagem pré-formatada via `wa.me`) e e-mail transacional |
| **Compartilhamento** | Geração de imagem/card para WhatsApp (escalação, resumo da partida) |
| **Performance** | Carregamento inicial < 3s em 4G |
| **Offline** | Registro de partida deve funcionar com conexão instável (sync quando voltar) |
| **Segurança** | Dados de Boleiros isolados por grupo; links de confirmação com expiração |
| **Multi-Presidente** | Permissões compartilhadas sem hierarquia entre co-Presidentes |

---

## 6. Modelo de Dados — Entidades Principais

```
Usuario
├── id, nome, email, telefone, avatar
├── perfil: [presidente, dono_estadio] (pode ter ambos)
└── plano: free_trial | presidente_mensal | estadio_mensal

Grupo
├── id, nome, esporte, nivel, foto
├── presidentes[] → Usuario
└── boleiros[] → Boleiro

Boleiro
├── id, nome, apelido, posicao, contato (whatsapp/email)
├── grupo_id
└── status: ativo | arquivado

Estadio
├── id, nome, endereco, tipo_piso, capacidade, fotos[]
├── dono_id → Usuario
└── horarios_disponiveis[]

Partida
├── id, data_hora, grupo_id, estadio_id (nullable)
├── num_times, boleiros_por_time, tempo_partida, tempo_total
├── presidentes[] → Usuario
├── regras: { cartao_azul, bloqueio_vermelho, bloqueio_inadimplente, ... }
└── status: agendada | em_andamento | encerrada

ConvitePartida
├── id, partida_id, boleiro_id (ou nome+contato para avulsos)
├── tipo: fixo | convidado_avulso
├── token_confirmacao (único, expirável)
└── status: pendente | confirmado | recusado | lista_espera

Time
├── id, partida_id, nome, cor
└── boleiros[] → Boleiro

Evento
├── id, partida_id, tipo: gol | amarelo | vermelho | azul | substituicao
├── boleiro_id, time_id, minuto
└── dados_extras: { boleiro_substituto_id, duracao_azul, ... }

Vaquinha
├── id, partida_id, chave_pix, valor_fixo, valor_convidado
├── tipo: por_partida | mensalidade
└── pagamentos[] → { boleiro_id, status, data_pagamento }
```

---

## 7. Stack Sugerida para Vibe Coding

### Frontend
- **Framework:** Next.js 15 (App Router) ou React + Vite
- **UI:** Tailwind CSS + shadcn/ui
- **Estado:** Zustand ou Jotai
- **PWA:** Service Worker para uso offline no registro de partida

### Backend
- **API:** Node.js + Fastify ou Python + FastAPI
- **Banco de dados:** PostgreSQL (relacional, ideal para os relacionamentos do modelo)
- **ORM:** Prisma (Node) ou SQLAlchemy (Python)
- **Autenticação:** NextAuth.js ou Supabase Auth
- **Armazenamento de imagens:** Cloudinary ou Supabase Storage

### Infraestrutura
- **Deploy frontend:** Vercel
- **Deploy backend/banco:** Railway, Render ou Supabase
- **Notificações e-mail:** Resend ou SendGrid
- **WhatsApp:** Link `wa.me` com mensagem pré-formatada (sem API paga na V1)

---

## 8. Fora do Escopo — V1

Os itens abaixo foram identificados mas **intencionalmente excluídos da V1**:

| Feature | Versão prevista |
|---------|----------------|
| Campeonatos e classificação por pontos | V2 |
| Pagamento integrado de reservas de estádio | V2 |
| Notificações push nativas | V2 |
| Integração com API do WhatsApp Business | V2 |
| Confirmação automática de pagamento Pix | V2 |
| Avaliação de estádios pelos Presidentes | V2 |
| Assistências e estatísticas avançadas | V2 |
| Aplicativo nativo (iOS/Android) | V3 |

---

## 9. Critérios de Aceitação — V1

A V1 está completa quando um Presidente consegue:

- [x] Criar um grupo e adicionar Boleiros
- [x] Agendar uma partida com todas as configurações e regras
- [x] Enviar convites e receber confirmações via link (sem login dos Boleiros)
- [x] Escalar times (automático e manual) com respeito às regras ativas
- [x] Registrar gols, cartões e substituições durante a partida
- [x] Encerrar a partida e visualizar o resumo com estatísticas
- [x] Gerenciar a vaquinha e controlar pagamentos

E um Dono do Estádio consegue:

- [x] Cadastrar o espaço com informações e horários
- [x] Aprovar vínculo de Presidentes ao seu estádio
- [x] Visualizar partidas agendadas no seu espaço

---

## 10. Glossário

| Termo no App | Significado real |
|--------------|-----------------|
| **Presidente** | Organizador de jogo / responsável pela pelada |
| **Dono do Estádio** | Proprietário ou gestor de campo/quadra esportiva |
| **Boleiro** | Jogador participante da pelada |
| **Estádio** | Campo ou quadra cadastrada na plataforma |
| **Rachão / Partida** | Sessão de jogo organizada por um Presidente |
| **Vaquinha** | Rateio financeiro do custo da pelada entre os Boleiros |
| **Escalação** | Distribuição dos Boleiros entre os times |

