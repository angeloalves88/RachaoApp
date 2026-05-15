import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDataPartida } from '@/lib/format';
import { COR_HEX } from '@/lib/escalacao-ui';
import { fetchPublicEscalacao } from '@/lib/public-escalacao';
import { CORES_TIME, type CorTime } from '@rachao/shared/zod';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchPublicEscalacao(id);
  if (!data) {
    return { title: 'Escalação · RachãoApp' };
  }
  const og = `${APP_URL}/api/og/escalacao/${id}?formato=quadrado`;
  return {
    title: `Escalação · ${data.partida.grupo.nome}`,
    description: `Escalação — ${formatDataPartida(data.partida.dataHora)}`,
    openGraph: {
      title: `Escalação · ${data.partida.grupo.nome}`,
      images: [{ url: og, width: 1080, height: 1080, alt: 'Escalação' }],
    },
  };
}

export default async function PublicEscalacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await fetchPublicEscalacao(id);
  if (!data) notFound();

  const local =
    data.partida.estadio ?? (data.partida.localLivre ? data.partida.localLivre : null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1b2d] to-[#0a1018] text-foreground">
      <main className="mx-auto max-w-lg px-4 py-8">
        <header className="mb-6 text-center">
          <p className="text-xs uppercase tracking-wider text-orange-400">RachãoApp</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">
            {data.partida.grupo.nome}
          </h1>
          <p className="mt-1 text-sm text-white/70">{formatDataPartida(data.partida.dataHora)}</p>
          {local ? <p className="text-sm text-white/60">{local}</p> : null}
        </header>

        <div className="space-y-4">
          {data.times.map((t) => {
            const cor: CorTime = CORES_TIME.includes(t.cor as CorTime)
              ? (t.cor as CorTime)
              : 'blue';
            return (
            <section
              key={t.id}
              className="overflow-hidden rounded-xl border border-white/10 bg-white/5"
              style={{ borderTopWidth: 4, borderTopColor: COR_HEX[cor] }}
            >
              <h2 className="border-b border-white/10 bg-black/20 px-4 py-2 font-display text-lg font-semibold text-white">
                {t.nome}
              </h2>
              <ul className="divide-y divide-white/10">
                {t.boleiros.map((b, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <Avatar name={b.nome} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{b.nome}</p>
                      {b.posicao ? (
                        <p className="text-xs text-white/50">{b.posicao}</p>
                      ) : null}
                    </div>
                    {b.capitao ? (
                      <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs text-orange-300">
                        Capitão
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
            );
          })}
        </div>

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
