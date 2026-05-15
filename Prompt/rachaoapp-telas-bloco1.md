# RachãoApp — Mapa de Telas — Bloco 1: Área Pública + Onboarding

> **Versão:** 1.0 | **Data:** Maio de 2026

---

## T01 — Landing Page

**Propósito:** Primeira impressão do RachãoApp para visitantes não autenticados. Converte visitante em cadastro.  
**URL:** `/`  
**Acesso:** Público

### Layout
- **Header fixo (topo):** Logo RachãoApp à esquerda + botões "Entrar" e "Cadastrar grátis" à direita
- **Hero Section:**
  - Headline em Barlow Condensed ExtraBold: *"Sua pelada merece um Presidente"*
  - Subheadline em Inter: *"Escale times, controle a vaquinha e registre cada gol — tudo pelo celular"*
  - CTA primário: botão laranja "Começar grátis"
  - CTA secundário: link "Ver como funciona ↓"
  - Visual: mockup do app em celular (tela de escalação) sobre fundo azul noite com gradiente laranja sutil no canto inferior direito
- **Seção de Perfis (2 cards lado a lado):**
  - Card Presidente: ícone + título + 3 bullet points de benefícios + botão "Sou Presidente"
  - Card Dono do Estádio: ícone + título + 3 bullet points + botão "Tenho um estádio"
- **Seção de Funcionalidades (grid 2x2 no mobile, 4 colunas no desktop):**
  - Card 1: Lista de presença — ícone + título + descrição curta
  - Card 2: Escalação de times — ícone + título + descrição curta
  - Card 3: Registro de partida — ícone + título + descrição curta
  - Card 4: Controle de vaquinha — ícone + título + descrição curta
- **Seção de Planos (tabela comparativa):** Presidente vs Dono do Estádio — preços e features
- **Footer:** Links institucionais + redes sociais + copyright

### Estados
- **Usuário já logado:** Header mostra avatar + "Ir para o app" em vez dos botões de login/cadastro
- **Mobile:** Hero em coluna única, mockup acima do texto, seção de perfis em cards verticais

### Comportamentos
- Scroll suave entre seções pelo CTA "Ver como funciona"
- Header some no scroll down, reaparece no scroll up (hide-on-scroll)

---

## T02 — Login

**Propósito:** Autenticar usuário existente.  
**URL:** `/login`  
**Acesso:** Público (redireciona para dashboard se já logado)

### Layout
- **Fundo:** Azul Noite `#0f1b2d` com padrão geométrico sutil de losangos (remete a gramado)
- **Card central** (max-width 400px, centralizado vertical e horizontalmente):
  - Logo RachãoApp no topo do card
  - Título: "Bem-vindo de volta" (Barlow Condensed Bold)
  - **Botão Google OAuth** (full width): ícone Google + "Continuar com Google"
  - Divisor: linha + texto "ou"
  - **Campo e-mail:** label "E-mail", input tipo email, placeholder "seu@email.com"
  - **Campo senha:** label "Senha", input tipo password, ícone de olho para mostrar/ocultar
  - Link "Esqueci minha senha" alinhado à direita abaixo do campo
  - **Botão primário** (full width, laranja): "Entrar"
  - Rodapé do card: "Não tem conta? [Cadastrar grátis]" — link laranja

### Estados
- **Loading:** botão "Entrar" mostra spinner, desabilitado
- **Erro de credenciais:** banner vermelho abaixo do divisor: "E-mail ou senha incorretos"
- **Erro de rede:** toast no topo: "Sem conexão. Tente novamente."
- **Campos vazios ao submeter:** borda vermelha nos campos + mensagem inline abaixo de cada um

### Comportamentos
- Enter no campo senha submete o formulário
- Redirect automático para `/dashboard` após login bem-sucedido
- Se URL tiver parâmetro `?redirect=`, redireciona para aquela rota após login (ex: link de convite que pediu login)

---

## T03 — Cadastro

**Propósito:** Criar nova conta no RachãoApp.  
**URL:** `/cadastro`  
**Acesso:** Público

### Layout
- Mesmo visual do Login (fundo + card centralizado)
- **Dentro do card:**
  - Logo + Título: "Crie sua conta" (Barlow Condensed Bold)
  - **Botão Google OAuth** (full width): "Cadastrar com Google"
  - Divisor: linha + "ou"
  - **Campo Nome completo:** label + input texto
  - **Campo E-mail:** label + input email
  - **Campo Telefone (WhatsApp):** label + input tel com máscara brasileira `(XX) XXXXX-XXXX`
    - Hint abaixo: "Usado para envio de convites aos Boleiros"
  - **Campo Senha:** label + input password + ícone olho
    - Indicador de força da senha: barra de 3 segmentos (fraca / média / forte) abaixo do campo
  - **Checkbox:** "Aceito os Termos de Uso e Política de Privacidade" — link nos termos
  - **Botão primário** (full width, laranja): "Criar conta"
  - Rodapé: "Já tem conta? [Entrar]"

### Estados
- **Loading:** botão com spinner
- **E-mail já cadastrado:** erro inline no campo: "Este e-mail já está em uso. [Entrar]"
- **Senha fraca:** indicador vermelho + hint: "Use ao menos 8 caracteres com letras e números"
- **Checkbox desmarcado ao submeter:** mensagem vermelha: "Você precisa aceitar os termos para continuar"
- **Cadastro com Google:** pula para Onboarding diretamente (T04), campos nome/email já preenchidos

### Comportamentos
- Após criar conta → redireciona para T04 (Onboarding)
- Se veio de link de convite de partida → após onboarding, redireciona para a partida

---

## T04 — Onboarding — Seleção de Perfil

**Propósito:** Definir o perfil do novo usuário (Presidente, Dono do Estádio, ou ambos).  
**URL:** `/onboarding`  
**Acesso:** Apenas usuários recém-cadastrados (redireciona para dashboard se onboarding já feito)

### Layout
- **Fundo:** Azul Noite com gradiente laranja sutil no topo
- **Barra de progresso no topo:** Step 1 de 2 — "Qual é o seu perfil?"
- **Título:** "Como você vai usar o RachãoApp?" (Barlow Condensed Bold, centralizado)
- **Subtítulo:** "Escolha um ou os dois perfis — você pode mudar depois"
- **Dois cards de seleção** (empilhados no mobile, lado a lado no desktop):

  **Card Presidente:**
  - Ícone grande: 🏆 ou ilustração
  - Título: "Presidente"
  - Descrição: "Organizo peladas, escalo times e controlo a vaquinha do meu grupo"
  - Lista de 3 bullets: ✓ Gerencio meus Boleiros / ✓ Agendo e registro partidas / ✓ Controlo a vaquinha
  - Estado: borda laranja + check quando selecionado

  **Card Dono do Estádio:**
  - Ícone grande: 🏟️ ou ilustração
  - Título: "Dono do Estádio"
  - Descrição: "Tenho um campo ou quadra e quero gerenciar minha agenda e receber organizadores"
  - Lista de 3 bullets: ✓ Cadastro meu espaço / ✓ Defino horários disponíveis / ✓ Aprovo partidas no meu campo
  - Estado: borda laranja + check quando selecionado

- **Nota abaixo dos cards:** "Você pode ter os dois perfis ao mesmo tempo"
- **Botão primário** (full width): "Continuar" — habilitado apenas quando ao menos 1 card selecionado

### Step 2 — Completar perfil (após seleção)

**Se selecionou Presidente:**
- Campo: "Nome do seu grupo de pelada" (opcional, pode pular)
- Campo: "Cidade onde joga" (texto livre)
- Botão: "Entrar no app"

**Se selecionou Dono do Estádio:**
- Campo: "Nome do seu campo/quadra"
- Campo: "Cidade"
- Botão: "Entrar no app" → leva para T09 (cadastro do estádio) como primeiro passo

**Se selecionou ambos:**
- Campos do Presidente + campos do Dono do Estádio na mesma tela
- Botão: "Entrar no app"

### Estados
- **Nenhum card selecionado:** botão "Continuar" desabilitado com opacidade 50%
- **Step 2 com campo obrigatório vazio:** validação inline ao tentar avançar

### Comportamentos
- Pode pular o Step 2 ("Preencher depois" link abaixo do botão)
- Após concluir → redireciona para o Dashboard do perfil principal selecionado

---

## T05 — Recuperação de Senha

**Propósito:** Permitir que o usuário redefina sua senha por e-mail.  
**URL:** `/recuperar-senha`  
**Acesso:** Público

### Layout (2 etapas no mesmo card centralizado)

**Etapa 1 — Solicitar link:**
- Título: "Esqueceu a senha?"
- Subtítulo: "Informe seu e-mail e enviaremos um link para redefinição"
- Campo e-mail
- Botão laranja: "Enviar link"
- Link: "Voltar para o login"

**Etapa 2 — Confirmação (após submit):**
- Ícone de envelope ✉️ grande
- Título: "Verifique seu e-mail"
- Texto: "Enviamos um link para **[email mascarado]**. Válido por 30 minutos."
- Botão secundário: "Reenviar e-mail" (habilitado após 60 segundos — countdown visível)
- Link: "Voltar para o login"

### Estados
- **E-mail não cadastrado:** mesmo feedback de sucesso (não revela se o e-mail existe — segurança)
- **Reenvio durante countdown:** botão desabilitado com "Reenviar em 45s"

---

## T06 — Link de Confirmação de Presença (Boleiro)

**Propósito:** Tela acessada pelo Boleiro via link recebido no WhatsApp ou e-mail. Confirma ou recusa presença **sem necessidade de login.**  
**URL:** `/confirmar/[token]`  
**Acesso:** Público, via token único por convite

### Layout
- **Fundo:** Azul Noite (mesma identidade do app, mesmo sem login)
- **Card centralizado** (mobile ocupa tela toda):

  **Cabeçalho do card:**
  - Badge laranja: "CONVITE PARA PARTIDA"
  - Nome do grupo em destaque (Barlow Condensed)
  - Nome do Presidente abaixo: "Organizado por [Nome]"

  **Informações da Partida:**
  - 📅 Data e horário (ex: "Sábado, 10 de maio · 20h00")
  - 📍 Local (nome do campo ou endereço)
  - ⚽ Formato (ex: "Futsal 5x5 · 3 times · 60 min")
  - 💰 Valor da vaquinha (se configurado): "Sua parte: R$ 20,00 — Pix: [chave]"

  **Contagem de confirmados:**
  - Barra de progresso: "12 de 15 vagas confirmadas"
  - Avatares/iniciais dos confirmados (máx. 8 visíveis + "+N")

  **Observações do Presidente** (se preenchido): caixa de texto destacada

  **Área de ação (fixada no rodapé no mobile):**
  - Botão verde full width: "✅ Vou comparecer"
  - Botão vermelho outline full width: "❌ Não vou poder ir"
  - Campo opcional: "Deixe um recado para o Presidente" (textarea, aparece após clicar em qualquer botão)

### Estados
- **Token inválido ou expirado:** card com ícone ⚠️ + "Este link não é mais válido. Peça ao Presidente um novo convite."
- **Já confirmado:** mostra estado atual com opção de cancelar — "Você já confirmou presença. [Cancelar confirmação]"
- **Já recusou:** mostra estado atual com opção de confirmar — "Você recusou este convite. [Confirmar presença]"
- **Partida lotada (confirmando):** avisa que entrou na lista de espera — "Todas as vagas estão preenchidas. Você entrou na lista de espera e será avisado se uma vaga abrir."
- **Partida já encerrada:** banner informativo — "Esta partida já aconteceu."

### Após confirmar/recusar
- Feedback imediato: animação de check verde (confirmar) ou X vermelho (recusar)
- Mensagem: "Obrigado! O Presidente foi avisado."
- Se confirmou: exibe botão "Adicionar ao calendário" (Google Calendar / iCal)
- Link discreto no rodapé: "Quer organizar sua própria pelada? Conheça o RachãoApp" → Landing Page
