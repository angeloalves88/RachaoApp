'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api';
import type { CorTime, EscalacaoSaveInput, SorteioOptionsInput } from '@rachao/shared/zod';

async function token(): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sessão expirada');
  return data.session.access_token;
}

export interface EscalacaoElegivel {
  conviteId: string;
  /** ID do BoleiroGrupo quando tipo='fixo'; null para convidados avulsos. */
  boleiroGrupoId: string | null;
  tipo: string;
  bloqueado: boolean;
  nome: string;
  apelido: string | null;
  posicao: string | null;
}

export type PresencaStripEstado = 'ok' | 'nao' | 'neutro';

export interface EscalacaoBloqueado {
  conviteId: string;
  motivo: 'cartao_vermelho' | 'pagamento_pendente';
  detalhe?: string;
  nome: string;
  apelido: string | null;
  posicao: string | null;
}

export interface EscalacaoTimeRow {
  id: string;
  nome: string;
  cor: string;
  conviteIds: string[];
  conviteIdsReservas: string[];
  capitaoConviteId: string | null;
  boleiros: Array<{
    conviteId: string | null;
    /** ID estável do boleiro (BoleiroGrupo.id ou ConvidadoAvulso.id), usado em eventos. */
    boleiroId: string | null;
    nome: string;
    apelido: string | null;
    posicao: string | null;
    capitao: boolean;
    reserva: boolean;
  }>;
}

export interface EscalacaoPartidaPayload {
  id: string;
  dataHora: string;
  status: string;
  localLivre: string | null;
  estadio: { nome: string } | null;
  numTimes: number;
  boleirosPorTime: number;
  reservasPorTime: number;
  tempoPartida?: number;
  tempoTotal?: number;
  regras?: unknown;
  grupo: { id: string; nome: string; fotoUrl: string | null };
}

export interface EscalacaoGetResponse {
  partida: EscalacaoPartidaPayload;
  elegiveis: EscalacaoElegivel[];
  bloqueados: EscalacaoBloqueado[];
  times: EscalacaoTimeRow[];
  /** Datas das ultimas (ate) 5 partidas encerradas do grupo. */
  ultimasPartidas: Array<{ partidaId: string; dataHora: string }>;
  /** Mapa boleiroGrupoId -> presenca em cada uma das ultimas 5 partidas. */
  presencaUltimos5: Record<string, PresencaStripEstado[]>;
  readOnly: boolean;
}

export async function getEscalacao(partidaId: string) {
  return apiFetch<EscalacaoGetResponse>(`/api/partidas/${partidaId}/escalacao`, {
    token: await token(),
  });
}

export async function sortearEscalacao(partidaId: string, body: SorteioOptionsInput) {
  return apiFetch<{
    times: Array<{
      nome: string;
      cor: CorTime;
      conviteIds: string[];
      conviteIdsReservas: string[];
      capitaoConviteId: null;
    }>;
    seedUsado: string;
    /** Boleiros confirmados que ficaram fora do sorteio por excederem a capacidade. */
    excedentes: number;
  }>(`/api/partidas/${partidaId}/escalacao/sortear`, {
    method: 'POST',
    token: await token(),
    body,
  });
}

export async function saveEscalacao(partidaId: string, body: EscalacaoSaveInput) {
  return apiFetch<{ ok: true }>(`/api/partidas/${partidaId}/escalacao`, {
    method: 'PUT',
    token: await token(),
    body,
  });
}
