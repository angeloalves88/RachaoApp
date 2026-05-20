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
  Trash2,
  Trophy,
  UserPlus,
  Users,
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
  type AoVivoEstado,
  type EventoApi,
  encerrarPartida,
  getToken,
  limparEventosDoJogo,
  patchAoVivoEstado,
  postCronometro,
  removerEvento,
} from '@/lib/aovivo-actions';
import { ConvidadoAvulsoDialog } from '@/components/partidas/convidado-avulso-dialog';
import {
  discardFailed,
  enqueueEvento,
  flushPending,
  partitionPending,
  removePending,
  removePendingForJogo,
  retryFailed,
  useOnline,
  usePending,
  type PendingEvento,
} from '@/lib/offline-queue';
import type { EscalacaoGetResponse } from '@/lib/escalacao-actions';
import type { PartidaDetalhe } from '@/lib/types';
import { clearActiveSession, setActiveSession, setPlacarSnapshot } from '@/lib/aovivo-session';
import {
  extrairStatsDeEventos,
  mergeArtilharia,
  mergeEstatisticasTimes,
} from '@/lib/classificacao-aovivo';
import { Cronometro } from './cronometro';
import { CartaoModal, GolModal, SubstituicaoModal, type TimeAovivo } from './modais';
import { ConfrontoElenco } from './confronto-elenco';
import { loadCronoState } from '@/lib/cronometro-local';
import { ClassificacaoAcoes } from './classificacao-acoes';
import { ClassificacaoTabelas } from './classificacao-tabelas';

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
  jogo?: number;
  clientId?: string;
  [k: string]: unknown;
}

interface DadosExtrasCartao {
  duracaoAzul?: number;
  jogo?: number;
  clientId?: string;
  [k: string]: unknown;
}

interface DadosExtrasSub {
  boleiroSubstitutoId?: string;
  jogo?: number;
  clientId?: string;
  [k: string]: unknown;
}

interface JogadorSelecionado {
  timeId: string;
  boleiroId: string;
  boleiroNome: string;
}

function eventoJogo(ev: EventoApi): number {
  const j = (ev.dadosExtras as { jogo?: number } | null)?.jogo;
  return typeof j === 'number' && j >= 1 ? j : 1;
}

export function AoVivoClient({ partida, escalacao, eventosIniciais }: Props) {
  const router = useRouter();
  const isOnline = useOnline();
  const pending = usePending(partida.id);

  const numPartidas =
    partida.numPartidas ??
    Math.max(1, Math.floor(partida.tempoTotal / Math.max(1, partida.tempoPartida)));

  // Reactive aoVivoEstado — evita usar o valor stale do SSR após PATCHes
  const [aoVivoEstado, setAoVivoEstado] = useState<AoVivoEstado>(() => ({
    jogoAtual: 1,
    jogoFinalizado: false,
    resultados: [],
    confronto: null,
    ...(partida.aoVivoEstado ?? {}),
  }));

  const jogoAtual = aoVivoEstado.jogoAtual ?? 1;
  const jogoFinalizado = aoVivoEstado.jogoFinalizado ?? false;
  const confronto = aoVivoEstado.confronto ?? null;

  const [eventos, setEventos] = useState<EventoApi[]>(eventosIniciais);
  const [minuto, setMinuto] = useState(0);
  const [golOpen, setGolOpen] = useState(false);
  const [cartaoOpen, setCartaoOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [encerrarOpen, setEncerrarOpen] = useState(false);
  const [defaultTimeId, setDefaultTimeId] = useState<string | null>(null);
  const [defaultBoleiroId, setDefaultBoleiroId] = useState<string | null>(null);
  const [syncedFlash, setSyncedFlash] = useState(false);
  const [jogadoresOpen, setJogadoresOpen] = useState(false);
  const [confrontoOpen, setConfrontoOpen] = useState(false);
  const [jogadorSelecionado, setJogadorSelecionado] = useState<JogadorSelecionado | null>(null);
  const [confirmandoFinalizar, setConfirmandoFinalizar] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [feedExpandido, setFeedExpandido] = useState(true);
  const [jogoEmAndamento, setJogoEmAndamento] = useState(false);

  const flushingRef = useRef(false);
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    const s = loadCronoState(partida.id, partida.tempoPartida, numPartidas);
    setJogoEmAndamento(s.acumuladoMs > 0 || s.rodando);
  }, [partida.id, partida.tempoPartida, numPartidas, jogoAtual]);

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
        reserva: b.reserva,
      })),
    }));
  }, [escalacao]);

  const timesPlacar = useMemo(() => {
    if (partida.numTimes <= 2) return times;
    if (!confronto) return times.slice(0, 2);
    return times.filter((t) => t.id === confronto.timeAId || t.id === confronto.timeBId);
  }, [times, confronto, partida.numTimes]);

  // Abre seletor de confronto só antes do jogo começar (cronômetro parado e zerado)
  useEffect(() => {
    if (
      partida.numTimes > 2 &&
      !confronto &&
      times.length >= 2 &&
      !jogoEmAndamento &&
      !jogoFinalizado
    ) {
      setConfrontoOpen(true);
    }
  }, [partida.numTimes, confronto, times.length, jogoEmAndamento, jogoFinalizado]);

  // Placar total (todos os jogos) — para LiveMatchBar e snapshot
  const placarPorTime = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of eventos) {
      if (ev.tipo === 'gol' && ev.timeId) {
        map.set(ev.timeId, (map.get(ev.timeId) ?? 0) + 1);
      }
    }
    return map;
  }, [eventos]);

  // Eventos apenas do sub-jogo em andamento (jogos finalizados sao limpos apos gravar em resultados)
  const eventosJogoAtual = useMemo(
    () => eventos.filter((ev) => eventoJogo(ev) === jogoAtual),
    [eventos, jogoAtual],
  );

  // Placar filtrado pelo jogo atual (para exibir no PlacarTime e ClassificacaoRodape)
  const placarJogoAtual = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of eventosJogoAtual) {
      if (ev.tipo === 'gol' && ev.timeId) {
        map.set(ev.timeId, (map.get(ev.timeId) ?? 0) + 1);
      }
    }
    return map;
  }, [eventosJogoAtual]);

  useEffect(() => {
    if (partida.status !== 'em_andamento') return;
    setActiveSession({
      partidaId: partida.id,
      titulo: partida.grupo.nome,
      tempoPartidaMin: partida.tempoPartida,
      numPartidas,
      times: times.map((t) => ({ id: t.id, nome: t.nome, cor: t.cor })),
    });
  }, [partida.id, partida.status, partida.grupo.nome, partida.tempoPartida, numPartidas, times]);

  useEffect(() => {
    if (partida.status !== 'em_andamento') return;
    setPlacarSnapshot(partida.id, placarPorTime);
  }, [partida.id, partida.status, placarPorTime]);

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
          toast.error(`Evento não pôde ser enviado: ${reason}`, { duration: 6000 });
        },
      });
      if (res.sent > 0) {
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

  useEffect(() => {
    void tryFlush();
  }, [isOnline, pending.length, tryFlush]);

  // Enfileira evento com `jogo` nos dadosExtras
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
    boleiroNomePassed?: string,
  ) {
    const extras = { ...(body.dadosExtras ?? {}), jogo: jogoAtual };
    const item = await enqueueEvento(partida.id, { ...body, dadosExtras: extras });
    const optimistic: EventoApi = {
      id: `pending-${item.clientId}`,
      tipo: body.tipo,
      minuto: body.minuto ?? null,
      timeId: body.timeId ?? null,
      timeNome: timeNome ?? null,
      timeCor: timeCor ?? null,
      boleiroId: body.boleiroId ?? null,
      boleiroNome: boleiroNomePassed ?? null,
      dadosExtras: { ...extras, clientId: item.clientId },
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
    const evs = [...eventos];
    for (let i = evs.length - 1; i >= 0; i--) {
      const ev = evs[i]!;
      if (ev.tipo === 'gol' && ev.timeId === timeId && eventoJogo(ev) === jogoAtual) {
        evs.splice(i, 1);
        setEventos(evs);
        if (ev.id.startsWith('pending-')) {
          const cid = (ev.dadosExtras as { clientId?: string } | null)?.clientId ?? null;
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
    setDefaultBoleiroId(null);
    setGolOpen(true);
  }

  // Toque no jogador no elenco → abre dialog de ação rápida
  function handleAcaoJogador(payload: { timeId: string; boleiroId: string; boleiroNome: string }) {
    setJogadorSelecionado(payload);
  }

  async function handleEncerrar() {
    setEncerrando(true);
    try {
      await encerrarPartida(partida.id);
      clearActiveSession();
      toast.success('Partida encerrada!');
      router.push(`/partidas/${partida.id}/resumo`);
    } catch {
      toast.error('Não foi possível encerrar a partida.');
      setEncerrando(false);
    }
  }

  // Finalizar jogo: grava na classificacao (resultados) e limpa eventos deste sub-jogo
  async function handleConfirmarFinalizar() {
    setFinalizando(true);
    try {
      const golsA = placarJogoAtual.get(timesPlacar[0]?.id ?? '') ?? 0;
      const golsB = placarJogoAtual.get(timesPlacar[1]?.id ?? '') ?? 0;
      const novoResultado = {
        jogo: jogoAtual,
        timeAId: timesPlacar[0]?.id ?? '',
        timeBId: timesPlacar[1]?.id ?? '',
        golsA,
        golsB,
      };
      const semEsteJogo = (aoVivoEstado.resultados ?? []).filter((r) => r.jogo !== jogoAtual);
      const novosResultados = [...semEsteJogo, novoResultado];

      const resolverNome = (boleiroId: string, timeId: string) => {
        const time = times.find((t) => t.id === timeId);
        const b = time?.boleiros.find((x) => x.boleiroId === boleiroId);
        return b?.apelido ?? b?.nome ?? 'Jogador';
      };
      const { cartoesPorTime, artilheiros } = extrairStatsDeEventos(
        eventosJogoAtual,
        resolverNome,
      );
      const novasEstatisticas = mergeEstatisticasTimes(
        aoVivoEstado.estatisticasTimes,
        cartoesPorTime,
      );
      const novaArtilharia = mergeArtilharia(aoVivoEstado.artilharia, artilheiros);

      const r = await patchAoVivoEstado(partida.id, {
        jogoFinalizado: true,
        resultados: novosResultados,
        estatisticasTimes: novasEstatisticas,
        artilharia: novaArtilharia,
      });
      setAoVivoEstado((prev) => ({
        ...prev,
        jogoFinalizado: true,
        resultados: r.aoVivoEstado.resultados ?? novosResultados,
        estatisticasTimes: r.aoVivoEstado.estatisticasTimes ?? novasEstatisticas,
        artilharia: r.aoVivoEstado.artilharia ?? novaArtilharia,
      }));
      void postCronometro(partida.id, { acao: 'pausar', clientId: crypto.randomUUID() }).catch(() => {});

      await limparEventosDoJogo(partida.id, jogoAtual);
      await removePendingForJogo(partida.id, jogoAtual);
      setEventos((evs) => evs.filter((ev) => eventoJogo(ev) !== jogoAtual));

      setConfirmandoFinalizar(false);
      toast.success(`Jogo ${jogoAtual} finalizado! Placar salvo na classificação.`);
    } catch {
      toast.error('Não foi possível finalizar o jogo.');
    } finally {
      setFinalizando(false);
    }
  }

  // Avançar para o próximo jogo
  async function handleProximaPartida(novoConfronto?: { timeAId: string; timeBId: string }) {
    const nextJogo = jogoAtual + 1;
    const confrontoFinal = novoConfronto ?? confronto;
    try {
      const r = await patchAoVivoEstado(partida.id, {
        jogoAtual: nextJogo,
        jogoFinalizado: false,
        ...(confrontoFinal !== undefined ? { confronto: confrontoFinal } : {}),
      });
      await postCronometro(partida.id, {
        acao: 'proximo_jogo',
        jogoAtual: nextJogo,
        clientId: crypto.randomUUID(),
      }).catch(() => {});
      setAoVivoEstado((prev) => ({
        ...prev,
        jogoAtual: nextJogo,
        jogoFinalizado: false,
        ...(r.aoVivoEstado.confronto !== undefined
          ? { confronto: r.aoVivoEstado.confronto }
          : confrontoFinal !== undefined
            ? { confronto: confrontoFinal }
            : {}),
      }));
    } catch {
      toast.error('Não foi possível avançar para o próximo jogo.');
    }
  }

  // Disparado pelo ClassificacaoRodape: se 3+ times, abre seletor; se 2, avança direto
  function onProximaPartidaClicked() {
    if (partida.numTimes > 2) {
      setConfrontoOpen(true);
    } else {
      void handleProximaPartida();
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

  const eventosOrdered = useMemo(() => [...eventosJogoAtual].reverse(), [eventosJogoAtual]);

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
    <div className="min-h-screen bg-background pb-8">
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
        <Button type="button" size="sm" variant="outline" onClick={() => setJogadoresOpen(true)}>
          <Users className="h-4 w-4" />
          Jogadores
        </Button>
        <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/15 px-2 py-1 text-xs font-medium text-warning">
          <span className="h-2 w-2 animate-pulse rounded-full bg-warning" />
          EM ANDAMENTO
        </span>
      </header>

      {/* Banners offline / pending / falhos (só no cliente — IndexedDB / navigator) */}
      <div className="container mt-3 space-y-2">
        {clientReady && !isOnline ? (
          <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/15 px-3 py-2 text-sm text-warning">
            <WifiOff className="h-4 w-4" />
            <span>
              Você está offline — {pendingAtivos.length} evento(s) na fila serão enviados ao voltar.
            </span>
          </div>
        ) : clientReady && pendingAtivos.length > 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-info/40 bg-info/10 px-3 py-2 text-sm text-info">
            <Wifi className="h-4 w-4" />
            <span>
              Sincronizando {pendingAtivos.length} evento(s)...
              {totalGoleiroAttempts > 0 && (
                <span className="ml-1 text-xs opacity-80">
                  ({totalGoleiroAttempts} retentativa{totalGoleiroAttempts === 1 ? '' : 's'})
                </span>
              )}
            </span>
          </div>
        ) : clientReady && syncedFlash ? (
          <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/15 px-3 py-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            Sincronizado!
          </div>
        ) : null}

        {clientReady && pendingFalhos.length > 0 && (
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
        )}
      </div>

      <main className="container mt-3 space-y-4">
        {/* Cronômetro compacto */}
        <Cronometro
          partidaId={partida.id}
          tempoPartidaMin={partida.tempoPartida}
          numPartidas={numPartidas}
          jogoAtual={jogoAtual}
          onMinutoChange={setMinuto}
          onStateChange={(s) => setJogoEmAndamento(s.acumuladoMs > 0 || s.rodando)}
        />

        {/* Selector de confronto (3+ times) */}
        {partida.numTimes > 2 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">
              Confronto:{' '}
              {confronto
                ? `${times.find((t) => t.id === confronto.timeAId)?.nome ?? '?'} × ${times.find((t) => t.id === confronto.timeBId)?.nome ?? '?'}`
                : 'Escolha os dois times em campo'}
            </p>
            {!jogoEmAndamento && !jogoFinalizado ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setConfrontoOpen(true)}
              >
                Escolher confronto
              </Button>
            ) : null}
          </div>
        )}

        {/* Placar do jogo atual */}
        <section className="-mx-2 overflow-x-auto px-2">
          <div
            className={`grid min-w-fit gap-2 ${
              timesPlacar.length === 2
                ? 'grid-cols-2'
                : timesPlacar.length === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-4'
            }`}
          >
            {timesPlacar.map((t) => (
              <PlacarTime
                key={t.id}
                time={t}
                gols={placarJogoAtual.get(t.id) ?? 0}
                disabled={jogoFinalizado}
                onMinus={() => quickGol(t.id, -1)}
                onPlus={() => quickGol(t.id, 1)}
                onLongPress={() => abrirGolDoTime(t.id)}
              />
            ))}
          </div>
        </section>

        {/* Elenco lado a lado */}
        {timesPlacar.length >= 2 && (
          <ConfrontoElenco
            times={timesPlacar.slice(0, 2)}
            eventos={eventosJogoAtual}
            jogoAtual={jogoAtual}
            jogoFinalizado={jogoFinalizado}
            onAcaoJogador={handleAcaoJogador}
          />
        )}

        {/* 3 botões de ação */}
        <section className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="h-14 flex-col gap-0.5 text-xs"
            disabled={jogoFinalizado}
            onClick={() => {
              setDefaultTimeId(null);
              setDefaultBoleiroId(null);
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
            className="h-14 flex-col gap-0.5 text-xs"
            disabled={jogoFinalizado}
            onClick={() => {
              setDefaultTimeId(null);
              setDefaultBoleiroId(null);
              setCartaoOpen(true);
            }}
          >
            <span className="text-2xl">🟨</span>
            Cartão
          </Button>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="h-14 flex-col gap-0.5 text-xs"
            disabled={jogoFinalizado}
            onClick={() => {
              setDefaultTimeId(null);
              setDefaultBoleiroId(null);
              setSubOpen(true);
            }}
          >
            <ArrowLeftRight className="h-5 w-5" />
            Sub
          </Button>
        </section>

        <ClassificacaoTabelas
          times={times}
          aoVivoEstado={aoVivoEstado}
          jogoFinalizado={jogoFinalizado}
          placarJogoAtual={placarJogoAtual}
          eventosJogoAtual={eventosJogoAtual}
        />

        {/* Feed de eventos (colapsável) */}
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setFeedExpandido((v) => !v)}
            className="flex w-full items-center justify-between font-display text-base font-semibold"
          >
            <span>Eventos</span>
            <span className="text-xs text-muted">{feedExpandido ? '▲ ocultar' : '▼ mostrar'}</span>
          </button>
          {feedExpandido && (
            <>
              {eventosOrdered.length === 0 ? (
                <p className="rounded-md border border-dashed border-border bg-surface px-3 py-3 text-sm text-muted">
                  Sem eventos. Use os botões acima para registrar.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {eventosOrdered.map((ev) => (
                    <FeedItem key={ev.id} ev={ev} onDelete={() => void deleteEvento(ev)} />
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        <ClassificacaoAcoes
          jogoAtual={jogoAtual}
          jogoFinalizado={jogoFinalizado}
          isUltimoJogo={jogoAtual >= numPartidas}
          confirmandoFinalizar={confirmandoFinalizar}
          finalizando={finalizando}
          encerrando={encerrando}
          nomeA={timesPlacar[0]?.nome ?? 'Time A'}
          nomeB={timesPlacar[1]?.nome ?? 'Time B'}
          golsA={placarJogoAtual.get(timesPlacar[0]?.id ?? '') ?? 0}
          golsB={placarJogoAtual.get(timesPlacar[1]?.id ?? '') ?? 0}
          onRequestFinalizar={() => setConfirmandoFinalizar(true)}
          onConfirmarFinalizar={() => void handleConfirmarFinalizar()}
          onCancelarFinalizar={() => setConfirmandoFinalizar(false)}
          onProximaPartida={onProximaPartidaClicked}
          onEncerrar={() => setEncerrarOpen(true)}
        />
      </main>

      {/* Modal: Gol */}
      <GolModal
        open={golOpen}
        onOpenChange={setGolOpen}
        times={timesPlacar.length > 0 ? timesPlacar : times}
        minutoAtual={minuto}
        defaultTimeId={defaultTimeId}
        defaultBoleiroId={defaultBoleiroId}
        permitirOlimpico={golOlimpicoDuplo}
        onConfirm={async (v) => {
          const t = times.find((x) => x.id === v.timeId);
          const extras: DadosExtrasGol = {};
          if (v.golOlimpico) extras.golOlimpico = true;
          const bName =
            t?.boleiros.find((b) => b.boleiroId === v.boleiroId)?.apelido ??
            t?.boleiros.find((b) => b.boleiroId === v.boleiroId)?.nome;
          await recordEvento(
            { tipo: 'gol', timeId: v.timeId, boleiroId: v.boleiroId, minuto: v.minuto, dadosExtras: extras },
            t?.nome,
            t ? COR_HEX[(t.cor as CorTime) ?? 'blue'] : undefined,
            bName,
          );
        }}
      />

      {/* Modal: Cartão */}
      <CartaoModal
        open={cartaoOpen}
        onOpenChange={setCartaoOpen}
        times={timesPlacar.length > 0 ? timesPlacar : times}
        minutoAtual={minuto}
        defaultTimeId={defaultTimeId}
        defaultBoleiroId={defaultBoleiroId}
        cartaoAzulAtivo={cartaoAzulAtivo}
        duracaoAzulPadrao={duracaoAzulPadrao}
        onConfirm={async (v) => {
          const t = times.find((x) => x.id === v.timeId);
          const extras: DadosExtrasCartao = {};
          if (v.duracaoAzul) extras.duracaoAzul = v.duracaoAzul;
          const bName =
            t?.boleiros.find((b) => b.boleiroId === v.boleiroId)?.apelido ??
            t?.boleiros.find((b) => b.boleiroId === v.boleiroId)?.nome;
          await recordEvento(
            { tipo: v.tipo, timeId: v.timeId, boleiroId: v.boleiroId, minuto: v.minuto, dadosExtras: extras },
            t?.nome,
            t ? COR_HEX[(t.cor as CorTime) ?? 'blue'] : undefined,
            bName,
          );
        }}
      />

      {/* Modal: Substituição */}
      <SubstituicaoModal
        open={subOpen}
        onOpenChange={setSubOpen}
        times={timesPlacar.length > 0 ? timesPlacar : times}
        minutoAtual={minuto}
        defaultTimeId={defaultTimeId}
        defaultBoleiroId={defaultBoleiroId}
        onConfirm={async (v) => {
          const t = times.find((x) => x.id === v.timeId);
          const extras: DadosExtrasSub = { boleiroSubstitutoId: v.entraBoleiroId };
          await recordEvento(
            { tipo: 'substituicao', timeId: v.timeId, boleiroId: v.saiBoleiroId, minuto: v.minuto, dadosExtras: extras },
            t?.nome,
            t ? COR_HEX[(t.cor as CorTime) ?? 'blue'] : undefined,
          );
        }}
      />

      {/* Dialog de ação rápida ao tocar no jogador do elenco */}
      <Dialog
        open={!!jogadorSelecionado}
        onOpenChange={(open) => !open && setJogadorSelecionado(null)}
      >
        <DialogContent fullScreenOnMobile={false} className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="truncate">
              {jogadorSelecionado?.boleiroNome ?? 'Jogador'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 pt-1">
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="justify-start gap-3"
              onClick={() => {
                if (!jogadorSelecionado) return;
                setDefaultTimeId(jogadorSelecionado.timeId);
                setDefaultBoleiroId(jogadorSelecionado.boleiroId);
                setJogadorSelecionado(null);
                setGolOpen(true);
              }}
            >
              <span className="text-2xl">⚽</span> Gol
            </Button>
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="justify-start gap-3"
              onClick={() => {
                if (!jogadorSelecionado) return;
                setDefaultTimeId(jogadorSelecionado.timeId);
                setDefaultBoleiroId(jogadorSelecionado.boleiroId);
                setJogadorSelecionado(null);
                setCartaoOpen(true);
              }}
            >
              <span className="text-2xl">🟨</span> Cartão
            </Button>
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="justify-start gap-3"
              onClick={() => {
                if (!jogadorSelecionado) return;
                setDefaultTimeId(jogadorSelecionado.timeId);
                setDefaultBoleiroId(jogadorSelecionado.boleiroId);
                setJogadorSelecionado(null);
                setSubOpen(true);
              }}
            >
              <ArrowLeftRight className="h-5 w-5" /> Sub
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setJogadorSelecionado(null)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: confronto (3+ times) */}
      <ConfrontoDialog
        open={confrontoOpen}
        onOpenChange={setConfrontoOpen}
        times={times}
        initial={confronto}
        onConfirm={async (c) => {
          if (jogoFinalizado) {
            // Confirmação de confronto para próxima partida
            await handleProximaPartida(c);
          } else {
            await patchAoVivoEstado(partida.id, { confronto: c });
            setAoVivoEstado((prev) => ({ ...prev, confronto: c }));
          }
          setConfrontoOpen(false);
        }}
      />

      {/* Dialog: Jogadores */}
      <Dialog open={jogadoresOpen} onOpenChange={setJogadoresOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Jogadores</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted">
            Adicione convidados ou altere a escalação sem sair do ao-vivo.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <ConvidadoAvulsoDialog
              partidaId={partida.id}
              onAdded={() => router.refresh()}
              trigger={
                <Button type="button" variant="secondary" className="w-full justify-start">
                  <UserPlus className="h-4 w-4" />
                  Adicionar convidado avulso
                </Button>
              }
            />
            <Button type="button" variant="outline" className="w-full" asChild>
              <Link href={`/partidas/${partida.id}/escalacao`}>Abrir escalação</Link>
            </Button>
            <Button type="button" variant="outline" className="w-full" asChild>
              <Link href={`/partidas/${partida.id}/presencas`}>Abrir presenças</Link>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setJogadoresOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar encerrar */}
      <Dialog open={encerrarOpen} onOpenChange={setEncerrarOpen}>
        <DialogContent fullScreenOnMobile={false} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Encerrar partida?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted">
            O placar final será congelado e a partida passará para a tela de resumo. Esta ação não
            pode ser desfeita.
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEncerrarOpen(false)}
              disabled={encerrando}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void handleEncerrar()} disabled={encerrando}>
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
// PlacarTime
// -----------------------------------------------------------------------------

const LONG_PRESS_MS = 500;

function PlacarTime({
  time,
  gols,
  disabled,
  onMinus,
  onPlus,
  onLongPress,
}: {
  time: TimeAovivo;
  gols: number;
  disabled?: boolean;
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
        <span className="truncate font-display text-sm font-semibold uppercase">{time.nome}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onMinus}
          aria-label={`Remover gol de ${time.nome}`}
          className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-surface text-foreground hover:bg-surface-offset disabled:opacity-40"
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
          disabled={disabled}
          onClick={(e) => {
            if (movedRef.current) return;
            if (longPressTimer.current === null) return;
            cancelLongPress();
            onPlus();
            void e;
          }}
          onPointerDown={startLongPress}
          onPointerUp={(e) => {
            if (longPressTimer.current != null) return;
            e.preventDefault();
          }}
          onPointerLeave={cancelLongPress}
          onPointerCancel={cancelLongPress}
          aria-label={`Adicionar gol de ${time.nome}`}
          className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active disabled:opacity-40"
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
      <span className="w-10 shrink-0 text-center font-mono text-sm tabular-nums text-muted">
        {ev.minuto != null ? `${ev.minuto}'` : '—'}
      </span>
      <EventoBadge tipo={ev.tipo} dadosExtras={ev.dadosExtras} />
      <span
        className="ml-1 flex h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: ev.timeCor ?? '#888' }}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-sm">
        {ev.boleiroNome ? (
          <span className="font-medium">{ev.boleiroNome}</span>
        ) : ev.timeNome ? (
          <span className="font-medium">{ev.timeNome}</span>
        ) : null}
      </span>
      {pending && (
        <span className="text-xs text-warning" title="Aguardando sincronização">
          ⌛
        </span>
      )}
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

// -----------------------------------------------------------------------------
// ConfrontoDialog
// -----------------------------------------------------------------------------

function ConfrontoDialog({
  open,
  onOpenChange,
  times,
  initial,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  times: TimeAovivo[];
  initial: { timeAId: string; timeBId: string } | null;
  onConfirm: (c: { timeAId: string; timeBId: string }) => Promise<void>;
}) {
  const [timeAId, setTimeAId] = useState<string | null>(initial?.timeAId ?? null);
  const [timeBId, setTimeBId] = useState<string | null>(initial?.timeBId ?? null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTimeAId(initial?.timeAId ?? times[0]?.id ?? null);
      setTimeBId(initial?.timeBId ?? times[1]?.id ?? null);
    }
  }, [open, initial, times]);

  async function handleSave() {
    if (!timeAId || !timeBId || timeAId === timeBId) return;
    setSaving(true);
    try {
      await onConfirm({ timeAId, timeBId });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confronto em campo</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted">Escolha os dois times que estão jogando agora.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted">Time A</label>
            <select
              className="w-full rounded-md border border-border bg-surface px-2 py-2 text-sm"
              value={timeAId ?? ''}
              onChange={(e) => setTimeAId(e.target.value || null)}
            >
              <option value="">—</option>
              {times.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted">Time B</label>
            <select
              className="w-full rounded-md border border-border bg-surface px-2 py-2 text-sm"
              value={timeBId ?? ''}
              onChange={(e) => setTimeBId(e.target.value || null)}
            >
              <option value="">—</option>
              {times.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === timeAId}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={!timeAId || !timeBId || timeAId === timeBId || saving}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
