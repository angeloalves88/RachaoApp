/**
 * Webhook do Resend (https://resend.com/docs/dashboard/webhooks/event-types).
 *
 * Eventos relevantes:
 * - email.delivered     -> guardamos timestamp de entrega no log
 * - email.opened        -> opcional
 * - email.bounced       -> alerta para o presidente (futuro)
 * - email.complained    -> idem
 *
 * Validacao: usa o header `svix-signature` com `RESEND_WEBHOOK_SECRET`.
 * Em V1 fazemos apenas o log estruturado; integracao com Notificacoes (T17)
 * ficara no Bloco 4.
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { env } from '../env.js';

const webhookEventSchema = z
  .object({
    type: z.string(),
    data: z
      .object({
        email_id: z.string().optional(),
        to: z.union([z.string(), z.array(z.string())]).optional(),
        subject: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

const webhooksResendRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/webhooks/resend', async (request, reply) => {
    const secret = env.RESEND_WEBHOOK_SECRET;
    if (secret) {
      const sig = request.headers['svix-signature'];
      if (!sig || typeof sig !== 'string') {
        return reply.code(401).send({ error: 'Missing signature' });
      }
      // Validacao real seria via lib `svix`. V1: apenas exigimos o header.
    }

    const parsed = webhookEventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid payload' });
    }

    fastify.log.info(
      { type: parsed.data.type, email: parsed.data.data.email_id },
      '[resend] webhook recebido',
    );

    return { ok: true };
  });
};

export default webhooksResendRoutes;
