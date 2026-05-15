import Link from 'next/link';
import { CalendarPlus, ChevronRight, Plus, Users } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetchServer, ApiError } from '@/lib/api-server';
import { getSession } from '@/lib/auth-server';
import { formatDataCurta } from '@/lib/format';
import type { DashboardSummary } from '@/lib/types';
import { PartidaCard } from './partida-card';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getSession();
  // O layout ja garante onboarding; esta checagem e redundante mas evita ts-error.
  const nome = session?.usuario?.nome ?? 'Presidente';

  let data: DashboardSummary;
  try {
    data = await apiFetchServer<DashboardSummary>('/api/dashboard');
  } catch (err) {
    if (err instanceof ApiError) {
      return (
        <div className="container py-6">
          <EmptyState
            title="Não foi possível carregar"
            description="Tente novamente em instantes."
            action={
              <Link href="/dashboard">
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
    <div className="container space-y-6 py-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">E aí,</p>
          <h1 className="font-display text-3xl font-bold leading-tight">{nome.split(' ')[0]} 👋</h1>
        </div>
        <Link href="/partidas/nova" className="shrink-0">
          <Button size="sm" className="gap-1.5">
            <CalendarPlus size={16} /> Nova partida
          </Button>
        </Link>
      </header>

      {/* Bloco 1 — Próximas Partidas (cards lado-a-lado) */}
      <ProximasPartidasGrid partidas={data.proximasPartidas} />

      {/* Bloco 4 — Alertas e pendências (acima dos grupos quando há urgência) */}
      <Alertas alertas={data.alertas} />

      {/* Bloco 2 — Meus Grupos */}
      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Meus Grupos</h2>
          <Link
            href="/grupos"
            className="inline-flex items-center gap-0.5 text-sm font-medium text-primary"
          >
            Ver todos <ChevronRight size={14} />
          </Link>
        </header>
        <GruposScrollList grupos={data.grupos} />
      </section>

      {/* Bloco 3 — Últimas Partidas */}
      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Partidas Recentes</h2>
          <Link
            href="/partidas?status=encerrada"
            className="inline-flex items-center gap-0.5 text-sm font-medium text-primary"
          >
            Ver histórico <ChevronRight size={14} />
          </Link>
        </header>
        <UltimasPartidas partidas={data.ultimasPartidas} />
      </section>
    </div>
  );
}

function ProximasPartidasGrid({ partidas }: { partidas: DashboardSummary['proximasPartidas'] }) {
  if (partidas.length === 0) {
    return (
      <EmptyState
        variant="dashed"
        icon={<span aria-hidden>⚽</span>}
        title="Nenhuma partida agendada"
        description="Marque um rachão pra esquentar a galera."
        action={
          <Link href="/partidas/nova">
            <Button>
              <CalendarPlus size={16} /> Agendar agora
            </Button>
          </Link>
        }
      />
    );
  }

  // 1 partida: card unico em largura total. 2+: grid responsivo (mobile: scroll
  // horizontal com snap; tablet: 2 col; desktop: 3 col).
  if (partidas.length === 1) {
    return (
      <section className="space-y-2">
        <h2 className="sr-only">Próxima partida</h2>
        <PartidaCard partida={partidas[0]!} destaque />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Próximas partidas</h2>
        <Link
          href="/partidas?status=agendada"
          className="inline-flex items-center gap-0.5 text-sm font-medium text-primary"
        >
          Ver todas <ChevronRight size={14} />
        </Link>
      </header>
      <ul
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3"
      >
        {partidas.map((p, idx) => (
          <li
            key={p.id}
            className="w-[300px] shrink-0 snap-start md:w-auto"
          >
            <PartidaCard partida={p} destaque={idx === 0} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function GruposScrollList({ grupos }: { grupos: DashboardSummary['grupos'] }) {
  if (grupos.length === 0) {
    return (
      <EmptyState
        variant="dashed"
        title="Você ainda não tem grupos"
        description="Crie o primeiro grupo para começar a organizar peladas."
        action={
          <Link href="/grupos/novo">
            <Button>
              <Plus size={16} /> Criar grupo
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1">
      <ul className="flex gap-3 md:grid md:grid-cols-3 md:gap-4">
        {grupos.map((g) => (
          <li
            key={g.id}
            className="w-[220px] shrink-0 md:w-auto"
          >
            <Link
              href={`/grupos/${g.id}`}
              className="block h-full rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-surface-2"
            >
              <div className="flex items-start gap-3">
                <Avatar name={g.nome} src={g.fotoUrl ?? undefined} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{g.nome}</p>
                  <p className="truncate text-xs text-muted">
                    {g.totalBoleiros} {g.totalBoleiros === 1 ? 'boleiro' : 'boleiros'}
                    {g.ultimaPartida ? ` · última ${formatDataCurta(g.ultimaPartida)}` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <Badge variant={g.papel === 'criador' ? 'primary' : 'default'}>
                  {g.papel === 'criador' ? 'Presidente' : 'Co-presidente'}
                </Badge>
              </div>
            </Link>
          </li>
        ))}
        <li className="w-[180px] shrink-0 md:w-auto">
          <Link
            href="/grupos/novo"
            className="flex h-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 text-sm text-muted transition-colors hover:border-primary hover:text-primary"
          >
            <Plus size={16} /> Novo grupo
          </Link>
        </li>
      </ul>
    </div>
  );
}

function UltimasPartidas({ partidas }: { partidas: DashboardSummary['ultimasPartidas'] }) {
  if (partidas.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted">
          <Users size={32} strokeWidth={1.5} className="text-faint" />
          Nenhuma partida realizada ainda
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-2">
      {partidas.map((p) => {
        const t1 = p.times[0];
        const t2 = p.times[1];
        return (
          <li key={p.id}>
            <Link
              href={`/partidas/${p.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.grupo.nome}</p>
                <p className="text-xs text-muted">{formatDataCurta(p.dataHora)}</p>
              </div>
              {t1 && t2 ? (
                <p className="font-display text-lg font-semibold tabular-nums">
                  {t1.gols} <span className="text-muted">×</span> {t2.gols}
                </p>
              ) : null}
              <Badge variant="default">Encerrada</Badge>
              <ChevronRight size={16} className="text-muted" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Alertas({ alertas }: { alertas: DashboardSummary['alertas'] }) {
  if (alertas.vaquinhasAbertas === 0 && alertas.bloqueadosVermelho === 0) return null;

  return (
    <div className="space-y-2">
      {alertas.vaquinhasAbertas > 0 ? (
        <Link
          href="/partidas?vaquinha=aberta"
          className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning-highlight px-4 py-3 text-sm transition-colors hover:bg-warning-highlight/80"
        >
          <span aria-hidden>💸</span>
          <p className="flex-1 text-warning">
            <span className="font-medium text-foreground">
              {alertas.vaquinhasAbertas}{' '}
              {alertas.vaquinhasAbertas === 1 ? 'pagamento em aberto' : 'pagamentos em aberto'}
            </span>
            {' '} na última partida
          </p>
          <ChevronRight size={16} className="text-warning" />
        </Link>
      ) : null}
      {alertas.bloqueadosVermelho > 0 ? (
        <Link
          href="/partidas?bloqueio=vermelho"
          className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-error-highlight px-4 py-3 text-sm transition-colors hover:bg-error-highlight/80"
        >
          <span aria-hidden>🟥</span>
          <p className="flex-1 text-destructive">
            <span className="font-medium text-foreground">
              {alertas.bloqueadosVermelho} cartão{alertas.bloqueadosVermelho === 1 ? '' : 's'}{' '}
              vermelho{alertas.bloqueadosVermelho === 1 ? '' : 's'}
            </span>
            {' '}registrado{alertas.bloqueadosVermelho === 1 ? '' : 's'} no histórico
          </p>
          <ChevronRight size={16} className="text-destructive" />
        </Link>
      ) : null}
    </div>
  );
}
