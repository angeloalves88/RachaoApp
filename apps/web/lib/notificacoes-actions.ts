'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api';

async function token(): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sessão expirada');
  return data.session.access_token;
}

export type NotificacaoCategoria = 'partidas' | 'financeiro' | 'estadio' | 'grupo';

export interface NotificacaoItem {
  id: string;
  tipo: string;
  categoria: NotificacaoCategoria;
  titulo: string;
  corpo: string;
  link: string | null;
  partidaId: string | null;
  grupoId: string | null;
  lida: boolean;
  lidaEm: string | null;
  criadoEm: string;
}

export async function listNotificacoes(params?: {
  categoria?: 'todas' | NotificacaoCategoria;
  cursor?: string | null;
  limite?: number;
}) {
  const search = new URLSearchParams();
  if (params?.categoria && params.categoria !== 'todas') search.set('categoria', params.categoria);
  if (params?.cursor) search.set('cursor', params.cursor);
  if (params?.limite) search.set('limite', String(params.limite));
  const qs = search.toString();
  return apiFetch<{
    notificacoes: NotificacaoItem[];
    nextCursor: string | null;
  }>(`/api/notificacoes${qs ? `?${qs}` : ''}`, { token: await token() });
}

export async function getContagemNaoLidas() {
  return apiFetch<{ naoLidas: number }>(`/api/notificacoes/contagem`, {
    token: await token(),
  });
}

export async function marcarLida(id: string) {
  return apiFetch<{ ok: true }>(`/api/notificacoes/${id}/lida`, {
    method: 'PATCH',
    token: await token(),
  });
}

export async function marcarTodasLidas() {
  return apiFetch<{ ok: true; total: number }>(`/api/notificacoes/marcar-todas-lidas`, {
    method: 'POST',
    token: await token(),
  });
}
