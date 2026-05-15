# RachãoApp — Mapa de Telas — Blocos 7, 8 e 9: Vaquinha + Dono do Estádio + Configurações

> **Versão:** 1.0 | **Data:** Maio de 2026

---

# BLOCO 7 — Vaquinha (Financeiro)

---

## T23 — Gerenciar Vaquinha

**Propósito:** Controle financeiro completo de uma partida — quem pagou, quanto falta arrecadar e envio de cobranças.  
**URL:** `/partidas/[id]/vaquinha`  
**Acesso:** Presidente / Co-Presidente

### Layout

**Header:**
- Título: "Vaquinha" em Barlow Condensed
- Subtítulo: "[Nome do grupo] · [Data da partida]"
- Botão (⋮): Editar configurações da vaquinha

**Card de resumo financeiro (destaque):**
```
┌─────────────────────────────────────┐
│  Arrecadado          Esperado        │
│  R$ 120,00    de    R$ 200,00       │
│  ████████████░░░░░░░░  60%          │
│                                     │
│  Chave Pix: 11999998888             │
│  [Copiar chave Pix]                 │
└─────────────────────────────────────┘
```
- Barra de progresso laranja
- Valor arrecadado em verde se 100%, laranja se parcial, vermelho se abaixo de 50%
- Botão "Copiar chave Pix" — feedback inline "Copiado! ✓"

**Pills de status:**
- 💰 Pagos: X (verde) · ⏳ Pendentes: X (amarelo) · ❌ Inadimplentes: X (vermelho)

**Filtros em tabs:** Todos | Pagos | Pendentes | Inadimplentes

**Lista de boleiros:**

Cada item:
- Avatar + nome + apelido
- Tipo: badge "Fixo" (R$ X,00) ou "Convidado" (R$ Y,00)
- Status de pagamento: badge colorido
- Data de pagamento (se pago): texto secundário "Pago em DD/MM"
- **Ações rápidas (swipe no mobile, hover no desktop):**
  - ✅ Marcar como pago
  - ↩️ Desfazer pagamento
  - 📲 Enviar cobrança via WhatsApp

**Botão flutuante (FAB) no mobile:**
- "📲 Cobrar todos os pendentes" — abre T24

---

### Marcar como pago (inline, sem modal):
- Toque no botão ✅ → item muda imediatamente para "Pago" com animação de check verde
- Ação desfeita por swipe contrário ou via ↩️ (até 10 segundos — snackbar "Pagamento registrado [Desfazer]")

---

## T24 — Enviar Cobrança (Modal)

**Propósito:** Gerar e enviar mensagem de cobrança personalizada para boleiros pendentes.  
**URL:** modal em `/partidas/[id]/vaquinha`  
**Acesso:** Presidente / Co-Presidente

### Layout (sheet de baixo no mobile)

**Título:** "Enviar cobrança"

**Seleção de boleiros:**
- Chips pré-definidos: "Todos os pendentes" (padrão) / "Todos os inadimplentes" / "Selecionar manualmente"
- Se manual: lista com checkboxes

**Preview da mensagem (editável):**
```
E aí, [Nome]! 👋
Sua parte da pelada de [data] ainda está em aberto.

💰 Valor: R$ [X],00
🏦 Pix: [chave]

Qualquer dúvida é só falar!
```
- Textarea editável — alterações afetam todos os envios do lote
- Tags dinâmicas `[Nome]`, `[data]`, `[X]`, `[chave]` são substituídas individualmente por boleiro

**Botão:** "Enviar para X boleiros via WhatsApp" (laranja)
- Abre o WhatsApp com a mensagem pré-preenchida para cada contato (um por um — limitação da API web do WhatsApp)
- Hint: "O WhatsApp será aberto para cada boleiro separadamente"

### Estados
- **Boleiro sem WhatsApp:** excluído do envio com aviso "Y boleiros sem WhatsApp não receberão a cobrança"
- **Mensagem vazia:** botão desabilitado

---

## T25 — Configurar Vaquinha (Modal de Edição)

**Propósito:** Criar ou editar a configuração financeira de uma partida específica.  
**URL:** modal em `/partidas/[id]/vaquinha` ou step 5 do wizard T13  
**Acesso:** Presidente / Co-Presidente

### Layout

**Título:** "Configurar Vaquinha"

**Campos:**
- **Ativar vaquinha:** toggle principal (desativar oculta os demais campos)
- **Tipo de cobrança:** seletor — "Por esta partida" / "Mensalidade"
- **Chave Pix:** tipo (CPF/Tel/E-mail/Aleatória) + input valor da chave
- **Valor — Boleiros fixos:** input numérico prefixo "R$"
- **Valor — Convidados avulsos:** input numérico prefixo "R$"
  - Toggle atalho: "Mesmo valor dos boleiros fixos"
- **Data limite de pagamento:** date picker — padrão: data da partida

**Preview ao vivo:**
- "Total esperado: R$ X,00 (Y boleiros × R$ Z,00 + W convidados × R$ V,00)"

**Botão:** "Salvar configuração" (laranja)
**Botão destrutivo (se já configurada):** "Remover vaquinha desta partida" (vermelho outline, com confirmação)

---

# BLOCO 8 — Dono do Estádio

---

## T26 — Dashboard do Dono do Estádio

**Propósito:** Visão geral do espaço — partidas agendadas, pendências de aprovação e ocupação da agenda.  
**URL:** `/estadio/dashboard`  
**Acesso:** Dono do Estádio autenticado

### Layout

**Header:**
- Logo + "Olá, [Nome] 🏟️"
- Ícone de notificações com badge
- Avatar → menu rápido

**Card de destaque — Próximas partidas:**
- Lista das 3 próximas partidas aprovadas:
  - Data + horário
  - Nome do grupo (Presidente)
  - Formato: "X times · Y boleiros"
  - Badge: "Aprovada" (verde)
- Botão: "Ver agenda completa →"
- Estado vazio: "Nenhuma partida agendada" + botão "Configurar horários disponíveis"

**Card de pendências de aprovação:**
- Badge laranja com número de solicitações pendentes
- Lista compacta: nome do grupo + data solicitada + horário
- Botões inline: "✅ Aprovar" / "❌ Recusar"
- Link: "Ver todas →" → T29
- Estado vazio: card com borda tracejada "Nenhuma solicitação pendente"

**Cards de estatísticas rápidas (grid 2x2):**
- 📅 Partidas este mês: número
- 👥 Grupos frequentadores: número
- ⚽ Horários ocupados esta semana: X de Y
- 📊 Taxa de ocupação mensal: %

**Bottom Navigation (mobile):**
- 🏠 Início (ativo) · 🏟️ Estádio · 📅 Agenda · 👤 Perfil

---

## T27 — Perfil do Estádio

**Propósito:** Cadastro e edição completa das informações do espaço esportivo.  
**URL:** `/estadio/perfil`  
**Acesso:** Dono do Estádio autenticado

### Layout

**Tabs:** Informações | Fotos | Horários

---

### Tab: Informações

**Campos do formulário:**
- **Foto de capa:** upload de imagem — preview full-width no topo (aspect ratio 16:9)
- **Nome do estádio/campo** (obrigatório): input texto
- **Tipo de espaço:** seletor — Campo / Quadra / Arena / Salão
- **Tipo de piso:** seletor múltiplo — Grama Natural / Grama Sintética / Cimento / Saibro / Areia / Parquet
- **Capacidade por time:** seletor numérico — quantos jogadores por time o espaço comporta confortavelmente
- **Endereço completo** (obrigatório): CEP (auto-completa logradouro via API) + número + complemento
- **Cidade / Estado:** auto-preenchidos pelo CEP, editáveis
- **Descrição livre** (opcional): textarea, placeholder "Ex: Campo com vestiário, estacionamento e iluminação para jogos noturnos"
- **Comodidades:** checkboxes — Vestiário / Estacionamento / Iluminação Noturna / Banheiros / Lanchonete / Arquibancada

**Página pública do estádio:**
- Toggle: "Meu estádio aparece em buscas de Presidentes"
- Link: "Ver minha página pública →" (abre T30 em nova aba)

**Botão:** "Salvar informações" (laranja)

---

### Tab: Fotos

**Galeria atual:**
- Grid de fotos já enviadas (3 colunas no mobile, 4 no desktop)
- Foto de capa marcada com badge "Capa"
- Toque em foto → opções: "Definir como capa" / "Excluir"

**Adicionar fotos:**
- Área de upload (drag & drop no desktop, botão no mobile)
- Aceita até 10 fotos, max 5MB cada, formatos JPG/PNG/WEBP
- Preview antes de confirmar upload
- Contador: "X de 10 fotos"

---

### Tab: Horários Disponíveis

**Propósito:** Definir os dias e horários em que o espaço aceita solicitações de partidas.

**Grade semanal:**
- 7 linhas (Segunda a Domingo)
- Cada linha: toggle de ativação do dia + campos de horário se ativo

```
Segunda  [●] Ativo    De [08:00] até [22:00]   Intervalo [1h] entre partidas
Terça    [○] Inativo
Quarta   [●] Ativo    De [18:00] até [23:00]   Intervalo [30min] entre partidas
...
```

**Campo "Intervalo entre partidas":** tempo mínimo entre o fim de uma partida e início de outra (para limpeza/preparação)

**Bloqueio de datas específicas:**
- Seção "Exceções": lista de datas bloqueadas (feriados, manutenção, etc.)
- Botão "＋ Bloquear data" → date picker + campo de motivo (opcional, ex: "Manutenção")
- Datas bloqueadas listadas com botão de remover

**Botão:** "Salvar horários" (laranja)

---

## T28 — Agenda do Estádio

**Propósito:** Visualização calendário de todas as partidas aprovadas e horários disponíveis.  
**URL:** `/estadio/agenda`  
**Acesso:** Dono do Estádio autenticado

### Layout

**Controles do calendário:**
- Navegação: ← Mês anterior · Mês atual (título) · Próximo mês →
- Toggle de visualização: "Mês" / "Semana" / "Dia"

**Visualização Mês:**
- Grade calendário padrão
- Dias com partidas aprovadas: ponto laranja abaixo da data
- Dias com solicitações pendentes: ponto amarelo
- Dias bloqueados: fundo cinza escuro
- Toque em dia → abre visualização de dia

**Visualização Semana:**
- Colunas por dia, linhas por hora
- Blocos coloridos: laranja (aprovado) / amarelo (pendente) / cinza (bloqueado)
- Clique em horário vazio → modal de bloquear data

**Visualização Dia (mais usada):**
- Lista de partidas do dia em ordem cronológica
- Cada item:
  - Horário de início e fim
  - Nome do grupo (Presidente)
  - Formato
  - Badge de status: Aprovada / Pendente / Recusada
  - Toque → T29 (detalhe da solicitação)

**Legenda no rodapé:** Aprovada / Pendente / Bloqueada

---

## T29 — Aprovação de Vínculo

**Propósito:** Gerenciar solicitações de Presidentes que querem realizar partidas no estádio.  
**URL:** `/estadio/solicitacoes`  
**Acesso:** Dono do Estádio autenticado

### Layout

**Tabs:** Pendentes (badge com contador) | Aprovadas | Recusadas | Todas

**Lista de solicitações:**

Cada card contém:
- **Header:** Nome do grupo + nome do Presidente
- **Data e horário solicitados** em destaque
- **Formato:** X times · Y boleiros · Z min
- **Observações do Presidente** (se preenchidas)
- **Alerta de conflito** (se houver): banner amarelo "⚠️ Conflito com partida aprovada às [HH:MM]"

**Ações (cards pendentes):**
- Botão verde "✅ Aprovar" (full width)
- Botão vermelho outline "❌ Recusar"
  - Ao recusar: modal com campo de texto livre "Motivo (opcional)" — enviado como notificação ao Presidente

**Ações (cards aprovados):**
- Botão outline "Cancelar aprovação" → abre modal de confirmação + campo de motivo

### Estados
- **Lista vazia (pendentes):** "Nenhuma solicitação pendente. Seus horários disponíveis estão configurados." + link para T27
- **Conflito de horário ao aprovar:** modal de confirmação "Já existe uma partida aprovada neste horário. Deseja aprovar mesmo assim?"

---

## T30 — Página Pública do Estádio

**Propósito:** Página acessível sem login para Presidentes encontrarem e conhecerem o espaço.  
**URL:** `/estadios/[slug]`  
**Acesso:** Público

### Layout

**Hero:**
- Foto de capa full-width (16:9)
- Galeria de fotos abaixo: miniaturas clicáveis com lightbox

**Informações principais:**
- Nome do estádio em Barlow Condensed grande
- Endereço com link para Google Maps
- Tipo de piso + comodidades (ícones com labels)

**Horários disponíveis:**
- Grade visual da semana com horários

**CTA para Presidente:**
- Banner: "Quer jogar aqui?"
- Botão laranja: "Solicitar horário" → se não logado, redireciona para login com `?redirect=` para voltar; se logado como Presidente, abre o wizard T13 com este estádio pré-selecionado no Step 2

---

# BLOCO 9 — Configurações e Perfil

---

## T31 — Perfil Pessoal

**Propósito:** Edição dos dados pessoais do usuário autenticado.  
**URL:** `/perfil`  
**Acesso:** Qualquer usuário autenticado

### Layout

**Avatar:**
- Foto circular grande (96px) + botão "Alterar foto"
- Upload de imagem ou câmera no mobile

**Formulário:**
- **Nome completo** (obrigatório)
- **Apelido/Nickname** (opcional): como aparece para os boleiros nos grupos
- **E-mail:** somente-leitura se cadastro via Google; editável se e-mail/senha
- **WhatsApp** (obrigatório para envio de convites): input com máscara
- **Cidade** (usado em buscas de estádio)

**Seção: Segurança**
- Botão "Alterar senha" → modal com senha atual + nova senha + confirmação
- Botão "Desconectar de todos os dispositivos" (outline vermelho) — com confirmação

**Seção: Meus Perfis**
- Lista de perfis ativos: badge "Presidente" e/ou "Dono do Estádio"
- Botão "Ativar perfil de Presidente" (se ainda não tiver) → wizard de onboarding do perfil
- Botão "Ativar perfil de Dono do Estádio" (se ainda não tiver) → wizard de onboarding do perfil

**Botão:** "Salvar alterações" (laranja)

**Zona de perigo (rodapé, colapsável):**
- "Excluir minha conta" (vermelho) → modal de confirmação com input de confirmação digitando "EXCLUIR"

---

## T32 — Planos e Assinatura

**Propósito:** Visualização do plano atual, upgrade e gerenciamento de assinatura.  
**URL:** `/planos`  
**Acesso:** Qualquer usuário autenticado

### Layout

**Card do plano atual:**
- Badge: "SEU PLANO ATUAL"
- Nome do plano + valor + período
- Data de renovação
- Botão "Gerenciar assinatura" (abre portal de pagamento externo)

**Tabela comparativa de planos:**

| | Grátis (Trial) | Presidente | Dono do Estádio | Combo |
|--|---------------|-----------|-----------------|-------|
| Grupos | 1 | Ilimitados | — | Ilimitados |
| Boleiros por grupo | 15 | Ilimitados | — | Ilimitados |
| Partidas/mês | 3 | Ilimitadas | — | Ilimitadas |
| Histórico | 30 dias | Completo | — | Completo |
| Escalação automática | ✅ | ✅ | — | ✅ |
| Vaquinha | ✅ | ✅ | — | ✅ |
| Card de compartilhamento | ❌ | ✅ | — | ✅ |
| Estádio cadastrado | — | — | ✅ | ✅ |
| Gestão de agenda | — | — | ✅ | ✅ |
| Aprovação de vínculos | — | — | ✅ | ✅ |
| **Preço** | Grátis (14 dias) | R$ X/mês | R$ Y/mês | R$ Z/mês |

**Botões de ação:**
- CTA laranja no plano recomendado: "Assinar agora"
- Hint: "Cancele quando quiser — sem fidelidade"

**Se trial ativo:**
- Banner laranja: "Seu trial gratuito termina em X dias"

---

## T33 — Configurações de Notificações

**Propósito:** Controle granular sobre quais notificações o usuário recebe e por qual canal.  
**URL:** `/configuracoes/notificacoes`  
**Acesso:** Qualquer usuário autenticado

### Layout

**Seção: Canal de recebimento**
- **E-mail:** toggle global + e-mail atual exibido
- **WhatsApp:** toggle global + número atual exibido

**Seção: Notificações do Presidente**

| Evento | E-mail | WhatsApp |
|--------|--------|----------|
| Boleiro confirmou presença | toggle | toggle |
| Boleiro recusou presença | toggle | toggle |
| Vaga aberta na lista de espera | toggle | toggle |
| Lembrete de partida (24h antes) | toggle | toggle |
| Vaquinha pendente | toggle | toggle |
| Dono do Estádio aprovou vínculo | toggle | toggle |
| Dono do Estádio recusou vínculo | toggle | toggle |

**Seção: Notificações do Dono do Estádio** (visível se perfil ativo)

| Evento | E-mail | WhatsApp |
|--------|--------|----------|
| Nova solicitação de vínculo | toggle | toggle |
| Presidente cancelou partida | toggle | toggle |

**Botão:** "Salvar preferências" (laranja)

---

## T34 — Configurações Gerais

**Propósito:** Preferências gerais do aplicativo.  
**URL:** `/configuracoes`  
**Acesso:** Qualquer usuário autenticado

### Layout (lista de seções com navegação)

**Seção: Conta**
- "Perfil pessoal" → T31
- "Planos e assinatura" → T32
- "Notificações" → T33

**Seção: Preferências**
- "Idioma": seletor (Português BR — único na V1)
- "Tema": Dark (padrão — único na V1, light mode na V2)
- "Formato de hora": 24h / 12h

**Seção: Padrões para partidas** (atalho de produtividade)
- "Número padrão de times": seletor numérico
- "Boleiros padrão por time": seletor numérico
- "Tempo padrão de partida (min)": seletor numérico
- "Regras ativas por padrão": checkboxes das regras — as marcadas aqui vêm pré-ativadas ao criar partida
- Hint: "Estes valores são preenchidos automaticamente ao criar uma nova partida"

**Seção: Sobre**
- "Versão do app": X.X.X
- "Termos de Uso" → link externo
- "Política de Privacidade" → link externo
- "Suporte / Fale conosco" → link para WhatsApp de suporte ou e-mail

**Seção: Conta — Ações**
- "Sair" (outline vermelho) → confirmação simples → redirect para login
