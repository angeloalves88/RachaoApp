'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCronometro, postCronometro } from '@/lib/aovivo-actions';
import {
  type CronoState,
  createCronoState,
  displayMs,
  elapsedMs,
  formatCronoMs,
  loadCronoState,
  minutoNoSegmento,
  saveCronoState,
  segmentoEsgotado,
} from '@/lib/cronometro-local';

function clientId(): string {
  return crypto.randomUUID();
}

const ALERTA_FINAL_MS = 2 * 60 * 1000;

interface Props {
  partidaId: string;
  tempoPartidaMin: number;
  numPartidas: number;
  onMinutoChange?: (minuto: number) => void;
  onSegmentoEsgotado?: () => void;
  onProximoJogo?: () => void;
  onStateChange?: (state: CronoState) => void;
}

export function Cronometro({
  partidaId,
  tempoPartidaMin,
  numPartidas,
  onMinutoChange,
  onSegmentoEsgotado,
  onProximoJogo,
  onStateChange,
}: Props) {
  const [state, setState] = useState<CronoState>(() =>
    loadCronoState(partidaId, tempoPartidaMin, numPartidas),
  );
  const [, setTick] = useState(0);
  const rafRef = useRef<number | null>(null);
  const esgotadoRef = useRef(false);
  const syncRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const syncRemote = useCallback(
    (acao: 'iniciar' | 'pausar' | 'retomar' | 'zerar' | 'proximo_jogo', jogo?: number) => {
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

  const msDisplay = displayMs(state);
  const elapsed = elapsedMs(state);
  const remaining = state.duracaoMs - elapsed;
  const minutoAtual = minutoNoSegmento(state);
  const overtime = state.modo === 'regressivo' && msDisplay < 0;
  const isAlerta =
    state.modo === 'regressivo' && !overtime && remaining > 0 && remaining <= ALERTA_FINAL_MS;

  useEffect(() => {
    onMinutoChange?.(minutoAtual);
  }, [minutoAtual, onMinutoChange]);

  useEffect(() => {
    if (segmentoEsgotado(state) && state.rodando && !esgotadoRef.current) {
      esgotadoRef.current = true;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }
      onSegmentoEsgotado?.();
    }
    if (!segmentoEsgotado(state)) {
      esgotadoRef.current = false;
    }
  }, [state, onSegmentoEsgotado]);

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
    esgotadoRef.current = false;
    syncRemote('zerar');
  }, [tempoPartidaMin, numPartidas, state.jogoAtual, syncRemote]);

  const proximoJogo = useCallback(() => {
    if (state.jogoAtual >= numPartidas) return;
    const next = state.jogoAtual + 1;
    setState(createCronoState(tempoPartidaMin, numPartidas, next));
    esgotadoRef.current = false;
    syncRemote('proximo_jogo', next);
    onProximoJogo?.();
  }, [state.jogoAtual, numPartidas, tempoPartidaMin, onProximoJogo, syncRemote]);

  const setModo = useCallback(
    (modo: CronoState['modo']) => {
      setState((s) => ({
        ...createCronoState(tempoPartidaMin, numPartidas, s.jogoAtual),
        modo,
      }));
    },
    [tempoPartidaMin, numPartidas],
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 font-semibold text-primary">
          Partida {state.jogoAtual}/{numPartidas}
        </span>
        {overtime ? (
          <span className="text-xs font-medium text-destructive">Tempo extra</span>
        ) : null}
      </div>
      <div
        className={`text-center font-display text-5xl font-bold tabular-nums sm:text-6xl ${
          overtime
            ? 'text-destructive'
            : isAlerta
              ? 'animate-pulse-warning text-warning'
              : 'text-foreground'
        }`}
        aria-live="polite"
      >
        {formatCronoMs(msDisplay)}
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
        {state.jogoAtual < numPartidas ? (
          <Button type="button" size="sm" variant="outline" onClick={proximoJogo}>
            <SkipForward className="h-4 w-4" />
            Próxima partida
          </Button>
        ) : null}
      </div>
    </div>
  );
}
