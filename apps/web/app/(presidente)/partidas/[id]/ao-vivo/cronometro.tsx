'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ALERTA_FINAL_MS = 2 * 60 * 1000;

interface CronoState {
  modo: 'regressivo' | 'progressivo';
  duracaoMs: number;
  rodando: boolean;
  /** ms acumulados quando pausado (epoch parcial). */
  acumuladoMs: number;
  /** Date.now() quando iniciou o ciclo atual. */
  iniciadoEm: number | null;
}

interface Props {
  partidaId: string;
  tempoTotalMin: number;
  /** Callback quando o cronômetro tem um minuto válido (para pré-preencher modais). */
  onMinutoChange?: (minuto: number) => void;
}

const DEFAULT_MODO: CronoState['modo'] = 'regressivo';

function storageKey(partidaId: string): string {
  return `aovivo:cron:${partidaId}`;
}

function loadState(partidaId: string, tempoTotalMin: number): CronoState {
  const fallback: CronoState = {
    modo: DEFAULT_MODO,
    duracaoMs: tempoTotalMin * 60 * 1000,
    rodando: false,
    acumuladoMs: 0,
    iniciadoEm: null,
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey(partidaId));
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

function saveState(partidaId: string, state: CronoState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(partidaId), JSON.stringify(state));
}

function elapsedMs(state: CronoState): number {
  if (!state.rodando || state.iniciadoEm == null) return state.acumuladoMs;
  return state.acumuladoMs + (Date.now() - state.iniciadoEm);
}

function format(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function Cronometro({ partidaId, tempoTotalMin, onMinutoChange }: Props) {
  const [state, setState] = useState<CronoState>(() => loadState(partidaId, tempoTotalMin));
  const [tick, setTick] = useState(0);
  const rafRef = useRef<number | null>(null);
  const buzzRef = useRef(false);

  useEffect(() => {
    saveState(partidaId, state);
  }, [partidaId, state]);

  useEffect(() => {
    function loop() {
      setTick((n) => n + 1);
      rafRef.current = window.requestAnimationFrame(loop);
    }
    if (state.rodando) {
      rafRef.current = window.requestAnimationFrame(loop);
      return () => {
        if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
      };
    }
    return undefined;
  }, [state.rodando]);

  const elapsed = elapsedMs(state);
  const remaining = Math.max(0, state.duracaoMs - elapsed);
  const display = state.modo === 'regressivo' ? remaining : elapsed;
  const minutoAtual = Math.floor(elapsed / 60000);

  useEffect(() => {
    onMinutoChange?.(minutoAtual);
  }, [minutoAtual, onMinutoChange]);

  // Vibração ao zerar (modo regressivo, primeira vez)
  useEffect(() => {
    if (state.modo === 'regressivo' && state.rodando && remaining === 0 && !buzzRef.current) {
      buzzRef.current = true;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }
      setState((s) => ({
        ...s,
        rodando: false,
        acumuladoMs: s.duracaoMs,
        iniciadoEm: null,
      }));
    }
    if (remaining > 0) buzzRef.current = false;
  }, [remaining, state.modo, state.rodando]);

  const start = useCallback(() => {
    setState((s) => {
      if (s.rodando) return s;
      return { ...s, rodando: true, iniciadoEm: Date.now() };
    });
  }, []);

  const pause = useCallback(() => {
    setState((s) => {
      if (!s.rodando) return s;
      const acc = elapsedMs(s);
      return { ...s, rodando: false, acumuladoMs: acc, iniciadoEm: null };
    });
  }, []);

  const reset = useCallback(() => {
    if (!window.confirm('Zerar o cronômetro?')) return;
    setState((s) => ({ ...s, rodando: false, acumuladoMs: 0, iniciadoEm: null }));
  }, []);

  const setModo = useCallback((modo: CronoState['modo']) => {
    setState((s) => ({ ...s, modo, rodando: false, acumuladoMs: 0, iniciadoEm: null }));
  }, []);

  const isAlerta = state.modo === 'regressivo' && remaining > 0 && remaining <= ALERTA_FINAL_MS;
  void tick;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <div
          className={`flex-1 text-center font-display text-5xl font-bold tabular-nums sm:text-6xl ${
            isAlerta ? 'animate-pulse-warning text-warning' : 'text-foreground'
          }`}
          aria-live="polite"
        >
          {format(display)}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setModo('regressivo')}
            className={`rounded px-2 py-1 ${
              state.modo === 'regressivo' ? 'bg-primary text-primary-foreground' : 'text-muted'
            }`}
          >
            Regressivo
          </button>
          <button
            type="button"
            onClick={() => setModo('progressivo')}
            className={`rounded px-2 py-1 ${
              state.modo === 'progressivo' ? 'bg-primary text-primary-foreground' : 'text-muted'
            }`}
          >
            Progressivo
          </button>
        </div>
        {state.rodando ? (
          <Button type="button" size="sm" variant="secondary" onClick={pause}>
            <Pause className="h-4 w-4" />
            Pausar
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={start}>
            <Play className="h-4 w-4" />
            {state.acumuladoMs > 0 ? 'Retomar' : 'Iniciar'}
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          Zerar
        </Button>
      </div>
    </div>
  );
}
