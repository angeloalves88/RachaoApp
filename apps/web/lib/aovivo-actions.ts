'use client';

import { apiFetch } from '@/lib/api';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { EventoCreateInput, EventoUpdateInput } from '@rachao/shared/zod';

async function token(): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sessão expirada');
  return data.session.access_token;
}

export async function getToken(): Promise<string> {
  return token();
}

export interface EventoApi {
  id: string;
  tipo: string;
  minuto: number | null;
  timeId: string | null;
  timeNome: string | null;
  timeCor: string | null;
  boleiroId: string | null;
  boleiroNome: string | null;
  dadosExtras: Record<string, unknown> | null;
  criadoEm: string;
}

export async function listarEventos(partidaId: string) {
  return apiFetch<{ eventos: EventoApi[] }>(`/api/partidas/${partidaId}/eventos`, {
    token: await token(),
  });
}

export async function criarEvento(partidaId: string, input: EventoCreateInput) {
  return apiFetch<{ evento: EventoApi; idempotent: boolean }>(
    `/api/partidas/${partidaId}/eventos`,
    {
      method: 'POST',
      token: await token(),
      body: input,
    },
  );
}

export async function editarEvento(
  partidaId: string,
  eventoId: string,
  input: EventoUpdateInput,
) {
  return apiFetch<{ evento: EventoApi }>(
    `/api/partidas/${partidaId}/eventos/${eventoId}`,
    {
      method: 'PATCH',
      token: await token(),
      body: input,
    },
  );
}

export async function removerEvento(partidaId: string, eventoId: string) {
  return apiFetch<{ ok: true }>(`/api/partidas/${partidaId}/eventos/${eventoId}`, {
    method: 'DELETE',
    token: await token(),
  });
}

/** Remove todos os eventos do sub-jogo (apos gravar resultado na classificacao). */
export async function limparEventosDoJogo(partidaId: string, jogo: number) {
  return apiFetch<{ ok: true; removidos: number }>(
    `/api/partidas/${partidaId}/eventos?jogo=${jogo}`,
    {
      method: 'DELETE',
      token: await token(),
    },
  );
}

export async function iniciarPartida(partidaId: string) {
  return apiFetch<{ ok: true; partida: { id: string; status: string } }>(
    `/api/partidas/${partidaId}/iniciar`,
    {
      method: 'POST',
      token: await token(),
      body: {},
    },
  );
}

export async function encerrarPartida(partidaId: string) {
  return apiFetch<{ ok: true; partida: { id: string; status: string } }>(
    `/api/partidas/${partidaId}/encerrar`,
    {
      method: 'POST',
      token: await token(),
      body: {},
    },
  );
}

export interface AoVivoEstadoResultado {
  jogo: number;
  timeAId: string;
  timeBId: string;
  golsA: number;
  golsB: number;
}

export interface EstatisticasTimePersist {
  amarelos: number;
  vermelhos: number;
  azuis: number;
}

export interface ArtilheiroPersist {
  boleiroId: string;
  boleiroNome: string;
  timeId: string;
  gols: number;
}

export interface AoVivoEstado {
  jogoAtual?: number;
  confronto?: { timeAId: string; timeBId: string } | null;
  jogoFinalizado?: boolean;
  resultados?: AoVivoEstadoResultado[];
  /** Cartões acumulados por time (persistido ao finalizar cada sub-jogo). */
  estatisticasTimes?: Record<string, EstatisticasTimePersist>;
  /** Artilharia acumulada (persistida ao finalizar cada sub-jogo). */
  artilharia?: ArtilheiroPersist[];
}

export async function getAoVivoEstado(partidaId: string) {
  return apiFetch<{ aoVivoEstado: AoVivoEstado; numPartidas: number }>(
    `/api/partidas/${partidaId}/ao-vivo-estado`,
    { token: await token() },
  );
}

export async function patchAoVivoEstado(
  partidaId: string,
  body: {
    jogoAtual?: number;
    confronto?: { timeAId: string; timeBId: string } | null;
    jogoFinalizado?: boolean;
    resultados?: AoVivoEstadoResultado[];
    estatisticasTimes?: Record<string, EstatisticasTimePersist>;
    artilharia?: ArtilheiroPersist[];
  },
) {
  return apiFetch<{ ok: true; aoVivoEstado: AoVivoEstado }>(
    `/api/partidas/${partidaId}/ao-vivo-estado`,
    {
      method: 'PATCH',
      token: await token(),
      body,
    },
  );
}

export interface CronometroApiState {
  status: 'parado' | 'rodando' | 'pausado';
  iniciadoEm: string | null;
  segundosAcumulados: number;
  jogoAtual: number;
  tempoPartidaSeg: number;
  segundosAtuais: number;
}

export async function getCronometro(partidaId: string) {
  return apiFetch<CronometroApiState>(`/api/partidas/${partidaId}/cronometro`, {
    token: await token(),
  });
}

export async function postCronometro(
  partidaId: string,
  body: {
    acao: 'iniciar' | 'pausar' | 'retomar' | 'ajustar' | 'zerar' | 'proximo_jogo';
    segundos?: number;
    jogoAtual?: number;
    clientId: string;
  },
) {
  return apiFetch<CronometroApiState & { idempotent?: boolean }>(
    `/api/partidas/${partidaId}/cronometro`,
    {
      method: 'POST',
      token: await token(),
      body,
    },
  );
}
