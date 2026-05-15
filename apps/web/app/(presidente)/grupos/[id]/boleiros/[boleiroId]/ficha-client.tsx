'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, MessageCircle, Pencil } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BoleiroFormDialog } from '@/components/boleiros/boleiro-form-dialog';
import { FichaFinanceiroBloco } from '@/components/boleiros/ficha-financeiro-bloco';
import type { BoleiroFicha, BoleiroListItem } from '@/lib/types';
import { formatCelular } from '@/lib/utils';

interface Props {
  grupoId: string;
  initial: BoleiroFicha;
}

export function FichaBoleiroClient({ grupoId, initial }: Props) {
  const router = useRouter();
  const [data, setData] = useState<BoleiroFicha>(initial);
  const [editOpen, setEditOpen] = useState(false);

  function handleSaved(b: BoleiroListItem) {
    setData((prev) => ({ ...prev, boleiro: b }));
    router.refresh();
  }

  function handleArchived(id: string) {
    if (id !== data.boleiro.id) return;
    setData((prev) => ({
      ...prev,
      boleiro: { ...prev.boleiro, status: 'arquivado' },
    }));
    router.refresh();
  }

  const b = data.boleiro;
  const celularLimpo = /^\d{11}$/.test(b.celular) ? b.celular : null;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-start gap-4">
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
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {celularLimpo ? (
                <a
                  href={`https://wa.me/55${celularLimpo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-success hover:underline"
                >
                  <MessageCircle size={14} aria-hidden /> {formatCelular(celularLimpo)}
                </a>
              ) : null}
              {b.email ? (
                <a
                  href={`mailto:${b.email}`}
                  className="inline-flex items-center gap-1 text-info hover:underline"
                >
                  <Mail size={14} aria-hidden /> {b.email}
                </a>
              ) : null}
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Editar boleiro"
            onClick={() => setEditOpen(true)}
          >
            <Pencil size={16} />
          </Button>
        </div>
      </section>

      {data.stats.pagamentosAbertos > 0 ? (
        <div className="rounded-lg border border-warning/40 bg-warning-highlight p-3 text-sm">
          <p className="font-medium text-warning">Inadimplente</p>
          <p className="text-muted">
            {data.stats.pagamentosAbertos}{' '}
            {data.stats.pagamentosAbertos === 1 ? 'pagamento em aberto' : 'pagamentos em aberto'}.
          </p>
        </div>
      ) : null}

      <Tabs defaultValue="estatisticas">
        <TabsList>
          <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>
        <TabsContent value="estatisticas">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile icon="⚽" label="Partidas" value={data.stats.partidasJogadas} />
            <StatTile icon="🥅" label="Gols" value={data.stats.gols} />
            <StatTile icon="🟨" label="Amarelos" value={data.stats.cartoesAmarelos} />
            <StatTile icon="🟥" label="Vermelhos" value={data.stats.cartoesVermelhos} />
          </ul>
        </TabsContent>
        <TabsContent value="financeiro">
          <FichaFinanceiroBloco grupoId={grupoId} boleiroId={b.id} />
        </TabsContent>
      </Tabs>

      <BoleiroFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        grupoId={grupoId}
        boleiro={b}
        onSaved={handleSaved}
        onArchived={handleArchived}
      />
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <li className="rounded-lg border border-border bg-surface p-3 text-center">
      <p aria-hidden className="text-xl">
        {icon}
      </p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </li>
  );
}
