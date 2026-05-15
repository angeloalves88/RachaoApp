'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { ResumoApi } from '@/lib/public-resumo';
import { ResumoView } from '@/components/resumo/resumo-view';
import { ShareResumoModal } from './share-modal';

export function ResumoClient({ data }: { data: ResumoApi }) {
  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="container flex flex-wrap items-center gap-3 pt-3">
        <Link
          href={`/partidas/${data.partida.id}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-2"
          aria-label="Voltar"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold">Resumo</h1>
          <p className="truncate text-sm text-muted">Partida encerrada</p>
        </div>
        <ShareResumoModal partidaId={data.partida.id} />
      </header>
      <ResumoView data={data} />
    </div>
  );
}
