import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Fab } from '@/components/layout/fab';
import { GruposClient } from './grupos-client';
import { apiFetchServer } from '@/lib/api-server';
import type { GrupoListItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function GruposPage() {
  // Server fetch inicial — o cliente refetch ao filtrar.
  const { grupos } = await apiFetchServer<{ grupos: GrupoListItem[] }>(
    '/api/grupos?status=todos',
  );

  return (
    <div className="container space-y-5 py-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight">Meus Grupos</h1>
          <p className="text-sm text-muted">
            {grupos.length} {grupos.length === 1 ? 'grupo' : 'grupos'} no total
          </p>
        </div>
        <Link href="/grupos/novo" className="hidden md:block">
          <Button>
            <Plus size={16} /> Novo grupo
          </Button>
        </Link>
      </header>

      <GruposClient initial={grupos} />

      <Fab href="/grupos/novo" label="Novo grupo" />
    </div>
  );
}
