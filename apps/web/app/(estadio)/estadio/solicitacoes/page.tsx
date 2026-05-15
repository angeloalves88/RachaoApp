import { redirect } from 'next/navigation';
import { apiFetchServerSafe } from '@/lib/api-server';
import { SolicitacoesClient } from './solicitacoes-client';
import type { SolicitacaoRow } from '@/lib/estadios-actions';

export const dynamic = 'force-dynamic';

export default async function SolicitacoesPage() {
  const data = await apiFetchServerSafe<{ solicitacoes: SolicitacaoRow[] }>(
    '/api/me/estadio/solicitacoes?status=todas',
  );
  if (!data) redirect('/login?redirect=%2Festadio%2Fsolicitacoes');
  return <SolicitacoesClient initial={data.solicitacoes} />;
}
