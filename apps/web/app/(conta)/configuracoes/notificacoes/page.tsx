import { redirect } from 'next/navigation';
import { apiFetchServerSafe } from '@/lib/api-server';
import type { PrefsNotificacaoResponse } from '@/lib/perfil-actions';
import { NotificacoesPrefsClient } from './notificacoes-prefs-client';

export const dynamic = 'force-dynamic';

export default async function NotificacoesConfigPage() {
  const [me, prefs] = await Promise.all([
    apiFetchServerSafe<{ usuario: { perfis: string[]; email: string } | null }>('/api/me'),
    apiFetchServerSafe<PrefsNotificacaoResponse>('/api/me/preferencias-notificacao'),
  ]);
  if (!me?.usuario || !prefs) redirect('/login');
  return (
    <NotificacoesPrefsClient
      initial={prefs}
      perfis={me.usuario.perfis}
      email={me.usuario.email}
    />
  );
}
