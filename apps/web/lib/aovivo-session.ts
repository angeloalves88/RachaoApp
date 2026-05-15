/**
 * Sessão da partida ao vivo ativa (painel flutuante + sincronização local).
 */

import { emitAovivoUpdate } from '@/lib/cronometro-local';

export interface AovivoTimeSnap {
  id: string;
  nome: string;
  cor: string;
}

export interface AovivoActiveSession {
  partidaId: string;
  titulo: string;
  tempoTotalMin: number;
  times: AovivoTimeSnap[];
}

const ACTIVE_KEY = 'aovivo:active';

function placarKey(partidaId: string): string {
  return `aovivo:placar:${partidaId}`;
}

export function setActiveSession(session: AovivoActiveSession): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(session));
  emitAovivoUpdate();
}

export function getActiveSession(): AovivoActiveSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AovivoActiveSession>;
    if (!parsed.partidaId || !parsed.titulo) return null;
    return {
      partidaId: parsed.partidaId,
      titulo: parsed.titulo,
      tempoTotalMin: typeof parsed.tempoTotalMin === 'number' ? parsed.tempoTotalMin : 90,
      times: Array.isArray(parsed.times) ? parsed.times : [],
    };
  } catch {
    return null;
  }
}

export function clearActiveSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACTIVE_KEY);
  emitAovivoUpdate();
}

export function setPlacarSnapshot(partidaId: string, golsPorTime: Map<string, number>): void {
  if (typeof window === 'undefined') return;
  const obj: Record<string, number> = {};
  for (const [timeId, gols] of golsPorTime) {
    obj[timeId] = gols;
  }
  window.localStorage.setItem(placarKey(partidaId), JSON.stringify(obj));
  emitAovivoUpdate();
}

export function getPlacarSnapshot(partidaId: string): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(placarKey(partidaId));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

export function placarFromEventos(
  eventos: Array<{ tipo: string; timeId: string | null }>,
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const ev of eventos) {
    if (ev.tipo === 'gol' && ev.timeId) {
      map[ev.timeId] = (map[ev.timeId] ?? 0) + 1;
    }
  }
  return map;
}
