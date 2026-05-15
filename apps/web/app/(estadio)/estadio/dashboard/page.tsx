import Link from 'next/link';
import { apiFetchServerSafe } from '@/lib/api-server';
import { DashboardClient } from './dashboard-client';
import type { DashboardEstadioResponse } from '@/lib/estadios-actions';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function EstadioDashboardPage() {
  const data = await apiFetchServerSafe<DashboardEstadioResponse>('/api/dashboard/estadio');
  if (!data) {
    return (
      <div className="container py-6">
        <h1 className="font-display text-3xl">Dashboard do Estádio</h1>
        <p className="mt-2 text-sm text-muted">
          Você ainda não tem um estádio ativo. Complete seu cadastro para começar.
        </p>
        <Button asChild className="mt-4">
          <Link href="/estadio/perfil">Configurar meu estádio</Link>
        </Button>
      </div>
    );
  }
  return <DashboardClient data={data} />;
}
