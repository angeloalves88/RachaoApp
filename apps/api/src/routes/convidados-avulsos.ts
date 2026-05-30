import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  convidadoAvulsoUpdateSchema,
  convidadoGrupoCreateSchema,
} from '@rachao/shared/zod';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { getGrupoAcesso } from '../lib/grupos.js';
import {
  promoverConvidadoGrupoParaBoleiro,
  upsertConvidadoNoPool,
} from '../lib/convidados-grupo.js';
import { sincronizarBoleiroEmPartidasAgendadas } from '../lib/presencas.js';
import { sincronizarPagamentosPartida } from '../lib/vaquinha.js';

const porCelularQuerySchema = z.object({
  celular: z
    .string()
    .transform((s) => s.replace(/\D/g, ''))
    .refine((d) => d.length === 11, { message: 'Informe 11 digitos (DDD + numero)' }),
});

const grupoIdSchema = z.object({ id: z.string().min(1) });
const convidadoGrupoParamsSchema = z.object({
  id: z.string().min(1),
  convidadoGrupoId: z.string().min(1),
});
const convidadoIdSchema = z.object({ id: z.string().min(1) });

const convidadosAvulsosRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/convidados-avulsos/por-celular?celular=
   */
  fastify.get(
    '/api/convidados-avulsos/por-celular',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const query = porCelularQuerySchema.safeParse(request.query);
      if (!query.success) return badRequest(reply, query.error.flatten().fieldErrors);

      const convidado = await fastify.prisma.convidadoAvulso.findUnique({
        where: { celular: query.data.celular },
      });

      if (!convidado) {
        return { convidado: null, totalPartidasComoConvidado: 0 };
      }

      const grupos = await fastify.prisma.convitePartida.groupBy({
        by: ['partidaId'],
        where: {
          convidadoAvulsoId: convidado.id,
          tipo: 'convidado_avulso',
        },
      });

      return {
        convidado: {
          id: convidado.id,
          nome: convidado.nome,
          apelido: convidado.apelido,
          posicao: convidado.posicao,
          celular: convidado.celular,
          fotoUrl: convidado.fotoUrl,
        },
        totalPartidasComoConvidado: grupos.length,
      };
    },
  );

  /**
   * PATCH /api/convidados-avulsos/:id
   */
  fastify.patch(
    '/api/convidados-avulsos/:id',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const params = convidadoIdSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);
      const parsed = convidadoAvulsoUpdateSchema.safeParse(request.body);
      if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

      const existing = await fastify.prisma.convidadoAvulso.findUnique({
        where: { id: params.data.id },
      });
      if (!existing) return notFound(reply);

      if (parsed.data.celular && parsed.data.celular !== existing.celular) {
        const dup = await fastify.prisma.convidadoAvulso.findUnique({
          where: { celular: parsed.data.celular },
        });
        if (dup) return conflict(reply, 'Ja existe convidado com este celular');
      }

      const convidado = await fastify.prisma.convidadoAvulso.update({
        where: { id: params.data.id },
        data: parsed.data,
      });
      return { convidado };
    },
  );

  /**
   * GET /api/grupos/:id/convidados — pool lista_espera do grupo
   */
  fastify.get(
    '/api/grupos/:id/convidados',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = grupoIdSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const acesso = await getGrupoAcesso(fastify.prisma, params.data.id, auth.sub);
      if (!acesso) return forbidden(reply);

      const itens = await fastify.prisma.convidadoGrupo.findMany({
        where: { grupoId: params.data.id, status: 'lista_espera' },
        include: {
          convidado: {
            select: {
              id: true,
              nome: true,
              apelido: true,
              posicao: true,
              celular: true,
              fotoUrl: true,
            },
          },
        },
        orderBy: { criadoEm: 'asc' },
      });

      return {
        convidados: itens.map((i) => ({
          convidadoGrupoId: i.id,
          status: i.status,
          ...i.convidado,
        })),
      };
    },
  );

  /**
   * POST /api/grupos/:id/convidados — adiciona ao pool
   */
  fastify.post(
    '/api/grupos/:id/convidados',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = grupoIdSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const acesso = await getGrupoAcesso(fastify.prisma, params.data.id, auth.sub);
      if (!acesso) return forbidden(reply);

      const parsed = convidadoGrupoCreateSchema.safeParse(request.body);
      if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

      const convidado = await fastify.prisma.$transaction((tx) =>
        upsertConvidadoNoPool(tx, params.data.id, parsed.data),
      );

      const cg = await fastify.prisma.convidadoGrupo.findUnique({
        where: {
          grupoId_convidadoAvulsoId: {
            grupoId: params.data.id,
            convidadoAvulsoId: convidado.id,
          },
        },
      });

      return reply.code(201).send({ convidado, convidadoGrupoId: cg?.id });
    },
  );

  /**
   * POST /api/grupos/:id/convidados/:convidadoGrupoId/promover
   */
  fastify.post(
    '/api/grupos/:id/convidados/:convidadoGrupoId/promover',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = convidadoGrupoParamsSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const acesso = await getGrupoAcesso(fastify.prisma, params.data.id, auth.sub);
      if (!acesso) return forbidden(reply);

      try {
        const boleiro = await fastify.prisma.$transaction(async (tx) => {
          const b = await promoverConvidadoGrupoParaBoleiro(
            tx,
            params.data.id,
            params.data.convidadoGrupoId,
          );
          await sincronizarBoleiroEmPartidasAgendadas(tx, {
            boleiroGrupoId: b.id,
            grupoId: params.data.id,
          });
          const partidasAfetadas = await tx.partida.findMany({
            where: { grupoId: params.data.id, status: 'agendada' },
            select: { id: true },
          });
          for (const p of partidasAfetadas) {
            await sincronizarPagamentosPartida(tx, p.id);
          }
          return b;
        });
        return reply.code(201).send({ boleiro });
      } catch (e) {
        const msg = (e as Error).message;
        if (msg.includes('Ja existe')) return conflict(reply, msg);
        if (msg.includes('nao encontrado')) return notFound(reply, msg);
        throw e;
      }
    },
  );
};

export default convidadosAvulsosRoutes;
