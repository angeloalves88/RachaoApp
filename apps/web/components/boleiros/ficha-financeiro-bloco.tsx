'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getBoleiroFinanceiro } from '@/lib/grupos-actions';
import type { BoleiroFinanceiroLinha } from '@/lib/types';

interface Props {
  grupoId: string;
  boleiroId: string;
}

export function FichaFinanceiroBloco({ grupoId, boleiroId }: Props) {
  const [loading, setLoading] = useState(true);
  const [porPartida, setPorPartida] = useState<BoleiroFinanceiroLinha[]>([]);
  const [mensalidades, setMensalidades] = useState<BoleiroFinanceiroLinha[]>([]);
  const [tab, setTab] = useState<'partida' | 'mensalidade'>('partida');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBoleiroFinanceiro(grupoId, boleiroId)
      .then((res) => {
        if (cancelled) return;
        setPorPartida(res.porPartida);
        setMensalidades(res.mensalidades);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [grupoId, boleiroId]);

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as 'partida' | 'mensalidade')}>
      <TabsList>
        <TabsTrigger value="partida">Por partida</TabsTrigger>
        <TabsTrigger value="mensalidade">Mensalidades</TabsTrigger>
      </TabsList>
      <TabsContent value="partida">
        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : porPartida.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-surface px-3 py-4 text-center text-xs text-muted">
            Nenhuma cobrança por partida ainda.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {porPartida.map((l) => (
              <LinhaFinanceira key={l.id} linha={l} variant="partida" />
            ))}
          </ul>
        )}
      </TabsContent>
      <TabsContent value="mensalidade">
        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : mensalidades.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-surface px-3 py-4 text-center text-xs text-muted">
            Nenhuma mensalidade registrada.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {mensalidades.map((l) => (
              <LinhaFinanceira key={l.id} linha={l} variant="mensalidade" />
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}

function LinhaFinanceira({
  linha,
  variant,
}: {
  linha: BoleiroFinanceiroLinha;
  variant: 'partida' | 'mensalidade';
}) {
  const valor = `R$ ${linha.valorCobrado.toFixed(2).replace('.', ',')}`;
  const data = new Date(linha.partida.dataHora);
  const dataFmt = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(data);

  const statusBadge =
    linha.status === 'pago' ? (
      <Badge variant="success">Pago</Badge>
    ) : linha.status === 'inadimplente' ? (
      <Badge variant="destructive">Inadimplente</Badge>
    ) : (
      <Badge variant="warning">Pendente</Badge>
    );

  return (
    <li className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate text-xs text-muted">
          {variant === 'mensalidade' ? (linha.mesReferencia ?? 'Mês —') : dataFmt}
        </p>
        <p className="truncate font-medium">{valor}</p>
      </div>
      {statusBadge}
    </li>
  );
}
