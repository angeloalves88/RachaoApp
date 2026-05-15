'use client';

/**
 * Helpers client-side para CRUD de grupos e boleiros. Pegam o JWT da sessao
 * Supabase atual e chamam a API Fastify.
 */
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api';
import type {
  BoleiroFicha,
  BoleiroListItem,
  EstatisticasGrupoData,
  EstatisticasPeriodo,
  GrupoDetalhe,
  GrupoListItem,
} from '@/lib/types';
import type {
  BoleiroCreateInput,
  BoleiroUpdateInput,
  GrupoCreateInput,
  GrupoUpdateInput,
} from '@rachao/shared/zod';

async function token(): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sessão expirada');
  return data.session.access_token;
}

// ----------------------------------------------------------------------------
// Grupos
// ----------------------------------------------------------------------------

export async function listGrupos(params?: { status?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.q) search.set('q', params.q);
  const qs = search.toString();
  return apiFetch<{ grupos: GrupoListItem[] }>(
    `/api/grupos${qs ? `?${qs}` : ''}`,
    { token: await token() },
  );
}

export async function createGrupo(input: GrupoCreateInput) {
  return apiFetch<{ grupo: GrupoListItem }>(`/api/grupos`, {
    method: 'POST',
    token: await token(),
    body: input,
  });
}

export async function updateGrupo(id: string, input: GrupoUpdateInput) {
  return apiFetch<{ grupo: GrupoListItem }>(`/api/grupos/${id}`, {
    method: 'PATCH',
    token: await token(),
    body: input,
  });
}

export async function archiveGrupo(id: string) {
  return apiFetch<{ ok: true; archived: true }>(`/api/grupos/${id}`, {
    method: 'DELETE',
    token: await token(),
  });
}

export async function getGrupo(id: string) {
  return apiFetch<{ grupo: GrupoDetalhe }>(`/api/grupos/${id}`, {
    token: await token(),
  });
}

export async function addCoPresidente(
  grupoId: string,
  input: { email?: string; celular?: string },
) {
  return apiFetch<{
    copresidente: { id: string; nome: string; email: string; papel: string };
  }>(`/api/grupos/${grupoId}/copresidentes`, {
    method: 'POST',
    token: await token(),
    body: input,
  });
}

export async function removeCoPresidente(grupoId: string, usuarioId: string) {
  return apiFetch<{ ok: true }>(
    `/api/grupos/${grupoId}/copresidentes/${usuarioId}`,
    { method: 'DELETE', token: await token() },
  );
}

export async function getEstatisticasGrupo(
  grupoId: string,
  periodo: EstatisticasPeriodo = '30d',
) {
  return apiFetch<EstatisticasGrupoData>(
    `/api/grupos/${grupoId}/estatisticas?periodo=${periodo}`,
    { token: await token() },
  );
}

// ----------------------------------------------------------------------------
// Boleiros
// ----------------------------------------------------------------------------

export async function listBoleiros(
  grupoId: string,
  params?: { status?: string; q?: string },
) {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.q) search.set('q', params.q);
  const qs = search.toString();
  return apiFetch<{ boleiros: BoleiroListItem[] }>(
    `/api/grupos/${grupoId}/boleiros${qs ? `?${qs}` : ''}`,
    { token: await token() },
  );
}

export async function getBoleiro(grupoId: string, boleiroId: string) {
  return apiFetch<BoleiroFicha>(
    `/api/grupos/${grupoId}/boleiros/${boleiroId}`,
    { token: await token() },
  );
}

export async function getBoleiroFinanceiro(grupoId: string, boleiroId: string) {
  return apiFetch<{
    porPartida: import('@/lib/types').BoleiroFinanceiroLinha[];
    mensalidades: import('@/lib/types').BoleiroFinanceiroLinha[];
  }>(`/api/grupos/${grupoId}/boleiros/${boleiroId}/financeiro`, { token: await token() });
}

export async function lookupBoleiroPorCelular(grupoId: string, celular11: string) {
  return apiFetch<{ encontrado: boolean; boleiro: BoleiroListItem | null }>(
    `/api/grupos/${grupoId}/boleiros/lookup-celular?celular=${encodeURIComponent(celular11)}`,
    { token: await token() },
  );
}

export async function createBoleiro(grupoId: string, input: BoleiroCreateInput) {
  return apiFetch<{ boleiro: BoleiroListItem }>(
    `/api/grupos/${grupoId}/boleiros`,
    { method: 'POST', token: await token(), body: input },
  );
}

export async function updateBoleiro(
  grupoId: string,
  boleiroId: string,
  input: BoleiroUpdateInput,
) {
  return apiFetch<{ boleiro: BoleiroListItem }>(
    `/api/grupos/${grupoId}/boleiros/${boleiroId}`,
    { method: 'PATCH', token: await token(), body: input },
  );
}

export async function archiveBoleiro(grupoId: string, boleiroId: string) {
  return apiFetch<{ ok: true; archived: true }>(
    `/api/grupos/${grupoId}/boleiros/${boleiroId}`,
    { method: 'DELETE', token: await token() },
  );
}
