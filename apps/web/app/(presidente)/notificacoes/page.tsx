import { NotificacoesClient } from './notificacoes-client';

export const metadata = {
  title: 'Notificacoes — RachãoApp',
};

export const dynamic = 'force-dynamic';

export default function NotificacoesPage() {
  return (
    <div className="container space-y-4 py-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight">Notificacoes</h1>
          <p className="text-sm text-muted">Acompanhe o que mudou nos seus rachoes.</p>
        </div>
      </header>
      <NotificacoesClient />
    </div>
  );
}
