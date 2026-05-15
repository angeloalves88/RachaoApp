# QA — Fase 5 (T18 Escalação + T19 Compartilhar)

Checklist manual. Ambiente: API + web + Postgres; usuário presidente com acesso ao grupo.

## T18 — Escalação automática

- [ ] Com partida `agendada`, card **Escalação** na ficha da partida está habilitado e abre `/partidas/:id/escalacao`.
- [ ] GET autenticado retorna `elegiveis` (confirmados), `bloqueados` (se regras ativas) e `times` persistidos.
- [ ] Com `bloqueio_vermelho` / `bloqueio_inadimplente` ativos, bloqueados aparecem no banner e no modal **Ver motivos**; no **Automático** não entram no sorteio.
- [ ] Toggles **Balancear por posição** e **Incluir convidados avulsos** alteram o resultado do POST `/escalacao/sortear`.
- [ ] **Sortear** / **Novo sorteio** geram `numTimes` times; nomes e cores editáveis; capitão (coroa) por time.
- [ ] **Confirmar escalação** persiste (PUT); após refresh, times batem com o salvo.
- [ ] Partida `encerrada` ou `cancelada`: `readOnly` — sem sortear/salvar (só leitura).

## T18 — Escalação manual

- [ ] Aba **Manual**: pool **Disponíveis** + colunas por time; arrastar entre pool e times (desktop e toque longo ~280ms).
- [ ] Bloqueados ficam no pool com cadeado, sem alça de arraste.
- [ ] Limite `boleirosPorTime`: ao tentar exceder, toast **Time completo** e drop não aplica.
- [ ] **Remover** devolve ao pool; capitão inconsistente é limpo ao mover.
- [ ] Contador **X / Y boleiros escalados** e **Confirmar escalação** com validação (cada time ≥1 boleiro).

## T19 — Compartilhar

- [ ] **Compartilhar** desabilitado até existir escalação salva (≥1 convite em algum time).
- [ ] Modal: formato **Quadrado** / **Retrato**, toggles horário/local e logo; **Baixar imagem** obtém PNG; **Copiar link público** copia `/partidas/publico/:id/escalacao`.
- [ ] Página pública renderiza times sem dados sensíveis; partida `cancelada` → 404.
- [ ] `metadata.openGraph.images` aponta para `/api/og/escalacao/:id?formato=quadrado` (URL absoluta via `NEXT_PUBLIC_APP_URL` em produção).

## API

- [ ] `GET /api/partidas/publico/:id/escalacao` sem auth retorna JSON sanitizado se não cancelada.
- [ ] `PUT /api/partidas/:id/escalacao` rejeita convite não confirmado, duplicado em dois times ou bloqueado.
- [ ] `TimeBoleiro.capitao` gravado conforme `capitaoConviteId`.

## Observações

- `pnpm --filter @rachao/db db:generate` pode falhar no Windows (EPERM em `query_engine-windows.dll.node`); feche processos que usem Prisma e tente de novo.
- OG no Edge faz fetch ao backend: `NEXT_PUBLIC_API_URL` deve ser acessível a partir do runtime que gera a imagem (ex.: rede interna na Vercel + API pública).
