import { notFound } from 'next/navigation';
import { apiFetchServerSafe } from '@/lib/api-server';
import type { ResumoApi } from '@/lib/public-resumo';
import { ResumoClient } from './resumo-client';

export const dynamic = 'force-dynamic';

export default async function ResumoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await apiFetchServerSafe<ResumoApi>(`/api/partidas/${id}/resumo`);
  if (!data) notFound();
  return <ResumoClient data={data} />;
}
