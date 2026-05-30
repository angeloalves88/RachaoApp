import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CadastroBoleiroClient } from './cadastro-boleiro-client';

export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function CadastroBoleiroPage({ params }: PageProps) {
  const { token } = await params;
  if (!token) notFound();

  let errorMsg: string | null = null;
  let grupoNome = '';
  let grupoFotoUrl: string | null = null;
  let podeCompletar = false;

  try {
    const res = await fetch(`${API_URL}/api/convites-boleiro/publico/${token}`, {
      cache: 'no-store',
    });
    if (res.status === 404) {
      errorMsg = 'Este link de convite não foi encontrado.';
    } else if (!res.ok) {
      errorMsg = 'Não foi possível carregar o convite.';
    } else {
      const data = (await res.json()) as {
        grupo: { nome: string; fotoUrl: string | null };
        expirado: boolean;
        concluido: boolean;
        podeCompletar: boolean;
      };
      grupoNome = data.grupo.nome;
      grupoFotoUrl = data.grupo.fotoUrl;
      podeCompletar = data.podeCompletar;
      if (data.concluido) errorMsg = 'Este cadastro já foi concluído.';
      else if (data.expirado) errorMsg = 'Este link expirou. Peça um novo convite ao presidente.';
    }
  } catch {
    errorMsg = 'Falha ao conectar com o servidor.';
  }

  return (
    <main className="container flex min-h-dvh flex-col items-center justify-center py-10">
      <div className="w-full max-w-md space-y-4">
        <Link href="/" className="block text-center text-sm font-medium text-primary">
          RachãoApp
        </Link>
        {errorMsg ? (
          <div className="rounded-lg border border-destructive/40 bg-error-highlight p-6 text-center">
            <p className="font-display text-xl font-bold text-destructive">Convite indisponível</p>
            <p className="mt-2 text-sm text-muted">{errorMsg}</p>
          </div>
        ) : podeCompletar ? (
          <CadastroBoleiroClient token={token} grupoNome={grupoNome} grupoFotoUrl={grupoFotoUrl} />
        ) : null}
      </div>
    </main>
  );
}
