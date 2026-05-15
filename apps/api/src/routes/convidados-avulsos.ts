import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { badRequest } from '../lib/errors.js';

const porCelularQuerySchema = z.object({
  celular: z
    .string()
    .transform((s) => s.replace(/\D/g, ''))
    .refine((d) => d.length === 11, { message: 'Informe 11 digitos (DDD + numero)' }),
});

const convidadosAvulsosRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/convidados-avulsos/por-celular?celular=
   * Lookup global de ConvidadoAvulso + quantidade de partidas distintas como convidado.
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
        },
        totalPartidasComoConvidado: grupos.length,
      };
    },
  );
};

export default convidadosAvulsosRoutes;
