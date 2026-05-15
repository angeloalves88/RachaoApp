# RachãoApp — Mapa de Telas — Bloco 2: Dashboard + Grupos

> **Versão:** 1.0 | **Data:** Maio de 2026

---

## T07 — Dashboard do Presidente

**Propósito:** Tela inicial do Presidente após login. Visão geral rápida do que está por vir e do histórico recente.  
**URL:** `/dashboard`  
**Acesso:** Presidente autenticado

### Layout

**Header (fixo no topo):**
- Logo RachãoApp à esquerda (versão compacta — só símbolo no mobile)
- Saudação: "E aí, [Nome] 👋" em Barlow Condensed
- Ícone de sino (notificações) à direita — badge laranja com contagem se houver novas
- Avatar do usuário — abre menu rápido: Perfil / Trocar perfil / Sair

**Bloco 1 — Próxima Partida (card de destaque):**
- Badge laranja no topo do card: "PRÓXIMA PARTIDA"
- Nome do grupo em destaque
- Data e horário em Barlow Condensed grande
- Local (campo vinculado ou endereço livre)
- Linha de status: "X confirmados · Y vagas · Z pendentes"
- Barra de progresso de confirmações (laranja)
- Contador regressivo: "Faltam 2 dias e 4 horas" (atualiza em tempo real se < 24h)
- Botões de ação rápida: [Ver presenças] [Escalar times] [Ver vaquinha]
- **Estado vazio:** card com fundo tracejado + ícone ⚽ + "Nenhuma partida agendada" + botão "Agendar agora"

**Bloco 2 — Meus Grupos (scroll horizontal de cards):**
- Título da seção: "Meus Grupos" + link "Ver todos →"
- Cards horizontais roláveis (no mobile) ou grid 3 colunas (desktop):
  - Foto/ícone do grupo
  - Nome do grupo
  - "X boleiros · última partida: DD/MM"
  - Badge de papel: "Presidente" ou "Co-Presidente"
- Card final: "＋ Novo grupo" com borda tracejada

**Bloco 3 — Últimas Partidas (lista vertical):**
- Título: "Partidas Recentes" + link "Ver histórico →"
- Lista de até 3 partidas:
  - Nome do grupo + data
  - Placar final em destaque (ex: "Time A 3 × 2 Time B")
  - Badge de status: "Encerrada"
  - Link "Ver resumo →"
- **Estado vazio:** "Nenhuma partida realizada ainda"

**Bloco 4 — Alertas e Pendências (se houver):**
- Banner amarelo: "X boleiros com vaquinha em aberto na última partida → [Ver]"
- Banner vermelho: "Y boleiros bloqueados por cartão vermelho na próxima partida → [Ver escalação]"
- Aparecem apenas quando há pendências relevantes

**Bottom Navigation (mobile):**
- 🏠 Início (ativo) · 👥 Grupos · ⚽ Partidas · 👤 Perfil

### Estados
- **Sem grupos:** exibe apenas CTA para criar primeiro grupo com ilustração motivacional
- **Loading inicial:** skeletons nos 3 blocos principais
- **Erro de carregamento:** inline por bloco — "Não foi possível carregar. [Tentar novamente]"

---

## T08 — Lista de Grupos

**Propósito:** Visualizar e gerenciar todos os grupos do Presidente.  
**URL:** `/grupos`  
**Acesso:** Presidente autenticado

### Layout

**Topo da página:**
- Título: "Meus Grupos" (Barlow Condensed)
- Botão primário (laranja, canto superior direito): "＋ Novo Grupo"
- Campo de busca: "Buscar grupo..." (filtra em tempo real pelo nome)

**Lista de grupos (cards verticais):**
Cada card contém:
- Foto do grupo (avatar circular ou inicial do nome em fundo laranja)
- Nome do grupo (título)
- Esporte + nível: badge "⚽ Futsal · Casual"
- Estatísticas rápidas em linha: "14 boleiros · 23 partidas · última: 03/05"
- Papel do usuário: badge "Presidente" (laranja) ou "Co-Presidente" (cinza)
- Indicador de próxima partida: badge azul "Jogo sáb. 20h" se houver agendado
- Menu de 3 pontos (⋮): Editar grupo / Convidar co-presidente / Arquivar grupo

**Ordenação padrão:** grupos com próxima partida agendada primeiro, depois por data de última partida

### Estados
- **Lista vazia:** ilustração central + "Você ainda não tem grupos. Crie o primeiro para começar." + botão
- **Grupo arquivado:** aparece no fim da lista com opacidade reduzida e badge "Arquivado" — botão "Restaurar"
- **Loading:** 3 cards skeleton

---

## T09 — Criar / Editar Grupo

**Propósito:** Formulário para criação ou edição de um grupo de boleiros.  
**URL:** `/grupos/novo` | `/grupos/[id]/editar`  
**Acesso:** Presidente autenticado

### Layout (modal no desktop, tela cheia no mobile)

**Cabeçalho:** "Novo Grupo" ou "Editar Grupo" + botão X para fechar

**Formulário:**
- **Foto do grupo:** área clicável circular para upload — câmera ou galeria no mobile
  - Preview imediato após seleção
  - Botão "Remover foto" se já tiver uma
- **Nome do grupo** (obrigatório): input texto, max 40 caracteres, contador visível
- **Esporte:** seletor com opções — Futebol / Futsal / Society / Futebol de areia (expansível)
- **Nível:** seletor segmentado — Casual / Intermediário / Competitivo
- **Descrição** (opcional): textarea, max 200 caracteres, placeholder "Ex: Rachão das quartas no Parque..."

**Seção Co-Presidentes:**
- Lista de co-presidentes já adicionados (se edição): avatar + nome + botão remover
- Input de busca/adição: "Adicionar co-presidente pelo e-mail ou telefone"
- Hint: "Co-presidentes têm as mesmas permissões que você neste grupo"

**Botão:** "Salvar grupo" (laranja, full width)

### Estados
- **Nome já existente no mesmo perfil:** aviso inline (não bloqueia, apenas alerta)
- **Upload de foto:** loading spinner sobre a área de preview
- **Erro no upload:** mensagem vermelha inline + opção de tentar novamente
- **Edição:** botão "Excluir grupo" vermelho no rodapé do formulário, com confirmação modal

---

## T10 — Detalhe do Grupo

**Propósito:** Hub central do grupo — boleiros, partidas e configurações em uma só tela.  
**URL:** `/grupos/[id]`  
**Acesso:** Presidente / Co-Presidente do grupo

### Layout

**Header do grupo:**
- Foto do grupo (banner horizontal) ou cor gerada automaticamente pelo nome
- Sobreposto ao banner: nome do grupo em Barlow Condensed grande + badge de esporte/nível
- Linha de metadados: "X boleiros · Y partidas realizadas · criado em MM/AAAA"
- Botão de ações (⋮): Editar grupo / Convidar co-presidente / Compartilhar grupo / Arquivar

**Tabs de navegação (abas fixas abaixo do header):**
- **Boleiros** (padrão) | **Partidas** | **Estatísticas**

---

### Tab: Boleiros

**Barra de ações:**
- Campo busca: "Buscar boleiro..."
- Filtro: Todos / Ativos / Arquivados
- Botão: "＋ Adicionar boleiro"

**Lista de boleiros (cards compactos):**
Cada item contém:
- Avatar com inicial do nome (cor gerada pelo nome)
- Nome + apelido em itálico
- Posição preferida: badge pequeno (GOL / ZAG / MEI / ATA)
- Contato: ícone WhatsApp verde (se tiver) ou e-mail
- Indicadores de status (ícones com tooltip):
  - 🔴 Bloqueado por cartão vermelho
  - 💸 Inadimplente (vaquinha em aberto)
- Toque no card → abre Ficha do Boleiro (T11)
- Menu (⋮): Editar / Ver ficha / Arquivar / Remover do grupo

**Rodapé da lista:** "X boleiros ativos"

**Botão flutuante (FAB) no mobile:** ＋ laranja no canto inferior direito → Adicionar boleiro

---

### Tab: Partidas

**Filtro por status:** Todas / Agendadas / Encerradas

**Lista de partidas do grupo:**
Cada item:
- Data + horário
- Local
- Formato: "X times · Y boleiros"
- Status: badge "Agendada" (azul) / "Em andamento" (laranja pulsante) / "Encerrada" (cinza)
- Se encerrada: placar resumido
- Se agendada: contagem de confirmados
- Toque → Detalhe da partida

---

### Tab: Estatísticas

**Período:** seletor — Último mês / Últimos 3 meses / Tudo

**Cards de destaque (grid 2x2):**
- 🏆 Artilheiro: nome + X gols
- 📅 Partidas realizadas: número total
- ✅ Presença média: % geral do grupo
- 🟨 Mais cartões: nome + X cartões

**Ranking de artilharia:** lista ordenada por gols, com barra de progresso visual

**Ranking de presença:** lista ordenada por % de comparecimento

---

## T11 — Ficha do Boleiro

**Propósito:** Perfil completo de um boleiro dentro do grupo — estatísticas, histórico e status financeiro.  
**URL:** `/grupos/[id]/boleiros/[boleiro_id]`  
**Acesso:** Presidente / Co-Presidente

### Layout (abre como sheet/modal vindo de baixo no mobile)

**Cabeçalho:**
- Avatar grande (80px) com inicial
- Nome completo + apelido
- Posição preferida: badge
- Contatos: ícones de WhatsApp e e-mail clicáveis
- Botão "Editar boleiro" (ícone de lápis)
- Botão "Arquivar" (⋮ menu)

**Alertas de status (se houver):**
- Banner vermelho: "⛔ Bloqueado — Tomou cartão vermelho na última partida"
- Banner amarelo: "💸 Inadimplente — Vaquinha em aberto desde [data]"

**Cards de estatísticas (grid 2x2):**
- ⚽ Partidas jogadas
- 🥅 Gols marcados
- 🟨 Cartões amarelos
- 🟥 Cartões vermelhos

**Gráfico de presença:** barras mensais simples — presente (verde) / ausente (vermelho) / justificado (amarelo)

**Histórico de partidas (lista):**
- Data da partida
- Gols marcados naquela partida (se algum)
- Cartões recebidos
- Status de presença: ✅ Presente / ❌ Ausente / ⏳ Pendente

**Histórico financeiro:**
- Lista de vaquinhas: data + valor + status (Pago / Pendente)
- Total em aberto destacado em vermelho se houver

---

## T12 — Adicionar / Editar Boleiro

**Propósito:** Formulário para cadastrar um novo boleiro no grupo ou editar existente.  
**URL:** modal dentro de `/grupos/[id]`  
**Acesso:** Presidente / Co-Presidente

### Layout (modal/sheet — não é página separada)

**Título:** "Novo Boleiro" ou "Editar Boleiro"

**Formulário:**
- **Nome completo** (obrigatório): input texto
- **Apelido** (opcional): input texto, placeholder "Ex: Ronaldinho, Jacaré, Baixinho"
- **Posição preferida:** seletor segmentado — GOL / ZAG / MEI / ATA
- **WhatsApp** (recomendado): input tel com máscara brasileira
  - Hint: "Usado para enviar convites de partida"
- **E-mail** (opcional): input email
  - Hint: "Alternativa ao WhatsApp para convites"

**Validação:** ao menos WhatsApp ou E-mail deve ser preenchido (um dos dois obrigatório)

**Botão:** "Salvar boleiro" (laranja, full width)

**Se edição:** botão "Remover do grupo" vermelho no rodapé

### Estados
- **Boleiro duplicado (mesmo nome + contato):** aviso inline — "Já existe um boleiro com este contato. [Ver boleiro]"
- **Sem contato preenchido:** erro inline: "Informe WhatsApp ou e-mail para poder enviar convites"
