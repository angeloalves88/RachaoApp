import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env.js';

let client: SupabaseClient | null = null;

/**
 * Cliente Supabase com SERVICE ROLE — usado para operacoes administrativas
 * no GoTrue (update de senha, signout global, delete user). Nunca expor no
 * frontend ou em respostas — apenas chamar internamente nas rotas.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return client;
}
