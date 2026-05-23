const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

export interface PublicEscalacaoResponse {
  partida: {
    id: string;
    dataHora: string;
    status: string;
    localLivre: string | null;
    estadio: string | null;
    numTimes: number;
    boleirosPorTime: number;
    grupo: { nome: string; fotoUrl: string | null };
  };
  times: Array<{
    id: string;
    nome: string;
    cor: string;
    boleiros: Array<{
      nome: string;
      apelido: string | null;
      posicao: string | null;
      capitao: boolean;
      isConvidado?: boolean;
    }>;
    reservas: Array<{
      nome: string;
      apelido: string | null;
      posicao: string | null;
      capitao: boolean;
      isConvidado?: boolean;
    }>;
  }>;
}

export type PublicFetchResult<T> = { status: 'ok'; data: T } | { status: 'expired' } | { status: 'not_found' };

export async function fetchPublicEscalacao(
  token: string,
): Promise<PublicFetchResult<PublicEscalacaoResponse>> {
  const res = await fetch(`${API_URL}/api/partidas/publico/${token}/escalacao`, {
    cache: 'no-store',
  });
  if (res.status === 410) return { status: 'expired' };
  if (!res.ok) return { status: 'not_found' };
  const data = (await res.json()) as PublicEscalacaoResponse;
  return { status: 'ok', data };
}
