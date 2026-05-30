import Link from 'next/link';
import { ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { apiFetchServer } from '@/lib/api-server';
import type { GrupoListItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function FinanceiroPage() {
  const { grupos } = await apiFetchServer<{ grupos: GrupoListItem[] }>('/api/grupos?status=ativo');

  return (
    <div className="space-y-5 pb-8">
      <header className="flex items-center gap-3">
        <Link
          href="/dashboard"
          aria-label="Voltar"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-surface-2"
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold leading-tight">Financeiro</h1>
          <p className="text-sm text-muted">
            Confirme pagamentos de mensalidade, partidas e convidados por grupo.
          </p>
        </div>
      </header>

      {grupos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-2 p-8 text-center">
          <Wallet className="mx-auto mb-3 h-10 w-10 text-muted" />
          <p className="font-display text-lg font-semibold">Nenhum grupo ativo</p>
          <p className="mt-1 text-sm text-muted">Crie um grupo para acompanhar cobranças.</p>
          <Link href="/grupos" className="mt-4 inline-block text-sm font-medium text-primary">
            Ir para Meus grupos
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {grupos.map((g) => (
            <li key={g.id}>
              <Link
                href={`/grupos/${g.id}?tab=financeiro`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-primary/40 hover:bg-surface-2"
              >
                <Avatar name={g.nome} src={g.fotoUrl ?? undefined} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{g.nome}</p>
                  <p className="text-xs text-muted">
                    {g.tipoCobrancaPadrao === 'mensalidade' ? 'Mensalidade' : 'Por partida'}
                    {g.valorConvidadoPadrao != null && g.valorConvidadoPadrao > 0
                      ? ` · convidado R$ ${g.valorConvidadoPadrao.toFixed(2)}`
                      : ''}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-primary">Abrir</span>
                <ChevronRight size={16} className="shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted">
        Dica: dentro de cada grupo, a aba <strong className="font-medium text-foreground">Financeiro</strong>{' '}
        mostra pendências de mensalidade, vaquinha por partida e convidados avulsos.
      </p>
    </div>
  );
}
