/**
 * Insights agregados para o dashboard do presidente (todos os grupos).
 */
import type { PrismaClient } from '@rachao/db';

type AoVivoJson = {
  artilharia?: Array<{ boleiroId: string; boleiroNome?: string; gols?: number }>;
  resultados?: Array<{
    timeAId: string;
    timeBId: string;
    golsA: number;
    golsB: number;
  }>;
};

export interface DashboardRankingJogador {
  boleiroId: string;
  nome: string;
  apelido: string | null;
  grupoNome: string;
  valor: number;
}

export interface DashboardRankingTime {
  nome: string;
  cor: string;
  vitorias: number;
}

export interface DashboardInsights {
  partidasPrevistas: number;
  partidasEncerradas: number;
  mediaGolsPorPartida: number;
  topArtilheiros: DashboardRankingJogador[];
  topCartoes: Array<
    DashboardRankingJogador & { amarelos: number; vermelhos: number }
  >;
  timeMaisVenceu: DashboardRankingTime | null;
  artilheiroDestaque: DashboardRankingJogador | null;
  maisPresente: DashboardRankingJogador | null;
}

export async function agregarDashboardInsights(
  prisma: PrismaClient,
  grupoIds: string[],
): Promise<DashboardInsights> {
  const empty: DashboardInsights = {
    partidasPrevistas: 0,
    partidasEncerradas: 0,
    mediaGolsPorPartida: 0,
    topArtilheiros: [],
    topCartoes: [],
    timeMaisVenceu: null,
    artilheiroDestaque: null,
    maisPresente: null,
  };

  if (grupoIds.length === 0) return empty;

  const partidas = await prisma.partida.findMany({
    where: { grupoId: { in: grupoIds } },
    select: {
      id: true,
      status: true,
      grupoId: true,
      aoVivoEstado: true,
      grupo: { select: { nome: true } },
      times: { select: { id: true, nome: true, cor: true, golsFinal: true } },
    },
  });

  const partidasRelevantes = partidas.filter((p) =>
    ['em_andamento', 'encerrada'].includes(p.status),
  );
  const partidaIdsRelevantes = partidasRelevantes.map((p) => p.id);

  const partidasPrevistas = partidas.filter((p) =>
    ['agendada', 'em_andamento'].includes(p.status),
  ).length;
  const partidasEncerradas = partidas.filter((p) => p.status === 'encerrada').length;

  const golsPorBoleiro = new Map<string, { gols: number; grupoId: string }>();
  const cartoesPorBoleiro = new Map<
    string,
    { amarelos: number; vermelhos: number; grupoId: string }
  >();
  const vitoriasPorTime = new Map<string, { nome: string; cor: string; v: number }>();
  let totalGolsPartidas = 0;
  let partidasComGols = 0;

  function bumpGol(boleiroId: string, grupoId: string, n = 1) {
    const cur = golsPorBoleiro.get(boleiroId) ?? { gols: 0, grupoId };
    cur.gols += n;
    golsPorBoleiro.set(boleiroId, cur);
  }

  function bumpCartao(
    boleiroId: string,
    grupoId: string,
    tipo: 'amarelo' | 'vermelho',
  ) {
    const cur = cartoesPorBoleiro.get(boleiroId) ?? {
      amarelos: 0,
      vermelhos: 0,
      grupoId,
    };
    if (tipo === 'amarelo') cur.amarelos++;
    else cur.vermelhos++;
    cartoesPorBoleiro.set(boleiroId, cur);
  }

  function registrarVitoria(timeId: string, times: typeof partidas[0]['times']) {
    const t = times.find((x) => x.id === timeId);
    if (!t) return;
    const key = `${t.nome}::${t.cor}`;
    const cur = vitoriasPorTime.get(key) ?? { nome: t.nome, cor: t.cor, v: 0 };
    cur.v++;
    vitoriasPorTime.set(key, cur);
  }

  if (partidaIdsRelevantes.length > 0) {
    const eventos = await prisma.evento.findMany({
      where: { partidaId: { in: partidaIdsRelevantes } },
      select: { tipo: true, boleiroId: true, partidaId: true, timeId: true },
    });

    const partidaPorId = new Map(partidasRelevantes.map((p) => [p.id, p]));

    for (const ev of eventos) {
      const p = partidaPorId.get(ev.partidaId);
      if (!p || !ev.boleiroId) continue;
      if (ev.tipo === 'gol') bumpGol(ev.boleiroId, p.grupoId);
      else if (ev.tipo === 'amarelo') bumpCartao(ev.boleiroId, p.grupoId, 'amarelo');
      else if (ev.tipo === 'vermelho') bumpCartao(ev.boleiroId, p.grupoId, 'vermelho');
    }

    for (const p of partidasRelevantes) {
      let golsPartida = 0;

      if (p.status === 'encerrada') {
        for (const t of p.times) {
          golsPartida += t.golsFinal ?? 0;
        }
        const max = Math.max(...p.times.map((t) => t.golsFinal ?? 0), 0);
        const winners = p.times.filter((t) => (t.golsFinal ?? 0) === max && max > 0);
        if (winners.length === 1) registrarVitoria(winners[0]!.id, p.times);
      } else {
        const estado = p.aoVivoEstado as AoVivoJson | null;
        for (const a of estado?.artilharia ?? []) {
          if (a.boleiroId && a.gols) bumpGol(a.boleiroId, p.grupoId, a.gols);
        }
        for (const r of estado?.resultados ?? []) {
          golsPartida += r.golsA + r.golsB;
          if (r.golsA > r.golsB) registrarVitoria(r.timeAId, p.times);
          else if (r.golsB > r.golsA) registrarVitoria(r.timeBId, p.times);
        }
        const evsPartida = eventos.filter((e) => e.partidaId === p.id);
        for (const ev of evsPartida) {
          if (ev.tipo === 'gol') golsPartida++;
        }
      }

      if (golsPartida > 0) {
        totalGolsPartidas += golsPartida;
        partidasComGols++;
      }
    }
  }

  const boleiroIds = new Set([
    ...golsPorBoleiro.keys(),
    ...cartoesPorBoleiro.keys(),
  ]);

  const boleiros =
    boleiroIds.size > 0
      ? await prisma.boleiroGrupo.findMany({
          where: { id: { in: Array.from(boleiroIds) }, grupoId: { in: grupoIds } },
          select: {
            id: true,
            nome: true,
            apelido: true,
            grupo: { select: { nome: true } },
          },
        })
      : [];

  const boleiroRef = new Map(boleiros.map((b) => [b.id, b]));

  const topArtilheiros: DashboardRankingJogador[] = Array.from(golsPorBoleiro.entries())
    .map(([id, { gols, grupoId }]) => {
      const b = boleiroRef.get(id);
      if (!b) return null;
      return {
        boleiroId: id,
        nome: b.nome,
        apelido: b.apelido,
        grupoNome: b.grupo.nome,
        valor: gols,
      };
    })
    .filter((x): x is DashboardRankingJogador => x != null && x.valor > 0)
    .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome))
    .slice(0, 3);

  const topCartoes = Array.from(cartoesPorBoleiro.entries())
    .map(([id, { amarelos, vermelhos, grupoId }]) => {
      const b = boleiroRef.get(id);
      if (!b) return null;
      const total = amarelos + vermelhos;
      if (total === 0) return null;
      return {
        boleiroId: id,
        nome: b.nome,
        apelido: b.apelido,
        grupoNome: b.grupo.nome,
        valor: total,
        amarelos,
        vermelhos,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort(
      (a, b) =>
        b.vermelhos - a.vermelhos ||
        b.amarelos - a.amarelos ||
        a.nome.localeCompare(b.nome),
    )
    .slice(0, 3);

  let timeMaisVenceu: DashboardRankingTime | null = null;
  let maxV = 0;
  for (const t of vitoriasPorTime.values()) {
    if (t.v > maxV) {
      maxV = t.v;
      timeMaisVenceu = { nome: t.nome, cor: t.cor, vitorias: t.v };
    }
  }

  // Presença: taxa de confirmação em partidas encerradas + em andamento
  const convites = await prisma.convitePartida.findMany({
    where: {
      partida: { grupoId: { in: grupoIds }, status: { in: ['encerrada', 'em_andamento'] } },
      boleiroGrupoId: { not: null },
    },
    select: {
      status: true,
      boleiroGrupoId: true,
      partida: { select: { grupoId: true } },
    },
  });

  const presencaAgg = new Map<string, { convidado: number; confirmado: number; grupoId: string }>();
  for (const c of convites) {
    if (!c.boleiroGrupoId) continue;
    const cur = presencaAgg.get(c.boleiroGrupoId) ?? {
      convidado: 0,
      confirmado: 0,
      grupoId: c.partida.grupoId,
    };
    cur.convidado++;
    if (c.status === 'confirmado') cur.confirmado++;
    presencaAgg.set(c.boleiroGrupoId, cur);
  }

  const presencaIds = Array.from(presencaAgg.keys());
  const boleirosPres =
    presencaIds.length > 0
      ? await prisma.boleiroGrupo.findMany({
          where: { id: { in: presencaIds } },
          select: { id: true, nome: true, apelido: true, grupo: { select: { nome: true } } },
        })
      : [];
  const presRef = new Map(boleirosPres.map((b) => [b.id, b]));

  let maisPresente: DashboardRankingJogador | null = null;
  let bestTaxa = -1;
  for (const [id, agg] of presencaAgg) {
    if (agg.convidado < 2) continue;
    const taxa = agg.confirmado / agg.convidado;
    const b = presRef.get(id);
    if (!b) continue;
    if (taxa > bestTaxa) {
      bestTaxa = taxa;
      maisPresente = {
        boleiroId: id,
        nome: b.nome,
        apelido: b.apelido,
        grupoNome: b.grupo.nome,
        valor: Math.round(taxa * 100),
      };
    }
  }

  return {
    partidasPrevistas,
    partidasEncerradas,
    mediaGolsPorPartida:
      partidasComGols > 0
        ? Math.round((totalGolsPartidas / partidasComGols) * 10) / 10
        : 0,
    topArtilheiros,
    topCartoes,
    timeMaisVenceu,
    artilheiroDestaque: topArtilheiros[0] ?? null,
    maisPresente,
  };
}
