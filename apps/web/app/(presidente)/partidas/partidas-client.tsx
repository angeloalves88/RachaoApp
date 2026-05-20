'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CalendarPlus, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { PartidaCard } from '@/app/(presidente)/dashboard/partida-card';
import { listPartidas } from '@/lib/partidas-actions';
import { formatDataPartida } from '@/lib/format';
import type { PartidaListItem, StatusPartida } from '@/lib/types';

type FilterStatus = StatusPartida | 'todos';

const FILTROS: { value: FilterStatus; label: string }[] = [
  { value: 'todos', label: 'Todas' },
  { value: 'agendada', label: 'Agendadas' },
  { value: 'em_andamento', label: 'Ao vivo' },
  { value: 'encerrada', label: 'Encerradas' },
  { value: 'cancelada', label: 'Canceladas' },
];

const STATUS_BADGE: Record<
  StatusPartida,
  { label: string; variant: 'default' | 'primary' | 'success' | 'destructive' }
> = {
  agendada: { label: 'Agendada', variant: 'primary' },
  em_andamento: { label: 'Ao vivo', variant: 'success' },
  encerrada: { label: 'Encerrada', variant: 'default' },
  cancelada: { label: 'Cancelada', variant: 'destructive' },
};

interface Props {
  initial: PartidaListItem[];
  initialStatus: FilterStatus;
  initialGrupoId?: string;
  avisoEspecial?: string | null;
}

export function PartidasClient({
  initial,
  initialStatus,
  initialGrupoId,
  avisoEspecial = null,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<FilterStatus>(initialStatus);
  const [partidas, setPartidas] = useState(initial);
  const [loading, setLoading] = useState(false);

  const syncUrl = useCallback(
    (status: FilterStatus) => {
      const p = new URLSearchParams(searchParams.toString());
      if (status === 'todos') p.delete('status');
      else p.set('status', status);
      p.delete('vaquinha');
      p.delete('bloqueio');
      const qs = p.toString();
      router.replace(qs ? `/partidas?${qs}` : '/partidas', { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    async function refetch() {
      setLoading(true);
      try {
        const { partidas: fetched } = await listPartidas({
          status: filter === 'todos' ? undefined : filter,
          grupoId: initialGrupoId,
        });
        if (!cancelled) setPartidas(fetched);
      } catch {
        toast.error('Não foi possível atualizar a lista.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void refetch();
    return () => {
      cancelled = true;
    };
  }, [filter, initialGrupoId]);

  function onFilterChange(value: string) {
    const next = value as FilterStatus;
    setFilter(next);
    syncUrl(next);
  }

  const emptyTitle =
    filter === 'agendada'
      ? 'Nenhuma partida agendada'
      : filter === 'em_andamento'
        ? 'Nenhuma partida ao vivo'
        : filter === 'encerrada'
          ? 'Nenhuma partida encerrada'
          : filter === 'cancelada'
            ? 'Nenhuma partida cancelada'
            : 'Nenhuma partida ainda';

  return (
    <div className="space-y-4">
      {avisoEspecial ? (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          {avisoEspecial}
        </p>
      ) : null}

      <Segmented
        value={filter}
        onChange={onFilterChange}
        options={FILTROS.map((f) => ({ value: f.value, label: f.label }))}
      />

      {loading ? (
        <ul className="space-y-3">
          {[1, 2, 3].map((i) => (
            <li key={i}>
              <Skeleton className="h-24 w-full rounded-lg" />
            </li>
          ))}
        </ul>
      ) : partidas.length === 0 ? (
        <EmptyState
          variant="dashed"
          icon={<span aria-hidden>⚽</span>}
          title={emptyTitle}
          description="Marque um rachão e convide a galera."
          action={
            <Link href="/partidas/nova">
              <Button>
                <CalendarPlus size={16} /> Nova partida
              </Button>
            </Link>
          }
        />
      ) : filter === 'agendada' ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partidas.map((p, idx) => (
            <li key={p.id}>
              <PartidaCard partida={p} destaque={idx === 0} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {partidas.map((p) => (
            <PartidaListRow key={p.id} partida={p} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PartidaListRow({ partida: p }: { partida: PartidaListItem }) {
  const badge = STATUS_BADGE[p.status];
  const vagasLivres = Math.max(0, p.vagasTotais - p.confirmados);

  return (
    <li>
      <Link
        href={`/partidas/${p.id}`}
        className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-2"
      >
        <Avatar name={p.grupo.nome} src={p.grupo.fotoUrl ?? undefined} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{p.grupo.nome}</p>
          <p className="text-xs text-muted">{formatDataPartida(p.dataHora)}</p>
          {p.local ? (
            <p className="truncate text-xs text-muted">📍 {p.local}</p>
          ) : null}
          {p.status === 'agendada' ? (
            <p className="mt-0.5 text-xs text-muted">
              {p.confirmados} confirmados · {vagasLivres}{' '}
              {vagasLivres === 1 ? 'vaga' : 'vagas'}
            </p>
          ) : null}
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <ChevronRight size={16} className="shrink-0 text-muted" />
      </Link>
    </li>
  );
}
