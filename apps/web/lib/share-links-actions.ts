'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api';

async function token(): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sessão expirada');
  return data.session.access_token;
}

export type ShareLinkTipo = 'escalacao' | 'resumo';

export interface ShareLinkResponse {
  token: string;
  tipo: ShareLinkTipo;
  expiresAt: string | null;
  publicPath: string;
}

export async function ensureShareLink(
  partidaId: string,
  tipo: ShareLinkTipo,
): Promise<ShareLinkResponse> {
  return apiFetch<ShareLinkResponse>(`/api/partidas/${partidaId}/share-links`, {
    method: 'POST',
    body: { tipo },
    token: await token(),
  });
}
