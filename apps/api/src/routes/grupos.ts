import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  adicionarCoPresidenteSchema,
  grupoCreateSchema,
  grupoUpdateSchema,
} from '@rachao/shared/zod';
import { getGrupoAcesso } from '../lib/grupos.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { agregarEstatisticasGrupo } from '../lib/estatisticas-grupo.js';

const idParamSchema = z.object({ id: z.string().min(1) });
const idAndUserParamSchema = z.object({
  id: z.string().min(1),
  usuarioId: z.string().min(1),
});

const listQuerySchema = z.object({
  status: z.enum(['ativo', 'arquivado', 'todos']).default('ativo'),
  q: z.string().trim().optional(),
});

const estatisticasQuerySchema = z.object({
  periodo: z.enum(['30d', '90d', 'all']).default('30d'),
});

const gruposRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/grupos
   * Lista os grupos do usuario autenticado, com contagens e proxima partida.
   */
  fastify.get('/api/grupos', { preHandler: fastify.requireAuth }, async (request, reply) => {
    const auth = request.user!;
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

    const { status, q } = parsed.data;
    const where = {
      presidentes: { some: { usuarioId: auth.sub } },
      ...(status === 'todos' ? {} : { status }),
      ...(q ? { nome: { contains: q, mode: 'insensitive' as const } } : {}),
    };

    const grupos = await fastify.prisma.grupo.findMany({
      where,
      orderBy: { atualizadoEm: 'desc' },
      include: {
        presidentes: {
          where: { usuarioId: auth.sub },
          select: { papel: true },
        },
        _count: { select: { boleiros: true, partidas: true } },
        partidas: {
          where: { status: { in: ['agendada', 'em_andamento'] } },
          orderBy: { dataHora: 'asc' },
          take: 1,
          select: { id: true, dataHora: true, status: true },
        },
      },
    });

    // Para "ultima partida realizada": query separada por simplicidade.
    const ultimas = await fastify.prisma.partida.findMany({
      where: {
        grupoId: { in: grupos.map((g) => g.id) },
        status: 'encerrada',
      },
      orderBy: { dataHora: 'desc' },
      distinct: ['grupoId'],
      select: { grupoId: true, dataHora: true },
    });
    const ultimaByGrupo = new Map(ultimas.map((u) => [u.grupoId, u.dataHora]));

    return {
      grupos: grupos.map((g) => ({
        id: g.id,
        nome: g.nome,
        esporte: g.esporte,
        nivel: g.nivel,
        fotoUrl: g.fotoUrl,
        descricao: g.descricao,
        status: g.status,
        criadoEm: g.criadoEm,
        atualizadoEm: g.atualizadoEm,
        papel: g.presidentes[0]?.papel ?? 'copresidente',
        totalBoleiros: g._count.boleiros,
        totalPartidas: g._count.partidas,
        proximaPartida: g.partidas[0] ?? null,
        ultimaPartida: ultimaByGrupo.get(g.id) ?? null,
        tipoCobrancaPadrao: g.tipoCobrancaPadrao,
      })),
    };
  });

  /**
   * POST /api/grupos
   * Cria um novo grupo. O usuario autenticado vira "criador" automaticamente.
   */
  fastify.post('/api/grupos', { preHandler: fastify.requireAuth }, async (request, reply) => {
    const auth = request.user!;
    const parsed = grupoCreateSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

    const grupo = await fastify.prisma.grupo.create({
      data: {
        ...parsed.data,
        presidentes: { create: { usuarioId: auth.sub, papel: 'criador' } },
      },
    });

    return reply.code(201).send({ grupo });
  });

  /**
   * GET /api/grupos/:id
   * Detalhe completo do grupo, incluindo lista de presidentes e papel do user.
   */
  fastify.get(
    '/api/grupos/:id',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParamSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const acesso = await getGrupoAcesso(fastify.prisma, params.data.id, auth.sub);
      if (!acesso) return forbidden(reply);

      const grupo = await fastify.prisma.grupo.findUnique({
        where: { id: params.data.id },
        include: {
          presidentes: {
            include: {
              usuario: { select: { id: true, nome: true, email: true, avatarUrl: true } },
            },
            orderBy: { criadoEm: 'asc' },
          },
          _count: { select: { boleiros: { where: { status: 'ativo' } }, partidas: true } },
        },
      });
      if (!grupo) return notFound(reply);

      return {
        grupo: {
          ...grupo,
          papel: acesso.papel,
          totalBoleirosAtivos: grupo._count.boleiros,
          totalPartidas: grupo._count.partidas,
        },
      };
    },
  );

  /**
   * PATCH /api/grupos/:id
   * Atualiza dados do grupo (nome, foto, esporte, nivel, etc).
   * Tambem suporta status (ativo|arquivado).
   */
  fastify.patch(
    '/api/grupos/:id',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParamSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const acesso = await getGrupoAcesso(fastify.prisma, params.data.id, auth.sub);
      if (!acesso) return forbidden(reply);

      const parsed = grupoUpdateSchema.safeParse(request.body);
      if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

      const grupo = await fastify.prisma.grupo.update({
        where: { id: params.data.id },
        data: parsed.data,
      });
      return { grupo };
    },
  );

  /**
   * DELETE /api/grupos/:id
   * Soft-delete: arquiva o grupo. Para deletar de fato, use ?hard=true (apenas
   * criador).
   */
  fastify.delete(
    '/api/grupos/:id',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParamSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const acesso = await getGrupoAcesso(fastify.prisma, params.data.id, auth.sub);
      if (!acesso) return forbidden(reply);

      const hard = (request.query as { hard?: string })?.hard === 'true';
      if (hard && acesso.papel !== 'criador') {
        return forbidden(reply, 'Apenas o criador pode excluir o grupo definitivamente');
      }

      if (hard) {
        await fastify.prisma.grupo.delete({ where: { id: params.data.id } });
        return { ok: true, deleted: true };
      }
      await fastify.prisma.grupo.update({
        where: { id: params.data.id },
        data: { status: 'arquivado' },
      });
      return { ok: true, archived: true };
    },
  );

  /**
   * GET /api/grupos/:id/estatisticas
   * Estatisticas agregadas do grupo (T10 aba "Estatisticas"): totais de eventos,
   * top artilheiros, cartoes e presenca. Suporta filtro de periodo (30d, 90d, all).
   */
  fastify.get(
    '/api/grupos/:id/estatisticas',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParamSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const acesso = await getGrupoAcesso(fastify.prisma, params.data.id, auth.sub);
      if (!acesso) return forbidden(reply);

      const query = estatisticasQuerySchema.safeParse(request.query);
      if (!query.success) return badRequest(reply, query.error.flatten().fieldErrors);

      const data = await agregarEstatisticasGrupo(
        fastify.prisma,
        params.data.id,
        query.data.periodo,
      );
      return data;
    },
  );

  // ---------------------------------------------------------------------------
  // Co-presidentes
  // ---------------------------------------------------------------------------

  /**
   * POST /api/grupos/:id/copresidentes
   * Adiciona um co-presidente buscando por email ou celular.
   */
  fastify.post(
    '/api/grupos/:id/copresidentes',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParamSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const acesso = await getGrupoAcesso(fastify.prisma, params.data.id, auth.sub);
      if (!acesso) return forbidden(reply);

      const parsed = adicionarCoPresidenteSchema.safeParse(request.body);
      if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

      const { email, celular } = parsed.data;
      const target = await fastify.prisma.usuario.findFirst({
        where: {
          OR: [
            email ? { email } : undefined,
            celular ? { celular } : undefined,
          ].filter(Boolean) as { email?: string; celular?: string }[],
        },
      });
      if (!target) return notFound(reply, 'Usuario nao cadastrado no app');

      const link = await fastify.prisma.grupoPresidente.upsert({
        where: { grupoId_usuarioId: { grupoId: params.data.id, usuarioId: target.id } },
        create: { grupoId: params.data.id, usuarioId: target.id, papel: 'copresidente' },
        update: {},
      });
      return reply.code(201).send({ copresidente: { id: target.id, nome: target.nome, email: target.email, papel: link.papel } });
    },
  );

  /**
   * DELETE /api/grupos/:id/copresidentes/:usuarioId
   * Remove um co-presidente. Nao permite remover o criador.
   */
  fastify.delete(
    '/api/grupos/:id/copresidentes/:usuarioId',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idAndUserParamSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const acesso = await getGrupoAcesso(fastify.prisma, params.data.id, auth.sub);
      if (!acesso) return forbidden(reply);

      const target = await fastify.prisma.grupoPresidente.findUnique({
        where: { grupoId_usuarioId: { grupoId: params.data.id, usuarioId: params.data.usuarioId } },
      });
      if (!target) return notFound(reply);
      if (target.papel === 'criador') {
        return forbidden(reply, 'O criador nao pode ser removido');
      }

      await fastify.prisma.grupoPresidente.delete({
        where: { grupoId_usuarioId: { grupoId: params.data.id, usuarioId: params.data.usuarioId } },
      });
      return { ok: true };
    },
  );
};

export default gruposRoutes;
