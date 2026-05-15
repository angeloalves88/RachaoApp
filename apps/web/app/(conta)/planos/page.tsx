import { redirect } from 'next/navigation';
import { apiFetchServerSafe } from '@/lib/api-server';
import type { PlanoResponse } from '@/lib/perfil-actions';
import type { AssinaturaResponse } from '@/lib/assinatura-actions';
import { PlanosClient } from './planos-client';

export const dynamic = 'force-dynamic';

export default async function PlanosPage() {
  const [plano, assinatura] = await Promise.all([
    apiFetchServerSafe<PlanoResponse>('/api/me/plano'),
    apiFetchServerSafe<AssinaturaResponse>('/api/me/assinatura'),
  ]);
  if (!plano) redirect('/login');
  return <PlanosClient initial={plano} assinatura={assinatura} />;
}
