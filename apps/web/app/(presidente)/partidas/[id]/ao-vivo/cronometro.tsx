'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCronometro, postCronometro } from '@/lib/aovivo-actions';
import {
  type CronoState,
  createCronoState,
  elapsedMs,
  formatCronoMs,
  loadCronoState,
  minutoNoSegmento,
  saveCronoState,
} from '@/lib/cronometro-local';

function clientId(): string {
  return crypto.randomUUID();
}

interface Props {
  partidaId: string;
  tempoPartidaMin: number;
  numPartidas: number;
  /** Controlado pelo pai — quando aumenta, o cronômetro é resetado para o novo jogo. */
  jogoAtual: number;
  onMinutoChange?: (minuto: number) => void;
  onStateChange?: (state: CronoState) => void;
}

export function Cronometro({
  partidaId,
  tempoPartidaMin,
  numPartidas,
  jogoAtual,
  onMinutoChange,
  onStateChange,
}: Props) {
  const [state, setState] = useState<CronoState>(() =>
    createCronoState(tempoPartidaMin, numPartidas, jogoAtual),
  );
  const [, setTick] = useState(0);
  const rafRef = useRef<number | null>(null);
  const syncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevJogoRef = useRef(jogoAtual);

  // Restaura localStorage + API após mount (evita hydration mismatch com SSR).
  useEffect(() => {
    setState(loadCronoState(partidaId, tempoPartidaMin, numPartidas));
  }, [partidaId, tempoPartidaMin, numPartidas]);

  useEffect(() => {
    let cancelled = false;
    void getCronometro(partidaId)
      .then((remote) => {
        if (cancelled) return;
        const segMs = remote.segundosAtuais * 1000;
        setState((s) => ({
          ...s,
          jogoAtual: remote.jogoAtual ?? s.jogoAtual,
          acumuladoMs: segMs,
          rodando: remote.status === 'rodando',
          iniciadoEm: remote.status === 'rodando' ? Date.now() : null,
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [partidaId]);

  // Reset when parent advances to next game
  useEffect(() => {
    if (jogoAtual !== prevJogoRef.current) {
      prevJogoRef.current = jogoAtual;
      setState(createCronoState(tempoPartidaMin, numPartidas, jogoAtual));
    }
  }, [jogoAtual, tempoPartidaMin, numPartidas]);

  const syncRemote = useCallback(
    (acao: 'iniciar' | 'pausar' | 'retomar' | 'zerar', jogo?: number) => {
      if (syncRef.current) clearTimeout(syncRef.current);
      syncRef.current = setTimeout(() => {
        void postCronometro(partidaId, {
          acao,
          clientId: clientId(),
          jogoAtual: jogo,
        }).catch(() => {});
      }, 400);
    },
    [partidaId],
  );

  useEffect(() => {
    saveCronoState(partidaId, state);
    onStateChange?.(state);
  }, [partidaId, state, onStateChange]);

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

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const minutoAtual = minutoNoSegmento(state);
  const msElapsed = elapsedMs(state);
  const tempoExtra = msElapsed >= state.duracaoMs;

  useEffect(() => {
    onMinutoChange?.(minutoAtual);
  }, [minutoAtual, onMinutoChange]);

  const start = useCallback(() => {
    setState((s) => {
      if (s.rodando) return s;
      syncRemote(s.acumuladoMs > 0 ? 'retomar' : 'iniciar');
      return { ...s, rodando: true, iniciadoEm: Date.now() };
    });
  }, [syncRemote]);

  const pause = useCallback(() => {
    setState((s) => {
      if (!s.rodando) return s;
      syncRemote('pausar');
      return { ...s, rodando: false, acumuladoMs: elapsedMs(s), iniciadoEm: null };
    });
  }, [syncRemote]);

  const reset = useCallback(() => {
    if (!window.confirm('Zerar o cronômetro desta partida?')) return;
    setState(createCronoState(tempoPartidaMin, numPartidas, state.jogoAtual));
    syncRemote('zerar');
  }, [tempoPartidaMin, numPartidas, state.jogoAtual, syncRemote]);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2">
      <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
        Jogo {state.jogoAtual}/{numPartidas}
      </span>
      <span
        className={`min-w-[6ch] font-display text-2xl font-bold tabular-nums ${
          tempoExtra ? 'animate-pulse-warning text-destructive' : ''
        }`}
        aria-live="polite"
      >
        {formatCronoMs(msElapsed)}
      </span>
      {tempoExtra ? (
        <span className="shrink-0 text-[10px] font-semibold uppercase text-destructive">
          Extra
        </span>
      ) : null}
      <div className="ml-auto flex items-center gap-1">
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
        <Button type="button" size="icon" variant="ghost" onClick={reset} aria-label="Zerar">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
