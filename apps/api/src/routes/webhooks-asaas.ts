/**
 * Webhook Asaas (T32). Atualiza `Assinatura.status`, `Usuario.plano` e
 * `Usuario.planoExpiraEm` conforme os eventos do gateway.
 *
 * Idempotencia: cada evento eh gravado em `EventoBilling(gateway,externalId)`
 * com `@@unique`. Se o mesmo evento chegar mais de uma vez, retornamos 200
 * sem reprocessar.
 *
 * Verificacao: Asaas envia o token configurado no painel no header
 * `asaas-access-token`. Compara igualdade simples (mesma forma da doc).
 */
import { Prisma } from '@rachao/db';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { verifyWebhookToken } from '../lib/asaas.js';

const eventoSchema = z
  .object({
    id: z.string(),
    event: z.string(),
    payment: z
      .object({
        id: z.string().optional(),
        subscription: z.string().optional(),
        status: z.string().optional(),
        value: z.number().optional(),
        paymentDate: z.string().optional(),
        nextDueDate: z.string().optional(),
        invoiceUrl: z.string().optional(),
        externalReference: z.string().optional(),
      })
      .passthrough()
      .optional(),
    subscription: z
      .object({
        id: z.string(),
        status: z.string().optional(),
        nextDueDate: z.string().optional(),
        deleted: z.boolean().optional(),
        externalReference: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

type EventoPayload = z.infer<typeof eventoSchema>;

function paymentStatusToAssinaturaStatus(s: string | undefined): string | null {
  if (!s) return null;
  switch (s) {
    case 'RECEIVED':
    case 'CONFIRMED':
    case 'RECEIVED_IN_CASH':
      return 'ativa';
    case 'PENDING':
    case 'AWAITING_RISK_ANALYSIS':
      return 'pendente';
    case 'OVERDUE':
      return 'inadimplente';
    case 'REFUNDED':
    case 'REFUND_REQUESTED':
    case 'CHARGEBACK_REQUESTED':
    case 'CHARGEBACK_DISPUTE':
      return 'pendente';
    default:
      return null;
  }
}

const webhooksAsaasRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/webhooks/asaas', async (request, reply) => {
    const headerToken =
      (request.headers['asaas-access-token'] as string | undefined) ??
      (request.headers['asaas_access_token'] as string | undefined);
    if (!verifyWebhookToken(headerToken)) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const parsed = eventoSchema.safeParse(request.body);
    if (!parsed.success) {
      request.log.warn({ err: parsed.error.flatten() }, 'asaas: payload invalido');
      return reply.code(400).send({ error: 'BadRequest' });
    }

    const evento = parsed.data;

    // 1. Idempotencia via EventoBilling
    try {
      await fastify.prisma.eventoBilling.create({
        data: {
          gateway: 'asaas',
          externalId: evento.id,
          tipo: evento.event,
          payload: evento as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        fastify.log.info({ id: evento.id }, 'asaas: webhook duplicado, ignorando');
        return { ok: true, duplicated: true };
      }
      throw err;
    }

    // 2. Processa o evento
    try {
      await processarEvento(fastify, evento);
      await fastify.prisma.eventoBilling.updateMany({
        where: { gateway: 'asaas', externalId: evento.id },
        data: { processadoEm: new Date() },
      });
    } catch (err) {
      fastify.log.warn({ err, evento: evento.event }, 'asaas: falha ao processar evento');
      // Retornamos 200 para o gateway nao bombardear (eventoBilling fica sem
      // processadoEm e podemos retry-processar via script depois).
    }

    return { ok: true };
  });
};

async function processarEvento(
  fastify: FastifyInstance,
  evento: EventoPayload,
): Promise<void> {
  const subId = evento.subscription?.id ?? evento.payment?.subscription;
  if (!subId) return;

  const assinatura = await fastify.prisma.assinatura.findUnique({
    where: { externalId: subId },
  });
  if (!assinatura) {
    fastify.log.warn({ subId }, 'asaas: assinatura nao encontrada localmente');
    return;
  }

  let novoStatus: string | null = null;
  let ultimoPagamento: Date | null = null;
  let proximoVenc: Date | null = null;

  if (evento.event.startsWith('PAYMENT_')) {
    novoStatus = paymentStatusToAssinaturaStatus(evento.payment?.status);
    if (evento.payment?.paymentDate) {
      ultimoPagamento = new Date(evento.payment.paymentDate);
    }
    if (evento.payment?.nextDueDate) {
      proximoVenc = new Date(`${evento.payment.nextDueDate}T03:00:00Z`);
    }
  } else if (evento.event.startsWith('SUBSCRIPTION_')) {
    if (evento.subscription?.deleted || evento.event === 'SUBSCRIPTION_DELETED') {
      novoStatus = 'cancelada';
    } else if (evento.event === 'SUBSCRIPTION_CREATED') {
      novoStatus = 'pendente';
    }
    if (evento.subscription?.nextDueDate) {
      proximoVenc = new Date(`${evento.subscription.nextDueDate}T03:00:00Z`);
    }
  }

  if (!novoStatus && !ultimoPagamento && !proximoVenc) return;

  await fastify.prisma.assinatura.update({
    where: { id: assinatura.id },
    data: {
      ...(novoStatus ? { status: novoStatus } : {}),
      ...(ultimoPagamento ? { ultimoPagamentoEm: ultimoPagamento } : {}),
      ...(proximoVenc ? { proximoVencimento: proximoVenc } : {}),
    },
  });

  // Sincroniza Usuario.plano / planoExpiraEm
  if (novoStatus === 'ativa') {
    await fastify.prisma.usuario.update({
      where: { id: assinatura.usuarioId },
      data: {
        plano: assinatura.plano,
        planoExpiraEm: proximoVenc ?? assinatura.proximoVencimento,
      },
    });
  } else if (novoStatus === 'cancelada') {
    await fastify.prisma.usuario.update({
      where: { id: assinatura.usuarioId },
      data: { plano: 'trial', planoExpiraEm: null },
    });
  }
}

export default webhooksAsaasRoutes;
