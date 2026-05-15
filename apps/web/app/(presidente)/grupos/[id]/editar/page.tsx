import { notFound } from 'next/navigation';
import { GrupoFormRouteShell } from '@/components/grupos/grupo-form-route-shell';
import { apiFetchServerSafe } from '@/lib/api-server';
import type { GrupoDetalhe } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function EditarGrupoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await apiFetchServerSafe<{ grupo: GrupoDetalhe }>(`/api/grupos/${id}`);
  if (!data) notFound();

  return <GrupoFormRouteShell grupo={data.grupo} />;
}
