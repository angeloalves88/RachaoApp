'use client';

import { useMemo } from 'react';
import { COR_HEX } from '@/lib/escalacao-ui';
import type { CorTime } from '@rachao/shared/zod';
import type { AoVivoEstado, EventoApi } from '@/lib/aovivo-actions';
import {
  artilhariaCompleta,
  calcularClassificacaoTimes,
  extrairStatsDeEventos,
  mergeEstatisticasTimes,
} from '@/lib/classificacao-aovivo';
import type { TimeAovivo } from './modais';

interface Props {
  times: TimeAovivo[];
  aoVivoEstado: AoVivoEstado;
  jogoFinalizado: boolean;
  placarJogoAtual: Map<string, number>;
  eventosJogoAtual: EventoApi[];
}

function resolverNomeBoleiro(times: TimeAovivo[], boleiroId: string, timeId: string): string {
  const time = times.find((t) => t.id === timeId);
  const b = time?.boleiros.find((x) => x.boleiroId === boleiroId);
  return b?.apelido ?? b?.nome ?? 'Jogador';
}

export function ClassificacaoTabelas({
  times,
  aoVivoEstado,
  jogoFinalizado,
  placarJogoAtual,
  eventosJogoAtual,
}: Props) {
  const resolverNome = (boleiroId: string, timeId: string) =>
    resolverNomeBoleiro(times, boleiroId, timeId);

  const estatisticasExibicao = useMemo(() => {
    if (jogoFinalizado) return aoVivoEstado.estatisticasTimes;
    const { cartoesPorTime } = extrairStatsDeEventos(eventosJogoAtual, resolverNome);
    return mergeEstatisticasTimes(aoVivoEstado.estatisticasTimes, cartoesPorTime);
  }, [jogoFinalizado, aoVivoEstado.estatisticasTimes, eventosJogoAtual, times]);

  const classificacao = useMemo(
    () =>
      calcularClassificacaoTimes(
        times.map((t) => ({ id: t.id, nome: t.nome, cor: t.cor as string })),
        aoVivoEstado.resultados,
        estatisticasExibicao,
        jogoFinalizado ? undefined : placarJogoAtual,
      ),
    [times, aoVivoEstado.resultados, estatisticasExibicao, jogoFinalizado, placarJogoAtual],
  );

  const artilharia = useMemo(
    () =>
      artilhariaCompleta(
        aoVivoEstado.artilharia,
        eventosJogoAtual,
        resolverNome,
        !jogoFinalizado,
      ),
    [aoVivoEstado.artilharia, eventosJogoAtual, jogoFinalizado, times],
  );

  if (classificacao.length === 0 && artilharia.length === 0) return null;

  return (
    <section className="space-y-4">
      {classificacao.length > 0 && (
        <div>
          <h2 className="mb-2 font-display text-base font-semibold">Classificação</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[28rem] text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-muted">
                  <th className="px-2 py-2 font-semibold">#</th>
                  <th className="px-2 py-2 font-semibold">Time</th>
                  <th className="px-2 py-2 text-center font-semibold">Pts</th>
                  <th className="px-2 py-2 text-center font-semibold">V</th>
                  <th className="px-2 py-2 text-center font-semibold">E</th>
                  <th className="px-2 py-2 text-center font-semibold">D</th>
                  <th className="px-2 py-2 text-center font-semibold">J</th>
                  <th className="px-2 py-2 text-center font-semibold">Gols</th>
                  <th className="px-2 py-2 text-center font-semibold">SG</th>
                  <th className="px-2 py-2 text-center font-semibold">Cartões</th>
                </tr>
              </thead>
              <tbody>
                {classificacao.map((row, i) => {
                  const cor = COR_HEX[(row.cor as CorTime) ?? 'blue'] ?? '#3b82f6';
                  const cartoes =
                    row.amarelos + row.vermelhos + row.azuis > 0
                      ? `${row.amarelos > 0 ? `🟨${row.amarelos}` : ''}${row.vermelhos > 0 ? ` 🟥${row.vermelhos}` : ''}${row.azuis > 0 ? ` 🟦${row.azuis}` : ''}`.trim()
                      : '—';
                  return (
                    <tr
                      key={row.timeId}
                      className="border-b border-border/60 last:border-0 odd:bg-surface/40"
                    >
                      <td className="px-2 py-2 font-semibold text-muted">{i + 1}</td>
                      <td className="px-2 py-2">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: cor }}
                          />
                          <span className="max-w-[5rem] truncate sm:max-w-none">{row.nome}</span>
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-primary">{row.pts}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{row.v}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{row.e}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{row.d}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{row.j}</td>
                      <td className="px-2 py-2 text-center tabular-nums">
                        {row.gp}
                        <span className="text-muted">–</span>
                        {row.gc}
                      </td>
                      <td
                        className={`px-2 py-2 text-center tabular-nums ${
                          row.sg > 0 ? 'text-success' : row.sg < 0 ? 'text-destructive' : ''
                        }`}
                      >
                        {row.sg > 0 ? `+${row.sg}` : row.sg}
                      </td>
                      <td className="px-2 py-2 text-center whitespace-nowrap">{cartoes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!jogoFinalizado && placarJogoAtual.size > 0 && (
            <p className="mt-1 text-[10px] text-muted">
              Gols do jogo em andamento já entram na coluna Gols.
            </p>
          )}
        </div>
      )}

      {artilharia.length > 0 && (
        <div>
          <h2 className="mb-2 font-display text-base font-semibold">Artilharia</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[16rem] text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-muted">
                  <th className="px-2 py-2 font-semibold">#</th>
                  <th className="px-2 py-2 font-semibold">Jogador</th>
                  <th className="px-2 py-2 font-semibold">Time</th>
                  <th className="px-2 py-2 text-center font-semibold">Gols</th>
                </tr>
              </thead>
              <tbody>
                {artilharia.map((a, i) => {
                  const time = times.find((t) => t.id === a.timeId);
                  const cor = COR_HEX[(time?.cor as CorTime) ?? 'blue'] ?? '#3b82f6';
                  return (
                    <tr
                      key={a.boleiroId}
                      className="border-b border-border/60 last:border-0 odd:bg-surface/40"
                    >
                      <td className="px-2 py-2 font-semibold text-muted">{i + 1}</td>
                      <td className="max-w-[8rem] truncate px-2 py-2 font-medium">
                        {a.boleiroNome}
                      </td>
                      <td className="px-2 py-2">
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: cor }}
                          />
                          <span className="truncate">{time?.nome ?? '—'}</span>
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center font-bold tabular-nums">⚽ {a.gols}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
