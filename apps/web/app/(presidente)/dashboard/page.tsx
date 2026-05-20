import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetchServer, ApiError } from '@/lib/api-server';
import { getSession } from '@/lib/auth-server';
import type { DashboardInsights, DashboardSummary } from '@/lib/types';
import { DashboardInsightsGrid } from './dashboard-insights';

export const dynamic = 'force-dynamic';

const INSIGHTS_VAZIOS: DashboardInsights = {
  partidasPrevistas: 0,
  partidasEncerradas: 0,
  mediaGolsPorPartida: 0,
  topArtilheiros: [],
  topCartoes: [],
  timeMaisVenceu: null,
  artilheiroDestaque: null,
  maisPresente: null,
};

export default async function DashboardPage() {
  const session = await getSession();
  const nome = session?.usuario?.nome ?? 'Presidente';

  let data: DashboardSummary;
  try {
    const raw = await apiFetchServer<DashboardSummary>('/api/dashboard');
    data = {
      ...raw,
      insights: raw.insights ?? INSIGHTS_VAZIOS,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      return (
        <div className="container py-6">
          <EmptyState
            title="Não foi possível carregar"
            description="Tente novamente em instantes."
            action={
              <Link href="/dashboard">
                <Button variant="outline">Tentar novamente</Button>
              </Link>
            }
          />
        </div>
      );
    }
    throw err;
  }

  return (
    <div className="container py-5">
      <DashboardInsightsGrid data={data} nome={nome} />
    </div>
  );
}
