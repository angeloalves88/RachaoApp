'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  type CronoState,
  elapsedMs,
  formatCronoMs,
  loadCronoState,
  saveCronoState,
} from '@/lib/cronometro-local';

const ALERTA_FINAL_MS = 2 * 60 * 1000;

interface Props {
  partidaId: string;
  tempoTotalMin: number;
  onMinutoChange?: (minuto: number) => void;
}

export function Cronometro({ partidaId, tempoTotalMin, onMinutoChange }: Props) {
  const [state, setState] = useState<CronoState>(() => loadCronoState(partidaId, tempoTotalMin));
  const [tick, setTick] = useState(0);
  const rafRef = useRef<number | null>(null);
  const buzzRef = useRef(false);

  useEffect(() => {
    saveCronoState(partidaId, state);
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
          {formatCronoMs(display)}
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
