/**
 * Agregação do resumo da partida (Bloco 6 / T22).
 * Recalcula placar a partir dos eventos `tipo='gol'` agrupados por `timeId`,
 * artilharia (top 5 boleiros por gols) e timeline cronológica.
 */
import type { PrismaClient } from '@rachao/db';
import {
  calcularClassificacaoResumo,
  cartoesPorTimeFromEventos,
  golsTotaisFromResultados,
  mergeEstatisticasTimes,
  parseAoVivoEstado,
  type ClassificacaoResumoRow,
} from './classificacao-resumo.js';

export interface ResumoTime {
  id: string;
  nome: string;
  cor: string;
  /** Gols totais (eventos + sub-jogos). */
  golsFinal: number;
  /** Pontos na classificação do torneio (V/E/D). */
  pontosFinal: number;
}

export interface ResumoArtilheiro {
  boleiroId: string;
  nome: string;
  apelido: string | null;
  posicao: string | null;
  timeId: string | null;
  timeNome: string | null;
  timeCor: string | null;
  gols: number;
}

export interface ResumoEventoTimeline {
  id: string;
  tipo: string;
  minuto: number | null;
  criadoEm: Date;
  timeId: string | null;
  timeNome: string | null;
  timeCor: string | null;
  boleiroId: string | null;
  boleiroNome: string | null;
  dadosExtras: unknown;
}

export interface ResumoEstatistica {
  boleiroId: string;
  nome: string;
  apelido: string | null;
  timeId: string | null;
  timeNome: string | null;
  gols: number;
  amarelos: number;
  vermelhos: number;
  azuis: number;
}

export type { ClassificacaoResumoRow };

export interface ResumoData {
  partida: {
    id: string;
    dataHora: Date;
    status: string;
    localLivre: string | null;
    estadio: string | null;
    numTimes: number;
    boleirosPorTime: number;
    grupo: { id?: string; nome: string; fotoUrl: string | null };
  };
  times: ResumoTime[];
  artilharia: ResumoArtilheiro[];
  timeline: ResumoEventoTimeline[];
  estatisticas: ResumoEstatistica[];
  totais: {
    totalGols: number;
    totalAmarelos: number;
    totalVermelhos: number;
    totalAzuis: number;
    totalSubs: number;
  };
  classificacao: ClassificacaoResumoRow[];
}

export async function agregarResumo(
  prisma: PrismaClient,
  partidaId: string,
): Promise<ResumoData | null> {
  const partida = await prisma.partida.findUnique({
    where: { id: partidaId },
    include: {
      grupo: { select: { id: true, nome: true, fotoUrl: true } },
      estadio: { select: { nome: true } },
      times: {
        orderBy: { nome: 'asc' },
        include: {
          boleiros: {
            include: {
              boleiroGrupo: {
                select: { id: true, nome: true, apelido: true, posicao: true },
              },
              convidadoAvulso: {
                select: { id: true, nome: true, apelido: true, posicao: true },
              },
            },
          },
        },
      },
      eventos: {
        orderBy: { criadoEm: 'asc' },
        include: {
          time: { select: { id: true, nome: true, cor: true } },
        },
      },
    },
  });

  if (!partida) return null;

  // Mapa boleiroId -> { nome, apelido, posicao, timeId, timeNome, timeCor }
  type BoleiroResolvido = {
    id: string;
    nome: string;
    apelido: string | null;
    posicao: string | null;
    timeId: string | null;
    timeNome: string | null;
    timeCor: string | null;
  };
  const boleiros = new Map<string, BoleiroResolvido>();
  for (const t of partida.times) {
    for (const tb of t.boleiros) {
      const ref = tb.boleiroGrupo ?? tb.convidadoAvulso;
      if (!ref) continue;
      boleiros.set(ref.id, {
        id: ref.id,
        nome: ref.nome,
        apelido: ref.apelido,
        posicao: ref.posicao,
        timeId: t.id,
        timeNome: t.nome,
        timeCor: t.cor,
      });
    }
  }

  // Placar derivado dos eventos
  const golsPorTime = new Map<string, number>();
  for (const ev of partida.eventos) {
    if (ev.tipo === 'gol' && ev.timeId) {
      golsPorTime.set(ev.timeId, (golsPorTime.get(ev.timeId) ?? 0) + 1);
    }
  }

  const aoVivo = parseAoVivoEstado(partida.aoVivoEstado);
  const golsFromResultados = golsTotaisFromResultados(aoVivo.resultados);
  const estatisticasTimes = mergeEstatisticasTimes(
    aoVivo.estatisticasTimes,
    cartoesPorTimeFromEventos(partida.eventos),
  );

  const classificacao = calcularClassificacaoResumo(
    partida.times.map((t) => ({ id: t.id, nome: t.nome, cor: t.cor })),
    aoVivo.resultados,
    estatisticasTimes,
  );
  const ptsPorTime = new Map(classificacao.map((r) => [r.timeId, r.pts]));

  const times: ResumoTime[] = partida.times.map((t) => ({
    id: t.id,
    nome: t.nome,
    cor: t.cor,
    golsFinal: Math.max(
      t.golsFinal ?? 0,
      golsPorTime.get(t.id) ?? 0,
      golsFromResultados.get(t.id) ?? 0,
    ),
    pontosFinal: ptsPorTime.get(t.id) ?? 0,
  }));

  // Estatísticas individuais
  const stats = new Map<string, ResumoEstatistica>();
  function statsFor(boleiroId: string): ResumoEstatistica {
    let s = stats.get(boleiroId);
    if (!s) {
      const b = boleiros.get(boleiroId);
      s = {
        boleiroId,
        nome: b?.nome ?? 'Boleiro',
        apelido: b?.apelido ?? null,
        timeId: b?.timeId ?? null,
        timeNome: b?.timeNome ?? null,
        gols: 0,
        amarelos: 0,
        vermelhos: 0,
        azuis: 0,
      };
      stats.set(boleiroId, s);
    }
    return s;
  }

  let totalGols = 0;
  let totalAmarelos = 0;
  let totalVermelhos = 0;
  let totalAzuis = 0;
  let totalSubs = 0;

  for (const ev of partida.eventos) {
    if (ev.tipo === 'gol') totalGols++;
    else if (ev.tipo === 'amarelo') totalAmarelos++;
    else if (ev.tipo === 'vermelho') totalVermelhos++;
    else if (ev.tipo === 'azul') totalAzuis++;
    else if (ev.tipo === 'substituicao') totalSubs++;

    if (ev.boleiroId) {
      const s = statsFor(ev.boleiroId);
      if (ev.tipo === 'gol') s.gols++;
      else if (ev.tipo === 'amarelo') s.amarelos++;
      else if (ev.tipo === 'vermelho') s.vermelhos++;
      else if (ev.tipo === 'azul') s.azuis++;
    }
  }

  const artilharia: ResumoArtilheiro[] = Array.from(stats.values())
    .filter((s) => s.gols > 0)
    .sort((a, b) => b.gols - a.gols)
    .slice(0, 5)
    .map((s) => {
      const b = boleiros.get(s.boleiroId);
      return {
        boleiroId: s.boleiroId,
        nome: s.nome,
        apelido: s.apelido,
        posicao: b?.posicao ?? null,
        timeId: s.timeId,
        timeNome: s.timeNome,
        timeCor: b?.timeCor ?? null,
        gols: s.gols,
      };
    });

  const timeline: ResumoEventoTimeline[] = partida.eventos.map((ev) => ({
    id: ev.id,
    tipo: ev.tipo,
    minuto: ev.minuto,
    criadoEm: ev.criadoEm,
    timeId: ev.timeId,
    timeNome: ev.time?.nome ?? null,
    timeCor: ev.time?.cor ?? null,
    boleiroId: ev.boleiroId,
    boleiroNome: ev.boleiroId ? (boleiros.get(ev.boleiroId)?.nome ?? null) : null,
    dadosExtras: ev.dadosExtras,
  }));

  for (const a of aoVivo.artilharia ?? []) {
    const s = statsFor(a.boleiroId);
    if (a.gols > s.gols) s.gols = a.gols;
    const b = boleiros.get(a.boleiroId);
    if (b && a.boleiroNome) s.nome = a.boleiroNome;
  }

  const estatisticas = Array.from(stats.values()).sort((a, b) => {
    if (b.gols !== a.gols) return b.gols - a.gols;
    return a.nome.localeCompare(b.nome);
  });

  const artilhariaMerged: ResumoArtilheiro[] = (() => {
    const fromStats = Array.from(stats.values())
      .filter((s) => s.gols > 0)
      .map((s) => {
        const b = boleiros.get(s.boleiroId);
        return {
          boleiroId: s.boleiroId,
          nome: s.nome,
          apelido: s.apelido,
          posicao: b?.posicao ?? null,
          timeId: s.timeId,
          timeNome: s.timeNome,
          timeCor: b?.timeCor ?? null,
          gols: s.gols,
        };
      });
    const map = new Map(fromStats.map((a) => [a.boleiroId, a]));
    for (const a of aoVivo.artilharia ?? []) {
      const prev = map.get(a.boleiroId);
      const b = boleiros.get(a.boleiroId);
      if (prev) {
        prev.gols = Math.max(prev.gols, a.gols);
      } else {
        map.set(a.boleiroId, {
          boleiroId: a.boleiroId,
          nome: a.boleiroNome,
          apelido: b?.apelido ?? null,
          posicao: b?.posicao ?? null,
          timeId: a.timeId,
          timeNome: partida.times.find((t) => t.id === a.timeId)?.nome ?? null,
          timeCor: b?.timeCor ?? null,
          gols: a.gols,
        });
      }
    }
    return [...map.values()]
      .sort((a, b) => b.gols - a.gols)
      .slice(0, 10);
  })();

  return {
    partida: {
      id: partida.id,
      dataHora: partida.dataHora,
      status: partida.status,
      localLivre: partida.localLivre,
      estadio: partida.estadio?.nome ?? null,
      numTimes: partida.numTimes,
      boleirosPorTime: partida.boleirosPorTime,
      grupo: {
        id: partida.grupo.id,
        nome: partida.grupo.nome,
        fotoUrl: partida.grupo.fotoUrl,
      },
    },
    times,
    artilharia: artilhariaMerged.length > 0 ? artilhariaMerged : artilharia,
    timeline,
    estatisticas,
    totais: { totalGols, totalAmarelos, totalVermelhos, totalAzuis, totalSubs },
    classificacao,
  };
}
