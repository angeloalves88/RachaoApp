'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarPlus,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Segmented } from '@/components/ui/segmented';
import { getAgenda, type AgendaResponse, type BloqueioRow } from '@/lib/estadios-actions';
import { BloquearHorarioDialog } from './bloquear-horario-dialog';

interface Props {
  initial: AgendaResponse;
  mesInicial: { ano: number; mes: number };
}

type View = 'mes' | 'semana' | 'dia';

function toDateStr(ano: number, mes: number, dia: number): string {
  const m = String(mes + 1).padStart(2, '0');
  const d = String(dia).padStart(2, '0');
  return `${ano}-${m}-${d}`;
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay());
  return out;
}

const DIA_NOMES_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const MES_NOMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function AgendaClient({ initial, mesInicial }: Props) {
  const [view, setView] = useState<View>('mes');
  const [ano, setAno] = useState(mesInicial.ano);
  const [mes, setMes] = useState(mesInicial.mes);
  const [data, setData] = useState<AgendaResponse>(initial);
  const [carregando, setCarregando] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [semanaInicio, setSemanaInicio] = useState<Date>(() =>
    startOfWeek(new Date(mesInicial.ano, mesInicial.mes, 1)),
  );
  const [bloquearOpen, setBloquearOpen] = useState(false);
  const [bloquearDataIso, setBloquearDataIso] = useState<string | null>(null);

  useEffect(() => {
    if (ano === mesInicial.ano && mes === mesInicial.mes) return;
    let cancelado = false;
    setCarregando(true);
    const inicio = new Date(ano, mes, 1);
    const fim = new Date(ano, mes + 1, 0, 23, 59, 59);
    getAgenda(inicio.toISOString(), fim.toISOString())
      .then((res) => {
        if (!cancelado) setData(res);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [ano, mes, mesInicial.ano, mesInicial.mes]);

  const partidasPorDia = useMemo(() => {
    const m = new Map<number, AgendaResponse['partidas']>();
    for (const p of data.partidas) {
      const d = new Date(p.dataHora);
      if (d.getFullYear() === ano && d.getMonth() === mes) {
        const dia = d.getDate();
        const arr = m.get(dia) ?? [];
        arr.push(p);
        m.set(dia, arr);
      }
    }
    return m;
  }, [data.partidas, ano, mes]);

  const bloqueadosPorDia = useMemo(() => {
    const s = new Set<number>();
    for (const b of data.bloqueios) {
      const d = new Date(b.data);
      if (d.getFullYear() === ano && d.getMonth() === mes) s.add(d.getDate());
    }
    return s;
  }, [data.bloqueios, ano, mes]);

  function navegar(delta: number) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes < 0) {
      novoMes = 11;
      novoAno -= 1;
    } else if (novoMes > 11) {
      novoMes = 0;
      novoAno += 1;
    }
    setMes(novoMes);
    setAno(novoAno);
    setDiaSelecionado(null);
  }

  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const grade: Array<number | null> = [];
  for (let i = 0; i < primeiroDiaSemana; i++) grade.push(null);
  for (let d = 1; d <= totalDias; d++) grade.push(d);

  const partidasDoDia = diaSelecionado != null ? partidasPorDia.get(diaSelecionado) ?? [] : [];

  function abrirBloqueio(dataIso: string) {
    setBloquearDataIso(dataIso);
    setBloquearOpen(true);
  }

  function handleBloqueado(b: BloqueioRow) {
    setData((prev) => ({ ...prev, bloqueios: [...prev.bloqueios, b] }));
  }

  return (
    <div className="container space-y-4 py-5">
      <header className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" onClick={() => navegar(-1)} aria-label="Mês anterior">
          <ChevronLeft size={18} />
        </Button>
        <div className="text-center">
          <h1 className="font-display text-xl font-bold leading-tight">
            {MES_NOMES[mes]} {ano}
          </h1>
          {carregando ? (
            <p className="flex items-center justify-center gap-1 text-xs text-muted">
              <RefreshCw size={10} className="animate-spin" /> Carregando…
            </p>
          ) : null}
        </div>
        <Button variant="outline" size="icon" onClick={() => navegar(1)} aria-label="Próximo mês">
          <ChevronRight size={18} />
        </Button>
      </header>

      <div className="flex items-center justify-between gap-2">
        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { value: 'mes', label: 'Mês' },
            { value: 'semana', label: 'Semana' },
            { value: 'dia', label: 'Dia' },
          ]}
          size="sm"
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const hoje = new Date();
            const isoHoje = toDateStr(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
            abrirBloqueio(isoHoje);
          }}
        >
          <CalendarPlus size={14} aria-hidden /> Bloquear data
        </Button>
      </div>

      {view === 'mes' ? (
        <Card>
          <CardContent className="p-2">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-muted">
              {DIA_NOMES_CURTO.map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {grade.map((d, idx) => {
                if (d == null) {
                  return <div key={idx} className="aspect-square rounded bg-transparent" />;
                }
                const partidas = partidasPorDia.get(d) ?? [];
                const bloqueado = bloqueadosPorDia.has(d);
                const temPendente = partidas.some((p) => p.statusEstadio === 'pendente');
                const temAprovada = partidas.some((p) => p.statusEstadio === 'aprovado');
                const selecionado = d === diaSelecionado;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setDiaSelecionado(d);
                      setView('dia');
                    }}
                    className={
                      'flex aspect-square flex-col items-center justify-center rounded border text-xs ' +
                      (selecionado
                        ? 'border-primary bg-primary-highlight/40'
                        : bloqueado
                          ? 'border-border bg-surface-offset text-muted'
                          : 'border-border bg-surface hover:bg-surface-2')
                    }
                  >
                    <span className="font-medium">{d}</span>
                    <div className="mt-0.5 flex h-1 items-center gap-0.5">
                      {temAprovada ? <span className="h-1 w-1 rounded-full bg-success" /> : null}
                      {temPendente ? <span className="h-1 w-1 rounded-full bg-warning" /> : null}
                      {bloqueado ? <span className="h-1 w-1 rounded-full bg-destructive" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : view === 'semana' ? (
        <SemanaView
          inicio={semanaInicio}
          onAvancar={() =>
            setSemanaInicio((d) => {
              const next = new Date(d);
              next.setDate(next.getDate() + 7);
              return next;
            })
          }
          onVoltar={() =>
            setSemanaInicio((d) => {
              const next = new Date(d);
              next.setDate(next.getDate() - 7);
              return next;
            })
          }
          partidas={data.partidas}
          bloqueios={data.bloqueios}
          onBloquearDia={abrirBloqueio}
          onAbrirDia={(d) => {
            setAno(d.getFullYear());
            setMes(d.getMonth());
            setDiaSelecionado(d.getDate());
            setView('dia');
          }}
        />
      ) : (
        <DiaView
          dia={diaSelecionado ?? new Date().getDate()}
          mes={mes}
          ano={ano}
          partidas={partidasDoDia}
          bloqueio={
            diaSelecionado != null && bloqueadosPorDia.has(diaSelecionado)
              ? data.bloqueios.find((b) => {
                  const dt = new Date(b.data);
                  return (
                    dt.getFullYear() === ano &&
                    dt.getMonth() === mes &&
                    dt.getDate() === diaSelecionado
                  );
                }) ?? null
              : null
          }
          onBloquear={() =>
            abrirBloqueio(
              toDateStr(ano, mes, diaSelecionado ?? new Date().getDate()),
            )
          }
        />
      )}

      <BloquearHorarioDialog
        open={bloquearOpen}
        onOpenChange={setBloquearOpen}
        dataInicial={bloquearDataIso}
        onBlocked={handleBloqueado}
      />

      {/* Legenda */}
      <div className="flex flex-wrap gap-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Aprovada
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Pendente
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> Bloqueada
        </span>
      </div>
    </div>
  );
}

function DiaView({
  dia,
  mes,
  ano,
  partidas,
  bloqueio,
  onBloquear,
}: {
  dia: number;
  mes: number;
  ano: number;
  partidas: AgendaResponse['partidas'];
  bloqueio: AgendaResponse['bloqueios'][number] | null;
  onBloquear?: () => void;
}) {
  const dataFmt = new Date(ano, mes, dia).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">{dataFmt}</h2>
        {!bloqueio && onBloquear ? (
          <Button variant="outline" size="sm" onClick={onBloquear}>
            <CalendarPlus size={14} aria-hidden /> Bloquear
          </Button>
        ) : null}
      </div>

      {bloqueio ? (
        <Card>
          <CardContent className="flex items-start gap-2 px-3 py-2.5">
            <CalendarX2 size={16} className="mt-0.5 text-destructive" />
            <div>
              <p className="text-sm font-medium">Data bloqueada</p>
              {bloqueio.motivo ? (
                <p className="text-xs text-muted">{bloqueio.motivo}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {partidas.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-surface px-3 py-4 text-center text-sm text-muted">
          Sem partidas neste dia.
        </p>
      ) : (
        <div className="space-y-2">
          {partidas
            .slice()
            .sort((a, b) => a.dataHora.localeCompare(b.dataHora))
            .map((p) => {
              const dt = new Date(p.dataHora);
              const fim = new Date(dt.getTime() + p.tempoTotal * 60000);
              const inicio = dt.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const fimStr = fim.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <Card key={p.id}>
                  <CardContent className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {inicio} – {fimStr}
                      </p>
                      <StatusBadge status={p.statusEstadio} />
                    </div>
                    <p className="text-sm text-foreground">{p.grupo.nome}</p>
                    <p className="text-xs text-muted">
                      {p.numTimes} times · {p.numTimes * (p.boleirosPorTime + p.reservasPorTime)}{' '}
                      boleiros
                    </p>
                    {p.statusEstadio === 'pendente' ? (
                      <Link
                        href="/estadio/solicitacoes"
                        className="mt-1 inline-block text-xs font-medium text-primary"
                      >
                        Responder solicitação →
                      </Link>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'aprovado') return <Badge variant="success">Aprovada</Badge>;
  if (status === 'pendente') return <Badge variant="warning">Pendente</Badge>;
  if (status === 'recusado') return <Badge variant="destructive">Recusada</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

/**
 * Visualizacao semanal: 7 colunas (dias), cada uma lista as partidas em ordem
 * cronologica e tem um botao para bloquear aquela data. Clicar em uma celula
 * vazia (ou no proprio header do dia) abre a visualizacao detalhada de dia.
 */
function SemanaView({
  inicio,
  onAvancar,
  onVoltar,
  partidas,
  bloqueios,
  onBloquearDia,
  onAbrirDia,
}: {
  inicio: Date;
  onAvancar: () => void;
  onVoltar: () => void;
  partidas: AgendaResponse['partidas'];
  bloqueios: AgendaResponse['bloqueios'];
  onBloquearDia: (isoDate: string) => void;
  onAbrirDia: (d: Date) => void;
}) {
  const dias = useMemo(() => {
    const out: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      out.push(d);
    }
    return out;
  }, [inicio]);

  function partidasDoDia(d: Date) {
    return partidas
      .filter((p) => {
        const x = new Date(p.dataHora);
        return (
          x.getFullYear() === d.getFullYear() &&
          x.getMonth() === d.getMonth() &&
          x.getDate() === d.getDate()
        );
      })
      .sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  }

  function bloqueioDoDia(d: Date) {
    return (
      bloqueios.find((b) => {
        const x = new Date(b.data);
        return (
          x.getFullYear() === d.getFullYear() &&
          x.getMonth() === d.getMonth() &&
          x.getDate() === d.getDate()
        );
      }) ?? null
    );
  }

  const tituloSemana = `${dias[0]!.getDate()}/${dias[0]!.getMonth() + 1} – ${dias[6]!.getDate()}/${dias[6]!.getMonth() + 1}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" onClick={onVoltar} aria-label="Semana anterior">
          <ChevronLeft size={16} />
        </Button>
        <p className="text-sm font-medium tabular-nums">{tituloSemana}</p>
        <Button variant="outline" size="icon" onClick={onAvancar} aria-label="Próxima semana">
          <ChevronRight size={16} />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {dias.map((d, idx) => {
          const ps = partidasDoDia(d);
          const bloqueio = bloqueioDoDia(d);
          const iso = toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
          return (
            <Card key={idx} className={bloqueio ? 'opacity-80' : ''}>
              <CardContent className="space-y-1.5 px-2.5 py-2">
                <button
                  type="button"
                  onClick={() => onAbrirDia(d)}
                  className="block w-full text-left"
                >
                  <p className="text-[10px] uppercase text-muted">
                    {DIA_NOMES_CURTO[d.getDay()]}
                  </p>
                  <p className="font-display text-lg font-semibold leading-none">
                    {d.getDate()}/{d.getMonth() + 1}
                  </p>
                </button>

                {bloqueio ? (
                  <p className="flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-1 text-[11px] text-destructive">
                    <CalendarX2 size={12} aria-hidden /> Bloqueado
                  </p>
                ) : null}

                <ul className="space-y-1">
                  {ps.length === 0 && !bloqueio ? (
                    <li>
                      <button
                        type="button"
                        onClick={() => onBloquearDia(iso)}
                        className="block w-full rounded border border-dashed border-border px-1.5 py-2 text-center text-[11px] text-muted hover:bg-surface-2 hover:text-foreground"
                      >
                        Vazio · clique para bloquear
                      </button>
                    </li>
                  ) : (
                    ps.map((p) => {
                      const dt = new Date(p.dataHora);
                      const hora = dt.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const cls =
                        p.statusEstadio === 'aprovado'
                          ? 'bg-success/15 text-success border-success/40'
                          : p.statusEstadio === 'pendente'
                            ? 'bg-warning/15 text-warning border-warning/40'
                            : 'bg-surface-offset text-muted border-border';
                      return (
                        <li key={p.id}>
                          <Link
                            href={`/partidas/${p.id}`}
                            className={`block rounded border px-1.5 py-1 text-[11px] ${cls}`}
                          >
                            <p className="truncate font-medium">
                              {hora} · {p.grupo.nome}
                            </p>
                            <p className="truncate text-[10px] opacity-80">
                              {p.numTimes}t · {p.numTimes * (p.boleirosPorTime + p.reservasPorTime)}b
                            </p>
                          </Link>
                        </li>
                      );
                    })
                  )}
                </ul>

                {!bloqueio && ps.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => onBloquearDia(iso)}
                    className="block w-full text-center text-[10px] text-muted hover:text-foreground hover:underline"
                  >
                    + Bloquear este dia
                  </button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
