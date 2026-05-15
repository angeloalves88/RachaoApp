'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  responderSolicitacao,
  type SolicitacaoRow,
} from '@/lib/estadios-actions';
import { formatDataPartida } from '@/lib/format';
import { RecusarDialog } from './recusar-dialog';

type Tab = 'pendente' | 'aprovada' | 'recusada' | 'todas';

interface Props {
  initial: SolicitacaoRow[];
}

export function SolicitacoesClient({ initial }: Props) {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoRow[]>(initial);
  const [tab, setTab] = useState<Tab>('pendente');
  const [recusandoId, setRecusandoId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pendentesCount = solicitacoes.filter((s) => s.status === 'pendente').length;

  const filtradas = useMemo(() => {
    if (tab === 'todas') return solicitacoes;
    return solicitacoes.filter((s) => s.status === tab);
  }, [solicitacoes, tab]);

  function aprovar(id: string) {
    const item = solicitacoes.find((s) => s.id === id);
    if (item?.conflito) {
      if (
        !window.confirm(
          'Já existe uma partida aprovada neste horário. Deseja aprovar mesmo assim?',
        )
      ) {
        return;
      }
    }
    setSolicitacoes((s) =>
      s.map((x) => (x.id === id ? { ...x, status: 'aprovada' as const } : x)),
    );
    startTransition(async () => {
      try {
        await responderSolicitacao(id, { acao: 'aprovar' });
        toast.success('Partida aprovada');
      } catch {
        toast.error('Falha ao aprovar');
      }
    });
  }

  async function confirmarRecusa(id: string, motivo: string) {
    setSolicitacoes((s) =>
      s.map((x) =>
        x.id === id
          ? { ...x, status: 'recusada' as const, motivoResposta: motivo || null }
          : x,
      ),
    );
    setRecusandoId(null);
    startTransition(async () => {
      try {
        await responderSolicitacao(id, {
          acao: 'recusar',
          motivo: motivo.trim() || null,
        });
        toast.success('Partida recusada');
      } catch {
        toast.error('Falha ao recusar');
      }
    });
  }

  function cancelarAprovacao(id: string) {
    const motivo = window.prompt('Motivo do cancelamento (opcional):') ?? '';
    setSolicitacoes((s) =>
      s.map((x) => (x.id === id ? { ...x, status: 'cancelada' as const } : x)),
    );
    startTransition(async () => {
      try {
        await responderSolicitacao(id, {
          acao: 'cancelar',
          motivo: motivo.trim() || null,
        });
        toast.success('Aprovação cancelada');
      } catch {
        toast.error('Falha ao cancelar aprovação');
      }
    });
  }

  return (
    <div className="container space-y-4 py-5">
      <header>
        <h1 className="font-display text-2xl font-bold leading-tight">Solicitações</h1>
        <p className="text-xs text-muted">
          Aprove ou recuse partidas dos Presidentes que querem usar seu estádio.
        </p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="pendente">
            Pendentes{pendentesCount > 0 ? ` (${pendentesCount})` : ''}
          </TabsTrigger>
          <TabsTrigger value="aprovada">Aprovadas</TabsTrigger>
          <TabsTrigger value="recusada">Recusadas</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtradas.length === 0 ? (
        <Card>
          <CardContent className="px-4 py-6 text-center text-sm text-muted">
            {tab === 'pendente' ? (
              <>
                Nenhuma solicitação pendente. Verifique se seus{' '}
                <Link href="/estadio/perfil" className="text-primary">
                  horários disponíveis
                </Link>{' '}
                estão configurados.
              </>
            ) : (
              'Nada por aqui.'
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtradas.map((s) => (
            <SolicitacaoCard
              key={s.id}
              solicitacao={s}
              disabled={isPending}
              onAprovar={() => aprovar(s.id)}
              onRecusar={() => setRecusandoId(s.id)}
              onCancelar={() => cancelarAprovacao(s.id)}
            />
          ))}
        </div>
      )}

      <RecusarDialog
        open={!!recusandoId}
        onOpenChange={(v) => !v && setRecusandoId(null)}
        onConfirm={(motivo) => {
          if (recusandoId) confirmarRecusa(recusandoId, motivo);
        }}
      />
    </div>
  );
}

function SolicitacaoCard({
  solicitacao: s,
  disabled,
  onAprovar,
  onRecusar,
  onCancelar,
}: {
  solicitacao: SolicitacaoRow;
  disabled: boolean;
  onAprovar: () => void;
  onRecusar: () => void;
  onCancelar: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-2.5 px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{s.partida.grupo.nome}</p>
            <p className="text-xs text-muted">
              Presidente: {s.partida.grupo.presidente?.nome ?? '—'}
            </p>
          </div>
          <StatusBadge status={s.status} />
        </div>

        <div className="rounded-md border border-border bg-surface-2 px-3 py-2">
          <p className="text-sm font-medium">{formatDataPartida(s.partida.dataHora)}</p>
          <p className="text-xs text-muted">
            {s.partida.numTimes} times · {s.partida.numTimes * (s.partida.boleirosPorTime + s.partida.reservasPorTime)} boleiros · {s.partida.tempoTotal} min
          </p>
        </div>

        {s.partida.observacoes ? (
          <p className="rounded-md border border-info/30 bg-info-highlight px-3 py-2 text-xs text-info">
            {s.partida.observacoes}
          </p>
        ) : null}

        {s.status === 'pendente' && s.conflito ? (
          <p className="flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning-highlight px-3 py-2 text-xs text-warning">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            Conflito com outra partida aprovada no mesmo horário.
          </p>
        ) : null}

        {s.motivoResposta ? (
          <p className="rounded-md border border-border bg-surface px-3 py-2 text-xs">
            <span className="font-medium">Motivo:</span> {s.motivoResposta}
          </p>
        ) : null}

        {s.status === 'pendente' ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={onAprovar}
              disabled={disabled}
              className="flex-1"
            >
              <Check size={14} /> Aprovar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onRecusar}
              disabled={disabled}
              className="flex-1"
            >
              <X size={14} /> Recusar
            </Button>
          </div>
        ) : s.status === 'aprovada' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onCancelar}
            disabled={disabled}
            className="w-full"
          >
            Cancelar aprovação
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: SolicitacaoRow['status'] }) {
  if (status === 'aprovada') return <Badge variant="success">Aprovada</Badge>;
  if (status === 'pendente') return <Badge variant="warning">Pendente</Badge>;
  if (status === 'recusada') return <Badge variant="destructive">Recusada</Badge>;
  return <Badge variant="outline">Cancelada</Badge>;
}
