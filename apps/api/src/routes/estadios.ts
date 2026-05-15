/**
 * Rotas do Dono do Estadio (Bloco 8 - T26..T30).
 *
 * Convencoes:
 * - Endpoints `/api/me/estadio*` operam sobre o estadio do usuario autenticado.
 * - Endpoints `/api/solicitacoes/*` lidam com SolicitacaoVinculo.
 * - `/api/estadios/buscar` e `/api/estadios/publico/:slug` sao acessadas por
 *   Presidentes / publico para encontrar estadios.
 */
import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@rachao/db';
import { z } from 'zod';
import {
  dataBloqueadaSchema,
  estadioUpdateSchema,
  horariosDisponiveisBatchSchema,
  slugify,
  solicitacaoResponderSchema,
  solicitacoesListQuerySchema,
} from '@rachao/shared/zod';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { criarNotificacoesPresidentesGrupo } from '../lib/notificacoes.js';

const idParam = z.object({ id: z.string().min(1) });
const slugParam = z.object({ slug: z.string().min(1) });

/**
 * Garante existencia de Estadio para o usuario logado (criando rascunho se preciso).
 * Retorna o registro completo.
 */
async function ensureEstadio(prisma: PrismaClient, usuarioId: string) {
  let estadio = await prisma.estadio.findUnique({ where: { donoId: usuarioId } });
  if (estadio) return estadio;

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { nome: true },
  });
  const nome = usuario?.nome ? `Estadio de ${usuario.nome}` : 'Novo estadio';
  const baseSlug = slugify(nome);
  const suffix = usuarioId.slice(-6).toLowerCase();

  estadio = await prisma.estadio.create({
    data: {
      donoId: usuarioId,
      nome,
      slug: `${baseSlug}-${suffix}`,
      endereco: '',
      cidade: '',
      estado: '',
      tipoEspaco: 'campo',
      tipoPiso: [],
      capacidade: 0,
      comodidades: [],
      ativo: false,
      publico: false,
      publicoBuscas: false,
    },
  });
  return estadio;
}

const estadiosRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/me/estadio
   * Retorna o estadio do dono autenticado (cria rascunho se nao existir).
   */
  fastify.get('/api/me/estadio', { preHandler: fastify.requireAuth }, async (request) => {
    const auth = request.user!;
    const estadio = await ensureEstadio(fastify.prisma, auth.sub);
    const horarios = await fastify.prisma.horarioDisponivel.findMany({
      where: { estadioId: estadio.id },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
    });
    const bloqueios = await fastify.prisma.dataBloqueada.findMany({
      where: { estadioId: estadio.id },
      orderBy: { data: 'asc' },
    });
    return { estadio, horarios, bloqueios };
  });

  /**
   * PATCH /api/me/estadio
   * Atualiza dados do estadio do dono autenticado.
   */
  fastify.patch('/api/me/estadio', { preHandler: fastify.requireAuth }, async (request, reply) => {
    const auth = request.user!;
    const body = estadioUpdateSchema.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error.flatten().fieldErrors);

    const estadio = await ensureEstadio(fastify.prisma, auth.sub);
    const data = body.data;

    const updated = await fastify.prisma.estadio.update({
      where: { id: estadio.id },
      data: {
        ...(data.nome !== undefined ? { nome: data.nome } : {}),
        ...(data.endereco !== undefined ? { endereco: data.endereco } : {}),
        ...(data.cidade !== undefined ? { cidade: data.cidade } : {}),
        ...(data.estado !== undefined ? { estado: data.estado } : {}),
        ...(data.tipoEspaco !== undefined ? { tipoEspaco: data.tipoEspaco } : {}),
        ...(data.tipoPiso !== undefined ? { tipoPiso: data.tipoPiso } : {}),
        ...(data.capacidade !== undefined ? { capacidade: data.capacidade } : {}),
        ...(data.comodidades !== undefined ? { comodidades: data.comodidades } : {}),
        ...(data.descricao !== undefined ? { descricao: data.descricao } : {}),
        ...(data.fotoCapaUrl !== undefined ? { fotoCapaUrl: data.fotoCapaUrl } : {}),
        ...(data.fotos !== undefined ? { fotos: data.fotos } : {}),
        ...(data.publicoBuscas !== undefined ? { publicoBuscas: data.publicoBuscas } : {}),
        // Atualiza `ativo` automaticamente: ativo = nome+endereco+capacidade preenchidos.
        ativo: Boolean(
          (data.nome ?? estadio.nome) &&
            (data.endereco ?? estadio.endereco) &&
            (data.capacidade ?? estadio.capacidade) > 0,
        ),
      },
    });
    return { estadio: updated };
  });

  /**
   * PUT /api/me/estadio/horarios
   * Substitui completamente a grade semanal.
   */
  fastify.put(
    '/api/me/estadio/horarios',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const body = horariosDisponiveisBatchSchema.safeParse(request.body);
      if (!body.success) return badRequest(reply, body.error.flatten().fieldErrors);

      const estadio = await ensureEstadio(fastify.prisma, auth.sub);

      // Valida que horaInicio < horaFim em cada item.
      for (const h of body.data.horarios) {
        if (h.horaInicio >= h.horaFim) {
          return badRequest(reply, { horarios: ['horaInicio deve ser menor que horaFim'] });
        }
      }

      await fastify.prisma.$transaction(async (tx) => {
        await tx.horarioDisponivel.deleteMany({ where: { estadioId: estadio.id } });
        if (body.data.horarios.length > 0) {
          await tx.horarioDisponivel.createMany({
            data: body.data.horarios.map((h) => ({
              estadioId: estadio.id,
              diaSemana: h.diaSemana,
              horaInicio: h.horaInicio,
              horaFim: h.horaFim,
              intervaloMinutos: h.intervaloMinutos,
              ativo: h.ativo,
            })),
          });
        }
      });

      const horarios = await fastify.prisma.horarioDisponivel.findMany({
        where: { estadioId: estadio.id },
        orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
      });
      return { horarios };
    },
  );

  /**
   * POST /api/me/estadio/bloqueios
   */
  fastify.post(
    '/api/me/estadio/bloqueios',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const body = dataBloqueadaSchema.safeParse(request.body);
      if (!body.success) return badRequest(reply, body.error.flatten().fieldErrors);

      const estadio = await ensureEstadio(fastify.prisma, auth.sub);
      const bloqueio = await fastify.prisma.dataBloqueada.create({
        data: {
          estadioId: estadio.id,
          data: body.data.data,
          motivo: body.data.motivo ?? null,
        },
      });
      return reply.code(201).send({ bloqueio });
    },
  );

  /**
   * DELETE /api/me/estadio/bloqueios/:id
   */
  fastify.delete(
    '/api/me/estadio/bloqueios/:id',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const estadio = await ensureEstadio(fastify.prisma, auth.sub);
      const bloqueio = await fastify.prisma.dataBloqueada.findUnique({
        where: { id: params.data.id },
      });
      if (!bloqueio || bloqueio.estadioId !== estadio.id) return notFound(reply);
      await fastify.prisma.dataBloqueada.delete({ where: { id: bloqueio.id } });
      return { ok: true };
    },
  );

  /**
   * GET /api/me/estadio/agenda?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
   * Retorna partidas + bloqueios da janela. Usado por T28.
   */
  fastify.get('/api/me/estadio/agenda', { preHandler: fastify.requireAuth }, async (request) => {
    const auth = request.user!;
    const querySchema = z.object({
      inicio: z.coerce.date(),
      fim: z.coerce.date(),
    });
    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return { error: 'ValidationError', issues: query.error.flatten().fieldErrors };
    }

    const estadio = await ensureEstadio(fastify.prisma, auth.sub);

    const partidas = await fastify.prisma.partida.findMany({
      where: {
        estadioId: estadio.id,
        dataHora: { gte: query.data.inicio, lte: query.data.fim },
        status: { in: ['agendada', 'em_andamento', 'encerrada'] },
      },
      orderBy: { dataHora: 'asc' },
      include: {
        grupo: { select: { id: true, nome: true } },
        solicitacaoVinculo: { select: { status: true } },
      },
    });

    const bloqueios = await fastify.prisma.dataBloqueada.findMany({
      where: {
        estadioId: estadio.id,
        data: { gte: query.data.inicio, lte: query.data.fim },
      },
      orderBy: { data: 'asc' },
    });

    return {
      partidas: partidas.map((p) => ({
        id: p.id,
        dataHora: p.dataHora,
        numTimes: p.numTimes,
        boleirosPorTime: p.boleirosPorTime,
        reservasPorTime: p.reservasPorTime ?? 0,
        tempoTotal: p.tempoTotal,
        statusEstadio: p.statusEstadio,
        status: p.status,
        grupo: p.grupo,
        solicitacaoStatus: p.solicitacaoVinculo?.status ?? null,
      })),
      bloqueios,
    };
  });

  /**
   * GET /api/me/estadio/solicitacoes?status=pendente
   */
  fastify.get(
    '/api/me/estadio/solicitacoes',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const query = solicitacoesListQuerySchema.safeParse(request.query);
      if (!query.success) return badRequest(reply, query.error.flatten().fieldErrors);

      const estadio = await ensureEstadio(fastify.prisma, auth.sub);

      const where = {
        estadioId: estadio.id,
        ...(query.data.status !== 'todas' ? { status: query.data.status } : {}),
      };

      const solicitacoes = await fastify.prisma.solicitacaoVinculo.findMany({
        where,
        orderBy: [{ status: 'asc' }, { criadoEm: 'desc' }],
        include: {
          partida: {
            select: {
              id: true,
              dataHora: true,
              numTimes: true,
              boleirosPorTime: true,
              reservasPorTime: true,
              tempoTotal: true,
              status: true,
              observacoes: true,
              grupo: {
                select: {
                  id: true,
                  nome: true,
                  presidentes: {
                    where: { papel: 'criador' },
                    select: {
                      usuario: { select: { id: true, nome: true, email: true, celular: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Detecta conflitos com partidas aprovadas: mesmo estadio, mesma data, intervalo
      // que se sobrepoe ao "tempoTotal" da solicitacao pendente.
      const aprovadas = await fastify.prisma.partida.findMany({
        where: {
          estadioId: estadio.id,
          statusEstadio: 'aprovado',
          status: { in: ['agendada', 'em_andamento'] },
        },
        select: { id: true, dataHora: true, tempoTotal: true },
      });

      function temConflito(p: { id: string; dataHora: Date; tempoTotal: number }): boolean {
        const inicio = p.dataHora.getTime();
        const fim = inicio + p.tempoTotal * 60_000;
        return aprovadas.some((a) => {
          if (a.id === p.id) return false;
          const aIni = a.dataHora.getTime();
          const aFim = aIni + a.tempoTotal * 60_000;
          return inicio < aFim && aIni < fim;
        });
      }

      return {
        solicitacoes: solicitacoes.map((s) => ({
          id: s.id,
          status: s.status,
          motivoResposta: s.motivoResposta,
          respondidaEm: s.respondidaEm,
          observacoesPres: s.observacoesPres,
          criadoEm: s.criadoEm,
          partida: {
            id: s.partida.id,
            dataHora: s.partida.dataHora,
            numTimes: s.partida.numTimes,
            boleirosPorTime: s.partida.boleirosPorTime,
            reservasPorTime: s.partida.reservasPorTime ?? 0,
            tempoTotal: s.partida.tempoTotal,
            status: s.partida.status,
            observacoes: s.partida.observacoes,
            grupo: {
              id: s.partida.grupo.id,
              nome: s.partida.grupo.nome,
              presidente: s.partida.grupo.presidentes[0]?.usuario ?? null,
            },
          },
          conflito: s.status === 'pendente' ? temConflito(s.partida) : false,
        })),
      };
    },
  );

  /**
   * POST /api/solicitacoes/:id/responder
   * Acoes: aprovar | recusar | cancelar (cancelar reverte uma aprovacao).
   */
  fastify.post(
    '/api/solicitacoes/:id/responder',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);
      const body = solicitacaoResponderSchema.safeParse(request.body);
      if (!body.success) return badRequest(reply, body.error.flatten().fieldErrors);

      const solicitacao = await fastify.prisma.solicitacaoVinculo.findUnique({
        where: { id: params.data.id },
        include: {
          estadio: { select: { donoId: true, nome: true } },
          partida: { select: { id: true, grupoId: true, dataHora: true, statusEstadio: true } },
        },
      });
      if (!solicitacao) return notFound(reply);
      if (solicitacao.estadio.donoId !== auth.sub) return forbidden(reply);

      const novoStatus =
        body.data.acao === 'aprovar'
          ? 'aprovada'
          : body.data.acao === 'recusar'
            ? 'recusada'
            : 'cancelada';

      const novoStatusEstadio =
        body.data.acao === 'aprovar'
          ? 'aprovado'
          : body.data.acao === 'recusar'
            ? 'recusado'
            : 'pendente';

      await fastify.prisma.$transaction(async (tx) => {
        await tx.solicitacaoVinculo.update({
          where: { id: solicitacao.id },
          data: {
            status: novoStatus,
            motivoResposta: body.data.motivo ?? null,
            respondidaEm: new Date(),
          },
        });
        await tx.partida.update({
          where: { id: solicitacao.partida.id },
          data: { statusEstadio: novoStatusEstadio },
        });
      });

      // Notifica presidentes do grupo.
      queueMicrotask(async () => {
        try {
          const tipo =
            body.data.acao === 'aprovar'
              ? 'estadio_aprovado'
              : body.data.acao === 'recusar'
                ? 'estadio_recusado'
                : 'estadio_aprovado';
          const titulo =
            body.data.acao === 'aprovar'
              ? `${solicitacao.estadio.nome} aprovou sua partida`
              : body.data.acao === 'recusar'
                ? `${solicitacao.estadio.nome} recusou sua partida`
                : `Aprovação cancelada por ${solicitacao.estadio.nome}`;
          const corpo = body.data.motivo
            ? `Motivo: ${body.data.motivo}`
            : 'Veja os detalhes da partida.';
          await criarNotificacoesPresidentesGrupo(
            fastify.prisma,
            solicitacao.partida.grupoId,
            {
              tipo,
              categoria: 'estadio',
              titulo,
              corpo,
              link: `/partidas/${solicitacao.partida.id}`,
              partidaId: solicitacao.partida.id,
              grupoId: solicitacao.partida.grupoId,
            },
          );
        } catch (err) {
          fastify.log.warn({ err }, 'Falha ao notificar resposta de solicitacao');
        }
      });

      return { ok: true, status: novoStatus };
    },
  );

  /**
   * GET /api/estadios/buscar?q=&cidade=
   * Busca publica (requer auth) de estadios para Presidentes selecionarem no
   * wizard de criacao de partida.
   */
  fastify.get('/api/estadios/buscar', { preHandler: fastify.requireAuth }, async (request) => {
    const querySchema = z.object({
      q: z.string().trim().optional(),
      cidade: z.string().trim().optional(),
      limite: z.coerce.number().int().min(1).max(50).default(20).optional(),
    });
    const q = querySchema.safeParse(request.query);
    if (!q.success) return { estadios: [] };

    const filtros = q.data;
    const where = {
      ativo: true,
      publicoBuscas: true,
      ...(filtros.q
        ? { nome: { contains: filtros.q, mode: 'insensitive' as const } }
        : {}),
      ...(filtros.cidade
        ? { cidade: { contains: filtros.cidade, mode: 'insensitive' as const } }
        : {}),
    };

    const estadios = await fastify.prisma.estadio.findMany({
      where,
      orderBy: { nome: 'asc' },
      take: filtros.limite ?? 20,
      select: {
        id: true,
        nome: true,
        slug: true,
        cidade: true,
        estado: true,
        fotoCapaUrl: true,
        tipoEspaco: true,
        capacidade: true,
      },
    });

    return { estadios };
  });

  /**
   * GET /api/estadios/publico/:slug
   * Pagina publica T30 — sem auth.
   */
  fastify.get('/api/estadios/publico/:slug', async (request, reply) => {
    const params = slugParam.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

    const estadio = await fastify.prisma.estadio.findUnique({
      where: { slug: params.data.slug },
      select: {
        id: true,
        slug: true,
        nome: true,
        endereco: true,
        cidade: true,
        estado: true,
        tipoEspaco: true,
        tipoPiso: true,
        capacidade: true,
        comodidades: true,
        descricao: true,
        fotoCapaUrl: true,
        fotos: true,
        ativo: true,
        publicoBuscas: true,
      },
    });
    if (!estadio || !estadio.ativo || !estadio.publicoBuscas) return notFound(reply);

    const horarios = await fastify.prisma.horarioDisponivel.findMany({
      where: { estadioId: estadio.id, ativo: true },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
    });

    return { estadio, horarios };
  });

  /**
   * GET /api/dashboard/estadio
   * Cards do T26: proximas partidas aprovadas + pendencias + stats.
   */
  fastify.get(
    '/api/dashboard/estadio',
    { preHandler: fastify.requireAuth },
    async (request) => {
      const auth = request.user!;
      const estadio = await ensureEstadio(fastify.prisma, auth.sub);
      const agora = new Date();

      const proximas = await fastify.prisma.partida.findMany({
        where: {
          estadioId: estadio.id,
          dataHora: { gte: agora },
          status: 'agendada',
          statusEstadio: 'aprovado',
        },
        orderBy: { dataHora: 'asc' },
        take: 3,
        include: { grupo: { select: { id: true, nome: true } } },
      });

      const pendentesCount = await fastify.prisma.solicitacaoVinculo.count({
        where: { estadioId: estadio.id, status: 'pendente' },
      });

      const pendentes = await fastify.prisma.solicitacaoVinculo.findMany({
        where: { estadioId: estadio.id, status: 'pendente' },
        orderBy: { criadoEm: 'asc' },
        take: 5,
        include: {
          partida: {
            select: {
              id: true,
              dataHora: true,
              tempoTotal: true,
              grupo: { select: { id: true, nome: true } },
            },
          },
        },
      });

      // Stats mensais
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
      const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);

      const partidasMes = await fastify.prisma.partida.count({
        where: {
          estadioId: estadio.id,
          dataHora: { gte: inicioMes, lte: fimMes },
          statusEstadio: 'aprovado',
        },
      });

      const gruposFrequentadores = await fastify.prisma.partida.findMany({
        where: { estadioId: estadio.id, statusEstadio: 'aprovado' },
        distinct: ['grupoId'],
        select: { grupoId: true },
      });

      // Taxa de ocupacao: aprovadas / slots_disponiveis_mes.
      // slots = soma dos horarios da semana * 4 semanas / 1 (simplificado).
      const horarios = await fastify.prisma.horarioDisponivel.findMany({
        where: { estadioId: estadio.id, ativo: true },
      });
      let slotsPorSemana = 0;
      for (const h of horarios) {
        const [hi, mi] = h.horaInicio.split(':').map(Number);
        const [hf, mf] = h.horaFim.split(':').map(Number);
        const minutos = (hf! * 60 + mf!) - (hi! * 60 + mi!);
        const slot = h.intervaloMinutos || 60;
        slotsPorSemana += Math.max(0, Math.floor(minutos / slot));
      }
      const slotsMes = slotsPorSemana * 4;
      const taxaOcupacao =
        slotsMes > 0 ? Math.round((partidasMes / slotsMes) * 100) : 0;

      // Inicio da semana (segunda)
      const dia = agora.getDay();
      const diffSeg = (dia + 6) % 7;
      const inicioSemana = new Date(agora);
      inicioSemana.setDate(agora.getDate() - diffSeg);
      inicioSemana.setHours(0, 0, 0, 0);
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 6);
      fimSemana.setHours(23, 59, 59);

      const ocupadosSemana = await fastify.prisma.partida.count({
        where: {
          estadioId: estadio.id,
          dataHora: { gte: inicioSemana, lte: fimSemana },
          statusEstadio: 'aprovado',
        },
      });

      return {
        estadio: {
          id: estadio.id,
          nome: estadio.nome,
          slug: estadio.slug,
          ativo: estadio.ativo,
          publicoBuscas: estadio.publicoBuscas,
        },
        proximas: proximas.map((p) => ({
          id: p.id,
          dataHora: p.dataHora,
          numTimes: p.numTimes,
          boleirosPorTime: p.boleirosPorTime,
          reservasPorTime: p.reservasPorTime ?? 0,
          grupo: p.grupo,
        })),
        pendentes: {
          total: pendentesCount,
          itens: pendentes.map((s) => ({
            id: s.id,
            partida: {
              id: s.partida.id,
              dataHora: s.partida.dataHora,
              tempoTotal: s.partida.tempoTotal,
              grupo: s.partida.grupo,
            },
            criadoEm: s.criadoEm,
          })),
        },
        stats: {
          partidasMes,
          gruposFrequentadores: gruposFrequentadores.length,
          ocupadosSemana,
          slotsSemana: slotsPorSemana,
          taxaOcupacaoMensal: taxaOcupacao,
        },
      };
    },
  );
};

export default estadiosRoutes;
