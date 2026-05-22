/**
 * Cliente HTTP para o backend Fastify (apps/api).
 *
 * Uso em Client Components: usa o JWT do Supabase armazenado no cookie.
 * Uso em Server Components / Route Handlers: passa o token explicitamente.
 */

/** URL do Fastify. No servidor (RSC), troca `localhost` por `127.0.0.1` (evita fetch failed no Windows). */
export function resolveApiUrl(): string {
  const isServer = typeof window === 'undefined';
  const raw = (
    isServer
      ? process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL
      : process.env.NEXT_PUBLIC_API_URL
  ) ?? 'http://127.0.0.1:3333';

  let url = raw.replace(/\/$/, '');
  if (isServer && url.includes('localhost')) {
    url = url.replace(/\/\/localhost/g, '//127.0.0.1');
  }
  return url;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message?: string,
  ) {
    super(message ?? `API error ${status}`);
    this.name = 'ApiError';
  }
}

export interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /// JWT a ser enviado no Authorization (necessario em Server Components)
  token?: string | null;
}

export async function apiFetch<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, token, headers, ...rest } = options;

  const finalHeaders = new Headers(headers);
  finalHeaders.set('Accept', 'application/json');
  if (body !== undefined) finalHeaders.set('Content-Type', 'application/json');
  if (token) finalHeaders.set('Authorization', `Bearer ${token}`);

  const base = resolveApiUrl();
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
  } catch (cause) {
    const hint =
      typeof window === 'undefined'
        ? ' No servidor Next, confira se a API está no ar (pnpm dev:api) e use API_URL=http://127.0.0.1:3333 no .env.local se necessário.'
        : ' Verifique se a API está rodando.';
    throw new Error(`Não foi possível conectar à API (${base}).${hint}`, {
      cause: cause instanceof Error ? cause : undefined,
    });
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }

  return data as T;
}
