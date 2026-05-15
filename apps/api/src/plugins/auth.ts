import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { env } from '../env.js';

/**
 * Payload de um JWT do Supabase (GoTrue) relevante para nos.
 * https://supabase.com/docs/guides/auth/sessions
 */
export interface SupabaseJwtPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  email?: string;
  phone?: string;
  role: 'anon' | 'authenticated' | 'service_role';
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

declare module 'fastify' {
  interface FastifyInstance {
    /// Pre-handler que exige um JWT autenticado valido
    requireAuth: (
      request: import('fastify').FastifyRequest,
      reply: import('fastify').FastifyReply,
    ) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: SupabaseJwtPayload;
    user: SupabaseJwtPayload;
  }
}

export default fp(async (fastify) => {
  await fastify.register(jwt, {
    secret: env.SUPABASE_JWT_SECRET,
    verify: {
      // Supabase usa "authenticated" como audience por padrao
      allowedAud: 'authenticated',
    },
  });

  fastify.decorate('requireAuth', async (request, reply) => {
    try {
      await request.jwtVerify();
      const payload = request.user;
      if (!payload || payload.role !== 'authenticated') {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido' });
      }
    } catch (err) {
      request.log.warn({ err }, 'JWT verify failed');
      return reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido ou expirado' });
    }
  });
});
