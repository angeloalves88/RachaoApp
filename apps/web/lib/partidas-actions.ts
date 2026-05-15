'use client';

/**
 * Helpers client-side para CRUD de partidas, vaquinha e convites avulsos.
 */
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api';
import type { PartidaDetalhe, PartidaListItem } from '@/lib/types';
import type {
  CanalReenvio,
  ConvidadoAvulsoCreateInput,
  ConvitePresidenteUpdateInput,
  PartidaCreateInput,
  PartidaUpdateInput,
} from '@rachao/shared/zod';
import type { StatusConvite } from '@rachao/shared/enums';

async function token(): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sessão expirada');
  return data.session.access_token;
}

export async function listPartidas(params?: { grupoId?: string; status?: string }) {
  const search = new URLSearchParams();
  if (params?.grupoId) search.set('grupoId', params.grupoId);
  if (params?.status) search.set('status', params.status);
  const qs = search.toString();
  return apiFetch<{ partidas: PartidaListItem[] }>(
    `/api/partidas${qs ? `?${qs}` : ''}`,
    { token: await token() },
  );
}

export async function getPartida(id: string) {
  return apiFetch<{ partida: PartidaDetalhe }>(`/api/partidas/${id}`, {
    token: await token(),
  });
}

export async function createPartida(input: PartidaCreateInput) {
  return apiFetch<{
    partida: { id: string };
    convites: Array<{ id: string; status: string }>;
    vaquinha: { id: string } | null;
    serie: { total: number; ids: string[] } | null;
  }>(`/api/partidas`, {
    method: 'POST',
    token: await token(),
    body: input,
  });
}

export async function updatePartida(id: string, input: PartidaUpdateInput) {
  return apiFetch<{ partida: { id: string; status: string } }>(`/api/partidas/${id}`, {
    method: 'PATCH',
    token: await token(),
    body: input,
  });
}

/**
 * Cancela (soft delete) uma partida. Para partidas que pertencem a uma serie
 * recorrente, passe escopo='serie' para cancelar tambem todas as proximas
 * partidas pendentes da mesma serie. Default ='apenas' (so esta).
 */
export async function cancelPartida(id: string, escopo: 'apenas' | 'serie' = 'apenas') {
  const qs = escopo === 'serie' ? '?escopo=serie' : '';
  return apiFetch<{
    ok: true;
    cancelled: true;
    total: number;
    escopo: 'apenas' | 'serie';
  }>(`/api/partidas/${id}${qs}`, {
    method: 'DELETE',
    token: await token(),
  });
}

export async function addConvidadoAvulso(partidaId: string, input: ConvidadoAvulsoCreateInput) {
  return apiFetch<{
    convite: { id: string };
    convidadoAvulso: { id: string; nome: string };
  }>(`/api/partidas/${partidaId}/convidados-avulsos`, {
    method: 'POST',
    token: await token(),
    body: input,
  });
}

export async function removeConvite(partidaId: string, conviteId: string) {
  return apiFetch<{ ok: true }>(`/api/partidas/${partidaId}/convites/${conviteId}`, {
    method: 'DELETE',
    token: await token(),
  });
}

/**
 * Atualizacao manual de um convite pelo Presidente (T15): muda status,
 * marca confirmadoEm, libera vaga e promove lista de espera quando aplicavel.
 */
export async function updateConviteStatus(
  partidaId: string,
  conviteId: string,
  input: ConvitePresidenteUpdateInput,
) {
  return apiFetch<{
    ok: true;
    convite: { id: string; status: StatusConvite };
    promovidos: number;
  }>(`/api/partidas/${partidaId}/convites/${conviteId}`, {
    method: 'PATCH',
    token: await token(),
    body: input,
  });
}

/**
 * Reenvia convites em lote (T16) por email e/ou retorna links wa.me para
 * o Presidente abrir manualmente.
 */
export async function reenviarConvites(
  partidaId: string,
  input: {
    conviteIds: string[];
    canais: CanalReenvio;
    mensagemPersonalizada?: string | null;
  },
) {
  return apiFetch<{
    ok: true;
    enviadosEmail: number;
    semContatoEmail: number;
    semContatoWhatsapp: number;
    whatsappLinks: Array<{ conviteId: string; nome: string; url: string }>;
  }>(`/api/partidas/${partidaId}/convites/reenviar`, {
    method: 'POST',
    token: await token(),
    body: input,
  });
}
