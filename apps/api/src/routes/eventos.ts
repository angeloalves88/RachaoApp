/**
 * Eventos da partida ao vivo (Bloco 6 / T20–T21).
 *
 * `clientId` eh gerado pelo frontend (UUID) e usado para idempotencia da fila
 * offline: o mesmo `clientId` numa mesma partida nunca produz duas linhas.
 *
 * A partir do hardening PWA (Fase 3), o `clientId` virou coluna real do modelo
 * `Evento` com unique `(partidaId, clientId)`. O fluxo usa `upsert` para
 * eliminar a janela de corrida que existia com o `findFirst + create` antigo.
 * Mantemos retro-compat lendo tambem `dadosExtras.clientId` caso o cliente
 * antigo ainda envie por la — durante a janela de transicao.
 */
import { Prisma } from '@rachao/db';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eventoCreateSchema, eventoUpdateSchema } from '@rachao/shared/zod';
import { getGrupoAcesso } from '../lib/grupos.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';

const partidaParam = z.object({ id: z.string().min(1) });
const eventoParam = z.object({ id: z.string().min(1), eventoId: z.string().min(1) });

interface DadosExtrasObj {
  [k: string]: unknown;
}

function parseDadosExtras(raw: unknown): DadosExtrasObj {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as DadosExtrasObj;
  }
  return {};
}

const eventosRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/partidas/:id/eventos
   */
  fastify.get(
    '/api/partidas/:id/eventos',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = partidaParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const partida = await fastify.prisma.partida.findUnique({
        where: { id: params.data.id },
        select: { grupoId: true, status: true },
      });
      if (!partida) return notFound(reply);
      const acesso = await getGrupoAcesso(fastify.prisma, partida.grupoId, auth.sub);
      if (!acesso) return forbidden(reply);

      const eventos = await fastify.prisma.evento.findMany({
        where: { partidaId: params.data.id },
        orderBy: { criadoEm: 'asc' },
        include: {
          time: { select: { id: true, nome: true, cor: true } },
        },
      });

      return {
        eventos: eventos.map((e) => ({
          id: e.id,
          tipo: e.tipo,
          minuto: e.minuto,
          timeId: e.timeId,
          timeNome: e.time?.nome ?? null,
          timeCor: e.time?.cor ?? null,
          boleiroId: e.boleiroId,
          dadosExtras: e.dadosExtras,
          criadoEm: e.criadoEm,
        })),
      };
    },
  );

  /**
   * POST /api/partidas/:id/eventos
   * Idempotente por (partidaId, dadosExtras.clientId).
   */
  fastify.post(
    '/api/partidas/:id/eventos',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = partidaParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const body = eventoCreateSchema.safeParse(request.body);
      if (!body.success) return badRequest(reply, body.error.flatten().fieldErrors);

      const partida = await fastify.prisma.partida.findUnique({
        where: { id: params.data.id },
        select: { grupoId: true, status: true },
      });
      if (!partida) return notFound(reply);
      const acesso = await getGrupoAcesso(fastify.prisma, partida.grupoId, auth.sub);
      if (!acesso) return forbidden(reply);
      if (partida.status !== 'em_andamento') {
        return badRequest(
          reply,
          null,
          'Partida nao esta em andamento — eventos nao podem ser registrados',
        );
      }

      // Valida timeId pertence à partida
      if (body.data.timeId) {
        const time = await fastify.prisma.time.findUnique({
          where: { id: body.data.timeId },
          select: { partidaId: true },
        });
        if (!time || time.partidaId !== params.data.id) {
          return badRequest(reply, { timeId: 'Time nao pertence a esta partida' });
        }
      }

      // Idempotencia por clientId — agora via coluna + unique constraint.
      const { clientId, dadosExtras: extras, ...rest } = body.data;
      const dadosExtras = { ...parseDadosExtras(extras), clientId };

      try {
        const evento = await fastify.prisma.evento.create({
          data: {
            partidaId: params.data.id,
            tipo: rest.tipo,
            timeId: rest.timeId ?? null,
            boleiroId: rest.boleiroId ?? null,
            minuto: rest.minuto ?? null,
            clientId,
            dadosExtras,
          },
        });
        return reply.code(201).send({ evento, idempotent: false });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          // Janela de corrida: outra requisicao com o mesmo clientId chegou
          // primeiro. Retorna o evento existente.
          const existing = await fastify.prisma.evento.findUnique({
            where: {
              uniq_partida_clientid: {
                partidaId: params.data.id,
                clientId,
              },
            },
          });
          if (existing) {
            return reply.code(200).send({ evento: existing, idempotent: true });
          }
        }
        throw err;
      }
    },
  );

  /**
   * PATCH /api/partidas/:id/eventos/:eventoId
   */
  fastify.patch(
    '/api/partidas/:id/eventos/:eventoId',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = eventoParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const body = eventoUpdateSchema.safeParse(request.body);
      if (!body.success) return badRequest(reply, body.error.flatten().fieldErrors);

      const evento = await fastify.prisma.evento.findUnique({
        where: { id: params.data.eventoId },
        include: { partida: { select: { grupoId: true, status: true, id: true } } },
      });
      if (!evento || evento.partidaId !== params.data.id) return notFound(reply);
      const acesso = await getGrupoAcesso(fastify.prisma, evento.partida.grupoId, auth.sub);
      if (!acesso) return forbidden(reply);
      if (evento.partida.status === 'cancelada') {
        return badRequest(reply, null, 'Partida cancelada');
      }

      const data: Record<string, unknown> = {};
      if (body.data.tipo !== undefined) data.tipo = body.data.tipo;
      if (body.data.timeId !== undefined) data.timeId = body.data.timeId;
      if (body.data.boleiroId !== undefined) data.boleiroId = body.data.boleiroId;
      if (body.data.minuto !== undefined) data.minuto = body.data.minuto;
      if (body.data.dadosExtras !== undefined) {
        const clientId = (parseDadosExtras(evento.dadosExtras) as { clientId?: string }).clientId;
        const extras = parseDadosExtras(body.data.dadosExtras);
        data.dadosExtras = clientId ? { ...extras, clientId } : extras;
      }

      const updated = await fastify.prisma.evento.update({
        where: { id: evento.id },
        data,
      });

      return { evento: updated };
    },
  );

  /**
   * DELETE /api/partidas/:id/eventos/:eventoId
   */
  fastify.delete(
    '/api/partidas/:id/eventos/:eventoId',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = eventoParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const evento = await fastify.prisma.evento.findUnique({
        where: { id: params.data.eventoId },
        include: { partida: { select: { grupoId: true, status: true } } },
      });
      // Idempotente: se ja foi removido (ou nunca existiu), responde 200.
      if (!evento || evento.partidaId !== params.data.id) {
        // Mesmo no caso de evento inexistente, conferimos se o usuario tem
        // acesso a partida pra nao expor 404 vs 403.
        const partida = await fastify.prisma.partida.findUnique({
          where: { id: params.data.id },
          select: { grupoId: true },
        });
        if (!partida) return notFound(reply);
        const acesso = await getGrupoAcesso(fastify.prisma, partida.grupoId, auth.sub);
        if (!acesso) return forbidden(reply);
        return { ok: true, alreadyDeleted: true };
      }
      const acesso = await getGrupoAcesso(fastify.prisma, evento.partida.grupoId, auth.sub);
      if (!acesso) return forbidden(reply);
      if (evento.partida.status === 'cancelada') {
        return badRequest(reply, null, 'Partida cancelada');
      }

      try {
        await fastify.prisma.evento.delete({ where: { id: evento.id } });
      } catch (err) {
        // Concorrencia: outro request ja deletou. Trate como sucesso.
        if (
          !(err instanceof Prisma.PrismaClientKnownRequestError) ||
          err.code !== 'P2025'
        ) {
          throw err;
        }
      }
      return { ok: true };
    },
  );
};

export default eventosRoutes;
