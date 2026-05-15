'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  ChevronLeft,
  Minus,
  Plus,
  RefreshCw,
  Square,
  Trash2,
  Trophy,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { CorTime } from '@rachao/shared/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { COR_HEX } from '@/lib/escalacao-ui';
import {
  type EventoApi,
  encerrarPartida,
  getToken,
  removerEvento,
} from '@/lib/aovivo-actions';
import {
  discardFailed,
  enqueueEvento,
  flushPending,
  partitionPending,
  removePending,
  retryFailed,
  useOnline,
  usePending,
  type PendingEvento,
} from '@/lib/offline-queue';
import type { EscalacaoGetResponse } from '@/lib/escalacao-actions';
import type { PartidaDetalhe } from '@/lib/types';
import { Cronometro } from './cronometro';
import { CartaoModal, GolModal, SubstituicaoModal, type TimeAovivo } from './modais';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

interface Props {
  partida: PartidaDetalhe;
  escalacao: EscalacaoGetResponse | null;
  eventosIniciais: EventoApi[];
}

const CARTOES_LABEL: Record<string, { label: string; cls: string }> = {
  amarelo: { label: '🟨 Amarelo', cls: 'bg-warning/15 text-warning' },
  vermelho: { label: '🟥 Vermelho', cls: 'bg-destructive/15 text-destructive' },
  azul: { label: '🟦 Azul', cls: 'bg-info/15 text-info' },
};

interface DadosExtrasGol {
  golOlimpico?: boolean;
  clientId?: string;
  [k: string]: unknown;
}

interface DadosExtrasCartao {
  duracaoAzul?: number;
  clientId?: string;
  [k: string]: unknown;
}

interface DadosExtrasSub {
  boleiroSubstitutoId?: string;
  clientId?: string;
  [k: string]: unknown;
}

export function AoVivoClient({ partida, escalacao, eventosIniciais }: Props) {
  const router = useRouter();
  const isOnline = useOnline();
  const pending = usePending(partida.id);

  const [eventos, setEventos] = useState<EventoApi[]>(eventosIniciais);
  const [minuto, setMinuto] = useState(0);
  const [golOpen, setGolOpen] = useState(false);
  const [cartaoOpen, setCartaoOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [encerrarOpen, setEncerrarOpen] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [defaultTimeId, setDefaultTimeId] = useState<string | null>(null);
  const [syncedFlash, setSyncedFlash] = useState(false);
  const flushingRef = useRef(false);

  const cartaoAzulAtivo = !!(
    partida.regras as Record<string, { ativo?: boolean }>
  )?.cartao_azul?.ativo;
  const duracaoAzulPadrao =
    Number(
      (
        partida.regras as Record<string, { duracao_minutos?: number; ativo?: boolean }>
      )?.cartao_azul?.duracao_minutos,
    ) || 2;
  const golOlimpicoDuplo = !!(
    partida.regras as Record<string, { ativo?: boolean }>
  )?.gol_olimpico_duplo?.ativo;

  // Times ao vivo: vem da escalação (com nomes/IDs reais de boleiros).
  const times: TimeAovivo[] = useMemo(() => {
    if (!escalacao || escalacao.times.length === 0) return [];
    return escalacao.times.map((t) => ({
      id: t.id,
      nome: t.nome,
      cor: (t.cor as CorTime) ?? 'blue',
      boleiros: t.boleiros.map((b) => ({
        boleiroId: b.boleiroId,
        nome: b.nome,
        apelido: b.apelido,
      })),
    }));
  }, [escalacao]);

  // Placar derivado de eventos
  const placarPorTime = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of eventos) {
      if (ev.tipo === 'gol' && ev.timeId) {
        map.set(ev.timeId, (map.get(ev.timeId) ?? 0) + 1);
      }
    }
    return map;
  }, [eventos]);

  const tryFlush = useCallback(async () => {
    if (flushingRef.current) return;
    if (!isOnline) return;
    flushingRef.current = true;
    try {
      const tk = await getToken();
      const res = await flushPending(partida.id, {
        apiUrl: API_URL,
        token: tk,
        onItemSent: () => {},
        onItemFailed: (_item, reason) => {
          toast.error(`Evento não pôde ser enviado: ${reason}`, {
            duration: 6000,
          });
        },
      });
      if (res.sent > 0) {
        // refetch eventos para refletir os IDs reais
        const r = await fetch(`${API_URL}/api/partidas/${partida.id}/eventos`, {
          headers: { Authorization: `Bearer ${tk}` },
        });
        if (r.ok) {
          const j = (await r.json()) as { eventos: EventoApi[] };
          setEventos(j.eventos);
        }
        if (res.remaining === 0) {
          setSyncedFlash(true);
          window.setTimeout(() => setSyncedFlash(false), 2000);
        }
      }
    } catch (e) {
      console.warn('flush failed', e);
    } finally {
      flushingRef.current = false;
    }
  }, [partida.id, isOnline]);

  // Flush automático ao voltar online ou quando a fila aumenta.
  useEffect(() => {
    void tryFlush();
  }, [isOnline, pending.length, tryFlush]);

  // Optimistic insert: cria evento local enquanto enfileira no backend.
  async function recordEvento(
    body: {
      tipo: string;
      timeId?: string | null;
      boleiroId?: string | null;
      minuto?: number | null;
      dadosExtras?: Record<string, unknown> | null;
    },
    timeNome?: string,
    timeCor?: string,
  ) {
    const item = await enqueueEvento(partida.id, body);
    const optimistic: EventoApi = {
      id: `pending-${item.clientId}`,
      tipo: body.tipo,
      minuto: body.minuto ?? null,
      timeId: body.timeId ?? null,
      timeNome: timeNome ?? null,
      timeCor: timeCor ?? null,
      boleiroId: body.boleiroId ?? null,
      dadosExtras: { ...(body.dadosExtras ?? {}), clientId: item.clientId },
      criadoEm: new Date().toISOString(),
    };
    setEventos((evs) => [...evs, optimistic]);
    void tryFlush();
  }

  function quickGol(timeId: string, sign: 1 | -1) {
    if (sign === 1) {
      const t = times.find((x) => x.id === timeId);
      void recordEvento(
        { tipo: 'gol', timeId, minuto, dadosExtras: {} },
        t?.nome,
        t ? COR_HEX[(t.cor as CorTime) ?? 'blue'] : undefined,
      );
      return;
    }
    // -1: remover último gol daquele time (otimista + backend se já sincronizado)
    const evs = [...eventos];
    for (let i = evs.length - 1; i >= 0; i--) {
      const ev = evs[i]!;
      if (ev.tipo === 'gol' && ev.timeId === timeId) {
        evs.splice(i, 1);
        setEventos(evs);
        if (ev.id.startsWith('pending-')) {
          const cid =
            (ev.dadosExtras as { clientId?: string } | null)?.clientId ?? null;
          if (cid) void removePending(partida.id, cid);
        } else {
          void removerEvento(partida.id, ev.id).catch(() => {
            toast.error('Não foi possível remover o gol no servidor.');
          });
        }
        return;
      }
    }
  }

  function abrirGolDoTime(timeId: string) {
    setDefaultTimeId(timeId);
    setGolOpen(true);
  }

  async function handleEncerrar() {
    setEncerrando(true);
    try {
      await encerrarPartida(partida.id);
      toast.success('Partida encerrada!');
      router.push(`/partidas/${partida.id}/resumo`);
    } catch {
      toast.error('Não foi possível encerrar a partida.');
      setEncerrando(false);
    }
  }

  async function deleteEvento(ev: EventoApi) {
    setEventos((evs) => evs.filter((e) => e.id !== ev.id));
    if (ev.id.startsWith('pending-')) {
      const cid = (ev.dadosExtras as { clientId?: string } | null)?.clientId;
      if (cid) await removePending(partida.id, cid);
      return;
    }
    try {
      await removerEvento(partida.id, ev.id);
    } catch {
      toast.error('Não foi possível remover o evento.');
    }
  }

  const eventosOrdered = useMemo(
    () => [...eventos].reverse(),
    [eventos],
  );

  const { ativos: pendingAtivos, falhos: pendingFalhos } = useMemo(
    () => partitionPending(pending),
    [pending],
  );

  const totalGoleiroAttempts = pendingAtivos.reduce((acc, p) => acc + p.attempts, 0);

  async function handleRetryFailed(item: PendingEvento) {
    await retryFailed(partida.id, item.clientId);
    void tryFlush();
  }

  async function handleDiscardFailed(item: PendingEvento) {
    if (!window.confirm('Descartar este evento? Esta acao nao pode ser desfeita.')) return;
    await discardFailed(partida.id, item.clientId);
    setEventos((evs) =>
      evs.filter(
        (e) =>
          !(
            e.id === `pending-${item.clientId}` ||
            (e.dadosExtras as { clientId?: string } | null)?.clientId === item.clientId
          ),
      ),
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="container flex flex-wrap items-center gap-3 pt-3">
        <Link
          href={`/partidas/${partida.id}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-2"
          aria-label="Voltar"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold">Ao vivo</h1>
          <p className="truncate text-sm text-muted">{partida.grupo.nome}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/15 px-2 py-1 text-xs font-medium text-warning">
          <span className="h-2 w-2 animate-pulse rounded-full bg-warning" />
          EM ANDAMENTO
        </span>
      </header>

      {/* Banner offline / pending / falhos */}
      <div className="container mt-3 space-y-2">
        {!isOnline ? (
          <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/15 px-3 py-2 text-sm text-warning">
            <WifiOff className="h-4 w-4" />
            <span>
              Você está offline — {pendingAtivos.length} evento(s) na fila local serão enviados
              quando voltar à internet.
            </span>
          </div>
        ) : pendingAtivos.length > 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-info/40 bg-info/10 px-3 py-2 text-sm text-info">
            <Wifi className="h-4 w-4" />
            <span>
              Sincronizando {pendingAtivos.length} evento(s)...
              {totalGoleiroAttempts > 0 ? (
                <span className="ml-1 text-xs opacity-80">
                  ({totalGoleiroAttempts} retentativa{totalGoleiroAttempts === 1 ? '' : 's'})
                </span>
              ) : null}
            </span>
          </div>
        ) : syncedFlash ? (
          <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/15 px-3 py-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            Sincronizado!
          </div>
        ) : null}

        {pendingFalhos.length > 0 ? (
          <div className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <p className="flex items-center gap-2 font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {pendingFalhos.length} evento(s) não puderam ser enviados
            </p>
            <ul className="space-y-1">
              {pendingFalhos.map((p) => (
                <li
                  key={p.clientId}
                  className="flex items-center gap-2 rounded border border-destructive/30 bg-background/40 px-2 py-1.5 text-xs"
                >
                  <span className="flex-1 truncate">
                    <strong className="font-medium">{p.body.tipo}</strong>
                    {p.body.minuto != null ? ` · ${p.body.minuto}'` : ''}
                    {p.lastError ? ` — ${p.lastError}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleRetryFailed(p)}
                    aria-label="Tentar novamente"
                    className="rounded p-1 text-info hover:bg-surface-offset"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDiscardFailed(p)}
                    aria-label="Descartar"
                    className="rounded p-1 text-destructive hover:bg-surface-offset"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <main className="container mt-3 space-y-4">
        {/* Cronômetro */}
        <Cronometro
          partidaId={partida.id}
          tempoTotalMin={partida.tempoTotal}
          onMinutoChange={setMinuto}
        />

        {/* Placar */}
        <section className="-mx-2 overflow-x-auto px-2">
          <div
            className={`grid min-w-fit gap-2 ${
              times.length === 2
                ? 'grid-cols-2'
                : times.length === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-4'
            }`}
          >
            {times.map((t) => (
              <PlacarTime
                key={t.id}
                time={t}
                gols={placarPorTime.get(t.id) ?? 0}
                onMinus={() => quickGol(t.id, -1)}
                onPlus={() => quickGol(t.id, 1)}
                onLongPress={() => abrirGolDoTime(t.id)}
              />
            ))}
          </div>
        </section>

        {/* Botões de eventos */}
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="h-14 justify-start"
            onClick={() => {
              setDefaultTimeId(null);
              setGolOpen(true);
            }}
          >
            <span className="text-2xl">⚽</span>
            Gol
          </Button>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="h-14 justify-start"
            onClick={() => setCartaoOpen(true)}
          >
            <span className="text-2xl">🟨</span>
            Cartão
          </Button>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="h-14 justify-start"
            onClick={() => setSubOpen(true)}
          >
            <ArrowLeftRight className="h-5 w-5" />
            Substituição
          </Button>
          {cartaoAzulAtivo ? (
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="h-14 justify-start"
              onClick={() => setCartaoOpen(true)}
            >
              <span className="text-2xl">🟦</span>
              Cartão Azul
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              variant="destructive"
              className="h-14 justify-start"
              onClick={() => setEncerrarOpen(true)}
            >
              <Square className="h-5 w-5" />
              Encerrar
            </Button>
          )}
        </section>

        {/* Feed */}
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Eventos</h2>
          {eventosOrdered.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-surface px-3 py-3 text-sm text-muted">
              Sem eventos ainda. Use os botões acima para registrar.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {eventosOrdered.map((ev) => (
                <FeedItem key={ev.id} ev={ev} onDelete={() => void deleteEvento(ev)} />
              ))}
            </ul>
          )}
        </section>

        {cartaoAzulAtivo ? (
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            onClick={() => setEncerrarOpen(true)}
          >
            <Square className="h-4 w-4" />
            Encerrar partida
          </Button>
        ) : null}
      </main>

      {/* Modais */}
      <GolModal
        open={golOpen}
        onOpenChange={setGolOpen}
        times={times}
        minutoAtual={minuto}
        defaultTimeId={defaultTimeId}
        permitirOlimpico={golOlimpicoDuplo}
        onConfirm={async (v) => {
          const t = times.find((x) => x.id === v.timeId);
          const extras: DadosExtrasGol = {};
          if (v.golOlimpico) extras.golOlimpico = true;
          await recordEvento(
            {
              tipo: 'gol',
              timeId: v.timeId,
              boleiroId: v.boleiroId,
              minuto: v.minuto,
              dadosExtras: extras,
            },
            t?.nome,
            t ? COR_HEX[(t.cor as CorTime) ?? 'blue'] : undefined,
          );
        }}
      />

      <CartaoModal
        open={cartaoOpen}
        onOpenChange={setCartaoOpen}
        times={times}
        minutoAtual={minuto}
        cartaoAzulAtivo={cartaoAzulAtivo}
        duracaoAzulPadrao={duracaoAzulPadrao}
        onConfirm={async (v) => {
          const t = times.find((x) => x.id === v.timeId);
          const extras: DadosExtrasCartao = {};
          if (v.duracaoAzul) extras.duracaoAzul = v.duracaoAzul;
          await recordEvento(
            {
              tipo: v.tipo,
              timeId: v.timeId,
              boleiroId: v.boleiroId,
              minuto: v.minuto,
              dadosExtras: extras,
            },
            t?.nome,
            t ? COR_HEX[(t.cor as CorTime) ?? 'blue'] : undefined,
          );
        }}
      />

      <SubstituicaoModal
        open={subOpen}
        onOpenChange={setSubOpen}
        times={times}
        minutoAtual={minuto}
        onConfirm={async (v) => {
          const t = times.find((x) => x.id === v.timeId);
          const extras: DadosExtrasSub = { boleiroSubstitutoId: v.entraBoleiroId };
          await recordEvento(
            {
              tipo: 'substituicao',
              timeId: v.timeId,
              boleiroId: v.saiBoleiroId,
              minuto: v.minuto,
              dadosExtras: extras,
            },
            t?.nome,
            t ? COR_HEX[(t.cor as CorTime) ?? 'blue'] : undefined,
          );
        }}
      />

      {/* Confirmar encerrar */}
      <Dialog open={encerrarOpen} onOpenChange={setEncerrarOpen}>
        <DialogContent fullScreenOnMobile={false} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Encerrar partida?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted">
            O placar final será congelado e a partida passará para a tela de resumo. Esta
            ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEncerrarOpen(false)} disabled={encerrando}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleEncerrar} disabled={encerrando}>
              <Trophy className="h-4 w-4" />
              Encerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------
// PlacarTime — botões - / + + tap longo
// -----------------------------------------------------------------------------

const LONG_PRESS_MS = 500;

function PlacarTime({
  time,
  gols,
  onMinus,
  onPlus,
  onLongPress,
}: {
  time: TimeAovivo;
  gols: number;
  onMinus: () => void;
  onPlus: () => void;
  onLongPress: () => void;
}) {
  const cor = COR_HEX[(time.cor as CorTime) ?? 'blue'] ?? '#3b82f6';
  const longPressTimer = useRef<number | null>(null);
  const movedRef = useRef(false);

  function startLongPress() {
    movedRef.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      onLongPress();
    }, LONG_PRESS_MS);
  }
  function cancelLongPress() {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3"
      style={{ borderTopWidth: 4, borderTopColor: cor }}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: cor }}
          aria-hidden
        />
        <span className="truncate font-display text-sm font-semibold uppercase">
          {time.nome}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onMinus}
          aria-label={`Remover gol de ${time.nome}`}
          className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-surface text-foreground hover:bg-surface-offset"
        >
          <Minus className="h-5 w-5" />
        </button>
        <span
          className="flex-1 text-center font-display text-5xl font-bold tabular-nums sm:text-6xl"
          aria-live="polite"
        >
          {gols}
        </span>
        <button
          type="button"
          onClick={(e) => {
            // Se foi disparado long-press, ignorar o click (já abriu modal).
            if (movedRef.current) return;
            // O onClick nativo do botão também dispara após pointerup; só processamos
            // se o timer ainda estava ativo (= não virou long-press).
            if (longPressTimer.current === null) return;
            cancelLongPress();
            onPlus();
            void e;
          }}
          onPointerDown={startLongPress}
          onPointerUp={(e) => {
            if (longPressTimer.current != null) {
              // Não foi long-press — onClick acima cuidará do +1.
              return;
            }
            // Long-press já disparou; consumir o evento.
            e.preventDefault();
          }}
          onPointerLeave={cancelLongPress}
          onPointerCancel={cancelLongPress}
          aria-label={`Adicionar gol de ${time.nome}`}
          className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// FeedItem
// -----------------------------------------------------------------------------

function FeedItem({ ev, onDelete }: { ev: EventoApi; onDelete: () => void }) {
  const pending = ev.id.startsWith('pending-');
  return (
    <li className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
      <span className="w-10 text-center text-sm font-mono tabular-nums text-muted">
        {ev.minuto != null ? `${ev.minuto}'` : '—'}
      </span>
      <EventoBadge tipo={ev.tipo} dadosExtras={ev.dadosExtras} />
      <span
        className="ml-1 flex h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: ev.timeCor ?? '#888' }}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-sm">
        {ev.timeNome ? <span className="font-medium">{ev.timeNome}</span> : null}
      </span>
      {pending ? (
        <span className="text-xs text-warning" title="Aguardando sincronização">
          ⌛
        </span>
      ) : null}
      <button
        type="button"
        onClick={onDelete}
        className="ml-1 rounded-md p-1 text-muted hover:bg-surface-offset hover:text-destructive"
        aria-label="Remover evento"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function EventoBadge({
  tipo,
  dadosExtras,
}: {
  tipo: string;
  dadosExtras: Record<string, unknown> | null | unknown;
}) {
  if (tipo === 'gol') {
    const olim = (dadosExtras as { golOlimpico?: boolean } | null)?.golOlimpico;
    return (
      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
        ⚽ Gol{olim ? ' olímpico' : ''}
      </span>
    );
  }
  if (tipo === 'substituicao') {
    return (
      <span className="rounded-full bg-info/15 px-2 py-0.5 text-xs font-semibold text-info">
        🔄 Sub
      </span>
    );
  }
  const card = CARTOES_LABEL[tipo];
  if (card) {
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${card.cls}`}>
        {card.label}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-surface-offset px-2 py-0.5 text-xs font-semibold">
      {tipo}
    </span>
  );
}

// referencia explicita p/ TS sobre PendingEvento (evita warning de import)
export type { PendingEvento };
