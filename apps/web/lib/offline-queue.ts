'use client';

/**
 * Fila offline de eventos da partida ao vivo (Bloco 6 / T20 + Fase 3 PWA).
 *
 * Persiste em IndexedDB via `idb-keyval` (chave `eventos:pending:<partidaId>`),
 * sobrevive a refresh e suporta varios dispositivos simultaneos. Cada item tem
 * um `clientId` UUID que o backend usa para tornar o POST idempotente.
 *
 * Mudancas Fase 3:
 * - Retry exponencial 1s/3s/9s ate `MAX_TENTATIVAS = 5`; depois marca `failed`.
 * - Erros de validacao (400/409/422) marcam `failed=true` com toast persistente;
 *   o usuario pode descartar manualmente. 401/403 pausa o flush ate re-login.
 *   5xx volta pro retry.
 * - Listener emite a fila inteira (inclusive failed) para a UI mostrar contagens.
 */
import { get, set, createStore, type UseStore } from 'idb-keyval';
import { useEffect, useState } from 'react';

export interface PendingEvento {
  clientId: string;
  body: {
    clientId: string;
    tipo: string;
    timeId?: string | null;
    boleiroId?: string | null;
    minuto?: number | null;
    dadosExtras?: Record<string, unknown> | null;
  };
  attempts: number;
  lastError?: string;
  /** Quando true, parou de tentar (validacao ou esgotou tentativas). */
  failed?: boolean;
  enqueuedAt: number;
}

export const MAX_TENTATIVAS = 5;
const BACKOFF_MS = [0, 1000, 3000, 9000, 20000];

const STORE_NAME = 'rachao-aovivo';
const DB_NAME = 'rachao';

let _store: UseStore | null = null;
function getStore(): UseStore {
  if (!_store) _store = createStore(DB_NAME, STORE_NAME);
  return _store;
}

function key(partidaId: string): string {
  return `eventos:pending:${partidaId}`;
}

type Listener = (pending: PendingEvento[]) => void;
const listeners = new Map<string, Set<Listener>>();

function emit(partidaId: string, items: PendingEvento[]): void {
  const subs = listeners.get(partidaId);
  if (!subs) return;
  for (const fn of subs) fn(items);
}

export async function readPending(partidaId: string): Promise<PendingEvento[]> {
  if (typeof window === 'undefined') return [];
  const items = (await get<PendingEvento[]>(key(partidaId), getStore())) ?? [];
  return items;
}

export async function writePending(
  partidaId: string,
  items: PendingEvento[],
): Promise<void> {
  await set(key(partidaId), items, getStore());
  emit(partidaId, items);
}

export function subscribePending(partidaId: string, fn: Listener): () => void {
  let set = listeners.get(partidaId);
  if (!set) {
    set = new Set();
    listeners.set(partidaId, set);
  }
  set.add(fn);
  void readPending(partidaId).then(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) listeners.delete(partidaId);
  };
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface EnqueueInput {
  tipo: string;
  timeId?: string | null;
  boleiroId?: string | null;
  minuto?: number | null;
  dadosExtras?: Record<string, unknown> | null;
}

export async function enqueueEvento(
  partidaId: string,
  input: EnqueueInput,
): Promise<PendingEvento> {
  const clientId = uuid();
  const item: PendingEvento = {
    clientId,
    body: { ...input, clientId },
    attempts: 0,
    enqueuedAt: Date.now(),
  };
  const items = await readPending(partidaId);
  items.push(item);
  await writePending(partidaId, items);
  return item;
}

export async function removePending(partidaId: string, clientId: string): Promise<void> {
  const items = await readPending(partidaId);
  const next = items.filter((i) => i.clientId !== clientId);
  if (next.length !== items.length) await writePending(partidaId, next);
}

export async function discardFailed(partidaId: string, clientId: string): Promise<void> {
  await removePending(partidaId, clientId);
}

export async function retryFailed(partidaId: string, clientId: string): Promise<void> {
  const items = await readPending(partidaId);
  const next = items.map((i) =>
    i.clientId === clientId
      ? { ...i, failed: false, attempts: 0, lastError: undefined }
      : i,
  );
  await writePending(partidaId, next);
}

async function patchItem(
  partidaId: string,
  clientId: string,
  patch: Partial<PendingEvento>,
): Promise<void> {
  const items = await readPending(partidaId);
  const next = items.map((i) => (i.clientId === clientId ? { ...i, ...patch } : i));
  await writePending(partidaId, next);
}

export interface FlushOptions {
  apiUrl: string;
  token: string;
  onItemSent?: (item: PendingEvento) => void;
  onItemError?: (item: PendingEvento, error: unknown) => void;
  onItemFailed?: (item: PendingEvento, reason: string) => void;
}

/**
 * Resultado do envio de um item: distingue sucesso, retry (rede/5xx),
 * falha definitiva (4xx de validacao) e auth (401/403 — pausa).
 */
type SendOutcome =
  | { kind: 'sent' }
  | { kind: 'retry'; reason: string }
  | { kind: 'failed'; reason: string }
  | { kind: 'auth'; reason: string };

async function sendOne(
  partidaId: string,
  item: PendingEvento,
  opts: FlushOptions,
): Promise<SendOutcome> {
  try {
    const res = await fetch(`${opts.apiUrl}/api/partidas/${partidaId}/eventos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${opts.token}`,
      },
      body: JSON.stringify(item.body),
    });
    if (res.status === 401 || res.status === 403) {
      return { kind: 'auth', reason: `auth ${res.status}` };
    }
    if (res.ok) return { kind: 'sent' };
    if (res.status >= 500) return { kind: 'retry', reason: `server ${res.status}` };
    // 4xx (exceto auth): validacao/conflito. Marca como failed.
    let detalhe = `${res.status}`;
    try {
      const j = await res.json();
      if (j && typeof j === 'object' && 'message' in j && typeof j.message === 'string') {
        detalhe = j.message;
      }
    } catch {
      // ignore
    }
    return { kind: 'failed', reason: detalhe };
  } catch (err) {
    return { kind: 'retry', reason: (err as Error).message || 'network error' };
  }
}

/**
 * Tenta enviar todos os pendentes (ignora itens `failed`). Aplica backoff
 * por item. Retorna estatisticas.
 */
export async function flushPending(
  partidaId: string,
  opts: FlushOptions,
): Promise<{ sent: number; failed: number; remaining: number }> {
  const items = await readPending(partidaId);
  let sent = 0;
  let failed = 0;

  for (const item of items) {
    if (item.failed) continue;
    const wait = BACKOFF_MS[Math.min(item.attempts, BACKOFF_MS.length - 1)] ?? 20000;
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));

    const outcome = await sendOne(partidaId, item, opts);
    if (outcome.kind === 'sent') {
      await removePending(partidaId, item.clientId);
      opts.onItemSent?.(item);
      sent++;
      continue;
    }
    if (outcome.kind === 'auth') {
      await patchItem(partidaId, item.clientId, {
        attempts: item.attempts + 1,
        lastError: outcome.reason,
      });
      opts.onItemError?.(item, new Error(outcome.reason));
      break; // pausa o flush
    }
    if (outcome.kind === 'failed') {
      await patchItem(partidaId, item.clientId, {
        attempts: item.attempts + 1,
        lastError: outcome.reason,
        failed: true,
      });
      opts.onItemFailed?.(item, outcome.reason);
      failed++;
      continue;
    }
    // retry (rede/5xx)
    const nextAttempts = item.attempts + 1;
    if (nextAttempts >= MAX_TENTATIVAS) {
      await patchItem(partidaId, item.clientId, {
        attempts: nextAttempts,
        lastError: outcome.reason,
        failed: true,
      });
      opts.onItemFailed?.(item, `${outcome.reason} (tentativas esgotadas)`);
      failed++;
      continue;
    }
    await patchItem(partidaId, item.clientId, {
      attempts: nextAttempts,
      lastError: outcome.reason,
    });
    opts.onItemError?.(item, new Error(outcome.reason));
    // Erro de rede em um item interrompe pra evitar martelar quando offline.
    break;
  }

  const remaining = (await readPending(partidaId)).filter((i) => !i.failed).length;
  return { sent, failed, remaining };
}

/**
 * Hook simples para acompanhar a conectividade do navegador.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/**
 * Hook que mantem a lista de pendentes sincronizada com a store.
 */
export function usePending(partidaId: string): PendingEvento[] {
  const [items, setItems] = useState<PendingEvento[]>([]);
  useEffect(() => {
    return subscribePending(partidaId, setItems);
  }, [partidaId]);
  return items;
}

/** Conveniencia: separa pendentes em "fila ativa" (retry) vs "falharam". */
export function partitionPending(items: PendingEvento[]): {
  ativos: PendingEvento[];
  falhos: PendingEvento[];
} {
  const ativos: PendingEvento[] = [];
  const falhos: PendingEvento[] = [];
  for (const i of items) {
    if (i.failed) falhos.push(i);
    else ativos.push(i);
  }
  return { ativos, falhos };
}
