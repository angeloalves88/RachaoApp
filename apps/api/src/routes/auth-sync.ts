import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { celularBrSchema } from '@rachao/shared/zod';

const bodySchema = z.object({
  nome: z.string().trim().min(2),
  celular: celularBrSchema,
});

const authSyncRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/auth/sync
   *
   * Idempotente. Chamado pelo front apos signup/login para garantir que existe
   * um Usuario no schema public correspondente ao auth.users.
   *
   * - Se existir: retorna o usuario.
   * - Se nao existir: cria com email do JWT + nome/celular do body (ou
   *   user_metadata).
   */
  fastify.post(
    '/api/auth/sync',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const userId = auth.sub;
      const email = auth.email;
      if (!email) {
        return reply.code(400).send({
          error: 'BadRequest',
          message: 'JWT do Supabase nao trouxe email — sync impossivel.',
        });
      }

      const existing = await fastify.prisma.usuario.findUnique({ where: { id: userId } });
      if (existing) {
        return { usuario: existing, created: false };
      }

      const meta = (auth.user_metadata ?? {}) as Record<string, unknown>;
      const fallbackNome = typeof meta.nome === 'string' ? meta.nome : (meta.name as string | undefined) ?? email.split('@')[0];
      const fallbackCelular = typeof meta.celular === 'string' ? meta.celular : '';

      const parsed = bodySchema.safeParse({
        nome: (request.body as { nome?: unknown })?.nome ?? fallbackNome,
        celular: (request.body as { celular?: unknown })?.celular ?? fallbackCelular,
      });

      if (!parsed.success) {
        return reply.code(400).send({
          error: 'ValidationError',
          message: 'Dados invalidos para criar usuario.',
          issues: parsed.error.flatten().fieldErrors,
        });
      }

      const usuario = await fastify.prisma.usuario.create({
        data: {
          id: userId,
          email,
          nome: parsed.data.nome,
          celular: parsed.data.celular,
          avatarUrl: typeof meta.avatar_url === 'string' ? meta.avatar_url : null,
        },
      });

      return reply.code(201).send({ usuario, created: true });
    },
  );
};

export default authSyncRoutes;
