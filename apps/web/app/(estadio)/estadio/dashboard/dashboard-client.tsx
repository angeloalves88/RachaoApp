'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Calendar, ChevronRight, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { responderSolicitacao, type DashboardEstadioResponse } from '@/lib/estadios-actions';
import { formatDataPartida } from '@/lib/format';
import { useRouter } from 'next/navigation';

interface Props {
  data: DashboardEstadioResponse;
}

export function DashboardClient({ data }: Props) {
  const router = useRouter();
  const [pendentes, setPendentes] = useState(data.pendentes.itens);
  const [isPending, startTransition] = useTransition();

  function responder(id: string, acao: 'aprovar' | 'recusar') {
    setPendentes((s) => s.filter((p) => p.id !== id));
    startTransition(async () => {
      try {
        await responderSolicitacao(id, { acao });
        toast.success(acao === 'aprovar' ? 'Partida aprovada' : 'Partida recusada');
        router.refresh();
      } catch {
        toast.error('Falha ao responder solicitação');
        router.refresh();
      }
    });
  }

  return (
    <div className="container space-y-5 py-5">
      <header>
        <h1 className="font-display text-2xl font-bold leading-tight">
          Olá, {data.estadio.nome}
        </h1>
        <p className="text-sm text-muted">
          {data.estadio.ativo
            ? 'Estádio ativo e visível para Presidentes.'
            : 'Estádio ainda não está visível — complete o cadastro.'}
        </p>
      </header>

      {/* Proximas partidas */}
      <section className="space-y-2">
        <header className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Próximas partidas</h2>
          <Link href="/estadio/agenda" className="text-sm font-medium text-primary">
            Ver agenda →
          </Link>
        </header>
        {data.proximas.length === 0 ? (
          <EmptyState
            variant="dashed"
            title="Nenhuma partida agendada"
            description="Quando Presidentes solicitarem horário e você aprovar, elas aparecerão aqui."
          />
        ) : (
          <div className="space-y-2">
            {data.proximas.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center gap-3 px-3 py-2.5">
                  <Calendar size={20} className="text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{formatDataPartida(p.dataHora)}</p>
                    <p className="truncate text-xs text-muted">
                      {p.grupo.nome} · {p.numTimes} times · {p.numTimes * (p.boleirosPorTime + p.reservasPorTime)} boleiros
                    </p>
                  </div>
                  <Badge variant="success">Aprovada</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Pendencias */}
      <section className="space-y-2">
        <header className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Pendências</h2>
          {data.pendentes.total > 0 ? (
            <Badge variant="warning">{data.pendentes.total} aguardando</Badge>
          ) : null}
        </header>
        {pendentes.length === 0 ? (
          <EmptyState
            variant="dashed"
            title="Nenhuma solicitação pendente"
            description="Nada aguardando aprovação no momento."
          />
        ) : (
          <div className="space-y-2">
            {pendentes.map((p) => (
              <Card key={p.id}>
                <CardContent className="space-y-2 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-warning" />
                    <p className="flex-1 text-sm font-medium">{p.partida.grupo.nome}</p>
                    <Badge variant="warning">Pendente</Badge>
                  </div>
                  <p className="text-xs text-muted">
                    {formatDataPartida(p.partida.dataHora)} · {p.partida.tempoTotal} min
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => responder(p.id, 'aprovar')}
                      disabled={isPending}
                      className="flex-1"
                    >
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => responder(p.id, 'recusar')}
                      disabled={isPending}
                      className="flex-1"
                    >
                      Recusar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Link
              href="/estadio/solicitacoes"
              className="block text-center text-sm font-medium text-primary"
            >
              Ver todas <ChevronRight size={14} className="inline" />
            </Link>
          </div>
        )}
      </section>

      {/* Stats */}
      <section>
        <h2 className="mb-2 font-display text-lg font-semibold">Resumo do mês</h2>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Partidas no mês" value={data.stats.partidasMes} hint="aprovadas" />
          <StatCard label="Grupos frequentadores" value={data.stats.gruposFrequentadores} />
          <StatCard
            label="Esta semana"
            value={`${data.stats.ocupadosSemana} / ${data.stats.slotsSemana}`}
            hint="horários"
          />
          <StatCard
            label="Taxa de ocupação"
            value={`${data.stats.taxaOcupacaoMensal}%`}
            hint="no mês"
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="px-3 py-2.5">
        <p className="text-xs text-muted">{label}</p>
        <p className="font-display text-xl font-bold leading-tight">{value}</p>
        {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
