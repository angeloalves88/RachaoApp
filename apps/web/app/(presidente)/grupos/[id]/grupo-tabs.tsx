'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  CalendarPlus,
  ChevronRight,
  ListFilter,
  MessageCircle,
  MoreVertical,
  Plus,
  Search,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Fab } from '@/components/layout/fab';
import { BoleiroFormDialog } from '@/components/boleiros/boleiro-form-dialog';
import { BoleiroFichaSheet } from '@/components/boleiros/boleiro-ficha-sheet';
import {
  archiveBoleiro,
  getEstatisticasGrupo,
  listBoleiros,
} from '@/lib/grupos-actions';
import { listPartidas } from '@/lib/partidas-actions';
import { formatCelular } from '@/lib/utils';
import type {
  BoleiroListItem,
  EstatisticasGrupoData,
  EstatisticasPeriodo,
  PartidaListItem,
  StatusPartida,
} from '@/lib/types';

type StatusFilter = 'ativos' | 'arquivados' | 'todos';

interface Props {
  grupoId: string;
  initialBoleiros: BoleiroListItem[];
}

export function GrupoTabs({ grupoId, initialBoleiros }: Props) {
  const [tab, setTab] = useState<'boleiros' | 'partidas' | 'estatisticas'>('boleiros');

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
      <TabsList>
        <TabsTrigger value="boleiros">Boleiros</TabsTrigger>
        <TabsTrigger value="partidas">Partidas</TabsTrigger>
        <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
      </TabsList>

      <TabsContent value="boleiros">
        <BoleirosTab grupoId={grupoId} initial={initialBoleiros} />
      </TabsContent>

      <TabsContent value="partidas">
        <PartidasTab grupoId={grupoId} />
      </TabsContent>

      <TabsContent value="estatisticas">
        <EstatisticasTab grupoId={grupoId} />
      </TabsContent>
    </Tabs>
  );
}

type PartidasFilter = 'proximas' | 'encerradas' | 'todas';

function PartidasTab({ grupoId }: { grupoId: string }) {
  const [filter, setFilter] = useState<PartidasFilter>('proximas');
  const [partidas, setPartidas] = useState<PartidaListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const apiStatus: string =
      filter === 'proximas'
        ? 'agendada'
        : filter === 'encerradas'
          ? 'encerrada'
          : 'todos';
    listPartidas({ grupoId, status: apiStatus })
      .then(({ partidas: fetched }) => {
        if (!cancelled) setPartidas(fetched);
      })
      .catch(() => {
        if (!cancelled) toast.error('Não foi possível carregar partidas.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [grupoId, filter]);

  const ordenadas = useMemo(() => {
    const arr = [...partidas];
    arr.sort((a, b) => +new Date(b.dataHora) - +new Date(a.dataHora));
    return arr;
  }, [partidas]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented<PartidasFilter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'proximas', label: 'Próximas' },
            { value: 'encerradas', label: 'Encerradas' },
            { value: 'todas', label: 'Todas' },
          ]}
          className="md:w-[360px]"
        />
        <Button asChild className="hidden md:inline-flex">
          <Link href={`/partidas/nova?grupoId=${grupoId}`}>
            <Plus size={16} /> Nova partida
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : ordenadas.length === 0 ? (
        <EmptyState
          variant="dashed"
          icon={<CalendarPlus size={32} aria-hidden />}
          title="Nenhuma partida nesta lista"
          description={
            filter === 'proximas'
              ? 'Agende uma partida para começar.'
              : 'Quando houver partidas encerradas, elas aparecem aqui.'
          }
          action={
            filter === 'proximas' ? (
              <Button asChild>
                <Link href={`/partidas/nova?grupoId=${grupoId}`}>
                  <Plus size={16} /> Nova partida
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="space-y-2">
          {ordenadas.map((p) => (
            <PartidaRow key={p.id} partida={p} />
          ))}
        </ul>
      )}
    </section>
  );
}

const STATUS_PARTIDA_LABEL: Record<StatusPartida, string> = {
  agendada: 'Agendada',
  em_andamento: 'Em andamento',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada',
};

const STATUS_PARTIDA_VARIANT: Record<
  StatusPartida,
  'default' | 'success' | 'warning' | 'destructive'
> = {
  agendada: 'warning',
  em_andamento: 'success',
  encerrada: 'default',
  cancelada: 'destructive',
};

function PartidaRow({ partida }: { partida: PartidaListItem }) {
  const data = new Date(partida.dataHora);
  const dataFmt = data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
  const horaFmt = data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <li>
      <Link
        href={`/partidas/${partida.id}`}
        className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 transition-colors hover:bg-surface-2"
      >
        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md border border-border bg-surface-2 text-center">
          <p className="text-[10px] font-medium leading-none text-muted">
            {dataFmt.slice(3, 5)}
          </p>
          <p className="font-display text-base font-semibold leading-none">
            {dataFmt.slice(0, 2)}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium leading-tight">
              {dataFmt} · {horaFmt}
            </p>
            <Badge variant={STATUS_PARTIDA_VARIANT[partida.status]}>
              {STATUS_PARTIDA_LABEL[partida.status]}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted">
            {partida.local ?? 'Local não definido'} · {partida.numTimes} times ·{' '}
            {partida.boleirosPorTime}/time · {partida.confirmados}/{partida.vagasTotais}{' '}
            confirmados
          </p>
        </div>
        <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />
      </Link>
    </li>
  );
}

function EstatisticasTab({ grupoId }: { grupoId: string }) {
  const [periodo, setPeriodo] = useState<EstatisticasPeriodo>('30d');
  const [data, setData] = useState<EstatisticasGrupoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getEstatisticasGrupo(grupoId, periodo)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) toast.error('Não foi possível carregar estatísticas.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [grupoId, periodo]);

  if (loading || !data) {
    return (
      <section className="space-y-3">
        <Skeleton className="h-9 w-full" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-40 w-full" />
      </section>
    );
  }

  const semDados = data.totais.partidas === 0;

  return (
    <section className="space-y-4">
      <Segmented<EstatisticasPeriodo>
        value={periodo}
        onChange={setPeriodo}
        options={[
          { value: '30d', label: 'Últimos 30d' },
          { value: '90d', label: 'Últimos 90d' },
          { value: 'all', label: 'Tudo' },
        ]}
        className="md:w-[420px]"
      />

      {semDados ? (
        <EmptyState
          variant="dashed"
          icon={<Trophy size={32} aria-hidden />}
          title="Sem partidas neste período"
          description="Os números aparecem quando houver partidas registradas."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatPill label="Partidas" value={data.totais.partidas} hint={`${data.totais.partidasEncerradas} encerradas`} />
            <StatPill label="Gols" value={data.totais.gols} />
            <StatPill
              label="Cartões"
              value={data.totais.amarelos + data.totais.vermelhos}
              hint={`${data.totais.amarelos} 🟨 · ${data.totais.vermelhos} 🟥`}
            />
            <StatPill label="Substituições" value={data.totais.substituicoes} />
          </div>

          <RankingCard title="Artilheiros" empty="Sem gols neste período.">
            {data.artilheiros.map((a, i) => (
              <RankRow
                key={a.boleiroId}
                pos={i + 1}
                nome={a.nome}
                apelido={a.apelido}
                tipo={a.tipo}
                rightLabel={`${a.gols} ${a.gols === 1 ? 'gol' : 'gols'}`}
              />
            ))}
          </RankingCard>

          <RankingCard title="Cartões" empty="Nenhum cartão neste período.">
            {data.cartoes.map((c, i) => (
              <RankRow
                key={c.boleiroId}
                pos={i + 1}
                nome={c.nome}
                apelido={c.apelido}
                tipo={c.tipo}
                rightLabel={`${c.amarelos} 🟨 · ${c.vermelhos} 🟥`}
              />
            ))}
          </RankingCard>

          <RankingCard title="Presença" empty="Sem convites confirmados.">
            {data.presenca.map((p, i) => (
              <RankRow
                key={p.boleiroId}
                pos={i + 1}
                nome={p.nome}
                apelido={p.apelido}
                tipo={p.tipo}
                rightLabel={`${Math.round(p.taxa * 100)}% (${p.confirmado}/${p.convidado})`}
              />
            ))}
          </RankingCard>
        </>
      )}
    </section>
  );
}

function StatPill({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-2 px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-2xl font-semibold leading-none tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}

function RankingCard({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const itens = Array.isArray(children) ? children : [children];
  const hasContent = itens.filter(Boolean).length > 0;
  return (
    <div className="rounded-lg border border-border bg-surface">
      <header className="border-b border-border px-3 py-2">
        <p className="font-display text-sm font-semibold uppercase tracking-wide">
          {title}
        </p>
      </header>
      {hasContent ? (
        <ul className="divide-y divide-border">{itens}</ul>
      ) : (
        <p className="px-3 py-4 text-sm text-muted">{empty}</p>
      )}
    </div>
  );
}

function RankRow({
  pos,
  nome,
  apelido,
  tipo,
  rightLabel,
}: {
  pos: number;
  nome: string;
  apelido: string | null;
  tipo: 'fixo' | 'convidado_avulso';
  rightLabel: string;
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <p className="w-6 shrink-0 text-center font-display text-sm font-semibold text-muted">
        {pos}
      </p>
      <Avatar name={nome} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">{nome}</p>
        <p className="truncate text-[11px] text-muted">
          {apelido ? `"${apelido}" · ` : ''}
          {tipo === 'fixo' ? 'Fixo' : 'Convidado avulso'}
        </p>
      </div>
      <p className="shrink-0 text-sm tabular-nums">{rightLabel}</p>
    </li>
  );
}

function BoleirosTab({
  grupoId,
  initial,
}: {
  grupoId: string;
  initial: BoleiroListItem[];
}) {
  const [boleiros, setBoleiros] = useState(initial);
  const [filter, setFilter] = useState<StatusFilter>('ativos');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BoleiroListItem | null>(null);

  const [fichaOpen, setFichaOpen] = useState(false);
  const [fichaId, setFichaId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function refetch() {
      setLoading(true);
      try {
        const apiStatus = filter === 'todos' ? 'todos' : filter === 'ativos' ? 'ativo' : 'arquivado';
        const { boleiros: fetched } = await listBoleiros(grupoId, {
          status: apiStatus,
          q: query || undefined,
        });
        if (!cancelled) setBoleiros(fetched);
      } catch {
        toast.error('Não foi possível carregar boleiros.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const id = setTimeout(refetch, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [grupoId, filter, query]);

  const ativos = useMemo(
    () => boleiros.filter((b) => b.status === 'ativo').length,
    [boleiros],
  );

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(b: BoleiroListItem) {
    setEditing(b);
    setFormOpen(true);
    setFichaOpen(false);
  }

  function openFicha(boleiroId: string) {
    setFichaId(boleiroId);
    setFichaOpen(true);
  }

  function handleSaved(b: BoleiroListItem) {
    setBoleiros((prev) => {
      const exists = prev.some((p) => p.id === b.id);
      if (exists) return prev.map((p) => (p.id === b.id ? b : p));
      return [b, ...prev];
    });
  }

  async function handleArchive(b: BoleiroListItem) {
    if (!window.confirm(`Arquivar ${b.nome}?`)) return;
    try {
      await archiveBoleiro(grupoId, b.id);
      toast.success('Boleiro arquivado.');
      setBoleiros((prev) =>
        prev.map((p) => (p.id === b.id ? { ...p, status: 'arquivado' } : p)),
      );
    } catch {
      toast.error('Não foi possível arquivar.');
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar boleiro..."
            className="pl-9"
            aria-label="Buscar boleiro"
          />
        </div>
        <Segmented<StatusFilter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'ativos', label: 'Ativos' },
            { value: 'arquivados', label: 'Arquivados' },
            { value: 'todos', label: 'Todos' },
          ]}
          className="md:w-[300px]"
        />
        <Button onClick={openCreate} className="hidden md:inline-flex">
          <Plus size={16} /> Adicionar boleiro
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : boleiros.length === 0 ? (
        <EmptyState
          variant="dashed"
          icon={<ListFilter size={32} aria-hidden />}
          title={query ? 'Nenhum boleiro encontrado' : 'Nenhum boleiro cadastrado'}
          description={
            query
              ? 'Tente ajustar a busca.'
              : 'Adicione boleiros para enviar convites e escalar times.'
          }
          action={
            !query ? (
              <Button onClick={openCreate}>
                <Plus size={16} /> Adicionar boleiro
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="space-y-2">
          {boleiros.map((b) => (
            <BoleiroRow
              key={b.id}
              boleiro={b}
              onClick={() => openFicha(b.id)}
              onEdit={() => openEdit(b)}
              onArchive={() => handleArchive(b)}
            />
          ))}
        </ul>
      )}

      <p className="text-xs text-muted">
        {ativos} {ativos === 1 ? 'boleiro ativo' : 'boleiros ativos'}
      </p>

      <Fab onClick={openCreate} label="Adicionar boleiro" />

      <BoleiroFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        grupoId={grupoId}
        boleiro={editing}
        onSaved={handleSaved}
        onArchived={(id) =>
          setBoleiros((prev) =>
            prev.map((p) => (p.id === id ? { ...p, status: 'arquivado' } : p)),
          )
        }
      />
      <BoleiroFichaSheet
        open={fichaOpen}
        onOpenChange={setFichaOpen}
        grupoId={grupoId}
        boleiroId={fichaId}
        onEdit={openEdit}
      />
    </section>
  );
}

function BoleiroRow({
  boleiro,
  onClick,
  onEdit,
  onArchive,
}: {
  boleiro: BoleiroListItem;
  onClick: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const arquivado = boleiro.status === 'arquivado';
  const celularLimpo = /^\d{11}$/.test(boleiro.celular) ? boleiro.celular : null;

  return (
    <li
      className={
        arquivado
          ? 'flex items-center gap-3 rounded-lg border border-border bg-surface/60 px-3 py-2.5 opacity-70'
          : 'flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 transition-colors hover:bg-surface-2'
      }
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <Avatar name={boleiro.nome} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-medium">{boleiro.nome}</p>
            {boleiro.posicao ? <Badge variant="primarySoft">{boleiro.posicao}</Badge> : null}
          </div>
          {boleiro.apelido ? (
            <p className="truncate text-xs italic text-muted">&ldquo;{boleiro.apelido}&rdquo;</p>
          ) : null}
        </div>
      </button>

      {celularLimpo ? (
        <a
          href={`https://wa.me/55${celularLimpo}`}
          target="_blank"
          rel="noreferrer"
          aria-label={`WhatsApp: ${formatCelular(celularLimpo)}`}
          className="hidden h-9 w-9 items-center justify-center rounded-md text-success hover:bg-surface-offset md:inline-flex"
          onClick={(e) => e.stopPropagation()}
        >
          <MessageCircle size={16} />
        </a>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Ações do boleiro"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-surface-offset hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onClick}>Ver ficha</DropdownMenuItem>
          <DropdownMenuItem onSelect={onEdit}>Editar</DropdownMenuItem>
          <DropdownMenuSeparator />
          {arquivado ? null : (
            <DropdownMenuItem destructive onSelect={onArchive}>
              Arquivar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
