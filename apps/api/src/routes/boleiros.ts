import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { boleiroCreateSchema, boleiroUpdateSchema } from '@rachao/shared/zod';
import { getGrupoAcesso } from '../lib/grupos.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { sincronizarBoleiroEmPartidasAgendadas } from '../lib/presencas.js';
import { sincronizarPagamentosPartida } from '../lib/vaquinha.js';

const grupoIdSchema = z.object({ id: z.string().min(1) });
const boleiroParamsSchema = z.object({
  id: z.string().min(1),
  boleiroId: z.string().min(1),
});

const listQuerySchema = z.object({
  status: z.enum(['ativo', 'arquivado', 'todos']).default('ativo'),
  q: z.string().trim().optional(),
});

const boleirosRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/grupos/:id/boleiros
   */
  fastify.get(
    '/api/grupos/:id/boleiros',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = grupoIdSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);
      const query = listQuerySchema.safeParse(request.query);
      if (!query.success) return badRequest(reply, query.error.flatten().fieldErrors);

      const acesso = await getGrupoAcesso(fastify.prisma, params.data.id, auth.sub);
      if (!acesso) return forbidden(reply);

      const where = {
        grupoId: params.data.id,
        ...(query.data.status === 'todos' ? {} : { status: query.data.status }),
        ...(query.data.q
          ? {
              OR: [
                { nome: { contains: query.data.q, mode: 'insensitive' as const } },
                { apelido: { contains: query.data.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };

      const boleiros = await fastify.prisma.boleiroGrupo.findMany({
        where,
        orderBy: [{ status: 'asc' }, { nome: 'asc' }],
      });

      return { boleiros };
    },
  );

  const celularLookupQuerySchema = z.object({
    celular: z
      .string()
      .transform((s) => s.replace(/\D/g, ''))
      .refine((d) => d.length === 11, { message: 'Informe 11 digitos (DDD + numero)' }),
  });

  /**
   * GET /api/grupos/:id/boleiros/lookup-celular?celular=
   */
  fastify.get(
    '/api/grupos/:id/boleiros/lookup-celular',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = grupoIdSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);
      const query = celularLookupQuerySchema.safeParse(request.query);
      if (!query.success) return badRequest(reply, query.error.flatten().fieldErrors);

      const acesso = await getGrupoAcesso(fastify.prisma, params.data.id, auth.sub);
      if (!acesso) return forbidden(reply);

      const boleiro = await fastify.prisma.boleiroGrupo.findUnique({
        where: {
          grupoId_celular: { grupoId: params.data.id, celular: query.data.celular },
        },
      });

      if (!boleiro) {
        return { encontrado: false as const, boleiro: null };
      }
      return { encontrado: true as const, boleiro };
    },
  );

  const boleiroFinanceiroParamsSchema = z.object({
    id: z.string().min(1),
    boleiroId: z.string().min(1),
  });

  /**
   * GET /api/grupos/:id/boleiros/:boleiroId/financeiro
   * Pagamentos por partida vs mensalidade (T11).
   */
  fastify.get(
    '/api/grupos/:id/boleiros/:boleiroId/financeiro',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = boleiroFinanceiroParamsSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const acesso = await getGrupoAcesso(fastify.prisma, params.data.id, auth.sub);
      if (!acesso) return forbidden(reply);

      const boleiro = await fastify.prisma.boleiroGrupo.findFirst({
        where: { id: params.data.boleiroId, grupoId: params.data.id },
        select: { id: true },
      });
      if (!boleiro) return notFound(reply);

      const pagamentos = await fastify.prisma.pagamento.findMany({
        where: { boleiroGrupoId: params.data.boleiroId },
        include: {
          vaquinha: {
            select: {
              tipo: true,
              mesReferencia: true,
              partida: {
                select: { id: true, dataHora: true, tipoCobranca: true, status: true },
              },
            },
          },
        },
        orderBy: { criadoEm: 'desc' },
      });

      const mapLinha = (
        p: (typeof pagamentos)[number],
      ): {
        id: string;
        status: string;
        valorCobrado: number;
        dataPagamento: Date | null;
        vaquinhaTipo: string;
        mesReferencia: string | null;
        partida: {
          id: string;
          dataHora: Date;
          tipoCobranca: string;
          status: string;
        };
      } => ({
        id: p.id,
        status: p.status,
        valorCobrado: Number(p.valorCobrado),
        dataPagamento: p.dataPagamento,
        vaquinhaTipo: p.vaquinha.tipo,
        mesReferencia: p.vaquinha.mesReferencia,
        partida: p.vaquinha.partida,
      });

      const porPartida = pagamentos
        .filter((p) => p.vaquinha.tipo === 'por_partida')
        .map(mapLinha);
      const mensalidades = pagamentos
        .filter((p) => p.vaquinha.tipo === 'mensalidade')
        .map(mapLinha);

      return { porPartida, mensalidades };
    },
  );

  /**
   * POST /api/grupos/:id/boleiros
   */
  fastify.post(
    '/api/grupos/:id/boleiros',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = grupoIdSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const acesso = await getGrupoAcesso(fastify.prisma, params.data.id, auth.sub);
      if (!acesso) return forbidden(reply);

      const parsed = boleiroCreateSchema.safeParse(request.body);
      if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

      const { celular, ...rest } = parsed.data;

      // Boleiro obrigatoriamente tem celular OU email; o schema valida isso.
      // O constraint unique e (grupoId, celular). Se nao houver celular, geramos
      // um placeholder unico baseado no email para manter o constraint.
      const celularFinal = celular && celular.length === 11 ? celular : `email:${rest.email}`;

      const existing = await fastify.prisma.boleiroGrupo.findUnique({
        where: { grupoId_celular: { grupoId: params.data.id, celular: celularFinal } },
      });
      if (existing) {
        return conflict(reply, 'Ja existe um boleiro com este contato no grupo');
      }

      const { boleiro, sincronizados } = await fastify.prisma.$transaction(async (tx) => {
        const novo = await tx.boleiroGrupo.create({
          data: {
            grupoId: params.data.id,
            nome: rest.nome,
            apelido: rest.apelido ?? null,
            posicao: rest.posicao ?? null,
            email: rest.email ?? null,
            celular: celularFinal,
          },
        });
        const sync = await sincronizarBoleiroEmPartidasAgendadas(tx, {
          boleiroGrupoId: novo.id,
          grupoId: params.data.id,
        });
        // Sincroniza pagamentos das partidas afetadas (cria 1 Pagamento para o
        // novo boleiro em cada vaquinha existente).
        const partidasAfetadas = await tx.partida.findMany({
          where: { grupoId: params.data.id, status: 'agendada' },
          select: { id: true },
        });
        for (const p of partidasAfetadas) {
          await sincronizarPagamentosPartida(tx, p.id);
        }
        return { boleiro: novo, sincronizados: sync.criados };
      });

      return reply.code(201).send({ boleiro, partidasAgendadasSincronizadas: sincronizados });
    },
  );

  /**
   * GET /api/grupos/:id/boleiros/:boleiroId
   */
  fastify.get(
    '/api/grupos/:id/boleiros/:boleiroId',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = boleiroParamsSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const acesso = await getGrupoAcesso(fastify.prisma, params.data.id, auth.sub);
      if (!acesso) return forbidden(reply);

      const boleiro = await fastify.prisma.boleiroGrupo.findFirst({
        where: { id: params.data.boleiroId, grupoId: params.data.id },
      });
      if (!boleiro) return notFound(reply);

      // Stats placeholders (Fase 3+: agregar de Evento/ConvitePartida/Pagamento).
      const [pagamentosAbertos] = await fastify.prisma.$transaction([
        fastify.prisma.pagamento.count({
          where: { boleiroGrupoId: boleiro.id, status: { in: ['pendente', 'inadimplente'] } },
        }),
      ]);

      return {
        boleiro,
        stats: {
          partidasJogadas: 0,
          gols: 0,
          cartoesAmarelos: 0,
          cartoesVermelhos: 0,
          pagamentosAbertos,
        },
      };
    },
  );

  /**
   * PATCH /api/grupos/:id/boleiros/:boleiroId
   */
  fastify.patch(
    '/api/grupos/:id/boleiros/:boleiroId',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = boleiroParamsSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const acesso = await getGrupoAcesso(fastify.prisma, params.data.id, auth.sub);
      if (!acesso) return forbidden(reply);

      const parsed = boleiroUpdateSchema.safeParse(request.body);
      if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

      const data: Record<string, unknown> = { ...parsed.data };
      if (parsed.data.celular !== undefined) {
        data.celular =
          parsed.data.celular.length === 11
            ? parsed.data.celular
            : `email:${parsed.data.email ?? ''}`;
      }

      const boleiro = await fastify.prisma.boleiroGrupo.update({
        where: { id: params.data.boleiroId },
        data,
      });
      return { boleiro };
    },
  );

  /**
   * DELETE /api/grupos/:id/boleiros/:boleiroId
   * Soft delete: marca como arquivado. ?hard=true remove definitivamente.
   */
  fastify.delete(
    '/api/grupos/:id/boleiros/:boleiroId',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = boleiroParamsSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const acesso = await getGrupoAcesso(fastify.prisma, params.data.id, auth.sub);
      if (!acesso) return forbidden(reply);

      const hard = (request.query as { hard?: string })?.hard === 'true';
      if (hard) {
        await fastify.prisma.boleiroGrupo.delete({ where: { id: params.data.boleiroId } });
        return { ok: true, deleted: true };
      }
      await fastify.prisma.boleiroGrupo.update({
        where: { id: params.data.boleiroId },
        data: { status: 'arquivado' },
      });
      return { ok: true, archived: true };
    },
  );
};

export default boleirosRoutes;
