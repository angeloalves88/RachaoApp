import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { EscalacaoFieldView } from '@/components/escalacao/escalacao-field-view';
import { LinkExpirado } from '@/components/public/link-expirado';
import { formatDataPartida } from '@/lib/format';
import { fetchPublicEscalacao } from '@/lib/public-escalacao';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const result = await fetchPublicEscalacao(token);
  if (result.status !== 'ok') {
    return { title: 'Escalação · RachãoApp' };
  }
  const og = `${APP_URL}/api/og/escalacao/${token}?formato=horizontal`;
  return {
    title: `Escalação · ${result.data.partida.grupo.nome}`,
    description: `Escalação — ${formatDataPartida(result.data.partida.dataHora)}`,
    openGraph: {
      title: `Escalação · ${result.data.partida.grupo.nome}`,
      images: [{ url: og, width: 1920, height: 1080, alt: 'Escalação' }],
    },
  };
}

export default async function PublicEscalacaoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await fetchPublicEscalacao(token);
  if (result.status === 'expired') return <LinkExpirado />;
  if (result.status === 'not_found') notFound();
  const data = result.data;

  const local =
    data.partida.estadio ?? (data.partida.localLivre ? data.partida.localLivre : null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1b2d] to-[#0a1018] text-foreground">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 text-center">
          <p className="text-xs uppercase tracking-wider text-orange-400">RachãoApp</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white md:text-3xl">
            {data.partida.grupo.nome}
          </h1>
          <p className="mt-1 text-sm text-white/70">{formatDataPartida(data.partida.dataHora)}</p>
          {local ? <p className="text-sm text-white/60">{local}</p> : null}
          <p className="mt-2 text-xs uppercase tracking-wide text-white/40">Escalação</p>
        </header>

        <EscalacaoFieldView times={data.times} />

        <footer className="mt-10 flex flex-col items-center gap-3">
          <Button asChild className="w-full max-w-xs">
            <Link href="/login">Voltar para o RachãoApp</Link>
          </Button>
          <p className="text-center text-xs text-white/40">
            Link público — sem dados de contato dos boleiros.
          </p>
        </footer>
      </main>
    </div>
  );
}
