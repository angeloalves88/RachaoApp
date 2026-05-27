import type { ReactNode } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronRight, Goal, TrendingUp, Trophy, Users } from 'lucide-react';
import { COR_HEX } from '@/lib/escalacao-ui';
import type { CorTime } from '@rachao/shared/zod';
import type { DashboardSummary } from '@/lib/types';
import { PartidaCard } from './partida-card';
import { formatDataPartida } from '@/lib/format';

interface Props {
  data: DashboardSummary;
  nome: string;
}

export function DashboardInsightsGrid({ data, nome }: Props) {
  const { insights, proximasPartidas } = data;
  const proxima = proximasPartidas[0] ?? null;
  const goleador = insights.artilheiroDestaque;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">E aí,</p>
          <h1 className="font-display text-3xl font-bold leading-tight">{nome.split(' ')[0]} 👋</h1>
        </div>
        <Link href="/partidas/nova" className="shrink-0">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
            <CalendarDays size={16} /> Nova partida
          </span>
        </Link>
      </header>

      <DashboardAlertas alertas={data.alertas} />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
          {proxima ? (
            <PartidaCard partida={proxima} destaque />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-surface-2 p-6 text-center">
              <p className="font-display text-lg font-semibold">Nenhuma partida agendada</p>
              <p className="mt-1 text-sm text-muted">Marque o próximo rachão da galera.</p>
              <Link
                href="/partidas/nova"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary"
              >
                Agendar agora <ChevronRight size={14} />
              </Link>
            </div>
          )}
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <MetricCard
            icon={<CalendarDays className="h-5 w-5 text-primary" />}
            label="Partidas previstas"
            value={String(insights.partidasPrevistas)}
            hint="Agendadas ou ao vivo"
          />
          <MetricCard
            icon={<Goal className="h-5 w-5 text-success" />}
            label="Média de gols"
            value={insights.mediaGolsPorPartida > 0 ? String(insights.mediaGolsPorPartida) : '—'}
            hint="Por partida com gols"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RankingCard
          title="Top artilheiros"
          icon="⚽"
          empty="Sem gols registrados ainda"
          items={insights.topArtilheiros.map((j, i) => ({
            rank: i + 1,
            nome: j.apelido ?? j.nome,
            sub: j.grupoNome,
            value: `${j.valor} gol${j.valor === 1 ? '' : 's'}`,
          }))}
        />
        <RankingCard
          title="Mais cartões"
          icon="🟨"
          empty="Nenhum cartão no período"
          items={insights.topCartoes.map((j, i) => ({
            rank: i + 1,
            nome: j.apelido ?? j.nome,
            sub: j.grupoNome,
            value: `🟨${j.amarelos} 🟥${j.vermelhos}`,
          }))}
        />
        <HighlightCard title="Time que mais venceu" icon={<Trophy className="h-5 w-5 text-warning" />}>
          {insights.timeMaisVenceu ? (
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor:
                    COR_HEX[(insights.timeMaisVenceu.cor as CorTime) ?? 'blue'] ?? '#3b82f6',
                }}
              />
              <div>
                <p className="font-display text-lg font-bold">{insights.timeMaisVenceu.nome}</p>
                <p className="text-xs text-muted">
                  {insights.timeMaisVenceu.vitorias}{' '}
                  {insights.timeMaisVenceu.vitorias === 1 ? 'vitória' : 'vitórias'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">Vitórias ainda não contabilizadas</p>
          )}
        </HighlightCard>
        <HighlightCard title="Mais presente" icon={<Users className="h-5 w-5 text-info" />}>
          {insights.maisPresente ? (
            <div>
              <p className="font-display text-lg font-bold">
                {insights.maisPresente.apelido ?? insights.maisPresente.nome}
              </p>
              <p className="text-xs text-muted">
                {insights.maisPresente.grupoNome} · {insights.maisPresente.valor}% confirmações
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted">Confirme presenças nas partidas</p>
          )}
        </HighlightCard>
      </div>

      {goleador ? (
        <div className="rounded-xl border border-success/30 bg-success-highlight/50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-success">Goleador da casa</p>
          <p className="font-display text-xl font-bold">
            {goleador.apelido ?? goleador.nome}{' '}
            <span className="text-base font-normal text-muted">· {goleador.grupoNome}</span>
          </p>
          <p className="text-sm text-muted">{goleador.valor} gols em partidas ao vivo e encerradas</p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <NavPanel
          href="/grupos"
          icon={<Users className="h-6 w-6" />}
          title="Meus grupos"
          description={`${data.grupos.length} grupo${data.grupos.length === 1 ? '' : 's'} ativos`}
        />
        <NavPanel
          href="/partidas?status=encerrada"
          icon={<TrendingUp className="h-6 w-6" />}
          title="Histórico de partidas"
          description={`${insights.partidasEncerradas} encerrada${insights.partidasEncerradas === 1 ? '' : 's'}`}
        />
      </div>

      {proximasPartidas.length > 1 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Outras próximas</h2>
            <Link href="/partidas?status=agendada" className="text-sm font-medium text-primary">
              Ver todas
            </Link>
          </div>
          <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {proximasPartidas.slice(1, 5).map((p) => (
              <li key={p.id} className="w-[280px] shrink-0">
                <PartidaCard partida={p} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.ultimasPartidas.length > 0 ? (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Últimos resultados</h2>
            <Link href="/partidas?status=encerrada" className="text-sm font-medium text-primary">
              Ver histórico
            </Link>
          </div>
          <ul className="space-y-2">
            {data.ultimasPartidas.map((p) => {
              return (
                <li key={p.id}>
                  <Link
                    href={`/partidas/${p.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 hover:bg-surface-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.grupo.nome}</p>
                      <p className="text-xs text-muted">{formatDataPartida(p.dataHora)}</p>
                    </div>
                    <ResultadoPartidaResumo times={p.times} />
                    <ChevronRight size={16} className="text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2">{icon}</div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="font-display text-3xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
    </div>
  );
}

function RankingCard({
  title,
  icon,
  empty,
  items,
}: {
  title: string;
  icon: string;
  empty: string;
  items: Array<{ rank: number; nome: string; sub: string; value: string }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
        <span aria-hidden>{icon}</span> {title}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-muted">{empty}</p>
      ) : (
        <ol className="space-y-2">
          {items.map((item) => (
            <li key={item.rank} className="flex items-center gap-2 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-offset text-xs font-bold">
                {item.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.nome}</p>
                <p className="truncate text-xs text-muted">{item.sub}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold tabular-nums">{item.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function HighlightCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
        {icon} {title}
      </p>
      {children}
    </div>
  );
}

function ResultadoPartidaResumo({
  times,
}: {
  times: DashboardSummary['ultimasPartidas'][number]['times'];
}) {
  if (times.length === 0) return null;

  if (times.length === 2) {
    const [t1, t2] = times;
    if (!t1 || !t2) return null;
    const cor1 = COR_HEX[(t1.cor as CorTime) ?? 'blue'] ?? '#3b82f6';
    const cor2 = COR_HEX[(t2.cor as CorTime) ?? 'blue'] ?? '#3b82f6';
    return (
      <div className="min-w-0 text-right">
        <p className="font-display text-lg font-semibold tabular-nums">
          {t1.gols} × {t2.gols}
        </p>
        <p className="truncate text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cor1 }} aria-hidden />
            {t1.nome}
          </span>{' '}
          ·{' '}
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cor2 }} aria-hidden />
            {t2.nome}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-1 text-right">
      {times.map((time) => {
        const cor = COR_HEX[(time.cor as CorTime) ?? 'blue'] ?? '#3b82f6';
        return (
          <p key={`${time.nome}-${time.cor}`} className="truncate text-xs">
            <span className="inline-flex items-center gap-1 text-muted">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cor }} aria-hidden />
              {time.nome}
            </span>{' '}
            <span className="font-display text-sm font-semibold tabular-nums text-foreground">
              {time.gols}
            </span>
          </p>
        );
      })}
    </div>
  );
}

function NavPanel({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-xl border border-border bg-gradient-to-br from-surface to-surface-2 p-4 transition-colors hover:border-primary/40"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-highlight text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display font-semibold">{title}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <ChevronRight className="shrink-0 text-muted" />
    </Link>
  );
}

function DashboardAlertas({ alertas }: { alertas: DashboardSummary['alertas'] }) {
  if (alertas.vaquinhasAbertas === 0 && alertas.bloqueadosVermelho === 0) return null;
  return (
    <div className="space-y-2">
      {alertas.vaquinhasAbertas > 0 ? (
        <Link
          href="/partidas?vaquinha=aberta"
          className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning-highlight px-3 py-2 text-sm"
        >
          💸 {alertas.vaquinhasAbertas} pagamento(s) em aberto
          <ChevronRight size={14} className="ml-auto" />
        </Link>
      ) : null}
      {alertas.bloqueadosVermelho > 0 ? (
        <Link
          href="/partidas?bloqueio=vermelho"
          className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-error-highlight px-3 py-2 text-sm"
        >
          🟥 {alertas.bloqueadosVermelho} cartão(ões) vermelho(s) no histórico
          <ChevronRight size={14} className="ml-auto" />
        </Link>
      ) : null}
    </div>
  );
}

