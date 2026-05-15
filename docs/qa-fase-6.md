# QA — Fase 6 (T20–T21 Partida Ao Vivo + T22 Resumo)

Checklist manual. Ambiente: API + web + Postgres; usuário presidente com acesso ao grupo.

## /ao-vivo — placar, cronômetro e modais

- [ ] Com partida `agendada` + escalação salva (≥2 times com boleiros), o detalhe exibe a faixa **"Tudo pronto!"** com botão **Iniciar partida**.
- [ ] Sem escalação, o detalhe mostra a faixa secundária pedindo para montar a escalação primeiro (sem botão Iniciar).
- [ ] **Iniciar partida** chama `POST /api/partidas/:id/iniciar`, muda status para `em_andamento` e redireciona para `/partidas/:id/ao-vivo`.
- [ ] Em `em_andamento`, o card **Ao vivo** no actions-grid fica habilitado; **Escalação** abre em modo leitura; **Vaquinha** segue desabilitada nesta fase.
- [ ] `/ao-vivo` mostra cabeçalho com badge **EM ANDAMENTO**, cronômetro, placar lado a lado por time e linha de botões de evento (Gol / Cartão / Sub / Azul se regra ativa).
- [ ] Cronômetro: alternar **Regressivo** ↔ **Progressivo** zera; **Iniciar/Pausar/Retomar/Zerar** funcionam; valor sobrevive a refresh (chave `aovivo:cron:<partidaId>` em localStorage).
- [ ] Cronômetro regressivo: nos últimos 2 minutos a UI pulsa em laranja; ao zerar, dispara `navigator.vibrate` (testar em mobile real).
- [ ] Placar **+/−**: tap rápido em **+** registra gol sem boleiro; tap em **−** remove o último gol daquele time (incluindo otimista pendente, sem pedir confirmação).
- [ ] Tap longo (≥500ms) em **+** abre o modal de gol pré-selecionando o time; selecionar boleiro, minuto e (se regra ativa) checkbox "gol olímpico" → registra evento.
- [ ] Modal **Cartão**: seleção amarelo/vermelho/azul (azul aparece somente se `regras.cartao_azul.ativo`); para azul, campo **Duração (min)** com valor padrão das regras.
- [ ] Modal **Substituição**: time → sai → entra → minuto; impossível registrar com sai == entra.
- [ ] Modais usam minuto pré-preenchido pelo cronômetro; usuário pode editar.
- [ ] Feed lista eventos em ordem cronológica reversa, com badge colorido por tipo, minuto, time e nome do boleiro quando houver. Eventos com clientId pendente exibem ⌛.
- [ ] Botão **🗑️** em cada item do feed remove o evento (otimista; chama `DELETE` no backend se já sincronizado).

## Offline (idb-keyval)

- [ ] Cortar a rede (DevTools → Offline). O banner amarelo **"Sem conexão — N evento(s) na fila local"** aparece.
- [ ] Registrar 3+ gols/cartões offline → contador da fila aumenta e os eventos aparecem otimisticamente no feed (com ⌛).
- [ ] Recarregar a página offline → eventos otimistas continuam visíveis (lidos da IndexedDB) e a fila persiste.
- [ ] Voltar online → fila esvazia automaticamente; banner verde **"Sincronizado!"** aparece por 2s.
- [ ] Reenviar o mesmo `clientId` (simulado por dois flushes paralelos) NÃO duplica linha no `Evento` (idempotência por `dadosExtras.clientId`).
- [ ] Erros 5xx interrompem o flush e marcam `attempts++`; backoff progressivo (1s, 3s, 8s, 20s) entre tentativas.
- [ ] 401/403 (sessão expirada) param o flush sem perder os pendentes; reentrar mantém a fila intacta.

## /resumo — privado e público

- [ ] Botão **Encerrar partida** no `/ao-vivo` abre Dialog de confirmação. Confirmar chama `POST /encerrar`, recalcula `Time.golsFinal`, vira `encerrada` e redireciona para `/resumo`.
- [ ] Em `encerrada`, abrir `/ao-vivo` redireciona automaticamente para `/resumo`.
- [ ] `/resumo` mostra placar final destacado, badge de vencedor (ou "Empate"), seção **Artilharia** (top 5 com avatar/time/gols), **Linha do tempo** com ícones e **Estatísticas individuais** (gols / 🟨 / 🟥 / 🟦) por boleiro.
- [ ] Card **Resumo** habilitado em `actions-grid` quando status é `encerrada`.
- [ ] Botão **Compartilhar** abre modal com formato (Quadrado/Retrato), toggles de horário/local e logo, **Baixar imagem**, **Compartilhar** (Web Share) e **Copiar link público**.
- [ ] Página pública `/partidas/publico/:id/resumo` carrega sem auth, oculta dados sensíveis, exibe botão **"Voltar para o RachãoApp"**.
- [ ] `metadata.openGraph.images` aponta para `/api/og/resumo/:id?formato=quadrado` (URL absoluta via `NEXT_PUBLIC_APP_URL`).
- [ ] OG image renderiza placar grande, time vencedor destacado e até 4–6 artilheiros.

## API

- [ ] `POST /api/partidas/:id/iniciar`: erro 400 quando status ≠ `agendada` ou sem escalação (≥2 times com boleiros). Idempotente quando já `em_andamento`.
- [ ] `POST /api/partidas/:id/encerrar`: erro 400 quando status ≠ `em_andamento`. Em `$transaction`: `Time.golsFinal` recalculado a partir de `Evento.tipo='gol'` agrupado por `timeId`. Idempotente quando já `encerrada`.
- [ ] `POST /api/partidas/:id/eventos`: erro 400 quando partida não está `em_andamento`; valida `timeId` pertence à partida; `clientId` reaproveitado retorna 200 com `idempotent: true` e o evento original.
- [ ] `GET /api/partidas/:id/eventos`: lista ordenada por `criadoEm` asc para o feed; auth + acesso ao grupo.
- [ ] `PATCH` e `DELETE /api/partidas/:id/eventos/:eventoId`: rejeitam quando partida `cancelada`; preservam `clientId` em `dadosExtras` no PATCH.
- [ ] `GET /api/partidas/publico/:id/resumo`: sem auth; 404 quando status é `cancelada` ou `agendada`; em `em_andamento` retorna parcial (placar derivado dos eventos atuais).
- [ ] `GET /api/partidas/:id/resumo`: auth + acesso; mesma estrutura do público.

## Observações

- A fila offline usa IndexedDB (`idb-keyval`, store `rachao` / `rachao-aovivo`). Em navegadores em modo anônimo a IDB pode ser limitada — o app continua funcionando, mas os eventos não sobrevivem ao fechamento da aba.
- Não há service worker nesta fase; a `flushPending` só roda enquanto a aba do `/ao-vivo` está aberta.
- `Time.golsFinal` é a fonte de verdade do placar **após** encerrar. Antes disso, o placar exibido é derivado dos eventos em tempo real.
- O OG do resumo é gerado em runtime Edge e faz fetch ao backend (`NEXT_PUBLIC_API_URL` deve ser resolvível a partir do runtime que gera a imagem).
