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
