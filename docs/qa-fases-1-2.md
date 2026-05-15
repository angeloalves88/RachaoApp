# Checklist de QA — Fases 1 + 2

> Última atualização: **10/05/2026** · cobre tudo até o **Bloco 2 (Dashboard + Grupos)**.

URLs default no dev:
- **Web:** http://localhost:3001
- **API:** http://localhost:3333
- **Studio:** http://localhost:8000 (basic auth com `DASHBOARD_USERNAME/PASSWORD` do `infra/supabase/.env`)

> **Smoke E2E — 10/05/2026 (após Bloco 4):** rodada com `python smoke.py --headless`,
> **13/13 passos verdes** em ~40s. Itens marcados com `[x]` são cobertos
> automaticamente pelo smoke; os demais ainda exigem validação manual
> (casos negativos, contadores, toasts, mobile, etc.).
>
> Resultado da última rodada:
>
> ```
> [00] API ok (rachao-api) | Web ok
> [01] Cadastro feito, redirecionado pra /onboarding
> [02] Onboarding concluido, em /dashboard
> [03] Grupo 'Pelada XXXXXX' aparece no dashboard
> [04] Grupo criado; detalhe aberto
> [05] Busca funcionando
> [06] Edicao salva
> [07] Boleiro adicionado
> [08] Ficha aberta e fechada
> [09] Partida criada
> [10] Detalhe da partida ok
> [11] Tela de presencas ok       ← Bloco 4 (T15)
> [12] Centro de notificacoes ok  ← Bloco 4 (T17)
> [13] Deslogado, em /login
> ```

---

## Pré-requisitos antes de testar

- [x] `pnpm supabase:up` — todos containers _Up_ (kong, db, auth healthy; storage pode reiniciar uma vez)
- [x] `pnpm dev` em terminal separado — log mostra `http://localhost:3001` e `Server listening on http://0.0.0.0:3333`
- [ ] Browser em modo anônimo / cache limpo (`Ctrl+Shift+R` ao reabrir)

---

## Fase 1 — Auth & Onboarding

### 1.1. Cadastro
- [x] `/cadastro` carrega sem erros no console
- [ ] Validação de e-mail (digitar inválido → mensagem inline)
- [ ] Máscara de celular: `(11) 9XXXX-XXXX` enquanto digita
- [ ] Indicador de força da senha muda de cor conforme digita
- [x] Botão "Criar conta" desabilitado até aceitar os termos *(smoke marca o checkbox antes de submeter)*
- [x] Submeter com dados válidos redireciona para `/onboarding`
- [ ] **Negativo:** tentar cadastrar e-mail já existente → mensagem "E-mail já cadastrado" (não trava)

### 1.2. Login
- [ ] `/login` carrega
- [ ] Logar com credenciais válidas → vai para `/dashboard` (se já onboarded) ou `/onboarding` (se não)
- [ ] **Negativo:** senha errada → "E-mail ou senha incorretos"
- [ ] Link "Esqueci minha senha" leva para `/recuperar-senha`

### 1.3. Recuperação (sem SMTP, só verificação visual)
- [ ] `/recuperar-senha` aceita e-mail válido e mostra tela de "Verifique seu e-mail"
- [ ] Cooldown de 60s no botão "Reenviar"

### 1.4. Onboarding
- [x] Step 1: cards de perfil (Presidente / Dono do Estádio) selecionáveis
- [ ] Botão "Continuar" só habilita após selecionar pelo menos um perfil
- [x] Step 2: campos contextuais aparecem conforme o perfil
- [x] Como Presidente: digitar nome do grupo + cidade → "Concluir" → `/dashboard`
- [ ] Como Dono do Estádio: digitar nome + cidade → `/estadio/dashboard`
- [ ] Refresh após onboarding **não** volta para `/onboarding` (idempotência)

### 1.5. Logout
- [x] Avatar no canto superior direito abre menu
- [x] "Sair" desloga e leva para `/login`
- [ ] Tentar acessar `/dashboard` deslogado → redireciona para `/login?redirect=/dashboard`

---

## Fase 2 — Dashboard & Grupos

### 2.1. Dashboard (T07) — `/dashboard`
- [x] Saudação com primeiro nome + emoji 👋
- [ ] **Sem partida agendada:** card tracejado "Nenhuma partida agendada" + botão "Agendar agora"
- [x] **Com grupo no onboarding:** aparece em "Meus Grupos"
- [ ] Card final do scroll horizontal "+ Novo grupo" abre `/grupos/novo`
- [ ] Sem partidas encerradas: card "Nenhuma partida realizada ainda"
- [ ] Bottom nav (mobile, < 768px): 4 ícones — Início ativo (laranja)
- [x] Botão sticky "Nova partida" no header *(adicionado no Bloco 3 e validado durante step 09)*

### 2.2. Lista de Grupos (T08) — `/grupos`
- [ ] Header "Meus Grupos" + contador "X grupos no total"
- [ ] Botão "+ Novo grupo" no canto superior direito (desktop)
- [ ] FAB laranja no canto inferior direito (mobile)
- [x] Busca filtra em tempo real (debounce ~250ms)
- [ ] Filtros segmentados: Ativos / Arquivados / Todos
- [ ] Card mostra: avatar (inicial colorida), nome, badges esporte/nível, contador de boleiros, papel (Presidente/Co-presidente)
- [ ] Menu ⋮ abre Editar / Convidar co-presidente / Arquivar
- [ ] Ordem padrão: ativos com próxima partida primeiro, depois por atualização

### 2.3. Criar Grupo (T09) — `/grupos/novo`
- [x] Dialog abre automaticamente
- [ ] Nome com contador `X/40` ao digitar
- [x] Esporte: 4 opções segmentadas (Futebol / Futsal / Society / Areia)
- [x] Nível: 3 opções segmentadas (Casual / Intermediário / Competitivo)
- [ ] Descrição com contador `X/200`
- [ ] Avatar atualiza visualmente conforme nome digitado (cor determinística)
- [x] Submeter cria o grupo e redireciona para `/grupos/[id]`
- [ ] Toast verde "Grupo criado!" no topo
- [ ] **Negativo:** nome com 1 caractere → erro inline "Informe um nome para o grupo"
- [ ] Fechar dialog (X ou ESC) volta para `/grupos`

### 2.4. Editar Grupo (T09) — `/grupos/[id]/editar`
- [x] Dialog abre com dados pré-preenchidos
- [x] Mudar nível e salvar → toast "Grupo atualizado", volta para detalhe
- [ ] Seção "Co-presidentes" lista o criador (com label "Criador") sem botão remover
- [ ] Adicionar co-presidente por e-mail de outro user existente → aparece na lista
- [ ] **Negativo:** adicionar e-mail inexistente → toast vermelho "Esse usuário ainda não tem conta no app"
- [ ] Botão "Arquivar grupo" (vermelho, rodapé) → confirma → toast "Grupo arquivado", volta para `/grupos`

### 2.5. Detalhe do Grupo (T10) — `/grupos/[id]`
- [ ] Header com banner gradiente (ou foto se houver `fotoUrl`)
- [ ] Avatar grande do grupo no canto inferior do banner
- [ ] Botão voltar (←) leva para `/grupos`
- [ ] Menu ⋮ no canto superior direito
- [ ] Linha de metadados: "X boleiros ativos · Y partidas · criado em mai/2026"
- [x] Tabs visíveis: **Boleiros** (ativa) / **Partidas** / **Estatísticas**
- [ ] Tab Partidas: empty state "Em breve"
- [ ] Tab Estatísticas: empty state "Estatísticas em breve"

### 2.6. Tab Boleiros (T10)
- [ ] Sem boleiros: empty state com botão "+ Adicionar boleiro"
- [x] Após adicionar: aparece na lista (avatar + nome + badge de posição)
- [ ] Busca filtra por nome ou apelido
- [ ] Filtros: Ativos / Arquivados / Todos
- [ ] Footer mostra "X boleiros ativos"
- [ ] FAB ＋ visível no mobile

### 2.7. Adicionar Boleiro (T12)
- [x] Click no botão (ou FAB) abre modal centralizado (desktop) ou tela cheia (mobile)
- [x] Posições segmentadas: GOL / ZAG / MEI / ATA
- [x] WhatsApp aceita máscara `(XX) 9XXXX-XXXX`
- [ ] **Validação:** sem WhatsApp e sem e-mail → erro inline "Informe WhatsApp ou e-mail..."
- [ ] **Validação:** WhatsApp com 10 dígitos → erro "Celular deve ter 11 dígitos"
- [x] Submeter → toast "Boleiro adicionado", aparece no topo da lista
- [ ] **Negativo:** mesmo celular duas vezes no mesmo grupo → toast "Já existe um boleiro com este contato"

### 2.8. Ficha do Boleiro (T11)
- [x] Click no card do boleiro abre o sheet
- [x] Avatar grande + nome + apelido em itálico (com aspas)
- [x] Badge da posição
- [ ] Link do WhatsApp clicável (abre `wa.me/55...`)
- [ ] Link do e-mail clicável
- [ ] Grid 2x2 com stats (todos zerados — fase 3+ alimenta)
- [ ] Botão lápis no canto superior direito abre modo "Editar Boleiro"
- [x] ESC ou X fecha o sheet

### 2.9. Editar / Arquivar Boleiro (T12)
- [ ] Editar pelo menu ⋮ pré-preenche todos os campos
- [ ] Mudar apelido e salvar → toast e atualização imediata na lista
- [ ] Botão "Remover do grupo" (rodapé do form de edição) → confirma → arquiva
- [ ] Filtro "Arquivados" mostra o boleiro com opacidade reduzida

### 2.10. Persistência & Recarga
- [ ] `Ctrl+Shift+R` em qualquer tela mantém todos os dados criados
- [ ] Logout + login + voltar pra `/grupos` → grupos e boleiros continuam lá
- [ ] Studio (http://localhost:8000) — tabela `Grupo`, `BoleiroGrupo`, `GrupoPresidente` populadas

---

## Erros conhecidos / em backlog

- **Storage container reinicia ocasionalmente** no Windows (Docker WSL). Não impacta auth/grupos.
- **Studio aparece "unhealthy"** no `docker ps` mas funciona normalmente. Healthcheck mal configurado (não afeta uso).
- **Tab Estatísticas** ainda mostra empty state — implementação vem em blocos posteriores. **Tab Partidas** já fica preenchida quando há partidas.

---

## Como reportar bugs encontrados

1. Print da tela + URL completa
2. Mensagens do Console (DevTools → Console)
3. Aba Network: status do request que falhou e payload da response
4. Passo a passo curto pra reproduzir
