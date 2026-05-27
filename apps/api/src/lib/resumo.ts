/**
 * Agregação do resumo da partida (Bloco 6 / T22).
 * Recalcula placar a partir dos eventos `tipo='gol'` agrupados por `timeId`,
 * artilharia (top 5 boleiros por gols) e timeline cronológica.
 */
import type { PrismaClient } from '@rachao/db';
import {
  calcularClassificacaoResumo,
  cartoesPorTimeFromEventos,
  eventosNaoConsolidados,
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

export interface ResumoResultado {
  jogo: number;
  timeAId: string;
  timeANome: string | null;
  timeACor: string | null;
  golsA: number;
  timeBId: string;
  timeBNome: string | null;
  timeBCor: string | null;
  golsB: number;
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
  resultados: ResumoResultado[];
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

  const aoVivo = parseAoVivoEstado(partida.aoVivoEstado);
  const eventosPendentes = eventosNaoConsolidados(partida.eventos, aoVivo);

  // Placar derivado dos eventos nao consolidados
  const golsPorTime = new Map<string, number>();
  for (const ev of eventosPendentes) {
    if (ev.tipo === 'gol' && ev.timeId) {
      golsPorTime.set(ev.timeId, (golsPorTime.get(ev.timeId) ?? 0) + 1);
    }
  }

  const golsFromResultados = golsTotaisFromResultados(aoVivo.resultados);
  const estatisticasTimes = mergeEstatisticasTimes(
    aoVivo.estatisticasTimes,
    cartoesPorTimeFromEventos(eventosPendentes),
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
  const totalGols = times.reduce((acc, t) => acc + t.golsFinal, 0);
  const totalAmarelos = Object.values(estatisticasTimes).reduce((acc, t) => acc + t.amarelos, 0);
  const totalVermelhos = Object.values(estatisticasTimes).reduce((acc, t) => acc + t.vermelhos, 0);
  const totalAzuis = Object.values(estatisticasTimes).reduce((acc, t) => acc + t.azuis, 0);

  const resultados: ResumoResultado[] = (aoVivo.resultados ?? [])
    .map((r) => {
      const timeA = partida.times.find((t) => t.id === r.timeAId);
      const timeB = partida.times.find((t) => t.id === r.timeBId);
      return {
        jogo: r.jogo,
        timeAId: r.timeAId,
        timeANome: timeA?.nome ?? null,
        timeACor: timeA?.cor ?? null,
        golsA: r.golsA,
        timeBId: r.timeBId,
        timeBNome: timeB?.nome ?? null,
        timeBCor: timeB?.cor ?? null,
        golsB: r.golsB,
      };
    })
    .sort((a, b) => a.jogo - b.jogo);

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

  let totalSubs = 0;

  for (const ev of eventosPendentes) {
    if (ev.tipo === 'substituicao') totalSubs++;

    if (ev.boleiroId) {
      const s = statsFor(ev.boleiroId);
      if (ev.tipo === 'gol') s.gols++;
      else if (ev.tipo === 'amarelo') s.amarelos++;
      else if (ev.tipo === 'vermelho') s.vermelhos++;
      else if (ev.tipo === 'azul') s.azuis++;
    }
  }

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
    s.gols += a.gols;
    const b = boleiros.get(a.boleiroId);
    if (b && a.boleiroNome) s.nome = a.boleiroNome;
    if (!s.timeId) {
      s.timeId = a.timeId;
      s.timeNome = partida.times.find((t) => t.id === a.timeId)?.nome ?? null;
    }
  }

  for (const sPersist of aoVivo.estatisticasBoleiros ?? []) {
    const s = statsFor(sPersist.boleiroId);
    s.amarelos += sPersist.amarelos;
    s.vermelhos += sPersist.vermelhos;
    s.azuis += sPersist.azuis;
    if (sPersist.boleiroNome) s.nome = sPersist.boleiroNome;
    if (!s.timeId) {
      s.timeId = sPersist.timeId;
      s.timeNome = partida.times.find((t) => t.id === sPersist.timeId)?.nome ?? null;
    }
  }

  const estatisticas = Array.from(stats.values()).sort((a, b) => {
    if (b.gols !== a.gols) return b.gols - a.gols;
    const cartoesA = a.amarelos + a.vermelhos + a.azuis;
    const cartoesB = b.amarelos + b.vermelhos + b.azuis;
    if (cartoesB !== cartoesA) return cartoesB - cartoesA;
    return a.nome.localeCompare(b.nome);
  });

  const artilharia: ResumoArtilheiro[] = Array.from(stats.values())
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
    })
    .sort((a, b) => b.gols - a.gols || a.nome.localeCompare(b.nome))
    .slice(0, 10);

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
    artilharia,
    resultados,
    timeline,
    estatisticas,
    totais: { totalGols, totalAmarelos, totalVermelhos, totalAzuis, totalSubs },
    classificacao,
  };
}
