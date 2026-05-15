import type { FastifyPluginAsync } from 'fastify';

const meRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/me',
    { preHandler: fastify.requireAuth },
    async (request) => {
      const user = request.user!;
      const usuario = await fastify.prisma.usuario.findUnique({
        where: { id: user.sub },
      });

      return {
        auth: {
          id: user.sub,
          email: user.email,
          role: user.role,
        },
        usuario,
      };
    },
  );
};

export default meRoutes;
