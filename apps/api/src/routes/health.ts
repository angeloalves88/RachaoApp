import type { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'rachao-api',
    timestamp: new Date().toISOString(),
  }));

  fastify.get('/health/db', async () => {
    await fastify.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', db: 'connected' };
  });
};

export default healthRoutes;
