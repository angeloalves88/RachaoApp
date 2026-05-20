import Link from 'next/link';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/layout/fab';
import { apiFetchServer, ApiError } from '@/lib/api-server';
import type { PartidaListItem, StatusPartida } from '@/lib/types';
import { PartidasClient } from './partidas-client';

export const dynamic = 'force-dynamic';

const STATUS_VALIDOS: StatusPartida[] = [
  'agendada',
  'em_andamento',
  'encerrada',
  'cancelada',
];

type PageProps = {
  searchParams: Promise<{
    status?: string;
    grupoId?: string;
    vaquinha?: string;
    bloqueio?: string;
  }>;
};

function resolveStatus(raw?: string): StatusPartida | 'todos' {
  if (!raw || raw === 'todos') return 'todos';
  if (STATUS_VALIDOS.includes(raw as StatusPartida)) return raw as StatusPartida;
  return 'todos';
}

export default async function PartidasPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  let status = resolveStatus(sp.status);

  let avisoEspecial: string | null = null;
  if (sp.vaquinha === 'aberta') {
    status = status === 'todos' ? 'encerrada' : status;
    avisoEspecial =
      'Pagamentos em aberto costumam estar em partidas já encerradas. Abra o detalhe para ver a vaquinha.';
  } else if (sp.bloqueio === 'vermelho') {
    avisoEspecial =
      'Consulte o histórico de cartões no detalhe de cada partida ou no perfil do boleiro.';
  }

  const qs = new URLSearchParams();
  if (status !== 'todos') qs.set('status', status);
  if (sp.grupoId) qs.set('grupoId', sp.grupoId);

  let partidas: PartidaListItem[] = [];
  try {
    const data = await apiFetchServer<{ partidas: PartidaListItem[] }>(
      `/api/partidas${qs.toString() ? `?${qs}` : ''}`,
    );
    partidas = data.partidas;
  } catch (err) {
    if (err instanceof ApiError) {
      return (
        <div className="container py-6">
          <EmptyState
            title="Não foi possível carregar"
            description="Tente novamente em instantes."
            action={
              <Link href="/partidas">
                <Button variant="outline">Tentar novamente</Button>
              </Link>
            }
          />
        </div>
      );
    }
    throw err;
  }

  return (
    <div className="container space-y-5 py-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight">Partidas</h1>
          <p className="text-sm text-muted">
            {partidas.length}{' '}
            {partidas.length === 1 ? 'partida encontrada' : 'partidas encontradas'}
          </p>
        </div>
        <Link href="/partidas/nova" className="hidden md:block">
          <Button className="gap-1.5">
            <CalendarPlus size={16} /> Nova partida
          </Button>
        </Link>
      </header>

      <PartidasClient
        initial={partidas}
        initialStatus={status}
        initialGrupoId={sp.grupoId}
        avisoEspecial={avisoEspecial}
      />

      <Fab href="/partidas/nova" label="Nova partida" />
    </div>
  );
}
