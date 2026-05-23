/**
 * Consolida eventos pendentes no `aoVivoEstado` antes de encerrar a partida.
 * Evita perder cartões/gols do último sub-jogo quando o presidente clica em
 * "Encerrar" sem passar por "Finalizar jogo".
 */
import {
  cartoesPorTimeFromEventos,
  golsTotaisFromResultados,
  mergeEstatisticasTimes,
  parseAoVivoEstado,
  type AoVivoResultado,
} from './classificacao-resumo.js';

export function jogoDoEvento(dadosExtras: unknown): number {
  if (!dadosExtras || typeof dadosExtras !== 'object' || Array.isArray(dadosExtras)) return 1;
  const j = (dadosExtras as Record<string, unknown>).jogo;
  return typeof j === 'number' && Number.isInteger(j) && j >= 1 ? j : 1;
}

type EventoMin = {
  tipo: string;
  timeId: string | null;
  boleiroId: string | null;
  dadosExtras: unknown;
};

export function consolidarAoVivoEstado(
  aoVivoRaw: unknown,
  eventos: EventoMin[],
): Record<string, unknown> {
  const prev =
    aoVivoRaw && typeof aoVivoRaw === 'object' && !Array.isArray(aoVivoRaw)
      ? { ...(aoVivoRaw as Record<string, unknown>) }
      : {};
  const parsed = parseAoVivoEstado(aoVivoRaw);

  const estatisticasTimes = mergeEstatisticasTimes(
    parsed.estatisticasTimes,
    cartoesPorTimeFromEventos(eventos),
  );

  let resultados: AoVivoResultado[] = [...(parsed.resultados ?? [])];
  const jogoAtual = typeof prev.jogoAtual === 'number' ? prev.jogoAtual : 1;
  const jogoFinalizado = prev.jogoFinalizado === true;
  const confronto = prev.confronto as
    | { timeAId: string; timeBId: string }
    | null
    | undefined;

  if (!jogoFinalizado && confronto?.timeAId && confronto?.timeBId) {
    const eventosJogo = eventos.filter((e) => jogoDoEvento(e.dadosExtras) === jogoAtual);
    let golsA = 0;
    let golsB = 0;
    for (const ev of eventosJogo) {
      if (ev.tipo !== 'gol' || !ev.timeId) continue;
      if (ev.timeId === confronto.timeAId) golsA++;
      else if (ev.timeId === confronto.timeBId) golsB++;
    }
    resultados = [
      ...resultados.filter((r) => r.jogo !== jogoAtual),
      {
        jogo: jogoAtual,
        timeAId: confronto.timeAId,
        timeBId: confronto.timeBId,
        golsA,
        golsB,
      },
    ];
  }

  const artMap = new Map<
    string,
    { boleiroId: string; boleiroNome: string; timeId: string; gols: number }
  >();
  for (const a of parsed.artilharia ?? []) {
    artMap.set(a.boleiroId, { ...a });
  }
  for (const ev of eventos) {
    if (ev.tipo === 'gol' && ev.boleiroId && ev.timeId) {
      const cur = artMap.get(ev.boleiroId);
      if (cur) cur.gols++;
      else {
        artMap.set(ev.boleiroId, {
          boleiroId: ev.boleiroId,
          boleiroNome: '',
          timeId: ev.timeId,
          gols: 1,
        });
      }
    }
  }

  return {
    ...prev,
    estatisticasTimes,
    resultados,
    artilharia: [...artMap.values()],
    jogoFinalizado: true,
  };
}

export function golsFinaisPorTime(
  eventos: EventoMin[],
  resultados: AoVivoResultado[] | undefined,
): Map<string, number> {
  const map = golsTotaisFromResultados(resultados);
  for (const ev of eventos) {
    if (ev.tipo === 'gol' && ev.timeId) {
      map.set(ev.timeId, (map.get(ev.timeId) ?? 0) + 1);
    }
  }
  return map;
}
