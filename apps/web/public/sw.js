/* eslint-disable no-undef */
/**
 * Service Worker do RachãoApp (Fase 3 / PWA).
 *
 * Estrategias:
 * - precache: shell mínimo (offline.html + manifest + icones).
 * - `cache-first` para assets do _next/static/* e icons.
 * - `stale-while-revalidate` para GET /api/* (somente leitura).
 * - `network-only` para todo POST/PUT/PATCH/DELETE (a fila offline em IndexedDB cuida).
 * - mensagem 'SKIP_WAITING' permite ativar uma nova versão sem reload duro.
 */

const VERSION = 'v1.0.0';
const CACHE_STATIC = `rachao-static-${VERSION}`;
const CACHE_API = `rachao-api-${VERSION}`;
const PRECACHE_URLS = ['/offline.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => undefined),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== CACHE_STATIC && k !== CACHE_API)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname === '/manifest.webmanifest' ||
    /\.(?:png|jpg|jpeg|webp|gif|svg|ico)$/i.test(url.pathname)
  );
}

function isApiGet(url, request) {
  return (
    request.method === 'GET' &&
    (url.pathname.startsWith('/api/partidas') ||
      url.pathname.startsWith('/api/grupos') ||
      url.pathname.startsWith('/api/me'))
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  if (cached) {
    // Devolve do cache imediato; revalida em background.
    network;
    return cached;
  }
  const fresh = await network;
  if (fresh) return fresh;
  return new Response(
    JSON.stringify({ error: 'Offline', message: 'Sem cache para este endpoint.' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } },
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    // network-only para POST/DELETE/PATCH/PUT
    return;
  }
  const url = new URL(request.url);
  // Ignora cross-origin (Supabase, Asaas).
  if (url.origin !== self.location.origin && !url.hostname.includes('localhost')) {
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // Cross-origin para API local em dev (porta 3333)
  if (url.port === '3333' || url.pathname.startsWith('/api/')) {
    if (isApiGet(url, request)) {
      event.respondWith(staleWhileRevalidate(request, CACHE_API));
    }
    return;
  }

  // Navegacoes: tenta rede, cai pro offline.html quando der ruim.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_STATIC);
        const fallback = await cache.match('/offline.html');
        return fallback ?? Response.error();
      }),
    );
  }
});
