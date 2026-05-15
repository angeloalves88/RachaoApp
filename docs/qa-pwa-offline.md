# QA — PWA + Offline (Fase 3)

Cobre o registro ao vivo de partidas, idempotência do backend, fila offline em IndexedDB e o service worker.

## Pré-requisitos

- `apps/api` rodando em `http://localhost:3333`
- `apps/web` rodando em `http://localhost:3001`
- `apps/web/.env.local` com `NEXT_PUBLIC_PWA_ENABLED=true`
- Usuário presidente logado e com pelo menos uma partida em andamento (`status=em_andamento` ou `aguardando`).
- Chrome/Edge (DevTools > Application > Service Workers).

## 1. Manifest + Service Worker

1. Acesse `http://localhost:3001` e abra DevTools > **Application** > **Manifest**.
   - Esperado: nome `RachãoApp`, theme `#e8530a`, ícones SVG carregados, `start_url=/dashboard`.
2. DevTools > **Application** > **Service Workers**.
   - Esperado: `sw.js` ativo, escopo `/`.
3. Recarregar a página. No console: `[sw] register` sem erros.
4. DevTools > **Application** > **Cache Storage**:
   - `rachao-static-v1.0.0` deve conter `/offline.html` e `/manifest.webmanifest`.

## 2. Cache de assets e API GET

1. Navegue para `/dashboard` (carrega bundles do `_next/static/*`).
2. Abra `Network` e force reload (`Ctrl+Shift+R`):
   - Esperado: itens de `_next/static` aparecem como `(ServiceWorker)` após o segundo load.
3. Em `Application > Cache Storage > rachao-api-v1.0.0`:
   - Devem aparecer respostas para `GET /api/partidas...`, `GET /api/grupos...`.

## 3. Modo offline — registro ao vivo

1. Abra `/partidas/<id>/ao-vivo` de uma partida em andamento.
2. DevTools > **Application** > **Service Workers**: marque **Offline**.
3. Adicione 3 gols, 1 cartão amarelo, 1 substituição.
   - Esperado: badge **"X eventos pendentes (offline)"** visível.
   - Banner amarelo "Você está offline" no topo.
4. Desmarque **Offline**.
   - Esperado: badge muda para "Sincronizando..." (`Wifi`), em segundos a fila zera e a lista de eventos é refetchada.
   - Verificar no backend: `GET /api/partidas/<id>/eventos` retorna os 5 eventos com `clientId` preenchido.

## 4. Falhas de validação (4xx)

1. Em modo offline, dispare um evento com payload inválido (forçar via console:
   ```js
   localStorage.setItem('dbg', 'on');
   ```
   ou editando manualmente IndexedDB para `boleiroId` inexistente).
2. Volte online.
   - Esperado: banner vermelho "X eventos falharam" com botões **Tentar novamente** e **Descartar**.
   - Clicar em "Descartar" remove os falhos da fila persistente.

## 5. Idempotência do backend

Envie o mesmo evento duas vezes com o mesmo `clientId`:

```bash
curl -X POST http://localhost:3333/api/partidas/<id>/eventos \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"tipo":"gol","boleiroId":"<bid>","minuto":10,"clientId":"teste-1"}'
```

Repetir a chamada — esperado: mesmo `eventoId` retornado, sem duplicar no `GET`.

DELETE idempotente:

```bash
curl -X DELETE http://localhost:3333/api/partidas/<id>/eventos/<eid> -H "Authorization: ..."
# Repetir: ainda retorna { ok: true }
```

## 6. Cronômetro server-side

```bash
curl -X POST http://localhost:3333/api/partidas/<id>/cronometro \
  -H "Authorization: Bearer ..." -H "Content-Type: application/json" \
  -d '{"acao":"iniciar","clientId":"crono-1"}'
```

Repetir a mesma chamada — esperado: mesmo estado retornado (idempotência via `ultimaAcaoClientId`).

## 7. Update do Service Worker

1. Edite `apps/web/public/sw.js`, altere `VERSION` para `v1.0.1`.
2. Recarregue a página.
   - Esperado: toast **"Nova versão disponível"** com botão **Recarregar**.
3. Clicar em **Recarregar** ativa a nova versão; `Cache Storage` migra para `rachao-static-v1.0.1`.

## 8. Recarregar offline

1. Marque **Offline** em DevTools.
2. Recarregue (`F5`).
   - Esperado: a página tenta carregar do cache; rotas não cacheadas exibem `offline.html`.

## Critérios de aceite

- [ ] Service worker registrado e ativo.
- [ ] Manifest válido com ícones.
- [ ] 5+ eventos registrados offline são sincronizados após reconectar.
- [ ] Eventos com erro 4xx aparecem em banner vermelho, podem ser descartados ou retentados.
- [ ] `POST /api/partidas/:id/eventos` é idempotente por `(partidaId, clientId)`.
- [ ] Cronômetro mantém estado consistente entre dispositivos.
- [ ] Toast de nova versão aparece ao mudar `VERSION` do `sw.js`.
