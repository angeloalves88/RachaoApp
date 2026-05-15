/**
 * Wrapper de `apiFetch` para uso em Server Components / Route Handlers.
 * Pega o token automaticamente da sessao Supabase do cookie.
 */
import { apiFetch, ApiError, type ApiOptions } from '@/lib/api';
import { getCachedServerSession } from '@/lib/supabase/session-cache';

export { ApiError } from '@/lib/api';

export async function apiFetchServer<T = unknown>(
  path: string,
  options: Omit<ApiOptions, 'token'> = {},
): Promise<T> {
  const { session } = await getCachedServerSession();
  return apiFetch<T>(path, { ...options, token: session?.access_token ?? null });
}

/**
 * Versao tolerante: retorna `null` em qualquer erro 4xx, repassando 5xx/erros
 * de rede. Util em paginas onde recursos opcionais podem nao existir.
 */
export async function apiFetchServerSafe<T = unknown>(
  path: string,
  options: Omit<ApiOptions, 'token'> = {},
): Promise<T | null> {
  try {
    return await apiFetchServer<T>(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status >= 400 && err.status < 500) return null;
    throw err;
  }
}
