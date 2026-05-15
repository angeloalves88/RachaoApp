/**
 * URL base do Supabase (Kong) para clientes JS.
 *
 * Em desenvolvimento no Windows, `localhost` costuma resolver para `::1`
 * enquanto o Docker publica a porta só em IPv4 — o browser dispara
 * `TypeError: Failed to fetch` no auth. Forçar 127.0.0.1 evita isso.
 */
export function getSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  if (process.env.NODE_ENV === 'production') return raw;
  try {
    const u = new URL(raw);
    if (u.hostname === 'localhost') {
      u.hostname = '127.0.0.1';
      return u.origin;
    }
  } catch {
    /* ignore */
  }
  return raw;
}
