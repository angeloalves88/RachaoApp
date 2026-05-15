import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ConfirmarClient } from './confirmar-client';

export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

interface ConvitePublicoResponse {
  convite: {
    id: string;
    status: 'pendente' | 'confirmado' | 'recusado' | 'lista_espera';
    recado: string | null;
    confirmadoEm: string | null;
    tipo: string;
  };
  partida: {
    id: string;
    dataHora: string;
    dataFormatada: string;
    status: string;
    local: string | null;
    numTimes: number;
    boleirosPorTime: number;
    tempoTotal: number;
  };
  grupo: { id: string; nome: string; fotoUrl: string | null };
  boleiro: { nome: string; apelido: string | null };
  expirado: boolean;
  partidaCancelada: boolean;
  podeResponder: boolean;
}

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ConfirmarPresencaPage({ params }: PageProps) {
  const { token } = await params;
  if (!token) notFound();

  let data: ConvitePublicoResponse | null = null;
  let errorMsg: string | null = null;

  try {
    const res = await fetch(`${API_URL}/api/convites/publico/${token}`, {
      cache: 'no-store',
    });
    if (res.status === 404) {
      errorMsg = 'Este link de convite nao foi encontrado ou ja foi removido.';
    } else if (!res.ok) {
      errorMsg = 'Nao foi possivel carregar o convite. Tente novamente em instantes.';
    } else {
      data = (await res.json()) as ConvitePublicoResponse;
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
          <ErrorCard message={errorMsg} />
        ) : data ? (
          <ConfirmarClient token={token} initialData={data} />
        ) : null}
      </div>
    </main>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-error-highlight p-6 text-center">
      <p className="font-display text-xl font-bold text-destructive">Convite indisponivel</p>
      <p className="mt-2 text-sm text-muted">{message}</p>
    </div>
  );
}
