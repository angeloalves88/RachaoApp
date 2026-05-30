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
  fotoUrl?: string | null;
}

export async function lookupConvidadoPorCelular(celular11: string) {
  return apiFetch<{ convidado: ConvidadoLookup | null; totalPartidasComoConvidado: number }>(
    `/api/convidados-avulsos/por-celular?celular=${encodeURIComponent(celular11)}`,
    { token: await token() },
  );
}

export async function updateConvidadoAvulso(
  id: string,
  input: import('@rachao/shared/zod').ConvidadoAvulsoUpdateInput,
) {
  return apiFetch<{ convidado: ConvidadoLookup }>(`/api/convidados-avulsos/${id}`, {
    method: 'PATCH',
    token: await token(),
    body: input,
  });
}
