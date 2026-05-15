import { notFound } from 'next/navigation';
import { apiFetchServerSafe } from '@/lib/api-server';
import type { EscalacaoGetResponse } from '@/lib/escalacao-actions';
import { EscalacaoClient } from './escalacao-client';

export const dynamic = 'force-dynamic';

export default async function EscalacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await apiFetchServerSafe<EscalacaoGetResponse>(`/api/partidas/${id}/escalacao`);
  if (!data) notFound();

  return <EscalacaoClient initial={data} />;
}
