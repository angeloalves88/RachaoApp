'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ExternalLink, Mail, MessageCircle, Pencil } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { FichaFinanceiroBloco } from '@/components/boleiros/ficha-financeiro-bloco';
import { getBoleiro } from '@/lib/grupos-actions';
import type { BoleiroFicha, BoleiroListItem } from '@/lib/types';
import { formatCelular } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grupoId: string;
  boleiroId: string | null;
  onEdit: (b: BoleiroListItem) => void;
}

export function BoleiroFichaSheet({ open, onOpenChange, grupoId, boleiroId, onEdit }: Props) {
  const [data, setData] = useState<BoleiroFicha | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !boleiroId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getBoleiro(grupoId, boleiroId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, boleiroId, grupoId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="sr-only">Ficha do boleiro</DialogTitle>
        </DialogHeader>

        {loading || !data ? (
          <FichaSkeleton />
        ) : (
          <div className="space-y-5">
            <FichaHeader data={data} onEdit={() => onEdit(data.boleiro)} />
            <Button asChild variant="outline" className="w-full">
              <Link href={`/grupos/${grupoId}/boleiros/${data.boleiro.id}`}>
                <ExternalLink size={14} /> Abrir ficha completa
              </Link>
            </Button>
            <FichaAlertas data={data} />
            <FichaStats stats={data.stats} />
            <section className="space-y-3">
              <h3 className="font-display text-base font-semibold">Financeiro</h3>
              <FichaFinanceiroBloco grupoId={grupoId} boleiroId={data.boleiro.id} />
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FichaSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function FichaHeader({ data, onEdit }: { data: BoleiroFicha; onEdit: () => void }) {
  const b = data.boleiro;
  const celularLimpo = /^\d{11}$/.test(b.celular) ? b.celular : null;

  return (
    <header className="flex items-start gap-4">
      <Avatar name={b.nome} size="xl" />
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-2xl font-bold leading-tight">{b.nome}</h2>
        {b.apelido ? (
          <p className="text-sm italic text-muted">&ldquo;{b.apelido}&rdquo;</p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {b.posicao ? <Badge variant="primarySoft">{b.posicao}</Badge> : null}
          {b.status === 'arquivado' ? <Badge variant="outline">Arquivado</Badge> : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          {celularLimpo ? (
            <a
              href={`https://wa.me/55${celularLimpo}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-success transition-colors hover:underline"
            >
              <MessageCircle size={14} aria-hidden /> {formatCelular(celularLimpo)}
            </a>
          ) : null}
          {b.email ? (
            <a
              href={`mailto:${b.email}`}
              className="inline-flex items-center gap-1 text-info transition-colors hover:underline"
            >
              <Mail size={14} aria-hidden /> {b.email}
            </a>
          ) : null}
        </div>
      </div>
      <Button variant="outline" size="icon" onClick={onEdit} aria-label="Editar boleiro">
        <Pencil size={16} />
      </Button>
    </header>
  );
}

function FichaAlertas({ data }: { data: BoleiroFicha }) {
  if (data.stats.pagamentosAbertos === 0) return null;
  return (
    <div className="rounded-lg border border-warning/40 bg-warning-highlight p-3 text-sm">
      <p className="font-medium text-warning">💸 Inadimplente</p>
      <p className="text-muted">
        {data.stats.pagamentosAbertos}{' '}
        {data.stats.pagamentosAbertos === 1 ? 'pagamento em aberto' : 'pagamentos em aberto'}.
      </p>
    </div>
  );
}

function FichaStats({ stats }: { stats: BoleiroFicha['stats'] }) {
  const items = [
    { icon: '⚽', label: 'Partidas', value: stats.partidasJogadas },
    { icon: '🥅', label: 'Gols', value: stats.gols },
    { icon: '🟨', label: 'Amarelos', value: stats.cartoesAmarelos },
    { icon: '🟥', label: 'Vermelhos', value: stats.cartoesVermelhos },
  ];
  return (
    <ul className="grid grid-cols-2 gap-2">
      {items.map((it) => (
        <li
          key={it.label}
          className="rounded-lg border border-border bg-surface-offset/50 p-3 text-center"
        >
          <p aria-hidden className="text-xl">
            {it.icon}
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{it.value}</p>
          <p className="text-xs text-muted">{it.label}</p>
        </li>
      ))}
    </ul>
  );
}

