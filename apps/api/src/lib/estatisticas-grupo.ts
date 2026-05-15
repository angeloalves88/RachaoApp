/**
 * Estatisticas agregadas de um grupo (T10 - aba "Estatisticas").
 *
 * Cobre: totais de eventos, top artilheiros, top cartoes e top presenca,
 * resolvendo `Evento.boleiroId` tanto em `BoleiroGrupo` quanto em
 * `ConvidadoAvulso` (mesmo padrao de `agregarResumo`).
 */
import type { PrismaClient } from '@rachao/db';

export type EstatisticasPeriodo = '30d' | '90d' | 'all';

export interface EstatisticasGrupoTotais {
  partidas: number;
  partidasEncerradas: number;
  gols: number;
  amarelos: number;
  vermelhos: number;
  azuis: number;
  substituicoes: number;
}

export interface EstatisticasGrupoArtilheiro {
  boleiroId: string;
  nome: string;
  apelido: string | null;
  tipo: 'fixo' | 'convidado_avulso';
  gols: number;
}

export interface EstatisticasGrupoCartoes {
  boleiroId: string;
  nome: string;
  apelido: string | null;
  tipo: 'fixo' | 'convidado_avulso';
  amarelos: number;
  vermelhos: number;
  total: number;
}

export interface EstatisticasGrupoPresenca {
  boleiroId: string;
  nome: string;
  apelido: string | null;
  tipo: 'fixo' | 'convidado_avulso';
  convidado: number;
  confirmado: number;
  taxa: number;
}

export interface EstatisticasGrupoData {
  periodo: EstatisticasPeriodo;
  desde: Date | null;
  totais: EstatisticasGrupoTotais;
  artilheiros: EstatisticasGrupoArtilheiro[];
  cartoes: EstatisticasGrupoCartoes[];
  presenca: EstatisticasGrupoPresenca[];
}

function inicioPeriodo(periodo: EstatisticasPeriodo): Date | null {
  if (periodo === 'all') return null;
  const dias = periodo === '30d' ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function agregarEstatisticasGrupo(
  prisma: PrismaClient,
  grupoId: string,
  periodo: EstatisticasPeriodo = '30d',
): Promise<EstatisticasGrupoData> {
  const desde = inicioPeriodo(periodo);
  const wherePartida = {
    grupoId,
    ...(desde ? { dataHora: { gte: desde } } : {}),
  };

  const partidas = await prisma.partida.findMany({
    where: wherePartida,
    select: { id: true, status: true },
  });
  const partidaIds = partidas.map((p) => p.id);

  if (partidaIds.length === 0) {
    return {
      periodo,
      desde,
      totais: {
        partidas: 0,
        partidasEncerradas: 0,
        gols: 0,
        amarelos: 0,
        vermelhos: 0,
        azuis: 0,
        substituicoes: 0,
      },
      artilheiros: [],
      cartoes: [],
      presenca: [],
    };
  }

  const [eventos, convites] = await Promise.all([
    prisma.evento.findMany({
      where: { partidaId: { in: partidaIds } },
      select: { tipo: true, boleiroId: true },
    }),
    prisma.convitePartida.findMany({
      where: { partidaId: { in: partidaIds } },
      select: {
        status: true,
        boleiroGrupoId: true,
        convidadoAvulsoId: true,
      },
    }),
  ]);

  const totais: EstatisticasGrupoTotais = {
    partidas: partidas.length,
    partidasEncerradas: partidas.filter((p) => p.status === 'encerrada').length,
    gols: 0,
    amarelos: 0,
    vermelhos: 0,
    azuis: 0,
    substituicoes: 0,
  };

  type AggBoleiro = {
    gols: number;
    amarelos: number;
    vermelhos: number;
    azuis: number;
  };
  const porBoleiro = new Map<string, AggBoleiro>();
  function getAgg(id: string): AggBoleiro {
    let agg = porBoleiro.get(id);
    if (!agg) {
      agg = { gols: 0, amarelos: 0, vermelhos: 0, azuis: 0 };
      porBoleiro.set(id, agg);
    }
    return agg;
  }

  for (const ev of eventos) {
    if (ev.tipo === 'gol') totais.gols++;
    else if (ev.tipo === 'amarelo') totais.amarelos++;
    else if (ev.tipo === 'vermelho') totais.vermelhos++;
    else if (ev.tipo === 'azul') totais.azuis++;
    else if (ev.tipo === 'substituicao') totais.substituicoes++;

    if (!ev.boleiroId) continue;
    const agg = getAgg(ev.boleiroId);
    if (ev.tipo === 'gol') agg.gols++;
    else if (ev.tipo === 'amarelo') agg.amarelos++;
    else if (ev.tipo === 'vermelho') agg.vermelhos++;
    else if (ev.tipo === 'azul') agg.azuis++;
  }

  type AggPresenca = { convidado: number; confirmado: number };
  const presencaPorBoleiroGrupo = new Map<string, AggPresenca>();
  const presencaPorConvidado = new Map<string, AggPresenca>();
  function bumpPres(
    map: Map<string, AggPresenca>,
    id: string,
    confirmou: boolean,
  ) {
    let agg = map.get(id);
    if (!agg) {
      agg = { convidado: 0, confirmado: 0 };
      map.set(id, agg);
    }
    agg.convidado++;
    if (confirmou) agg.confirmado++;
  }
  for (const c of convites) {
    const confirmou = c.status === 'confirmado';
    if (c.boleiroGrupoId) bumpPres(presencaPorBoleiroGrupo, c.boleiroGrupoId, confirmou);
    else if (c.convidadoAvulsoId) bumpPres(presencaPorConvidado, c.convidadoAvulsoId, confirmou);
  }

  const idsEventos = Array.from(porBoleiro.keys());
  const idsBoleiroGrupo = new Set<string>(presencaPorBoleiroGrupo.keys());
  const idsConvidadoAvulso = new Set<string>(presencaPorConvidado.keys());

  // Resolver cada id de eventos como BoleiroGrupo (mesmo grupo) ou ConvidadoAvulso
  const [bgs, avs] = await Promise.all([
    prisma.boleiroGrupo.findMany({
      where: {
        OR: [
          { id: { in: idsEventos } },
          { id: { in: Array.from(idsBoleiroGrupo) } },
        ],
        grupoId,
      },
      select: { id: true, nome: true, apelido: true },
    }),
    prisma.convidadoAvulso.findMany({
      where: {
        OR: [
          { id: { in: idsEventos } },
          { id: { in: Array.from(idsConvidadoAvulso) } },
        ],
      },
      select: { id: true, nome: true, apelido: true },
    }),
  ]);

  type Ref = {
    id: string;
    nome: string;
    apelido: string | null;
    tipo: 'fixo' | 'convidado_avulso';
  };
  const refs = new Map<string, Ref>();
  for (const b of bgs) {
    refs.set(b.id, {
      id: b.id,
      nome: b.nome,
      apelido: b.apelido,
      tipo: 'fixo',
    });
  }
  for (const a of avs) {
    if (!refs.has(a.id)) {
      refs.set(a.id, {
        id: a.id,
        nome: a.nome,
        apelido: a.apelido,
        tipo: 'convidado_avulso',
      });
    }
  }

  const artilheiros: EstatisticasGrupoArtilheiro[] = [];
  const cartoes: EstatisticasGrupoCartoes[] = [];
  for (const [id, agg] of porBoleiro) {
    const ref = refs.get(id);
    if (!ref) continue;
    if (agg.gols > 0) {
      artilheiros.push({
        boleiroId: id,
        nome: ref.nome,
        apelido: ref.apelido,
        tipo: ref.tipo,
        gols: agg.gols,
      });
    }
    const totalCart = agg.amarelos + agg.vermelhos;
    if (totalCart > 0) {
      cartoes.push({
        boleiroId: id,
        nome: ref.nome,
        apelido: ref.apelido,
        tipo: ref.tipo,
        amarelos: agg.amarelos,
        vermelhos: agg.vermelhos,
        total: totalCart,
      });
    }
  }
  artilheiros.sort((a, b) => b.gols - a.gols || a.nome.localeCompare(b.nome));
  cartoes.sort(
    (a, b) =>
      b.vermelhos - a.vermelhos ||
      b.amarelos - a.amarelos ||
      a.nome.localeCompare(b.nome),
  );

  const presenca: EstatisticasGrupoPresenca[] = [];
  function pushPres(map: Map<string, AggPresenca>, kind: 'fixo' | 'convidado_avulso') {
    for (const [id, agg] of map) {
      const ref = refs.get(id);
      if (!ref) continue;
      const taxa = agg.convidado > 0 ? agg.confirmado / agg.convidado : 0;
      presenca.push({
        boleiroId: id,
        nome: ref.nome,
        apelido: ref.apelido,
        tipo: kind,
        convidado: agg.convidado,
        confirmado: agg.confirmado,
        taxa,
      });
    }
  }
  pushPres(presencaPorBoleiroGrupo, 'fixo');
  pushPres(presencaPorConvidado, 'convidado_avulso');
  presenca.sort(
    (a, b) =>
      b.taxa - a.taxa ||
      b.confirmado - a.confirmado ||
      a.nome.localeCompare(b.nome),
  );

  return {
    periodo,
    desde,
    totais,
    artilheiros: artilheiros.slice(0, 10),
    cartoes: cartoes.slice(0, 10),
    presenca: presenca.slice(0, 10),
  };
}
