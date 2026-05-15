import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, MoreVertical } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GrupoTabs } from './grupo-tabs';
import { apiFetchServer, apiFetchServerSafe } from '@/lib/api-server';
import { formatMesAno } from '@/lib/format';
import type { BoleiroListItem, GrupoDetalhe } from '@/lib/types';

export const dynamic = 'force-dynamic';

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

export default async function GrupoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await apiFetchServerSafe<{ grupo: GrupoDetalhe }>(`/api/grupos/${id}`);
  if (!data) notFound();
  const grupo = data.grupo;

  const boleirosResp = await apiFetchServer<{ boleiros: BoleiroListItem[] }>(
    `/api/grupos/${id}/boleiros?status=todos`,
  );

  return (
    <div className="space-y-5 pb-6">
      <header className="relative">
        <div
          className="h-32 w-full bg-gradient-to-br from-primary-highlight via-surface-2 to-surface bg-cover bg-center"
          style={
            grupo.fotoUrl
              ? { backgroundImage: `linear-gradient(180deg, rgba(15,27,45,0.4), rgba(15,27,45,0.95)), url(${grupo.fotoUrl})` }
              : undefined
          }
        />
        <div className="container -mt-8 flex items-end gap-3">
          <Link
            href="/grupos"
            aria-label="Voltar"
            className="absolute left-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface/80 text-foreground backdrop-blur-sm hover:bg-surface"
          >
            <ChevronLeft size={18} />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Ações do grupo"
                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface/80 text-foreground backdrop-blur-sm hover:bg-surface"
              >
                <MoreVertical size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/grupos/${grupo.id}/editar`}>Editar grupo</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/grupos/${grupo.id}/editar`}>Convidar co-presidente</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/grupos/${grupo.id}/editar`}>Arquivar grupo</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Avatar name={grupo.nome} src={grupo.fotoUrl ?? undefined} size="xl" />
          <div className="flex-1 pb-2">
            <h1 className="font-display text-2xl font-bold leading-tight">{grupo.nome}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="primarySoft">
                ⚽ {ESPORTE_LABEL[grupo.esporte] ?? grupo.esporte} ·{' '}
                {NIVEL_LABEL[grupo.nivel] ?? grupo.nivel}
              </Badge>
              {grupo.status === 'arquivado' ? <Badge variant="outline">Arquivado</Badge> : null}
            </div>
          </div>
        </div>

        <p className="container mt-2 text-xs text-muted">
          {grupo.totalBoleirosAtivos}{' '}
          {grupo.totalBoleirosAtivos === 1 ? 'boleiro ativo' : 'boleiros ativos'}
          {' · '}
          {grupo.totalPartidas} {grupo.totalPartidas === 1 ? 'partida' : 'partidas'}
          {' · criado em '}
          {formatMesAno(grupo.criadoEm)}
        </p>
        {grupo.descricao ? (
          <p className="container mt-2 text-sm text-muted">{grupo.descricao}</p>
        ) : null}
      </header>

      <div className="container">
        <GrupoTabs grupoId={grupo.id} initialBoleiros={boleirosResp.boleiros} />
      </div>
    </div>
  );
}
