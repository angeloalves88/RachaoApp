import { notFound, redirect } from 'next/navigation';
import { apiFetchServerSafe } from '@/lib/api-server';
import type { EscalacaoGetResponse } from '@/lib/escalacao-actions';
import type { PartidaDetalhe } from '@/lib/types';
import { AoVivoClient } from './ao-vivo-client';
import type { EventoApi } from '@/lib/aovivo-actions';

export const dynamic = 'force-dynamic';

export default async function AoVivoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [detalhe, escalacao, eventos] = await Promise.all([
    apiFetchServerSafe<{ partida: PartidaDetalhe }>(`/api/partidas/${id}`),
    apiFetchServerSafe<EscalacaoGetResponse>(`/api/partidas/${id}/escalacao`),
    apiFetchServerSafe<{ eventos: EventoApi[] }>(`/api/partidas/${id}/eventos`),
  ]);

  if (!detalhe) notFound();
  const partida = detalhe.partida;

  if (partida.status === 'encerrada') {
    redirect(`/partidas/${id}/resumo`);
  }
  if (partida.status === 'cancelada') {
    redirect(`/partidas/${id}`);
  }

  return (
    <AoVivoClient
      partida={partida}
      escalacao={escalacao}
      eventosIniciais={eventos?.eventos ?? []}
    />
  );
}
