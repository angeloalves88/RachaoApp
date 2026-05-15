'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Pause, Play } from 'lucide-react';
import {
  type AovivoActiveSession,
  getActiveSession,
  getPlacarSnapshot,
  placarFromEventos,
  setPlacarSnapshot,
} from '@/lib/aovivo-session';
import { listarEventos } from '@/lib/aovivo-actions';
import {
  AOVIVO_UPDATE_EVENT,
  computeCronoDisplay,
  loadCronoState,
} from '@/lib/cronometro-local';
import { COR_HEX } from '@/lib/escalacao-ui';
import type { CorTime } from '@rachao/shared/zod';
import { cn } from '@/lib/utils';

function isAoVivoPath(pathname: string): boolean {
  return /\/partidas\/[^/]+\/ao-vivo\/?$/.test(pathname);
}

function formatPlacar(session: AovivoActiveSession, gols: Record<string, number>): string {
  const times = session.times;
  if (times.length === 0) return '—';
  return times
    .map((t) => {
      const n = gols[t.id] ?? 0;
      const short = t.nome.length > 8 ? `${t.nome.slice(0, 7)}…` : t.nome;
      return `${short} ${n}`;
    })
    .join(' × ');
}

export function LiveMatchBar() {
  const pathname = usePathname();
  const [session, setSession] = useState<AovivoActiveSession | null>(null);
  const [cronoText, setCronoText] = useState('00:00');
  const [cronoRodando, setCronoRodando] = useState(false);
  const [cronoPausado, setCronoPausado] = useState(false);
  const [placar, setPlacar] = useState<Record<string, number>>({});

  const refreshLocal = useCallback(() => {
    const s = getActiveSession();
    setSession(s);
    if (!s) {
      setPlacar({});
      return;
    }
    const crono = loadCronoState(s.partidaId, s.tempoTotalMin);
    const display = computeCronoDisplay(crono);
    setCronoText(display.texto);
    setCronoRodando(display.rodando);
    setCronoPausado(display.pausado);
    setPlacar(getPlacarSnapshot(s.partidaId));
  }, []);

  useEffect(() => {
    refreshLocal();
    const onUpdate = () => refreshLocal();
    window.addEventListener(AOVIVO_UPDATE_EVENT, onUpdate);
    window.addEventListener('storage', onUpdate);
    return () => {
      window.removeEventListener(AOVIVO_UPDATE_EVENT, onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
  }, [refreshLocal]);

  useEffect(() => {
    if (!session) return undefined;
    const id = window.setInterval(refreshLocal, 1000);
    return () => window.clearInterval(id);
  }, [session, refreshLocal]);

  useEffect(() => {
    const s = getActiveSession();
    if (!s || isAoVivoPath(pathname)) return undefined;

    let cancelled = false;

    async function syncFromServer() {
      try {
        const { eventos } = await listarEventos(s!.partidaId);
        if (cancelled) return;
        const gols = placarFromEventos(eventos);
        setPlacar(gols);
        const map = new Map(Object.entries(gols));
        setPlacarSnapshot(s!.partidaId, map);
      } catch {
        /* offline ou sessão expirada */
      }
    }

    void syncFromServer();
    const id = window.setInterval(() => void syncFromServer(), 25_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pathname, session?.partidaId]);

  if (!session || isAoVivoPath(pathname)) return null;

  const href = `/partidas/${session.partidaId}/ao-vivo`;
  const placarLabel = formatPlacar(session, placar);

  return (
    <Link
      href={href}
      className={cn(
        'fixed inset-x-3 z-25 flex items-center gap-3 rounded-xl border border-primary/50 bg-surface px-3 py-2.5 shadow-lg',
        'bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:bottom-4',
        'transition-colors hover:border-primary hover:bg-surface-2 active:bg-surface-offset',
      )}
      aria-label={`Voltar ao ao vivo: ${session.titulo}. Cronômetro ${cronoText}, placar ${placarLabel}`}
    >
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75',
              cronoRodando ? 'animate-ping bg-warning' : 'bg-muted',
            )}
          />
          <span
            className={cn(
              'relative inline-flex h-2 w-2 rounded-full',
              cronoRodando ? 'bg-warning' : 'bg-muted',
            )}
          />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-warning">Ao vivo</span>
      </span>

      <span className="flex shrink-0 items-center gap-1 font-display text-lg font-bold tabular-nums text-foreground">
        {cronoRodando ? (
          <Play className="h-3.5 w-3.5 text-success" aria-hidden />
        ) : cronoPausado ? (
          <Pause className="h-3.5 w-3.5 text-muted" aria-hidden />
        ) : null}
        {cronoText}
      </span>

      <span className="min-w-0 flex-1 truncate text-sm text-muted" title={placarLabel}>
        {session.times.length > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            {session.times.map((t, i) => (
              <span key={t.id} className="inline-flex items-center gap-0.5">
                {i > 0 ? <span className="text-muted/60">×</span> : null}
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: COR_HEX[(t.cor as CorTime) ?? 'blue'] ?? '#3b82f6',
                  }}
                  aria-hidden
                />
                <span className="font-medium text-foreground">{placar[t.id] ?? 0}</span>
              </span>
            ))}
          </span>
        ) : (
          placarLabel
        )}
      </span>

      <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}
