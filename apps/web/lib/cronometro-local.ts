/**
 * Estado do cronômetro ao vivo (persistido em localStorage por partida).
 * Compartilhado entre a tela /ao-vivo e o painel flutuante global.
 */

export interface CronoState {
  modo: 'regressivo' | 'progressivo';
  duracaoMs: number;
  rodando: boolean;
  acumuladoMs: number;
  iniciadoEm: number | null;
}

export function cronometroStorageKey(partidaId: string): string {
  return `aovivo:cron:${partidaId}`;
}

export function loadCronoState(partidaId: string, tempoTotalMin: number): CronoState {
  const fallback: CronoState = {
    modo: 'regressivo',
    duracaoMs: tempoTotalMin * 60 * 1000,
    rodando: false,
    acumuladoMs: 0,
    iniciadoEm: null,
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(cronometroStorageKey(partidaId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<CronoState>;
    return {
      modo: parsed.modo === 'progressivo' ? 'progressivo' : 'regressivo',
      duracaoMs: typeof parsed.duracaoMs === 'number' ? parsed.duracaoMs : fallback.duracaoMs,
      rodando: !!parsed.rodando,
      acumuladoMs: typeof parsed.acumuladoMs === 'number' ? parsed.acumuladoMs : 0,
      iniciadoEm: typeof parsed.iniciadoEm === 'number' ? parsed.iniciadoEm : null,
    };
  } catch {
    return fallback;
  }
}

export function saveCronoState(partidaId: string, state: CronoState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(cronometroStorageKey(partidaId), JSON.stringify(state));
  emitAovivoUpdate();
}

export function elapsedMs(state: CronoState): number {
  if (!state.rodando || state.iniciadoEm == null) return state.acumuladoMs;
  return state.acumuladoMs + (Date.now() - state.iniciadoEm);
}

export function formatCronoMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export interface CronoDisplay {
  texto: string;
  rodando: boolean;
  modo: CronoState['modo'];
  pausado: boolean;
}

export function computeCronoDisplay(state: CronoState): CronoDisplay {
  const elapsed = elapsedMs(state);
  const remaining = Math.max(0, state.duracaoMs - elapsed);
  const displayMs = state.modo === 'regressivo' ? remaining : elapsed;
  return {
    texto: formatCronoMs(displayMs),
    rodando: state.rodando,
    modo: state.modo,
    pausado: !state.rodando && state.acumuladoMs > 0,
  };
}

export const AOVIVO_UPDATE_EVENT = 'rachao:aovivo-update';

export function emitAovivoUpdate(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AOVIVO_UPDATE_EVENT));
}
