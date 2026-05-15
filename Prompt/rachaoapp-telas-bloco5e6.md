# RachãoApp — Mapa de Telas — Blocos 5 e 6: Escalação + Registro de Partida

> **Versão:** 1.0 | **Data:** Maio de 2026

---

# BLOCO 5 — Escalação de Times

---

## T18 — Escalação de Times

**Propósito:** Distribuir os boleiros confirmados entre os times, de forma automática ou manual.  
**URL:** `/partidas/[id]/escalacao`  
**Acesso:** Presidente / Co-Presidente

### Layout Geral

**Header:**
- Título: "Escalação" em Barlow Condensed
- Subtítulo: "[Nome do grupo] · [Data] · X times de Y boleiros"
- Botão "Compartilhar escalação" (ícone share) — ativa T19

**Tabs de modo:**
- **Automático** (padrão) | **Manual**
- Cada tab mantém seu estado independente — o Presidente pode alternar sem perder o que montou

**Banner de alertas (se houver boleiros bloqueados):**
- Banner vermelho compacto: "X boleiro(s) bloqueado(s) e excluído(s) da escalação → [Ver motivos]"

---

### Tab: Modo Automático

**Painel de configuração (topo):**

- **Balancear por posição:** toggle
  - Quando ativo: o sorteio distribui goleiros, zagueiros, meias e atacantes proporcionalmente entre os times
  - Hint: "Recomendado quando os boleiros têm posições cadastradas"
- **Incluir convidados avulsos:** toggle (ativo por padrão)

**Área de resultado (ocupa a maior parte da tela):**

Após clicar em "Sortear" pela primeira vez:
- **N colunas de times** (N = número de times configurado), rolagem horizontal se necessário no mobile
- Cada coluna:
  - Header da coluna: nome editável do time (ex: "Time A", "Preto", "Colete") — clique para editar
  - Cor do time: bolinha colorida ao lado do nome (paleta pré-definida: laranja, azul, verde, amarelo)
  - Lista de boleiros do time:
    - Avatar + nome + badge de posição
    - Ícone de capitão ©️ — clique define capitão do time (opcional)
  - Rodapé da coluna: "X boleiros"

**Boleiros fora dos times (se número não fechar igualmente):**
- Seção "Banco / Fora" abaixo dos times
- Hint: "Estes boleiros entram no rodízio conforme configurado"

**Botões de ação:**
- "🔀 Novo Sorteio" (outline, full width) — gera nova distribuição aleatória mantendo as configurações
- "✅ Confirmar Escalação" (laranja, full width) — salva e vai para T14 com status atualizado

---

### Tab: Modo Manual

**Layout dividido em duas áreas:**

**Área superior — Pool de boleiros disponíveis:**
- Lista de todos os boleiros confirmados ainda não escalados
- Busca rápida por nome/apelido
- Filtro por posição: Todos / GOL / ZAG / MEI / ATA
- Cada boleiro: avatar + nome + posição
- **Boleiros bloqueados:** aparecem acinzentados com cadeado 🔒 — não podem ser arrastados

**Área inferior — Times (scroll horizontal):**
- N colunas, uma por time
- Header de cada coluna: nome editável + cor + contador "X/Y boleiros"
- Zona de drop: área tracejada com hint "Arraste boleiros aqui"
- Boleiros já escalados aparecem na coluna com opção de remover (X) ou mover para outro time

**Interação:**
- **Mobile:** toque longo no boleiro ativa drag; ou toque simples abre modal "Para qual time?" com botões de seleção
- **Desktop:** drag and drop nativo
- Ao ultrapassar o número máximo por time: borda vermelha na coluna + toast "Este time já está completo"

**Validação em tempo real (rodapé fixo):**
- Barra de status: "Time A: X/Y · Time B: X/Y · Banco: Z"
- Se desequilibrado: aviso amarelo "Times com números diferentes de boleiros"
- Se regra de goleiro obrigatório ativa e time sem goleiro: ícone ⚠️ na coluna do time

**Botão:** "✅ Confirmar Escalação" (laranja, full width) — habilitado sempre, avisa inconsistências mas não bloqueia

---

### Estados Gerais da T18

- **Sem boleiros confirmados suficientes:** tela bloqueada com banner "Aguardando confirmações — você precisa de ao menos X boleiros para montar os times" + botão "Ver presenças"
- **Escalação já confirmada:** banner azul "Escalação salva" + opção "Refazer escalação" (sobrescreve)
- **Partida encerrada:** tela somente-leitura — mostra a escalação final sem ações
- **Loading inicial:** skeletons dos cards de time

---

## T19 — Card de Compartilhamento da Escalação

**Propósito:** Gerar uma imagem/card visual da escalação para compartilhar no WhatsApp ou outros apps.  
**URL:** modal em `/partidas/[id]/escalacao`  
**Acesso:** Presidente / Co-Presidente

### Layout (modal full-screen no mobile, modal centralizado no desktop)

**Preview do card gerado (área principal):**

O card gerado tem dimensões de imagem quadrada (1080×1080px) ou retangular (1080×1350px), com:
- Logo RachãoApp no topo (discreto)
- Título: nome do grupo em Barlow Condensed ExtraBold
- Data e horário da partida
- Local
- N colunas de times (nome do time + lista de nomes dos boleiros)
- Rodapé: "Gerado pelo RachãoApp"
- **Visual:** fundo azul noite, acento laranja nos headers dos times, texto branco

**Opções de personalização:**
- Toggle: "Incluir horário e local" (ativo por padrão)
- Toggle: "Incluir logo RachãoApp"
- Seletor de formato: Quadrado / Retrato

**Botões de ação:**
- "📥 Baixar imagem" (salva no dispositivo)
- "📤 Compartilhar" (abre o share nativo do dispositivo — WhatsApp, Telegram, etc.)
- "🔗 Copiar link" (link público da escalação acessível sem login)

### Estados
- **Gerando imagem:** spinner sobre o preview + "Gerando card..."
- **Erro na geração:** mensagem + "Tentar novamente"

---

# BLOCO 6 — Registro de Partida

---

## T20 — Partida Ao Vivo

**Propósito:** Interface de registro em tempo real durante a partida — placar, cronômetro e eventos.  
**URL:** `/partidas/[id]/ao-vivo`  
**Acesso:** Presidente / Co-Presidente  
**Nota técnica:** Funciona offline — eventos são salvos localmente e sincronizados ao reconectar.

### Layout

**Otimizado para uso em campo:** fontes grandes, botões com area de toque generosa (min 56px), máximo contraste, sem elementos decorativos desnecessários.

---

**Área central — Placar:**
```
┌─────────────────────────────────────┐
│  TIME A          ×         TIME B   │
│    3                          2     │  ← números em Barlow Condensed 72px
│  [–] [+]                  [–] [+]  │  ← botões grandes de decremento/incremento
└─────────────────────────────────────┘
```
- Nome de cada time em Barlow Condensed Medium 18px
- Placar em Barlow Condensed Bold 72px (destaque absoluto)
- Botões – e + com 56px de altura mínima cada, bordas arredondadas
- Toque longo no + abre modal de registro de gol com atribuição ao boleiro (T20-A)
- Toque rápido no + incrementa placar sem atribuição (registro rápido)
- Botão – pede confirmação: "Remover gol do [Time]? [Cancelar] [Confirmar]"

**Se 3+ times:** scroll horizontal entre os times ou tabs de time acima do placar

---

**Área de cronômetro:**
```
┌─────────────────────────────────────┐
│          ▶  14:32  ◀               │
│     [Pausar]   [Encerrar tempo]     │
└─────────────────────────────────────┘
```
- Modo regressivo (padrão): começa no tempo configurado e conta para baixo
- Modo progressivo: conta de 0 para cima
- Configurado no agendamento — pode ser alterado aqui antes de iniciar
- Ao chegar em 0: vibração + som + banner "⏱ Tempo esgotado — [Iniciar próximo tempo] [Encerrar partida]"
- Cor do cronômetro muda para laranja nos últimos 2 minutos

---

**Área de eventos rápidos (abaixo do placar):**

4 botões de ação em grid 2x2:

| Botão | Ícone | Ação |
|-------|-------|------|
| Gol | ⚽ | Abre modal T20-A |
| Cartão | 🟨 | Abre modal T20-B |
| Substituição | 🔄 | Abre modal T20-C |
| Cartão Azul | 🟦 | Abre modal T20-D (visível se regra ativa) |

---

**Feed de eventos (parte inferior, rolável):**
- Lista cronológica reversa dos eventos da partida
- Cada evento: ícone colorido + descrição + minuto + time
  - Ex: "⚽ Gol — João · Time A · 14'"
  - Ex: "🟨 Amarelo — Pedro · Time B · 22'"
  - Ex: "🔄 Sub — Carlos ↔ Marcos · Time A · 31'"
- Toque em evento → opções: "Editar" / "Excluir evento"

---

**Botão fixo no rodapé:**
- "⏹ Encerrar Partida" (vermelho outline) → abre modal de confirmação → vai para T21

---

### T20-A — Modal: Registrar Gol

**Título:** "Quem fez o gol?"

- **Seletor de time:** tabs com nome dos times
- **Lista de boleiros do time selecionado:** lista com avatar + nome
  - Toque no boleiro → seleciona marcador
  - Opção "Gol sem autor" (gol contra ou não identificado)
- **Minuto do gol:** input numérico pré-preenchido com o minuto atual do cronômetro (editável)
- **Checkbox:** "Gol olímpico" (visível se regra ativa) — aplica multiplicador se configurado
- **Botão:** "Confirmar gol" (laranja)

### T20-B — Modal: Registrar Cartão

**Título:** "Qual cartão?"

- **Tipo de cartão:** seletor segmentado — 🟨 Amarelo / 🟥 Vermelho
  - Cartão 🟦 Azul aparece se regra ativa
- **Time:** tabs
- **Boleiro:** lista do time selecionado
- **Minuto:** input numérico pré-preenchido
- **Se Vermelho:** aviso automático: "Se a regra de bloqueio estiver ativa, [Nome] não jogará na próxima partida"
- **Se Azul:** campo extra "Duração (min)" pré-preenchido com o valor configurado
  - Timer visual no feed de eventos mostrando tempo restante de suspensão
- **Botão:** "Confirmar cartão"

### T20-C — Modal: Registrar Substituição

**Título:** "Substituição"

- **Time:** tabs
- **Sai:** lista de boleiros em campo do time
- **Entra:** lista de boleiros no banco/fora do time
- **Minuto:** input numérico pré-preenchido
- **Botão:** "Confirmar substituição"

### T20-D — Modal: Cartão Azul (Suspensão Temporária)

- Mesmo layout do cartão comum com campo extra de duração
- Após confirmar: timer no feed mostra "⏱ [Nome] suspenso — X min restantes" com countdown

---

### Estados da T20

- **Offline:** banner amarelo no topo "Sem conexão — eventos sendo salvos localmente"
- **Reconexão:** banner verde "Conexão restaurada — sincronizando eventos..." → "Sincronizado ✓"
- **Cronômetro pausado:** botão Pausar vira "▶ Retomar", cronômetro pisca levemente
- **Partida não iniciada:** botão "▶ Iniciar Partida" no centro — ao clicar, inicia cronômetro e ativa todos os controles
- **Erro ao salvar evento:** toast vermelho + "Tentar novamente" — evento fica em fila local

---

## T21 — Encerrar Partida (Modal de Confirmação)

**Propósito:** Confirmar encerramento da partida antes de ir para o resumo.  
**URL:** modal sobre T20  
**Acesso:** Presidente / Co-Presidente

### Layout

**Título:** "Encerrar partida?"

**Resumo rápido:**
- Placar final de todos os times
- Total de eventos registrados: X gols · Y cartões · Z substituições
- Duração: cronômetro atual

**Votação de MVP (opcional):**
- Toggle: "Abrir votação de MVP"
- Se ativo: lista de boleiros de todos os times com radio button
- Hint: "Você pode votar e todos os boleiros presentes podem votar pelo link da partida"

**Botões:**
- "⏹ Confirmar encerramento" (laranja)
- "Voltar ao jogo" (outline)

---

## T22 — Resumo da Partida

**Propósito:** Tela pós-partida com resultado final, estatísticas e compartilhamento.  
**URL:** `/partidas/[id]/resumo`  
**Acesso:** Presidente (gestão) + link público somente-leitura para boleiros

### Layout

**Header:**
- Badge: "PARTIDA ENCERRADA"
- Nome do grupo + data
- Local

**Card de Resultado (destaque central):**
```
┌─────────────────────────────────────┐
│  TIME A    3  ×  2    TIME B        │
│  (nomes dos boleiros de cada time)  │
└─────────────────────────────────────┘
```
- Se 3+ times: todos os placares em formato de tabela compacta
- Fundo: gradiente sutil laranja-azul

**Card de MVP (se votação realizada):**
- Avatar grande + nome + "⭐ MVP da Partida"
- Total de votos

**Artilharia da Partida:**
- Lista ordenada: avatar + nome + X ⚽
- Podium: 1º, 2º e 3º com destaque visual

**Linha do tempo de eventos:**
- Todos os eventos em ordem cronológica
- Visual de linha do tempo vertical com ícones coloridos

**Estatísticas individuais:**
- Tabela compacta: boleiro / time / gols / cartões / status presença

**Botões de ação (Presidente):**
- "📤 Compartilhar resumo" → gera card visual similar ao de escalação
- "💰 Ver vaquinha" → T23
- "🔁 Repetir esta partida" → abre T13 com os mesmos dados pré-preenchidos

**Visualização pública (link sem login):**
- Exibe resultado, artilharia e linha do tempo
- Oculta dados de contato e informações financeiras
- Rodapé: "Organize sua pelada com o RachãoApp → [link de cadastro]"

### Estados
- **Sem eventos registrados:** aviso no topo "Nenhum evento foi registrado durante esta partida"
- **Votação de MVP em aberto:** banner azul "Votação em andamento — X votos até agora" com botão para encerrar votação
- **Loading:** skeletons dos cards principais
