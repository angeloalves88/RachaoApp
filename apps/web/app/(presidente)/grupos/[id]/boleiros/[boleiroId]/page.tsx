import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { apiFetchServerSafe } from '@/lib/api-server';
import type { BoleiroFicha, GrupoDetalhe } from '@/lib/types';
import { FichaBoleiroClient } from './ficha-client';

export const dynamic = 'force-dynamic';

export default async function FichaBoleiroPage({
  params,
}: {
  params: Promise<{ id: string; boleiroId: string }>;
}) {
  const { id, boleiroId } = await params;

  const [ficha, grupoData] = await Promise.all([
    apiFetchServerSafe<BoleiroFicha>(`/api/grupos/${id}/boleiros/${boleiroId}`),
    apiFetchServerSafe<{ grupo: GrupoDetalhe }>(`/api/grupos/${id}`),
  ]);
  if (!ficha || !grupoData) notFound();

  return (
    <div className="container space-y-4 pb-6 pt-4">
      <header className="flex items-center gap-2">
        <Link
          href={`/grupos/${id}`}
          aria-label="Voltar para o grupo"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface text-foreground hover:bg-surface-offset"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">{grupoData.grupo.nome}</p>
          <p className="font-display text-lg font-semibold leading-tight">
            Ficha do boleiro
          </p>
        </div>
      </header>

      <FichaBoleiroClient grupoId={id} initial={ficha} />
    </div>
  );
}
