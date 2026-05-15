# QA — Bloco 9: Configurações e Perfil (T31–T34)

> Casos de teste manuais para perfil, planos (stub), notificações e configurações gerais.

## Setup

1. Usuário com perfil **Presidente** e outro com **Dono do Estádio** (ou ambos).
2. Variáveis: `SUPABASE_SERVICE_ROLE_KEY`, buckets `avatares` e `estadios-fotos` no Supabase.
3. Migração aplicada: `Usuario.apelido`, `Usuario.cidade`, `Usuario.planoExpiraEm`, `Usuario.prefFormatoHora`, `PreferenciaNotificacao`.

---

## T31 — Perfil (`/perfil`)

### Caso A — Editar dados
1. Menu do usuário → **Perfil pessoal**.
2. Alterar nome, apelido, WhatsApp (11 dígitos), cidade.
3. **Salvar alterações** → toast de sucesso; recarregar e conferir persistência.

### Caso B — Avatar
1. **Alterar foto** → escolher JPG &lt; 5 MB.
2. Preview atualiza; recarregar — URL pública do bucket `avatares`.

### Caso C — Alterar senha
1. **Alterar senha** → senha atual incorreta → erro.
2. Senha atual correta + nova (regras: 8+ chars, maiúscula, minúscula, número) + confirmação → sucesso.
3. Fazer logout e login com a nova senha.

### Caso D — Logout global
1. **Desconectar de todos os dispositivos** → confirmar → redireciona para login.

### Caso E — Ativar perfil
1. Usuário só Presidente → **Ativar perfil de Dono do Estádio** → perfil aparece na lista.
2. Repetir não duplica o badge.

### Caso F — Excluir conta
1. Zona de perigo → **Excluir minha conta** → digitar `EXCLUIR` errado → botão desabilitado ou erro.
2. Digitar `EXCLUIR` → conta removida; login impossível com o mesmo e-mail até novo cadastro.

---

## T32 — Planos (`/planos`)

### Caso G — Plano atual e trial
1. Abrir **Planos** (menu ou `/planos`).
2. Card mostra plano atual; se `trial`, banner com dias restantes (14 dias a partir de `criadoEm`).

### Caso H — Assinar (stub)
1. Clicar **Assinar agora** em "Presidente" → toast com mensagem de cobrança em breve.
2. `GET /api/me/plano` reflete o novo código e `planoExpiraEm` ~30 dias.

### Caso I — Tabela comparativa
1. Conferir linhas da tabela (Grupos, Boleiros, Partidas, Histórico, regras, estádio, preço).

---

## T33 — Notificações (`/configuracoes/notificacoes`)

### Caso J — Canais globais
1. Desligar **E-mail** global → toggles por evento de e-mail ficam desabilitados.
2. Salvar → recarregar — estado persistido.

### Caso K — Por evento
1. Alternar E-mail / WhatsApp em "Boleiro confirmou presença".
2. Salvar → `GET /api/me/preferencias-notificacao` retorna valores gravados em `PreferenciaNotificacao`.

### Caso L — Seção Dono
1. Usuário **sem** perfil dono → não aparece bloco "Dono do Estádio".
2. Com perfil dono → aparecem `Nova solicitação` e `Presidente cancelou partida`.

---

## T34 — Configurações (`/configuracoes`)

### Caso M — Navegação
1. Abrir `/configuracoes` → links para Perfil, Planos, Notificações funcionam.

### Caso N — Preferências gerais
1. Formato de hora 12h / 24h → Salvar → persistir.
2. Padrões de partida (times, boleiros, tempos) → Salvar.
3. Marcar 2 regras padrão → Salvar → `GET /api/me/preferencias` retorna `prefRegrasPadrao` com as chaves.

### Caso O — Wizard usa padrões
1. Em **Configurações**, definir ex.: 3 times, 6 boleiros, tempo total 120, marcar "Goleiro obrigatório".
2. Abrir **Nova partida** (`/partidas/nova`) — Step 1 deve refletir esses valores (após carregar prefs).

### Caso P — Sair
1. Em Configurações, **Sair** → confirmar → volta ao login.

---

## Smoke técnico

- [ ] `pnpm --filter @rachao/api typecheck`
- [ ] `pnpm --filter @rachao/web typecheck`
- [ ] `POST /api/me/plano` sem Stripe retorna `message` informativo
- [ ] `POST /api/me/senha` valida senha atual via GoTrue
- [ ] Helper `canaisPermitidos` em `apps/api/src/lib/preferencias-notificacao.ts` disponível para jobs futuros de e-mail/WhatsApp
