/**
 * Estado do cronômetro ao vivo (persistido em localStorage por partida).
 * Compartilhado entre a tela /ao-vivo e o painel flutuante global.
 */

export interface CronoState {
  /** Sempre 'progressivo' — campo mantido para compatibilidade com dados antigos. */
  modo: 'regressivo' | 'progressivo';
  /** Duração do segmento atual (tempoPartida). */
  duracaoMs: number;
  rodando: boolean;
  acumuladoMs: number;
  iniciadoEm: number | null;
  jogoAtual: number;
  numPartidas: number;
}

export function cronometroStorageKey(partidaId: string): string {
  return `aovivo:cron:${partidaId}`;
}

export function createCronoState(
  tempoPartidaMin: number,
  numPartidas: number,
  jogoAtual = 1,
): CronoState {
  return {
    modo: 'progressivo',
    duracaoMs: tempoPartidaMin * 60 * 1000,
    rodando: false,
    acumuladoMs: 0,
    iniciadoEm: null,
    jogoAtual,
    numPartidas,
  };
}

export function loadCronoState(
  partidaId: string,
  tempoPartidaMin: number,
  numPartidas: number,
): CronoState {
  const fallback = createCronoState(tempoPartidaMin, numPartidas);
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(cronometroStorageKey(partidaId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<CronoState>;
    const segmentMs = tempoPartidaMin * 60 * 1000;
    return {
      modo: 'progressivo',
      duracaoMs: segmentMs,
      rodando: !!parsed.rodando,
      acumuladoMs: typeof parsed.acumuladoMs === 'number' ? parsed.acumuladoMs : 0,
      iniciadoEm: typeof parsed.iniciadoEm === 'number' ? parsed.iniciadoEm : null,
      jogoAtual:
        typeof parsed.jogoAtual === 'number'
          ? Math.min(Math.max(1, parsed.jogoAtual), numPartidas)
          : 1,
      numPartidas,
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

/** ms exibidos no relógio (regressivo pode ficar negativo após o fim do segmento). */
export function displayMs(state: CronoState): number {
  const elapsed = elapsedMs(state);
  if (state.modo === 'regressivo') {
    return state.duracaoMs - elapsed;
  }
  return elapsed;
}

export function formatCronoMs(ms: number): string {
  const neg = ms < 0;
  const total = Math.floor(Math.abs(ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  const body = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return neg ? `-${body}` : body;
}

export function minutoNoSegmento(state: CronoState): number {
  const elapsed = elapsedMs(state);
  return Math.max(0, Math.floor(elapsed / 60000));
}

export function segmentoEsgotado(state: CronoState): boolean {
  return state.modo === 'regressivo' && displayMs(state) < 0;
}

/** Tempo regulamentar esgotado (cronômetro progressivo). */
export function tempoExtraProgressivo(state: CronoState): boolean {
  return elapsedMs(state) >= state.duracaoMs;
}

export interface CronoDisplay {
  texto: string;
  rodando: boolean;
  modo: CronoState['modo'];
  pausado: boolean;
  overtime: boolean;
  jogoAtual: number;
  numPartidas: number;
}

export function computeCronoDisplay(state: CronoState): CronoDisplay {
  const ms = displayMs(state);
  return {
    texto: formatCronoMs(ms),
    rodando: state.rodando,
    modo: state.modo,
    pausado: !state.rodando && state.acumuladoMs > 0,
    overtime:
      state.modo === 'regressivo' ? ms < 0 : elapsedMs(state) >= state.duracaoMs,
    jogoAtual: state.jogoAtual,
    numPartidas: state.numPartidas,
  };
}

export const AOVIVO_UPDATE_EVENT = 'rachao:aovivo-update';

export function emitAovivoUpdate(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AOVIVO_UPDATE_EVENT));
}
