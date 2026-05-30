'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { getGrupoFinanceiro } from '@/lib/grupos-actions';
import { updatePagamento } from '@/lib/vaquinha-actions';
import type {
  GrupoFinanceiroData,
  GrupoFinanceiroLinha,
  GrupoFinanceiroMensalidadeBoleiro,
} from '@/lib/types';

type Filtro = 'mensalidades' | 'porPartida' | 'convidados';

function mesReferenciaAtual(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date());
}

function shiftMes(mes: string, delta: number): string {
  const [y, m] = mes.split('-').map(Number);
  if (!y || !m) return mesReferenciaAtual();
  const d = new Date(y, m - 1 + delta, 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}`;
}

function labelMes(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  if (!y || !m) return mes;
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    new Date(y, m - 1, 1),
  );
}

export function GrupoFinanceiroTab({ grupoId }: { grupoId: string }) {
  const [data, setData] = useState<GrupoFinanceiroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('mensalidades');
  const [mesRef, setMesRef] = useState(mesReferenciaAtual);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getGrupoFinanceiro(grupoId, mesRef);
      setData(d);
    } catch {
      toast.error('Não foi possível carregar financeiro.');
    } finally {
      setLoading(false);
    }
  }, [grupoId, mesRef]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function togglePagamento(pagamentoId: string, statusAtual: string) {
    setUpdatingId(pagamentoId);
    try {
      await updatePagamento(pagamentoId, {
        status: statusAtual === 'pago' ? 'pendente' : 'pago',
      });
      toast.success(statusAtual === 'pago' ? 'Pagamento desmarcado.' : 'Pagamento confirmado.');
      void reload();
    } catch {
      toast.error('Não foi possível atualizar.');
    } finally {
      setUpdatingId(null);
    }
  }

  const totaisMes = useMemo(() => {
    if (!data?.mensalidadeMes) return { arrecadado: 0, pendente: 0, inadimplente: 0 };
    let arrecadado = 0;
    let pendente = 0;
    let inadimplente = 0;
    for (const b of data.mensalidadeMes.boleiros) {
      const v = b.valorCobrado ?? 0;
      if (b.status === 'pago') arrecadado += v;
      else if (b.status === 'inadimplente') inadimplente += v;
      else if (b.status === 'pendente') pendente += v;
    }
    return { arrecadado, pendente, inadimplente };
  }, [data]);

  if (loading || !data) {
    return (
      <section className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </section>
    );
  }

  const linhas =
    filtro === 'mensalidades'
      ? data.mensalidades
      : filtro === 'convidados'
        ? data.convidados
        : data.porPartida;

  const stats =
    filtro === 'mensalidades' && data.mensalidadeMes.temVaquinha ? totaisMes : data.totais;

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Arrecadado" value={stats.arrecadado} variant="success" />
        <StatCard label="Pendente" value={stats.pendente} variant="warning" />
        <StatCard label="Inadimplente" value={stats.inadimplente} variant="destructive" />
      </div>

      <Segmented<Filtro>
        value={filtro}
        onChange={setFiltro}
        options={[
          { value: 'mensalidades', label: 'Mensalidade' },
          { value: 'porPartida', label: 'Por partida' },
          { value: 'convidados', label: 'Convidados' },
        ]}
      />

      {filtro === 'mensalidades' ? (
        <MensalidadeMesView
          mes={data.mensalidadeMes}
          mesRef={mesRef}
          onPrev={() => setMesRef((m) => shiftMes(m, -1))}
          onNext={() => setMesRef((m) => shiftMes(m, 1))}
          onToggle={togglePagamento}
          updatingId={updatingId}
        />
      ) : linhas.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Nenhum pagamento nesta categoria.</p>
      ) : (
        <ul className="space-y-2">
          {linhas.map((l) => (
            <LinhaPagamento key={l.id} linha={l} onMarcarPago={(id) => togglePagamento(id, 'pendente')} />
          ))}
        </ul>
      )}
    </section>
  );
}

function MensalidadeMesView({
  mes,
  mesRef,
  onPrev,
  onNext,
  onToggle,
  updatingId,
}: {
  mes: GrupoFinanceiroData['mensalidadeMes'];
  mesRef: string;
  onPrev: () => void;
  onNext: () => void;
  onToggle: (pagamentoId: string, status: string) => void;
  updatingId: string | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
        <Button type="button" variant="ghost" size="sm" onClick={onPrev} aria-label="Mês anterior">
          <ChevronLeft size={18} />
        </Button>
        <div className="text-center">
          <p className="font-display text-base font-semibold capitalize">{labelMes(mesRef)}</p>
          {mes.valorMensal != null ? (
            <p className="text-xs text-muted">R$ {mes.valorMensal.toFixed(2)} / boleiro fixo</p>
          ) : null}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onNext} aria-label="Próximo mês">
          <ChevronRight size={18} />
        </Button>
      </div>

      {!mes.temVaquinha ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-2 px-4 py-8 text-center">
          <p className="text-sm font-medium">Nenhuma cobrança de mensalidade neste mês</p>
          <p className="mt-1 text-xs text-muted">
            Crie uma partida com tipo <strong>Mensalidade</strong> e vaquinha ativa neste mês para
            gerar as cobranças de todos os boleiros fixos.
          </p>
          <Button type="button" size="sm" className="mt-4" asChild>
            <Link href="/partidas/nova">Nova partida</Link>
          </Button>
        </div>
      ) : mes.boleiros.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Nenhum boleiro fixo ativo no grupo.</p>
      ) : (
        <ul className="divide-y divide-divider rounded-lg border border-border bg-surface">
          {mes.boleiros.map((b) => (
            <BoleiroMensalidadeRow
              key={b.boleiroId}
              boleiro={b}
              onToggle={onToggle}
              updating={updatingId === b.pagamentoId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function BoleiroMensalidadeRow({
  boleiro,
  onToggle,
  updating,
}: {
  boleiro: GrupoFinanceiroMensalidadeBoleiro;
  onToggle: (pagamentoId: string, status: string) => void;
  updating: boolean;
}) {
  const statusVariant =
    boleiro.status === 'pago'
      ? 'success'
      : boleiro.status === 'inadimplente'
        ? 'destructive'
        : boleiro.status === 'sem_cobranca'
          ? 'outline'
          : 'warning';

  const statusLabel =
    boleiro.status === 'pago'
      ? 'Pago'
      : boleiro.status === 'inadimplente'
        ? 'Inadimplente'
        : boleiro.status === 'sem_cobranca'
          ? 'Sem cobrança'
          : 'Pendente';

  const podeAlternar = boleiro.pagamentoId != null && boleiro.status !== 'sem_cobranca';

  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2.5">
      <Avatar name={boleiro.nome} src={boleiro.fotoUrl ?? undefined} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{boleiro.apelido ?? boleiro.nome}</p>
        {boleiro.valorCobrado != null ? (
          <p className="text-xs text-muted">R$ {boleiro.valorCobrado.toFixed(2)}</p>
        ) : null}
      </div>
      <Badge variant={statusVariant}>{statusLabel}</Badge>
      {podeAlternar ? (
        <Button
          type="button"
          size="sm"
          variant={boleiro.status === 'pago' ? 'outline' : 'default'}
          disabled={updating}
          onClick={() => onToggle(boleiro.pagamentoId!, boleiro.status)}
        >
          {boleiro.status === 'pago' ? 'Desmarcar' : 'Marcar pago'}
        </Button>
      ) : null}
    </li>
  );
}

function StatCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: 'success' | 'warning' | 'destructive';
}) {
  const colors = {
    success: 'border-success/30 bg-success-highlight',
    warning: 'border-warning/30 bg-warning-highlight',
    destructive: 'border-destructive/30 bg-error-highlight',
  };
  return (
    <div className={`rounded-lg border px-3 py-2 ${colors[variant]}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-lg font-semibold tabular-nums">R$ {value.toFixed(2)}</p>
    </div>
  );
}

function LinhaPagamento({
  linha,
  onMarcarPago,
}: {
  linha: GrupoFinanceiroLinha;
  onMarcarPago: (id: string) => void;
}) {
  const dataFmt = new Date(linha.partida.dataHora).toLocaleDateString('pt-BR');
  const statusVariant =
    linha.status === 'pago' ? 'success' : linha.status === 'inadimplente' ? 'destructive' : 'warning';

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{linha.pagador.nome}</p>
        <p className="text-xs text-muted">
          {dataFmt} · R$ {linha.valorCobrado.toFixed(2)} ·{' '}
          {linha.pagador.kind === 'convidado_avulso' ? 'Convidado' : 'Fixo'}
        </p>
      </div>
      <Badge variant={statusVariant}>{linha.status}</Badge>
      {linha.status !== 'pago' ? (
        <Button type="button" size="sm" onClick={() => onMarcarPago(linha.id)}>
          Marcar pago
        </Button>
      ) : null}
      <Button type="button" size="sm" variant="ghost" asChild>
        <Link href={`/partidas/${linha.partida.id}/vaquinha`}>Vaquinha</Link>
      </Button>
    </li>
  );
}
