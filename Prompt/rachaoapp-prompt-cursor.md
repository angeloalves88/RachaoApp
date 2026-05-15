# RachãoApp — Prompt Mestre para Cursor

> Use este prompt como ponto de partida no Cursor (Agent Mode).  
> Cole na aba de chat com o modelo Claude Sonnet ou GPT-4o ativado.  
> Recomendado: divida em fases conforme indicado abaixo.

---

## PROMPT INICIAL — Visão geral e setup do projeto

```
Você é um engenheiro sênior full-stack. Vamos construir juntos um web app SaaS chamado **RachãoApp** — uma plataforma para gestão de peladas de futebol amador no Brasil.

### Stack definida
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes (Route Handlers) ou Fastify separado (decidir juntos)
- **Banco de dados:** PostgreSQL via Supabase
- **ORM:** Prisma
- **Autenticação:** Supabase Auth (email/senha + Google OAuth)
- **Storage de imagens:** Supabase Storage
- **E-mail transacional:** Resend
- **Deploy:** Vercel (frontend) + Supabase (banco + auth + storage)
- **Estado global:** Zustand
- **Formulários:** React Hook Form + Zod

### Identidade visual
- **Tema:** Dark mode por padrão
- **Fundo principal:** #0f1b2d (Azul Noite)
- **Surface cards:** #162236
- **Acento primário:** #e8530a (Laranja Fogo) — botões, CTAs, destaques
- **Texto principal:** #e8edf3
- **Texto secundário:** #7a8fa6
- **Sucesso:** #22c55e | Atenção: #eab308 | Erro: #ef4444 | Info: #38bdf8
- **Fonte display:** Barlow Condensed (Google Fonts) — títulos, placar, logo
- **Fonte body:** Inter (Google Fonts) — todo o restante
- **Border radius cards:** 12px | botões: 8px | badges: 9999px
- **Mobile-first:** bottom navigation no mobile, sidebar no desktop

### Perfis de usuário
- **Presidente** — organiza peladas, gerencia boleiros, agenda partidas
- **Dono do Estádio** — gerencia campo/quadra, define horários, aprova vínculos
- **Boleiro** — jogador sem login, confirma presença por link único com token
- Um usuário pode ter os dois perfis ativos simultaneamente

### Entidades principais do banco de dados (Prisma schema)
Crie o schema completo com as seguintes entidades e relacionamentos:

model Usuario {
  id            String   @id @default(cuid())
  nome          String
  email         String   @unique
  celular       String?
  avatarUrl     String?
  perfis        Perfil[]  // presidente, dono_estadio
  plano         String   @default("trial")
  criadoEm      DateTime @default(now())
  grupos        GrupoPresidente[]
  estadio       Estadio?
}

model Grupo {
  id            String   @id @default(cuid())
  nome          String
  esporte       String   @default("futebol")
  nivel         String   @default("casual") // casual, intermediario, competitivo
  fotoUrl       String?
  criadoEm      DateTime @default(now())
  presidentes   GrupoPresidente[]
  boleiros      BoleiroGrupo[]
  partidas      Partida[]
}

model BoleiroGrupo {
  id                String   @id @default(cuid())
  grupoId           String
  grupo             Grupo    @relation(fields: [grupoId], references: [id])
  convidadoRefId    String?  // referência ao ConvidadoAvulso se veio de lá
  convidado         ConvidadoAvulso? @relation(fields: [convidadoRefId], references: [id])
  nome              String
  apelido           String?
  posicao           String?  // GOL, ZAG, MEI, ATA
  celular           String
  email             String?
  status            String   @default("ativo") // ativo, arquivado
}

model ConvidadoAvulso {
  id              String   @id @default(cuid())
  nome            String
  celular         String   @unique
  apelido         String?
  posicao         String?
  boleirosGrupo   BoleiroGrupo[]
  convites        ConvitePartida[]
}

model Partida {
  id              String   @id @default(cuid())
  grupoId         String
  grupo           Grupo    @relation(fields: [grupoId], references: [id])
  estadioId       String?
  estadio         Estadio? @relation(fields: [estadioId], references: [id])
  dataHora        DateTime
  localLivre      String?
  numTimes        Int      @default(2)
  boleirosPorTime Int      @default(5)
  tempoPartida    Int      @default(15)
  tempoTotal      Int      @default(90)
  tipoCobranca    String   @default("por_partida") // por_partida, mensalidade
  status          String   @default("agendada") // agendada, em_andamento, encerrada, cancelada
  regras          Json     @default("{}")
  presidentes     PartidaPresidente[]
  convites        ConvitePartida[]
  times           Time[]
  eventos         Evento[]
  vaquinha        Vaquinha?
}

model ConvitePartida {
  id                  String   @id @default(cuid())
  partidaId           String
  partida             Partida  @relation(fields: [partidaId], references: [id])
  boleiroGrupoId      String?
  boleiroGrupo        BoleiroGrupo? @relation(fields: [boleiroGrupoId], references: [id])
  convidadoAvulsoId   String?
  convidadoAvulso     ConvidadoAvulso? @relation(fields: [convidadoAvulsoId], references: [id])
  tipo                String   // fixo, convidado_avulso
  token               String   @unique @default(cuid())
  tokenExpiresAt      DateTime
  status              String   @default("pendente") // pendente, confirmado, recusado, lista_espera
  recado              String?
}

model Time {
  id        String   @id @default(cuid())
  partidaId String
  partida   Partida  @relation(fields: [partidaId], references: [id])
  nome      String
  cor       String
  boleiros  TimeBoleiro[]
  eventos   Evento[]
}

model Evento {
  id          String   @id @default(cuid())
  partidaId   String
  partida     Partida  @relation(fields: [partidaId], references: [id])
  timeId      String?
  time        Time?    @relation(fields: [timeId], references: [id])
  boleiroId   String?
  tipo        String   // gol, amarelo, vermelho, azul, substituicao
  minuto      Int?
  dadosExtras Json?    // { boleiroSubstitutoId, duracaoAzul, golOlimpico }
  criadoEm   DateTime @default(now())
}

model Vaquinha {
  id                    String   @id @default(cuid())
  partidaId             String   @unique
  partida               Partida  @relation(fields: [partidaId], references: [id])
  tipo                  String   // por_partida, mensalidade
  mesReferencia         String?  // "2026-05"
  chavePix              String
  valorBoleiroFixo      Decimal
  valorConvidadoAvulso  Decimal
  dataLimitePagamento   DateTime?
  pagamentos            Pagamento[]
}

model Pagamento {
  id                String   @id @default(cuid())
  vaquinhaId        String
  vaquinha          Vaquinha @relation(fields: [vaquinhaId], references: [id])
  boleiroGrupoId    String?
  convidadoAvulsoId String?
  tipoPagador       String   // fixo, convidado_avulso
  valorCobrado      Decimal
  status            String   @default("pendente") // pago, pendente, inadimplente
  dataPagamento     DateTime?
}

model Estadio {
  id              String   @id @default(cuid())
  donoId          String   @unique
  dono            Usuario  @relation(fields: [donoId], references: [id])
  nome            String
  slug            String   @unique
  endereco        String
  cidade          String
  estado          String
  tipoPiso        String[]
  capacidade      Int
  comodidades     String[]
  descricao       String?
  fotoCapaUrl     String?
  fotos           String[]
  ativo           Boolean  @default(true)
  publico         Boolean  @default(true)
  horarios        HorarioDisponivel[]
  bloqueios       DataBloqueada[]
  partidas        Partida[]
}

model HorarioDisponivel {
  id                  String   @id @default(cuid())
  estadioId           String
  estadio             Estadio  @relation(fields: [estadioId], references: [id])
  diaSemana           Int      // 0=Dom, 1=Seg ... 6=Sab
  horaInicio          String   // "08:00"
  horaFim             String   // "22:00"
  intervaloMinutos    Int      @default(60)
  ativo               Boolean  @default(true)
}

model DataBloqueada {
  id        String   @id @default(cuid())
  estadioId String
  estadio   Estadio  @relation(fields: [estadioId], references: [id])
  data      DateTime
  motivo    String?
}

Ao iniciar, configure:
1. Projeto Next.js 15 com TypeScript e Tailwind
2. shadcn/ui com tema customizado (cores acima via CSS variables)
3. Prisma conectado ao Supabase PostgreSQL
4. Supabase Auth configurado
5. Estrutura de pastas App Router com grupos de rotas: (public), (presidente), (estadio)
6. Middleware de autenticação protegendo rotas privadas
7. Fontes Barlow Condensed e Inter via next/font/google

Confirme o setup antes de começar a codificar as features.
```

---

## FASE 1 — Autenticação e Onboarding

```
Implemente a Fase 1 do RachãoApp: Autenticação e Onboarding.

### Telas a implementar:
1. /login — e-mail/senha + Google OAuth via Supabase Auth
2. /cadastro — nome, e-mail, celular (máscara BR), senha com indicador de força
3. /onboarding — seleção de perfil em 2 steps (Presidente / Dono do Estádio / ambos)
4. /recuperar-senha — solicitação de link + tela de confirmação com countdown

### Regras:
- Após cadastro → redirecionar para /onboarding
- Após onboarding → redirecionar para /dashboard (Presidente) ou /estadio/dashboard (Dono do Estádio)
- Middleware protege todas as rotas /dashboard, /grupos, /partidas, /estadio
- Se usuário logado acessar /login → redirecionar para dashboard
- Link de confirmação de presença (/confirmar/[token]) é público — não redirecionar para login
```

---

## FASE 2 — Grupos e Boleiros

```
Implemente a Fase 2 do RachãoApp: Gestão de Grupos e Boleiros.

### Telas a implementar:
1. /grupos — lista de grupos com busca em tempo real
2. /grupos/novo e /grupos/[id]/editar — formulário com upload de foto (Supabase Storage)
3. /grupos/[id] — hub do grupo com 3 tabs: Boleiros / Partidas / Estatísticas
4. Modal de adicionar/editar boleiro — fluxo com busca prévia por celular

### Regras críticas:
- Ao adicionar boleiro: buscar primeiro por celular na tabela ConvidadoAvulso
  - Se encontrado: sugerir reuso do cadastro
  - Se não encontrado: criar novo ConvidadoAvulso + BoleiroGrupo
- Um boleiro pode estar em múltiplos grupos (registros BoleiroGrupo separados)
- Bloqueios (cartão vermelho, inadimplência) são isolados por grupo
- Co-presidentes têm as mesmas permissões que o criador

### Componentes reutilizáveis a criar:
- <BoleiroCard /> — avatar + nome + posição + badges de status
- <GrupoCard /> — foto + nome + metadados + próxima partida
- <StatusBadge type="confirmado|pendente|bloqueado|inadimplente" />
```

---

## FASE 3 — Agendamento de Partida (Wizard)

```
Implemente a Fase 3 do RachãoApp: Wizard de Criação de Partida.

### Tela: /partidas/nova — Wizard com 6 steps

**Step 1 — Dados Básicos:**
- Date picker, time picker (intervalos 15min)
- Seletores: número de times (2/3/4), boleiros por time (3-11), tempo por partida, tempo total
- Tipo de cobrança: "Por Partida" ou "Mensalidade" (impacta Step 5)
- Validação: tempo total >= tempo por partida

**Step 2 — Local:**
- Input livre OU busca de Estádio cadastrado na plataforma
- Se estádio vinculado: exibe disponibilidade do horário

**Step 3 — Boleiros e Convidados:**
- Lista de boleiros do grupo com checkbox + busca
- Boleiros bloqueados: desabilitados com tooltip de motivo
- Convidados avulsos: busca por celular (11 dígitos → auto-search) → reusa ou cria novo
- Contador de vagas em tempo real + lista de espera automática se exceder

**Step 4 — Regras:**
- Grid de cards toggle para cada regra
- Cartão Azul e Limite de Pênaltis expandem campos adicionais quando ativados

**Step 5 — Vaquinha (opcional):**
- Toggle de ativação
- Layout condicional baseado no tipo de cobrança do Step 1:
  - Por Partida: valor fixo + valor convidado + chave pix + data limite
  - Mensalidade: valor mensalidade + valor convidado (por partida) + chave pix + datas separadas
- Preview de total arrecadado esperado em tempo real

**Step 6 — Revisão:**
- Resumo de todos os steps com botão de edição por seção
- Botão "Criar e enviar convites" vs "Criar sem enviar"

### Persistência do wizard:
- Estado salvo no Zustand entre steps
- Ao fechar e voltar: mostrar modal "Você tem uma partida em rascunho. Continuar?"
```

---

## FASE 4 — Lista de Presença e Convites

```
Implemente a Fase 4 do RachãoApp: Lista de Presença e Sistema de Convites.

### Telas:
1. /partidas/[id]/presencas — gestão completa de presenças
2. /confirmar/[token] — página pública para Boleiro confirmar sem login

### /partidas/[id]/presencas:
- Pills de resumo: Confirmados / Recusados / Pendentes / Lista de espera
- Barra de progresso de vagas
- Tabs de filtro
- Swipe para ações rápidas no mobile (Confirmar / Recusar / Reenviar)
- Modal de reenvio com mensagem editável e seleção de destinatários
- FAB mobile: "Reenviar para pendentes"

### /confirmar/[token]:
- Buscar partida pelo token (verificar expiração)
- Exibir: nome do grupo, Presidente, data/hora, local, formato, valor da vaquinha
- Barra de confirmados/vagas com avatares
- Botões: "Vou comparecer" / "Não vou poder ir"
- Campo opcional de recado
- Estados: token inválido / já confirmado / já recusado / partida lotada (lista de espera) / partida encerrada
- Após confirmação: botão "Adicionar ao Google Calendar"

### Sistema de envio de convites:
- Gerar link único: https://rachaoapp.com.br/confirmar/[token]
- Link para WhatsApp: wa.me/55[celular]?text=[mensagem+link encodada]
- Token com expiração de 7 dias (renovável pelo Presidente)
- Ao confirmar/recusar: atualizar status em tempo real (polling a cada 30s ou Supabase Realtime)
```

---

## FASE 5 — Escalação de Times

```
Implemente a Fase 5 do RachãoApp: Escalação de Times.

### Tela: /partidas/[id]/escalacao

**Dois modos (tabs independentes com estado separado):**

**Modo Automático:**
- Toggle de balanceamento por posição
- Algoritmo de distribuição:
  - Com balanceamento: distribuir por posição proporcionalmente entre os N times
  - Sem balanceamento: shuffle aleatório com Fisher-Yates
- Exibir N colunas de times (scroll horizontal no mobile)
- Header de cada time: nome editável inline + cor selecionável
- Botão "Novo Sorteio" regenera sem limpar nomes/cores dos times
- Boleiros bloqueados: excluídos automaticamente + listados em banner

**Modo Manual:**
- Pool de boleiros disponíveis no topo
- Colunas de times embaixo
- Mobile: toque simples → modal "Para qual time?" com lista de times
- Desktop: drag and drop com @dnd-kit/core
- Validação em tempo real: máx. boleiros por time
- Regra de goleiro obrigatório: ícone ⚠️ se time sem goleiro quando regra ativa

**Compartilhamento (modal):**
- Gerar imagem do card usando html2canvas ou @vercel/og
- Dimensões: 1080x1080 (quadrado) ou 1080x1350 (retrato)
- Visual: fundo #0f1b2d, headers dos times em #e8530a, texto branco, Barlow Condensed
- Botões: Baixar / Compartilhar nativo / Copiar link
```

---

## FASE 6 — Registro de Partida Ao Vivo

```
Implemente a Fase 6 do RachãoApp: Registro de Partida Ao Vivo.

### Tela: /partidas/[id]/ao-vivo

**Requisito crítico:** funcionar offline. Usar localStorage para salvar eventos localmente.
Ao reconectar: sincronizar eventos com o banco via queue.

**Placar:**
- N placares side-by-side (scroll horizontal se > 2 times)
- Fonte: Barlow Condensed Bold 72px
- Botões – e + com min-height 56px (touch-friendly)
- Toque rápido no + → incrementa placar sem atribuição
- Toque longo (500ms) no + → abre modal de registro de gol com seleção de boleiro

**Cronômetro:**
- Modo regressivo (padrão) ou progressivo
- Iniciar / Pausar / Retomar
- Alerta visual (laranja pulsante) nos últimos 2 minutos
- Vibração via navigator.vibrate() ao zerar

**4 botões de eventos rápidos:**
⚽ Gol | 🟨 Cartão | 🔄 Substituição | 🟦 Cartão Azul (se regra ativa)

**Modais de registro:**
- Gol: seleção de time + boleiro + minuto (pré-preenchido) + checkbox gol olímpico
- Cartão: tipo (amarelo/vermelho/azul) + time + boleiro + minuto + duração se azul
- Substituição: time + sai + entra + minuto
- Cada modal deve ser rápido: máx. 3 toques para confirmar um evento

**Feed de eventos:** lista cronológica reversa com ícones coloridos + opção de editar/excluir

**Offline:**
- Banner amarelo quando sem conexão
- Salvar eventos em localStorage com flag "pendente_sync"
- Ao reconectar: sincronizar em background, banner verde confirmando

### Tela: /partidas/[id]/resumo
- Resultado final por time
- Card de MVP (se votação)
- Artilharia ordenada por gols
- Linha do tempo de eventos
- Tabela de estatísticas individuais
- Botão compartilhar (gera card visual como na escalação)
- Versão pública sem login: ocultar dados de contato e financeiros
```

---

## FASE 7 — Vaquinha (Financeiro)

```
Implemente a Fase 7 do RachãoApp: Módulo de Vaquinha.

### Tela: /partidas/[id]/vaquinha

**Dois modelos de cobrança (definido na criação da partida):**

Por Partida:
- Cobrar apenas boleiros confirmados nesta partida
- Lista única com badge Fixo / Convidado

Mensalidade:
- Cobrar TODOS os boleiros fixos ativos do grupo, independente de comparecerem
- Lista dividida em 2 seções: "Boleiros Fixos — Mensalidade [Mês]" + "Convidados — Por Partida"
- Gerar registros de pagamento para todos os boleiros fixos ao criar/salvar vaquinha

**Card de resumo financeiro:**
- Valor arrecadado / Total esperado
- Barra de progresso laranja
- Botão "Copiar chave Pix" com feedback "Copiado! ✓"

**Lista de pagamentos:**
- Swipe direita: marcar como pago (animação check verde)
- Snackbar com "Desfazer" por 10 segundos
- Swipe esquerda: enviar cobrança WhatsApp
- FAB: "Cobrar todos os pendentes"

**Modal de cobrança WhatsApp:**
- Seleção: todos os pendentes / todos os inadimplentes / manual
- Mensagem pré-formatada editável com tags dinâmicas [Nome], [data], [valor], [pix]
- Abre wa.me/ para cada contato individualmente (limitação da API web WhatsApp)

**Regra de bloqueio por inadimplência:**
- Por Partida: boleiro em aberto naquela partida → bloqueado na escalação
- Mensalidade: boleiro em aberto no mês → bloqueado em TODAS as partidas do mês no grupo
```

---

## FASE 8 — Dono do Estádio

```
Implemente a Fase 8 do RachãoApp: Área do Dono do Estádio.

### Telas:
1. /estadio/dashboard — visão geral com próximas partidas e solicitações pendentes
2. /estadio/perfil — cadastro completo (3 tabs: Informações / Fotos / Horários)
3. /estadio/agenda — calendário com visualizações mês/semana/dia
4. /estadio/solicitacoes — aprovar/recusar vínculos de Presidentes
5. /estadios/[slug] — página pública sem login

### Destaques de implementação:

**Perfil — Tab Horários:**
- Grade semanal: 7 linhas (Seg-Dom), cada linha com toggle + campos de horário
- Intervalo mínimo entre partidas (minutos)
- Seção de bloqueios de datas específicas

**Agenda — Calendário:**
- Usar react-big-calendar ou FullCalendar
- Cores: laranja (aprovado), amarelo (pendente), cinza (bloqueado)

**Solicitações:**
- Aprovação inline nos cards (sem página separada)
- Modal de recusa com campo de motivo opcional
- Detecção de conflito de horário: avisar se já existe aprovação no mesmo horário

**Página pública /estadios/[slug]:**
- Acessível sem login
- CTA "Solicitar horário": se não logado → redirect para login com ?redirect=
- Se logado como Presidente → abre wizard de partida com estádio pré-selecionado
- SEO: meta tags com nome e cidade do estádio
```

---

## FASE 9 — Configurações, Planos e Finalização

```
Implemente a Fase 9 do RachãoApp: Configurações e finalização.

### Telas:
1. /perfil — edição de dados pessoais + segurança + gerência de perfis ativos
2. /planos — tabela comparativa + plano atual + CTA de upgrade
3. /configuracoes/notificacoes — toggles granulares por tipo e canal (e-mail/WhatsApp)
4. /configuracoes — hub de configurações + preferências padrão de partida

### Preferências padrão de partida (T34):
- Número de times, boleiros por time, tempo por partida salvos no perfil
- Regras pré-ativas por padrão: checkboxes que pré-selecionam regras no wizard

### Checklist final de qualidade:
- [ ] Todos os estados vazios têm ilustração + CTA
- [ ] Todos os loading states têm skeletons (não spinners)
- [ ] Formulários têm validação inline (não só ao submeter)
- [ ] Todas as ações destrutivas pedem confirmação
- [ ] Bottom navigation ativa corretamente por rota
- [ ] Telas funcionam bem em 375px (iPhone SE) e 390px (iPhone 14)
- [ ] Touch targets mínimos de 44px em todos os elementos interativos
- [ ] Cores de status consistentes: verde=sucesso, amarelo=pendente, vermelho=erro/bloqueio, laranja=acento
- [ ] Barlow Condensed em títulos, placares e badges — Inter no restante
```

---

## Dicas de uso no Cursor

1. **Cole o prompt inicial primeiro** — deixe o Cursor configurar o projeto e confirme antes de avançar
2. **Uma fase por sessão** — cole cada FASE separadamente para não sobrecarregar o contexto
3. **Ao iniciar cada fase:** cole "Continuando o RachãoApp. [Cole a FASE aqui]"
4. **Componentes primeiro:** peça sempre para criar componentes reutilizáveis antes das páginas
5. **Revise o schema Prisma** antes de rodar migrations — é mais fácil corrigir agora do que depois
6. **Use o Composer (Ctrl+I)** para edições em múltiplos arquivos simultaneamente
7. **Ative o MCP do Supabase** no Cursor para ele interagir diretamente com o banco

---

## Ordem de implementação recomendada

```
Setup → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7 → Fase 8 → Fase 9
```

Cada fase entrega valor independente — você pode testar e usar antes de ir para a próxima.
