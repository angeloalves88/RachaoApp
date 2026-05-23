const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

export interface ResumoTimeApi {
  id: string;
  nome: string;
  cor: string;
  golsFinal: number;
  pontosFinal: number;
}

export interface ResumoArtilheiroApi {
  boleiroId: string;
  nome: string;
  apelido: string | null;
  posicao: string | null;
  timeId: string | null;
  timeNome: string | null;
  timeCor: string | null;
  gols: number;
}

export interface ResumoEventoApi {
  id: string;
  tipo: string;
  minuto: number | null;
  criadoEm: string;
  timeId: string | null;
  timeNome: string | null;
  timeCor: string | null;
  boleiroId: string | null;
  boleiroNome: string | null;
  dadosExtras: unknown;
}

export interface ResumoEstatisticaApi {
  boleiroId: string;
  nome: string;
  apelido: string | null;
  timeId: string | null;
  timeNome: string | null;
  gols: number;
  amarelos: number;
  vermelhos: number;
  azuis: number;
}

export interface ClassificacaoResumoApi {
  timeId: string;
  nome: string;
  cor: string;
  j: number;
  v: number;
  e: number;
  d: number;
  pts: number;
  gp: number;
  gc: number;
  sg: number;
  amarelos: number;
  vermelhos: number;
  azuis: number;
}

export interface ResumoApi {
  partida: {
    id: string;
    dataHora: string;
    status: string;
    localLivre: string | null;
    estadio: string | null;
    numTimes: number;
    boleirosPorTime: number;
    grupo: { id?: string; nome: string; fotoUrl: string | null };
  };
  times: ResumoTimeApi[];
  artilharia: ResumoArtilheiroApi[];
  timeline: ResumoEventoApi[];
  estatisticas: ResumoEstatisticaApi[];
  totais: {
    totalGols: number;
    totalAmarelos: number;
    totalVermelhos: number;
    totalAzuis: number;
    totalSubs: number;
  };
  classificacao: ClassificacaoResumoApi[];
}

export type PublicFetchResult<T> = { status: 'ok'; data: T } | { status: 'expired' } | { status: 'not_found' };

export async function fetchPublicResumo(token: string): Promise<PublicFetchResult<ResumoApi>> {
  const res = await fetch(`${API_URL}/api/partidas/publico/${token}/resumo`, {
    cache: 'no-store',
  });
  if (res.status === 410) return { status: 'expired' };
  if (!res.ok) return { status: 'not_found' };
  const data = (await res.json()) as ResumoApi;
  return { status: 'ok', data };
}
