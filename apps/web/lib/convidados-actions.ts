'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api';

async function token(): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sessão expirada');
  return data.session.access_token;
}

export interface ConvidadoLookup {
  id: string;
  nome: string;
  apelido: string | null;
  posicao: 'GOL' | 'ZAG' | 'MEI' | 'ATA' | null;
  celular: string;
}

export async function lookupConvidadoPorCelular(celular11: string) {
  return apiFetch<{ convidado: ConvidadoLookup | null; totalPartidasComoConvidado: number }>(
    `/api/convidados-avulsos/por-celular?celular=${encodeURIComponent(celular11)}`,
    { token: await token() },
  );
}
