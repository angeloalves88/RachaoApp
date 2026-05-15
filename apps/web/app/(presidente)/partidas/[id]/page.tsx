import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, MoreVertical } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiFetchServerSafe } from '@/lib/api-server';
import { formatDataPartida, formatMesAno } from '@/lib/format';
import type { PartidaDetalhe } from '@/lib/types';
import { ActionsGrid } from './actions-grid';
import { CancelarPartidaButton } from './cancelar-button';
import { IniciarPartidaCard } from './iniciar-card';

export const dynamic = 'force-dynamic';

const NOMES_REGRAS: Record<string, string> = {
  cartao_azul: 'Cartão azul',
  bloqueio_vermelho: 'Bloqueio após vermelho',
  bloqueio_inadimplente: 'Bloqueio inadimplente',
  gol_olimpico_duplo: 'Gol olímpico vale 2',
  impedimento_ativo: 'Impedimento ativo',
  penalti_max_por_tempo: 'Limite de pênaltis',
  time_menor_joga: 'Time incompleto joga',
  goleiro_obrigatorio: 'Goleiro obrigatório',
};

export default async function PartidaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await apiFetchServerSafe<{ partida: PartidaDetalhe }>(`/api/partidas/${id}`);
  if (!data) notFound();
  const partida = data.partida;

  const ativos = partida.convites.filter(
    (c) => c.status === 'pendente' || c.status === 'confirmado',
  );
  const primeiros = ativos.slice(0, 5);
  const restantes = Math.max(0, ativos.length - primeiros.length);

  const regrasAtivas = Object.entries(partida.regras ?? {}).filter(
    ([, v]) => (v as { ativo?: boolean })?.ativo,
  );

  return (
    <div className="space-y-5 pb-6">
      {partida.status === 'cancelada' ? (
        <div className="bg-error-highlight px-4 py-2 text-sm text-destructive">
          Esta partida foi cancelada.
        </div>
      ) : null}

      {partida.status !== 'cancelada' && partida.statusEstadio === 'pendente' && partida.estadio ? (
        <div className="rounded-lg border border-warning/40 bg-warning-highlight px-4 py-3 text-sm text-foreground">
          <p className="font-medium">Local aguardando confirmação</p>
          <p className="mt-1 text-muted">
            A pelada já está no calendário do grupo e os convites seguem o fluxo normal, mas o espaço{' '}
            <strong>{partida.estadio.nome}</strong> ainda precisa ser confirmado pelo dono do estádio.
          </p>
          {partida.estadio.slug ? (
            <p className="mt-2">
              <Link
                href={`/estadios/${partida.estadio.slug}`}
                className="text-primary text-sm font-medium underline-offset-2 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver página pública do local
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Hero header */}
      <header className="relative">
        <div
          className="h-32 w-full bg-gradient-to-br from-primary-highlight via-surface-2 to-surface bg-cover bg-center"
          style={
            partida.grupo.fotoUrl
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(15,27,45,0.4), rgba(15,27,45,0.95)), url(${partida.grupo.fotoUrl})`,
                }
              : undefined
          }
        />
        <div className="container -mt-8 flex items-end gap-3">
          <Link
            href={`/grupos/${partida.grupo.id}`}
            aria-label="Voltar para o grupo"
            className="absolute left-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface/80 text-foreground backdrop-blur-sm hover:bg-surface"
          >
            <ChevronLeft size={18} />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Ações da partida"
                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface/80 text-foreground backdrop-blur-sm hover:bg-surface"
              >
                <MoreVertical size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/partidas/nova?grupoId=${partida.grupo.id}`}>Nova partida deste grupo</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <CancelarPartidaButton
                partidaId={partida.id}
                disabled={partida.status === 'cancelada' || partida.status === 'encerrada'}
                serieId={partida.serieId}
                serieRestantes={partida.serieRestantes}
              />
            </DropdownMenuContent>
          </DropdownMenu>

          <Avatar name={partida.grupo.nome} src={partida.grupo.fotoUrl ?? undefined} size="xl" />
          <div className="flex-1 pb-2">
            <StatusBadge status={partida.status} />
            <h1 className="mt-1 font-display text-2xl font-bold leading-tight">
              {formatDataPartida(partida.dataHora)}
            </h1>
            <p className="text-sm text-muted">
              {partida.grupo.nome} ·{' '}
              {partida.estadio?.nome ?? partida.localLivre ?? 'Local não definido'}
            </p>
            <p className="text-xs text-muted">
              {partida.numTimes} times · {partida.numTimes * (partida.boleirosPorTime + (partida.reservasPorTime ?? 0))} boleiros · {partida.tempoTotal} min
              {' · '}criada em {formatMesAno(partida.criadoEm)}
            </p>
          </div>
        </div>
      </header>

      <main className="container space-y-5">
        {partida.status === 'agendada' ? (
          <IniciarPartidaCard
            partidaId={partida.id}
            temEscalacao={partida.temEscalacao ?? false}
          />
        ) : null}

        {/* Cards 2x2 */}
        <ActionsGrid partida={partida} />

        {/* Boleiros confirmados */}
        <section className="space-y-2">
          <header className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Boleiros</h2>
            <Link
              href={`/partidas/${partida.id}/presencas`}
              className="text-sm font-medium text-primary"
            >
              Ver todos →
            </Link>
          </header>
          {ativos.length === 0 ? (
            <EmptyState
              variant="dashed"
              title="Nenhum boleiro convidado ainda"
              description="Edite a partida ou adicione convidados para preencher as vagas."
            />
          ) : (
            <Card>
              <CardContent className="space-y-3 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {primeiros.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-2 py-1 text-xs"
                    >
                      <Avatar name={c.boleiro?.nome ?? 'Convidado'} size="xs" />
                      {c.boleiro?.nome ?? '—'}
                    </span>
                  ))}
                  {restantes > 0 ? (
                    <span className="text-xs text-muted">e mais {restantes}</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <ResumoPill label="Confirmados" value={partida.resumo.confirmados} variant="success" />
                  <ResumoPill label="Pendentes" value={partida.resumo.pendentes} variant="warning" />
                  <ResumoPill label="Recusados" value={partida.resumo.recusados} variant="destructive" />
                  <ResumoPill label="Lista de espera" value={partida.resumo.listaEspera} variant="info" />
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Regras ativas */}
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Regras ativas</h2>
          {regrasAtivas.length === 0 ? (
            <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted">
              Nenhuma regra especial nesta partida.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {regrasAtivas.map(([k]) => (
                <Badge key={k} variant="primarySoft">
                  {NOMES_REGRAS[k] ?? k}
                </Badge>
              ))}
            </div>
          )}
        </section>

        {/* Vaquinha */}
        <section className="space-y-2">
          <header className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Vaquinha</h2>
            {partida.vaquinha ? (
              <Link
                href={`/partidas/${partida.id}/vaquinha`}
                className="text-sm font-medium text-primary"
              >
                Gerenciar →
              </Link>
            ) : null}
          </header>
          {partida.vaquinha ? (
            <Card>
              <CardContent className="space-y-2 px-4 py-3">
                <p className="text-sm">
                  <span className="font-medium">
                    R$ {partida.vaquinha.arrecadado.toFixed(2)}
                  </span>{' '}
                  arrecadado de R$ {partida.vaquinha.totalEsperado.toFixed(2)}
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-offset">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${
                        partida.vaquinha.totalEsperado > 0
                          ? Math.min(
                              100,
                              (partida.vaquinha.arrecadado / partida.vaquinha.totalEsperado) * 100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted">
                  Chave Pix:{' '}
                  <span className="font-mono text-foreground">{partida.vaquinha.chavePix}</span>
                </p>
              </CardContent>
            </Card>
          ) : (
            <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted">
              Sem vaquinha nesta partida.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: PartidaDetalhe['status'] }) {
  switch (status) {
    case 'agendada':
      return <Badge variant="info">AGENDADA</Badge>;
    case 'em_andamento':
      return <Badge variant="warning" className="animate-pulse-warning">EM ANDAMENTO</Badge>;
    case 'encerrada':
      return <Badge variant="default">ENCERRADA</Badge>;
    case 'cancelada':
      return <Badge variant="destructive">CANCELADA</Badge>;
  }
}

function ResumoPill({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: 'success' | 'warning' | 'destructive' | 'info';
}) {
  const map = {
    success: 'border-success/40 bg-success-highlight text-success',
    warning: 'border-warning/40 bg-warning-highlight text-warning',
    destructive: 'border-destructive/40 bg-error-highlight text-destructive',
    info: 'border-info/40 bg-info-highlight text-info',
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${map[variant]}`}>
      <span className="font-semibold">{value}</span>
      <span className="text-foreground/80">{label}</span>
    </span>
  );
}
