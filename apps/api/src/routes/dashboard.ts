import type { FastifyPluginAsync } from 'fastify';

/**
 * GET /api/dashboard
 *
 * Resumo agregado para a tela /dashboard do Presidente:
 * - proximasPartidas: ate 6 proximas partidas agendadas/em_andamento entre todos
 *   os grupos onde o usuario e presidente, ordenadas por dataHora ASC.
 * - grupos: ate 8 grupos do usuario com contagens.
 * - ultimasPartidas: ate 3 partidas encerradas mais recentes.
 * - alertas: pendencias relevantes (vaquinhas em aberto, bloqueios).
 */
const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/dashboard', { preHandler: fastify.requireAuth }, async (request) => {
    const auth = request.user!;

    const grupoIds = await fastify.prisma.grupoPresidente
      .findMany({
        where: { usuarioId: auth.sub },
        select: { grupoId: true },
      })
      .then((rows) => rows.map((r) => r.grupoId));

    if (grupoIds.length === 0) {
      return {
        proximasPartidas: [],
        grupos: [],
        ultimasPartidas: [],
        alertas: { vaquinhasAbertas: 0, bloqueadosVermelho: 0 },
      };
    }

    const [proximasPartidasRaw, gruposRaw, ultimasPartidas, vaquinhasAbertas, bloqueadosVermelho] =
      await fastify.prisma.$transaction([
        fastify.prisma.partida.findMany({
          where: {
            grupoId: { in: grupoIds },
            status: { in: ['agendada', 'em_andamento'] },
          },
          orderBy: { dataHora: 'asc' },
          take: 6,
          include: {
            grupo: { select: { id: true, nome: true, fotoUrl: true } },
            estadio: { select: { id: true, nome: true } },
            _count: { select: { convites: true } },
            convites: {
              where: { status: 'confirmado' },
              select: { id: true },
            },
          },
        }),
        fastify.prisma.grupo.findMany({
          where: { id: { in: grupoIds }, status: 'ativo' },
          orderBy: { atualizadoEm: 'desc' },
          take: 8,
          include: {
            _count: { select: { boleiros: { where: { status: 'ativo' } } } },
            partidas: {
              where: { status: 'encerrada' },
              orderBy: { dataHora: 'desc' },
              take: 1,
              select: { dataHora: true },
            },
            presidentes: {
              where: { usuarioId: auth.sub },
              select: { papel: true },
            },
          },
        }),
        fastify.prisma.partida.findMany({
          where: { grupoId: { in: grupoIds }, status: 'encerrada' },
          orderBy: { dataHora: 'desc' },
          take: 3,
          include: {
            grupo: { select: { id: true, nome: true } },
            times: { select: { nome: true, golsFinal: true, cor: true } },
          },
        }),
        fastify.prisma.pagamento.count({
          where: {
            status: { in: ['pendente', 'inadimplente'] },
            boleiroGrupo: { grupoId: { in: grupoIds } },
          },
        }),
        // Cartoes vermelhos na ultima partida encerrada de cada grupo (placeholder).
        fastify.prisma.evento.count({
          where: { tipo: 'vermelho', partida: { grupoId: { in: grupoIds } } },
        }),
      ]);

    const proximasPartidas = proximasPartidasRaw.map((p) => ({
      id: p.id,
      dataHora: p.dataHora,
      status: p.status,
      serieId: p.serieId,
      local: p.estadio?.nome ?? p.localLivre ?? null,
      grupo: p.grupo,
      totalConvites: p._count.convites,
      confirmados: p.convites.length,
      vagasTotais: p.numTimes * (p.boleirosPorTime + (p.reservasPorTime ?? 0)),
    }));

    return {
      proximasPartidas,
      grupos: gruposRaw.map((g) => ({
        id: g.id,
        nome: g.nome,
        fotoUrl: g.fotoUrl,
        nivel: g.nivel,
        esporte: g.esporte,
        papel: g.presidentes[0]?.papel ?? 'copresidente',
        totalBoleiros: g._count.boleiros,
        ultimaPartida: g.partidas[0]?.dataHora ?? null,
      })),
      ultimasPartidas: ultimasPartidas.map((p) => ({
        id: p.id,
        dataHora: p.dataHora,
        grupo: p.grupo,
        times: p.times.map((t) => ({ nome: t.nome, gols: t.golsFinal ?? 0, cor: t.cor })),
      })),
      alertas: {
        vaquinhasAbertas,
        bloqueadosVermelho,
      },
    };
  });
};

export default dashboardRoutes;
