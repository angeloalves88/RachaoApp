'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { EscalacaoGetResponse } from '@/lib/escalacao-actions';
import { motivoBloqueioLabel } from '@/lib/escalacao-ui';
import { formatDataPartida } from '@/lib/format';
import { Avatar } from '@/components/ui/avatar';
import { AutoMode } from './auto-mode';
import { ManualMode } from './manual-mode';
import { ShareModal } from './share-modal';

interface Props {
  initial: EscalacaoGetResponse;
}

export function EscalacaoClient({ initial }: Props) {
  const router = useRouter();
  const [bloqueiosOpen, setBloqueiosOpen] = useState(false);

  const { partida, bloqueados, readOnly } = initial;
  const hasEscalacao = initial.times.some((t) => t.conviteIds.length > 0);

  return (
    <div className="space-y-4 pb-8">
      <header className="container flex flex-wrap items-center gap-3 pt-2">
        <Link
          href={`/partidas/${partida.id}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-2"
          aria-label="Voltar"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold">Escalação</h1>
          <p className="truncate text-sm text-muted">
            {partida.grupo.nome} · {formatDataPartida(partida.dataHora)}
          </p>
        </div>
        <ShareModal partidaId={partida.id} disabled={!hasEscalacao || partida.status === 'cancelada'} />
      </header>

      {bloqueados.length > 0 ? (
        <div className="container">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-error-highlight px-3 py-2 text-sm text-destructive">
            <p>
              <span className="font-semibold">{bloqueados.length}</span> boleiro(s) bloqueado(s) e
              excluído(s) da escalação
            </p>
            <Dialog open={bloqueiosOpen} onOpenChange={setBloqueiosOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="border-destructive/50">
                  Ver motivos
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bloqueios</DialogTitle>
                </DialogHeader>
                <ul className="max-h-[60vh] space-y-3 overflow-y-auto">
                  {bloqueados.map((b) => (
                    <li
                      key={b.conviteId}
                      className="flex items-start gap-3 rounded-lg border border-border bg-surface-2 p-3"
                    >
                      <Avatar name={b.nome} size="md" />
                      <div>
                        <p className="font-medium">{b.nome}</p>
                        <p className="text-sm text-muted">{motivoBloqueioLabel(b.motivo)}</p>
                        {b.detalhe ? <p className="text-xs text-muted">{b.detalhe}</p> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ) : null}

      <div className="container">
        <Tabs defaultValue="auto">
          <TabsList>
            <TabsTrigger value="auto">Automático</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>
          <TabsContent value="auto">
            <AutoMode
              partidaId={partida.id}
              numTimes={partida.numTimes}
              boleirosPorTime={partida.boleirosPorTime}
              reservasPorTime={partida.reservasPorTime ?? 0}
              readOnly={readOnly}
              initialTimes={initial.times}
              elegiveis={initial.elegiveis}
              presencaPorBoleiro={initial.presencaUltimos5}
              onSaved={() => router.refresh()}
            />
          </TabsContent>
          <TabsContent value="manual">
            <ManualMode
              partidaId={partida.id}
              numTimes={partida.numTimes}
              boleirosPorTime={partida.boleirosPorTime}
              reservasPorTime={partida.reservasPorTime ?? 0}
              readOnly={readOnly}
              initialTimes={initial.times}
              elegiveis={initial.elegiveis}
              presencaPorBoleiro={initial.presencaUltimos5}
              onSaved={() => router.refresh()}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
