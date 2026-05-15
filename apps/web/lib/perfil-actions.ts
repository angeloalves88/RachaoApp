'use client';

/**
 * Client-side actions for Bloco 9 (Perfil + Configuracoes).
 *
 * Fala com:
 * - PATCH /api/me
 * - POST  /api/me/senha
 * - POST  /api/me/logout-all
 * - DELETE /api/me
 * - POST  /api/me/perfis
 * - GET/PUT /api/me/preferencias-notificacao
 * - GET/PUT /api/me/preferencias
 * - GET/POST /api/me/plano
 */
import { apiFetch } from '@/lib/api';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type {
  AlterarSenhaInput,
  AtivarPerfilInput,
  EscolherPlanoInput,
  EventoNotificacao,
  ExcluirContaInput,
  PerfilUpdateInput,
  PreferenciasGeraisInput,
  PreferenciasNotificacaoInput,
} from '@rachao/shared/zod';

async function token(): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sessão expirada');
  return data.session.access_token;
}

export interface UsuarioPerfil {
  id: string;
  nome: string;
  apelido: string | null;
  email: string;
  celular: string | null;
  cidade: string | null;
  avatarUrl: string | null;
  perfis: string[];
  plano: string;
  planoExpiraEm: string | null;
}

export async function patchPerfil(input: PerfilUpdateInput) {
  return apiFetch<{ usuario: UsuarioPerfil }>('/api/me', {
    method: 'PATCH',
    body: input,
    token: await token(),
  });
}

export async function alterarSenha(input: AlterarSenhaInput) {
  return apiFetch<{ ok: true }>('/api/me/senha', {
    method: 'POST',
    body: input,
    token: await token(),
  });
}

export async function logoutAllDevices() {
  return apiFetch<{ ok: true }>('/api/me/logout-all', {
    method: 'POST',
    token: await token(),
  });
}

export async function excluirConta(input: ExcluirContaInput) {
  return apiFetch<{ ok: true }>('/api/me', {
    method: 'DELETE',
    body: input,
    token: await token(),
  });
}

export async function ativarPerfil(input: AtivarPerfilInput) {
  return apiFetch<{ usuario: UsuarioPerfil }>('/api/me/perfis', {
    method: 'POST',
    body: input,
    token: await token(),
  });
}

export interface PrefsNotificacaoResponse {
  notifEmail: boolean;
  notifWhatsapp: boolean;
  eventos: Array<{
    evento: EventoNotificacao;
    canalEmail: boolean;
    canalWhatsapp: boolean;
  }>;
}

export async function getPrefsNotificacao() {
  return apiFetch<PrefsNotificacaoResponse>('/api/me/preferencias-notificacao', {
    token: await token(),
  });
}

export async function putPrefsNotificacao(input: PreferenciasNotificacaoInput) {
  return apiFetch<{ ok: true }>('/api/me/preferencias-notificacao', {
    method: 'PUT',
    body: input,
    token: await token(),
  });
}

export interface PreferenciasGerais {
  prefNumTimes: number | null;
  prefBoleirosPorTime: number | null;
  prefTempoPartida: number | null;
  prefTempoTotal: number | null;
  prefRegrasPadrao: string[] | null;
  prefFormatoHora: '24h' | '12h';
}

export async function getPrefsGerais() {
  return apiFetch<{ preferencias: PreferenciasGerais }>('/api/me/preferencias', {
    token: await token(),
  });
}

export async function putPrefsGerais(input: PreferenciasGeraisInput) {
  return apiFetch<{ preferencias: PreferenciasGerais }>('/api/me/preferencias', {
    method: 'PUT',
    body: input,
    token: await token(),
  });
}

export interface PlanoResponse {
  plano: 'trial' | 'presidente_mensal' | 'estadio_mensal' | 'combo_mensal';
  expiraEm: string | null;
  trialRestante: number | null;
  perfis: string[];
}

export async function getPlano() {
  return apiFetch<PlanoResponse>('/api/me/plano', { token: await token() });
}

export async function escolherPlano(input: EscolherPlanoInput) {
  return apiFetch<{
    ok: true;
    plano: string;
    expiraEm: string | null;
    message: string;
  }>('/api/me/plano', {
    method: 'POST',
    body: input,
    token: await token(),
  });
}
