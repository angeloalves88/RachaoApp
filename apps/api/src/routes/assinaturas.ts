/**
 * Rotas de assinatura (T32) integradas com Asaas. Substituem o stub
 * `POST /api/me/plano`. Mantemos compat: `GET /api/me/plano` continua
 * existindo no `perfil.ts` para refletir o que esta no usuario.
 *
 * Endpoints:
 *
 * - GET    /api/me/assinatura          - dados da assinatura ativa
 * - POST   /api/me/assinatura          - cria customer (se preciso) + assinatura
 *                                       e retorna link de pagamento (checkout)
 * - DELETE /api/me/assinatura          - cancela ao fim do ciclo (status=cancelada)
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PLANOS } from '@rachao/shared/zod';
import { badRequest, notFound } from '../lib/errors.js';
import {
  cancelarAssinatura,
  criarAssinatura,
  criarCliente,
  obterPrimeiraCobranca,
  isAsaasSimulated,
} from '../lib/asaas.js';

const billingTypeSchema = z.enum(['PIX', 'CREDIT_CARD']);

const criarAssinaturaSchema = z.object({
  plano: z.enum(PLANOS).refine((p) => p !== 'trial', {
    message: 'Trial nao requer assinatura',
  }),
  billingType: billingTypeSchema,
});

const VALOR_POR_PLANO: Record<string, number> = {
  presidente_mensal: 19.9,
  estadio_mensal: 29.9,
  combo_mensal: 39.9,
};

const assinaturasRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/me/assinatura - retorna a assinatura ativa (ou null em trial).
   */
  fastify.get(
    '/api/me/assinatura',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const assinatura = await fastify.prisma.assinatura.findFirst({
        where: { usuarioId: auth.sub, status: { in: ['ativa', 'pendente', 'inadimplente'] } },
        orderBy: { criadoEm: 'desc' },
      });
      const usuario = await fastify.prisma.usuario.findUnique({
        where: { id: auth.sub },
        select: { plano: true, planoExpiraEm: true },
      });
      if (!usuario) return notFound(reply);
      return {
        assinatura,
        plano: usuario.plano,
        expiraEm: usuario.planoExpiraEm,
        simulado: isAsaasSimulated(),
      };
    },
  );

  /**
   * POST /api/me/assinatura - cria cliente (se necessario) + assinatura no
   * gateway e devolve `linkPagamento` para o front redirecionar ao checkout.
   */
  fastify.post(
    '/api/me/assinatura',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const parsed = criarAssinaturaSchema.safeParse(request.body);
      if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

      const { plano, billingType } = parsed.data;
      const valor = VALOR_POR_PLANO[plano];
      if (!valor) {
        return reply.code(400).send({ error: 'BadRequest', message: 'Plano sem valor configurado' });
      }

      const usuario = await fastify.prisma.usuario.findUnique({ where: { id: auth.sub } });
      if (!usuario) return notFound(reply);

      // 1. Garante customer no gateway
      let asaasCustomerId = usuario.asaasCustomerId;
      if (!asaasCustomerId) {
        const customer = await criarCliente(
          {
            name: usuario.nome,
            email: usuario.email,
            mobilePhone: usuario.celular ?? undefined,
            externalReference: usuario.id,
          },
          { log: request.log },
        );
        asaasCustomerId = customer.id;
        await fastify.prisma.usuario.update({
          where: { id: usuario.id },
          data: { asaasCustomerId },
        });
      }

      // 2. Bloqueia duplicidade: ja tem ativa?
      const existente = await fastify.prisma.assinatura.findFirst({
        where: { usuarioId: usuario.id, status: { in: ['ativa', 'pendente'] } },
      });
      if (existente) {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'Voce ja tem uma assinatura ativa. Cancele primeiro para trocar de plano.',
        });
      }

      // 3. Cria assinatura no gateway
      const sub = await criarAssinatura(
        {
          customer: asaasCustomerId,
          billingType,
          value: valor,
          cycle: 'MONTHLY',
          description: `RachãoApp - ${plano}`,
          externalReference: usuario.id,
        },
        { log: request.log },
      );

      // 4. Tenta resolver link de checkout (1a cobranca)
      let linkPagamento: string | null = null;
      try {
        const payment = await obterPrimeiraCobranca(sub.id, { log: request.log });
        linkPagamento = payment?.invoiceUrl ?? null;
      } catch (err) {
        request.log.warn({ err }, 'Asaas: falha ao buscar primeira cobranca');
      }

      // 5. Persiste localmente
      const assinatura = await fastify.prisma.assinatura.create({
        data: {
          usuarioId: usuario.id,
          gateway: 'asaas',
          externalId: sub.id,
          plano,
          status: 'pendente',
          valor,
          ciclo: 'monthly',
          billingType,
          linkPagamento,
          proximoVencimento: sub.nextDueDate ? new Date(`${sub.nextDueDate}T03:00:00Z`) : null,
        },
      });

      return reply.code(201).send({ assinatura, linkPagamento, simulado: isAsaasSimulated() });
    },
  );

  /**
   * DELETE /api/me/assinatura - cancela ao final do ciclo (mantem ativa ate
   * `proximoVencimento`). O webhook do gateway atualiza `status=cancelada`
   * quando o ciclo termina.
   */
  fastify.delete(
    '/api/me/assinatura',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const assinatura = await fastify.prisma.assinatura.findFirst({
        where: { usuarioId: auth.sub, status: { in: ['ativa', 'pendente', 'inadimplente'] } },
        orderBy: { criadoEm: 'desc' },
      });
      if (!assinatura) return notFound(reply, 'Sem assinatura ativa');

      try {
        await cancelarAssinatura(assinatura.externalId, { log: request.log });
      } catch (err) {
        request.log.warn({ err }, 'Asaas: falha ao cancelar assinatura remota');
        return reply.code(502).send({
          error: 'GatewayError',
          message: 'Nao foi possivel cancelar agora. Tente novamente em instantes.',
        });
      }

      const atualizada = await fastify.prisma.assinatura.update({
        where: { id: assinatura.id },
        data: { cancelaEmFimCiclo: true },
      });
      return { assinatura: atualizada };
    },
  );
};

export default assinaturasRoutes;
