'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { CheckCheck, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  listNotificacoes,
  marcarLida,
  marcarTodasLidas,
  type NotificacaoItem,
} from '@/lib/notificacoes-actions';

type TabValue = 'todas' | 'partidas' | 'financeiro' | 'estadio' | 'grupo';

const TABS: Array<{ value: TabValue; label: string }> = [
  { value: 'todas', label: 'Todas' },
  { value: 'partidas', label: 'Partidas' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'estadio', label: 'Estádio' },
];

const ICONE_POR_CATEGORIA: Record<string, string> = {
  partidas: '⚽',
  financeiro: '💰',
  estadio: '🏟️',
  grupo: '👥',
};

const RTF = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

function tempoRelativo(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const minutos = Math.round(diffMs / 60_000);
  if (Math.abs(minutos) < 60) return RTF.format(minutos, 'minute');
  const horas = Math.round(minutos / 60);
  if (Math.abs(horas) < 24) return RTF.format(horas, 'hour');
  const dias = Math.round(horas / 24);
  return RTF.format(dias, 'day');
}

export function NotificacoesClient() {
  const [tab, setTab] = useState<TabValue>('todas');
  const [itens, setItens] = useState<NotificacaoItem[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [, startTransition] = useTransition();

  async function carregar(t: TabValue) {
    setCarregando(true);
    try {
      const res = await listNotificacoes({ categoria: t, limite: 50 });
      setItens(res.notificacoes);
    } catch {
      toast.error('Falha ao carregar notificacoes.');
      setItens([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregar(tab);
  }, [tab]);

  async function handleMarcarTodas() {
    try {
      const res = await marcarTodasLidas();
      toast.success(`${res.total} notificacoes marcadas como lidas.`);
      startTransition(() => void carregar(tab));
    } catch {
      toast.error('Falha ao marcar todas.');
    }
  }

  async function handleClickItem(n: NotificacaoItem) {
    if (!n.lida) {
      try {
        await marcarLida(n.id);
        setItens((prev) => prev?.map((x) => (x.id === n.id ? { ...x, lida: true } : x)) ?? null);
      } catch {
        // navegar mesmo assim
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="flex-1">
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={tab}>
            {carregando ? (
              <ListaSkeleton />
            ) : itens && itens.length > 0 ? (
              <ul className="space-y-2">
                {itens.map((n) => (
                  <ItemNotificacao key={n.id} n={n} onClick={() => handleClickItem(n)} />
                ))}
              </ul>
            ) : (
              <EmptyState
                variant="dashed"
                icon={<Inbox size={28} strokeWidth={1.5} />}
                title="Tudo em dia por aqui!"
                description="Voce sera avisado(a) quando algo mudar nas suas partidas."
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={handleMarcarTodas}>
          <CheckCheck size={14} /> Marcar todas como lidas
        </Button>
      </div>
    </div>
  );
}

function ItemNotificacao({
  n,
  onClick,
}: {
  n: NotificacaoItem;
  onClick: () => void;
}) {
  const icone = ICONE_POR_CATEGORIA[n.categoria] ?? '🔔';
  const conteudo = (
    <article
      className={
        'flex items-start gap-3 rounded-lg border px-3 py-3 transition-colors ' +
        (n.lida
          ? 'border-border bg-surface'
          : 'border-primary/30 bg-primary-highlight/40 hover:bg-primary-highlight/60')
      }
    >
      <span className="text-xl" aria-hidden>
        {icone}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{n.titulo}</p>
          {!n.lida ? <Badge variant="primary">Nova</Badge> : null}
        </div>
        <p className="text-sm text-muted">{n.corpo}</p>
        <p className="mt-1 text-xs text-faint">{tempoRelativo(n.criadoEm)}</p>
      </div>
    </article>
  );

  if (n.link) {
    return (
      <li>
        <Link href={n.link} onClick={onClick} className="block">
          {conteudo}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button type="button" onClick={onClick} className="block w-full text-left">
        {conteudo}
      </button>
    </li>
  );
}

function ListaSkeleton() {
  return (
    <ul className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i}>
          <Skeleton className="h-16 w-full" />
        </li>
      ))}
    </ul>
  );
}
