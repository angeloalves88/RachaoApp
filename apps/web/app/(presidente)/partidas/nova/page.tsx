import { redirect } from 'next/navigation';
import { apiFetchServer } from '@/lib/api-server';
import type { GrupoListItem } from '@/lib/types';
import { WizardPartidaClient } from './wizard-client';

export const dynamic = 'force-dynamic';

export default async function NovaPartidaPage({
  searchParams,
}: {
  searchParams: Promise<{ grupoId?: string; estadioId?: string }>;
}) {
  const params = await searchParams;
  const { grupos } = await apiFetchServer<{ grupos: GrupoListItem[] }>('/api/grupos?status=ativo');

  if (grupos.length === 0) {
    redirect('/grupos/novo');
  }

  // Default: query param > primeiro grupo
  const initialGrupoId =
    params.grupoId && grupos.some((g) => g.id === params.grupoId)
      ? params.grupoId
      : (grupos[0]?.id ?? '');

  return (
    <WizardPartidaClient
      gruposDisponiveis={grupos.map((g) => ({
        id: g.id,
        nome: g.nome,
        totalBoleiros: g.totalBoleiros,
        tipoCobrancaPadrao: g.tipoCobrancaPadrao,
      }))}
      initialGrupoId={initialGrupoId}
      initialEstadioId={params.estadioId ?? null}
    />
  );
}
