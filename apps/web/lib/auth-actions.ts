'use client';

/**
 * Helpers chamados pelas telas de auth. Encapsulam a comunicacao com o
 * Supabase Auth (browser client) e o backend Fastify (sync e onboarding).
 */
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { ApiError, apiFetch } from '@/lib/api';
import type { Perfil } from '@rachao/shared/enums';

export interface SignUpInput {
  nome: string;
  email: string;
  celular: string;
  senha: string;
}

export interface SignInInput {
  email: string;
  senha: string;
}

async function ensureAccessToken(): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.access_token) throw new Error('Sessão não encontrada');
  return data.session.access_token;
}

/**
 * POST /api/auth/sync — cria o registro Usuario apos cadastro.
 */
export async function syncUsuario(payload: { nome: string; celular: string }) {
  const token = await ensureAccessToken();
  return apiFetch<{ usuario: { id: string; perfis: string[] } }>('/api/auth/sync', {
    method: 'POST',
    token,
    body: payload,
  });
}

/**
 * POST /api/onboarding — grava perfis + dados complementares.
 */
export interface OnboardingPayload {
  perfis: Perfil[];
  nomeGrupo?: string;
  cidade?: string;
  nomeEstadio?: string;
  cidadeEstadio?: string;
}

export async function submitOnboarding(payload: OnboardingPayload) {
  const token = await ensureAccessToken();
  return apiFetch<{ ok: true; redirect: string }>('/api/onboarding', {
    method: 'POST',
    token,
    body: payload,
  });
}

/**
 * Cadastro com email/senha. Retorna a sessao apos signup (se autoconfirm
 * estiver ligado em GoTrue, ja vem com session).
 */
export async function signUpWithEmail({ nome, email, celular, senha }: SignUpInput) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome, celular },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail({ email, senha }: SignInInput) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error) throw error;
  return data;
}

/**
 * Inicia OAuth com Google. Apos sucesso, GoTrue redireciona para
 * /auth/callback?code=... que troca o code por session e segue para `next`.
 */
export async function signInWithGoogle(next?: string) {
  const supabase = createSupabaseBrowserClient();
  const params = new URLSearchParams();
  if (next) params.set('next', next);
  const redirectTo = `${window.location.origin}/auth/callback${
    params.toString() ? `?${params}` : ''
  }`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Solicita link de redefinicao de senha (e-mail).
 */
export async function requestPasswordReset(email: string) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/atualizar-senha`,
  });
  if (error) throw error;
}

export async function updatePassword(novaSenha: string) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) throw error;
}

/**
 * Mensagens amigaveis para erros do Supabase Auth.
 */
export function authErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string; error?: string } | undefined;
    return body?.message ?? body?.error ?? 'Não foi possível completar a ação.';
  }
  if (typeof err === 'object' && err && 'message' in err) {
    const msg = String((err as { message: unknown }).message);
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('User already registered'))
      return 'Este e-mail já está em uso. Tente entrar.';
    if (msg.toLowerCase().includes('failed to fetch')) return 'Sem conexão. Tente novamente.';
    return msg;
  }
  return 'Ocorreu um erro inesperado.';
}
