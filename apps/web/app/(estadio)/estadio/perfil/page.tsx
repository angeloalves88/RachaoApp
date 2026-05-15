import { redirect } from 'next/navigation';
import { apiFetchServerSafe, ApiError } from '@/lib/api-server';
import { PerfilEstadioClient } from './perfil-client';
import type { EstadioCompleto, HorarioRow, BloqueioRow } from '@/lib/estadios-actions';

export const dynamic = 'force-dynamic';

export default async function PerfilEstadioPage() {
  try {
    const data = await apiFetchServerSafe<{
      estadio: EstadioCompleto;
      horarios: HorarioRow[];
      bloqueios: BloqueioRow[];
    }>('/api/me/estadio');
    if (!data) redirect('/dashboard');
    return <PerfilEstadioClient initial={data} />;
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      redirect('/dashboard');
    }
    throw err;
  }
}
