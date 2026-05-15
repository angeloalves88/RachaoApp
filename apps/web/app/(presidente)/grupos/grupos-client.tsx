'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, MoreVertical, Plus, RotateCcw, Search, Users } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Segmented } from '@/components/ui/segmented';
import { archiveGrupo, listGrupos, updateGrupo } from '@/lib/grupos-actions';
import { formatDataCurta, formatDataPartida } from '@/lib/format';
import type { GrupoListItem } from '@/lib/types';
import { toast } from 'sonner';

type Filter = 'ativos' | 'arquivados' | 'todos';

const ESPORTE_LABEL: Record<string, string> = {
  futebol: 'Futebol',
  futsal: 'Futsal',
  society: 'Society',
  areia: 'Areia',
};
const NIVEL_LABEL: Record<string, string> = {
  casual: 'Casual',
  intermediario: 'Intermediário',
  competitivo: 'Competitivo',
};

export function GruposClient({ initial }: { initial: GrupoListItem[] }) {
  const [filter, setFilter] = useState<Filter>('ativos');
  const [query, setQuery] = useState('');
  const [grupos, setGrupos] = useState(initial);
  const [loading, setLoading] = useState(false);

  // Filtro local quando inicial cobre tudo (status=todos).
  useEffect(() => {
    let cancelled = false;
    async function refetch() {
      setLoading(true);
      try {
        const apiStatus = filter === 'todos' ? 'todos' : filter === 'ativos' ? 'ativo' : 'arquivado';
        const { grupos: fetched } = await listGrupos({ status: apiStatus, q: query || undefined });
        if (!cancelled) setGrupos(fetched);
      } catch {
        toast.error('Não foi possível atualizar a lista.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const id = setTimeout(refetch, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [filter, query]);

  const ordenados = useMemo(() => {
    return [...grupos].sort((a, b) => {
      // Arquivados sempre por ultimo
      if (a.status !== b.status) return a.status === 'ativo' ? -1 : 1;
      // Depois com proxima partida
      const aNext = a.proximaPartida ? new Date(a.proximaPartida.dataHora).getTime() : Infinity;
      const bNext = b.proximaPartida ? new Date(b.proximaPartida.dataHora).getTime() : Infinity;
      if (aNext !== bNext) return aNext - bNext;
      // Por fim, atualizado mais recente
      return new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime();
    });
  }, [grupos]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar grupo..."
            className="pl-9"
            aria-label="Buscar grupo"
          />
        </div>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'ativos', label: 'Ativos' },
            { value: 'arquivados', label: 'Arquivados' },
            { value: 'todos', label: 'Todos' },
          ]}
          className="md:w-[300px]"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : ordenados.length === 0 ? (
        <EmptyState
          variant="dashed"
          title={query ? 'Nenhum grupo encontrado' : 'Você ainda não tem grupos'}
          description={
            query
              ? 'Tente buscar por outro nome.'
              : 'Crie o primeiro grupo para começar a organizar peladas.'
          }
          action={
            !query ? (
              <Link href="/grupos/novo">
                <Button>
                  <Plus size={16} /> Criar grupo
                </Button>
              </Link>
            ) : null
          }
        />
      ) : (
        <ul className="space-y-2">
          {ordenados.map((g) => (
            <GrupoCard
              key={g.id}
              grupo={g}
              onChange={(updated) =>
                setGrupos((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))
              }
              onRemove={(id) => setGrupos((prev) => prev.filter((p) => p.id !== id))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function GrupoCard({
  grupo,
  onChange,
  onRemove,
}: {
  grupo: GrupoListItem;
  onChange: (g: Partial<GrupoListItem> & { id: string }) => void;
  onRemove: (id: string) => void;
}) {
  const arquivado = grupo.status === 'arquivado';

  async function handleArchive() {
    try {
      await archiveGrupo(grupo.id);
      toast.success('Grupo arquivado.');
      onChange({ id: grupo.id, status: 'arquivado' });
    } catch {
      toast.error('Não foi possível arquivar.');
    }
  }
  async function handleRestore() {
    try {
      await updateGrupo(grupo.id, { status: 'ativo' });
      toast.success('Grupo restaurado.');
      onChange({ id: grupo.id, status: 'ativo' });
    } catch {
      toast.error('Não foi possível restaurar.');
    }
  }

  return (
    <li
      className={
        arquivado
          ? 'rounded-lg border border-border bg-surface/60 p-4 opacity-70 transition-opacity'
          : 'rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-surface-2'
      }
    >
      <div className="flex items-start gap-3">
        <Link href={`/grupos/${grupo.id}`} className="shrink-0">
          <Avatar name={grupo.nome} src={grupo.fotoUrl ?? undefined} size="lg" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/grupos/${grupo.id}`} className="min-w-0 flex-1">
              <h3 className="truncate font-display text-lg font-bold leading-tight">{grupo.nome}</h3>
            </Link>
            <Badge variant={grupo.papel === 'criador' ? 'primary' : 'default'}>
              {grupo.papel === 'criador' ? 'Presidente' : 'Co-presidente'}
            </Badge>
            {arquivado ? <Badge variant="outline">Arquivado</Badge> : null}
          </div>

          <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
            <Badge variant="outline">
              ⚽ {ESPORTE_LABEL[grupo.esporte] ?? grupo.esporte} · {NIVEL_LABEL[grupo.nivel] ?? grupo.nivel}
            </Badge>
            {grupo.proximaPartida ? (
              <Badge variant="info">
                <CalendarDays size={11} aria-hidden /> {formatDataPartida(grupo.proximaPartida.dataHora)}
              </Badge>
            ) : null}
          </div>

          <p className="mt-2 text-xs text-muted">
            <Users size={11} aria-hidden className="mr-1 inline-block align-text-bottom" />
            {grupo.totalBoleiros} {grupo.totalBoleiros === 1 ? 'boleiro' : 'boleiros'}
            {' · '}
            {grupo.totalPartidas} {grupo.totalPartidas === 1 ? 'partida' : 'partidas'}
            {grupo.ultimaPartida ? ` · última: ${formatDataCurta(grupo.ultimaPartida)}` : ''}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Ações do grupo"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-surface-offset hover:text-foreground"
            >
              <MoreVertical size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/grupos/${grupo.id}/editar`}>Editar grupo</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/grupos/${grupo.id}?tab=convidar`}>Convidar co-presidente</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {arquivado ? (
              <DropdownMenuItem onSelect={handleRestore}>
                <RotateCcw size={14} /> Restaurar grupo
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem destructive onSelect={handleArchive}>
                Arquivar grupo
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
