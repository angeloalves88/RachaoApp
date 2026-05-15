import { notFound } from 'next/navigation';
import { apiFetchServerSafe } from '@/lib/api-server';
import { VaquinhaClient } from './vaquinha-client';
import type { VaquinhaResponse } from '@/lib/vaquinha-actions';

export const dynamic = 'force-dynamic';

export default async function VaquinhaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await apiFetchServerSafe<VaquinhaResponse>(`/api/partidas/${id}/vaquinha`);
  if (!data) notFound();

  return <VaquinhaClient initial={data} partidaId={id} />;
}
