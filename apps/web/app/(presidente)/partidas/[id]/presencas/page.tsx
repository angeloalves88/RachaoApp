import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { apiFetchServerSafe } from '@/lib/api-server';
import { formatDataPartida } from '@/lib/format';
import type { PartidaDetalhe } from '@/lib/types';
import { PresencasClient } from './presencas-client';

export const dynamic = 'force-dynamic';

export default async function PresencasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await apiFetchServerSafe<{ partida: PartidaDetalhe }>(
    `/api/partidas/${id}`,
  );
  if (!data) notFound();
  const partida = data.partida;

  return (
    <div className="space-y-4">
      <header className="border-b border-divider bg-surface">
        <div className="container flex items-center gap-3 py-4">
          <Link
            href={`/partidas/${partida.id}`}
            aria-label="Voltar para o detalhe da partida"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-foreground transition-colors hover:bg-surface-offset"
          >
            <ChevronLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold leading-tight">
              Lista de Presença
            </h1>
            <p className="truncate text-xs text-muted">
              {partida.grupo.nome} · {formatDataPartida(partida.dataHora)}
            </p>
          </div>
        </div>
      </header>

      <main className="container">
        <PresencasClient partida={partida} />
      </main>
    </div>
  );
}
