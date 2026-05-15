import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchPublicResumo } from '@/lib/public-resumo';
import { formatDataPartida } from '@/lib/format';
import { ResumoView } from '@/components/resumo/resumo-view';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchPublicResumo(id);
  if (!data) {
    return { title: 'Resumo · RachãoApp' };
  }
  const og = `${APP_URL}/api/og/resumo/${id}?formato=quadrado`;
  const placar = data.times.map((t) => `${t.nome} ${t.golsFinal}`).join(' × ');
  return {
    title: `Resumo · ${data.partida.grupo.nome}`,
    description: `${placar} — ${formatDataPartida(data.partida.dataHora)}`,
    openGraph: {
      title: `Resumo · ${data.partida.grupo.nome}`,
      description: placar,
      images: [{ url: og, width: 1080, height: 1080, alt: 'Resumo da partida' }],
    },
  };
}

export default async function PublicResumoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await fetchPublicResumo(id);
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1b2d] to-[#0a1018] text-foreground">
      <ResumoView data={data} isPublic />
    </div>
  );
}
