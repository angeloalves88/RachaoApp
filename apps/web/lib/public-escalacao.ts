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
    }>;
  }>;
}

export async function fetchPublicEscalacao(
  partidaId: string,
): Promise<PublicEscalacaoResponse | null> {
  const res = await fetch(`${API_URL}/api/partidas/publico/${partidaId}/escalacao`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json() as Promise<PublicEscalacaoResponse>;
}
