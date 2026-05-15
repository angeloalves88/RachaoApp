import { cache } from 'react';
import { redirect } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { getCachedServerSession } from '@/lib/supabase/session-cache';

export interface SessionUsuario {
  id: string;
  nome: string;
  email: string;
  celular: string | null;
  avatarUrl: string | null;
  perfis: string[];
  plano: string;
}

export interface SessionResult {
  authId: string;
  email: string;
  accessToken: string;
  usuario: SessionUsuario | null;
}

/**
 * Le a sessao Supabase no server e busca o registro Usuario correspondente
 * via /api/me (Fastify). Retorna `null` quando nao ha sessao.
 *
 * Usa `getSession()` do cookie após o middleware ter chamado `getUser()` no Edge
 * (padrão Supabase SSR: middleware refresca JWT; RSC lê sessão sem 2ª ida ao Auth).
 *
 * Memoizado com `cache()` para deduplicar layout + página + irmãos no mesmo request.
 */
export const getSession = cache(async (): Promise<SessionResult | null> => {
  const { session, error } = await getCachedServerSession();
  if (error || !session?.user || !session.access_token) return null;

  const user = session.user;

  let usuario: SessionUsuario | null = null;
  try {
    const me = await apiFetch<{ usuario: SessionUsuario | null }>('/api/me', {
      token: session.access_token,
      cache: 'no-store',
    });
    usuario = me.usuario;
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    // 404 = sem registro Usuario (precisa /api/auth/sync ou onboarding)
  }

  return {
    authId: user.id,
    email: user.email ?? '',
    accessToken: session.access_token,
    usuario,
  };
});

/**
 * Garante que o usuario:
 * 1. Esta logado (sem -> /login?redirect=...)
 * 2. Tem registro Usuario sincronizado E ao menos um perfil (sem -> /onboarding)
 *
 * Use no topo dos layouts (presidente)/(estadio) e em paginas privadas.
 */
export async function requireOnboarded(currentPath: string): Promise<SessionResult> {
  const session = await getSession();
  if (!session) {
    const redirectParam = encodeURIComponent(currentPath);
    redirect(`/login?redirect=${redirectParam}`);
  }
  if (!session.usuario || session.usuario.perfis.length === 0) {
    redirect('/onboarding');
  }
  return session;
}
