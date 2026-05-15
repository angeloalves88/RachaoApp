/**
 * GET    /api/notificacoes              -> lista paginada (cursor) das proprias.
 * GET    /api/notificacoes/contagem     -> { naoLidas } para o sino do header.
 * PATCH  /api/notificacoes/:id/lida     -> marca como lida.
 * POST   /api/notificacoes/marcar-todas-lidas -> marca todas em lote.
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { notificacoesListQuerySchema } from '@rachao/shared/zod';
import { badRequest, notFound } from '../lib/errors.js';

const idParam = z.object({ id: z.string().min(1) });

const notificacoesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/api/notificacoes',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const parsed = notificacoesListQuerySchema.safeParse(request.query);
      if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);
      const { categoria = 'todas', cursor, limite = 30 } = parsed.data;

      const where = {
        usuarioId: auth.sub,
        ...(categoria !== 'todas' ? { categoria } : {}),
      } as const;

      const itens = await fastify.prisma.notificacao.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        take: limite + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = itens.length > limite;
      const slice = hasMore ? itens.slice(0, limite) : itens;
      return {
        notificacoes: slice.map((n) => ({
          id: n.id,
          tipo: n.tipo,
          categoria: n.categoria,
          titulo: n.titulo,
          corpo: n.corpo,
          link: n.link,
          partidaId: n.partidaId,
          grupoId: n.grupoId,
          lida: n.lida,
          lidaEm: n.lidaEm,
          criadoEm: n.criadoEm,
        })),
        nextCursor: hasMore ? slice[slice.length - 1]!.id : null,
      };
    },
  );

  fastify.get(
    '/api/notificacoes/contagem',
    { preHandler: fastify.requireAuth },
    async (request) => {
      const auth = request.user!;
      const naoLidas = await fastify.prisma.notificacao.count({
        where: { usuarioId: auth.sub, lida: false },
      });
      return { naoLidas };
    },
  );

  fastify.patch(
    '/api/notificacoes/:id/lida',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const n = await fastify.prisma.notificacao.findUnique({
        where: { id: params.data.id },
        select: { usuarioId: true, lida: true },
      });
      if (!n) return notFound(reply);
      if (n.usuarioId !== auth.sub) return notFound(reply);
      if (n.lida) return { ok: true };

      await fastify.prisma.notificacao.update({
        where: { id: params.data.id },
        data: { lida: true, lidaEm: new Date() },
      });
      return { ok: true };
    },
  );

  fastify.post(
    '/api/notificacoes/marcar-todas-lidas',
    { preHandler: fastify.requireAuth },
    async (request) => {
      const auth = request.user!;
      const result = await fastify.prisma.notificacao.updateMany({
        where: { usuarioId: auth.sub, lida: false },
        data: { lida: true, lidaEm: new Date() },
      });
      return { ok: true, total: result.count };
    },
  );
};

export default notificacoesRoutes;
