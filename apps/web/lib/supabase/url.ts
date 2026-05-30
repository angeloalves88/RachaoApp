/**
 * URL base do Supabase (Kong) para clientes JS.
 *
 * Em dev no Windows, outro processo (ex.: servidor Python) pode escutar só em
 * `127.0.0.1:8000` enquanto o Kong do Docker fica em `0.0.0.0:8000`. Pedidos
 * a `127.0.0.1` caem no serviço errado (HTML/404) e o auth falha com
 * "Failed to fetch". `localhost` e `::1` continuam roteando para o Kong.
 */
export function getSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  if (process.env.NODE_ENV === 'production') return raw;
  try {
    const u = new URL(raw);
    if (u.hostname === '127.0.0.1') {
      u.hostname = 'localhost';
      return u.origin;
    }
  } catch {
    /* ignore */
  }
  return raw;
}
