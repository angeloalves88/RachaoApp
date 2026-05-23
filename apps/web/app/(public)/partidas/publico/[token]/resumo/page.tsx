import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { LinkExpirado } from '@/components/public/link-expirado';
import { fetchPublicResumo } from '@/lib/public-resumo';
import { formatDataPartida } from '@/lib/format';
import { ResumoView } from '@/components/resumo/resumo-view';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const result = await fetchPublicResumo(token);
  if (result.status !== 'ok') {
    return { title: 'Resumo · RachãoApp' };
  }
  const og = `${APP_URL}/api/og/resumo/${token}?formato=retrato`;
  const usarPontos = (result.data.classificacao ?? []).some((r) => r.j > 0);
  const placar = result.data.times
    .map((t) =>
      usarPontos ? `${t.nome} ${t.pontosFinal ?? 0} pts` : `${t.nome} ${t.golsFinal}`,
    )
    .join(' · ');
  return {
    title: `Resumo · ${result.data.partida.grupo.nome}`,
    description: `${placar} — ${formatDataPartida(result.data.partida.dataHora)}`,
    openGraph: {
      title: `Resumo · ${result.data.partida.grupo.nome}`,
      description: placar,
      images: [{ url: og, width: 1080, height: 1920, alt: 'Resumo da partida' }],
    },
  };
}

export default async function PublicResumoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await fetchPublicResumo(token);
  if (result.status === 'expired') return <LinkExpirado />;
  if (result.status === 'not_found') notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1b2d] to-[#0a1018] text-foreground">
      <ResumoView data={result.data} isPublic />
    </div>
  );
}
