import { redirect } from 'next/navigation';
import { apiFetchServerSafe } from '@/lib/api-server';
import { AgendaClient } from './agenda-client';
import type { AgendaResponse } from '@/lib/estadios-actions';

export const dynamic = 'force-dynamic';

export default async function AgendaPage() {
  const now = new Date();
  const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
  const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const data = await apiFetchServerSafe<AgendaResponse>(
    `/api/me/estadio/agenda?inicio=${inicio.toISOString()}&fim=${fim.toISOString()}`,
  );
  if (!data) redirect('/dashboard');

  return (
    <AgendaClient
      initial={data}
      mesInicial={{
        ano: now.getFullYear(),
        mes: now.getMonth(),
      }}
    />
  );
}
