/**
 * Rotas da Vaquinha (T23/T24/T25).
 *
 * - GET /api/partidas/:id/vaquinha - dados completos da vaquinha + lista de pagadores.
 * - POST /api/partidas/:id/vaquinha - cria a vaquinha quando a partida nao tinha.
 * - PATCH /api/vaquinhas/:id - edita config (T25).
 * - DELETE /api/vaquinhas/:id - remove vaquinha.
 * - POST /api/vaquinhas/:id/sincronizar-pagamentos - garante Pagamento por boleiro confirmado/pendente.
 * - PATCH /api/pagamentos/:id - muda status (pago/pendente).
 * - POST /api/vaquinhas/:id/cobrar - gera lista de links wa.me com mensagem personalizada.
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  cobrancaLoteSchema,
  pagamentoUpdateSchema,
  vaquinhaCreateSchema,
  vaquinhaUpdateSchema,
} from '@rachao/shared/zod';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { getGrupoAcesso } from '../lib/grupos.js';
import { buildWhatsAppLink } from '../lib/email.js';
import {
  calcularTotais,
  fimDoDiaDataHora,
  mesReferenciaBr,
  sincronizarPagamentos,
  sincronizarPagamentosPartida,
  ultimoInstanteMesReferencia,
} from '../lib/vaquinha.js';

const idParam = z.object({ id: z.string().min(1) });

const vaquinhasRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/partidas/:id/vaquinha
   * Retorna a vaquinha (se existir) + pagadores com status agregado.
   */
  fastify.get(
    '/api/partidas/:id/vaquinha',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const partida = await fastify.prisma.partida.findUnique({
        where: { id: params.data.id },
        select: {
          id: true,
          grupoId: true,
          dataHora: true,
          status: true,
          tipoCobranca: true,
          grupo: { select: { id: true, nome: true } },
        },
      });
      if (!partida) return notFound(reply);

      const acesso = await getGrupoAcesso(fastify.prisma, partida.grupoId, auth.sub);
      if (!acesso) return forbidden(reply);

      const mesRefGrupo = mesReferenciaBr(partida.dataHora);
      const baseOutraMensal = {
        tipo: 'mensalidade' as const,
        mesReferencia: mesRefGrupo,
        partida: { grupoId: partida.grupoId },
      };

      const vaquinha = await fastify.prisma.vaquinha.findUnique({
        where: { partidaId: partida.id },
      });

      const outraVaquinhaMensalidadeMesmoMesNoGrupo = vaquinha
        ? (await fastify.prisma.vaquinha.count({
            where: { ...baseOutraMensal, id: { not: vaquinha.id } },
          })) > 0
        : (await fastify.prisma.vaquinha.count({ where: baseOutraMensal })) > 0;

      const partidaPayload = {
        id: partida.id,
        dataHora: partida.dataHora,
        status: partida.status,
        tipoCobranca: partida.tipoCobranca,
        grupo: partida.grupo,
        outraVaquinhaMensalidadeMesmoMesNoGrupo,
      };

      if (!vaquinha) {
        return {
          partida: partidaPayload,
          vaquinha: null,
          pagadores: [],
          totais: { arrecadado: 0, esperado: 0, pagos: 0, pendentes: 0, inadimplentes: 0 },
        };
      }

      // Sincroniza pagamentos garantindo consistencia com a presenca atual.
      await fastify.prisma.$transaction(async (tx) => {
        await sincronizarPagamentos(tx, vaquinha.id);
      });

      const pagamentos = await fastify.prisma.pagamento.findMany({
        where: { vaquinhaId: vaquinha.id },
        orderBy: [{ status: 'asc' }, { criadoEm: 'asc' }],
        include: {
          boleiroGrupo: {
            select: { id: true, nome: true, apelido: true, celular: true, posicao: true },
          },
          convidadoAvulso: {
            select: { id: true, nome: true, apelido: true, celular: true, posicao: true },
          },
        },
      });

      const totais = calcularTotais(pagamentos);

      return {
        partida: partidaPayload,
        vaquinha: {
          id: vaquinha.id,
          tipo: vaquinha.tipo,
          mesReferencia: vaquinha.mesReferencia,
          chavePix: vaquinha.chavePix,
          tipoChavePix: vaquinha.tipoChavePix,
          valorBoleiroFixo: Number(vaquinha.valorBoleiroFixo),
          valorConvidadoAvulso: Number(vaquinha.valorConvidadoAvulso),
          dataLimitePagamento: vaquinha.dataLimitePagamento,
          dataLimitePagamentoConvidados: vaquinha.dataLimitePagamentoConvidados,
          criadoEm: vaquinha.criadoEm,
          atualizadoEm: vaquinha.atualizadoEm,
        },
        pagadores: pagamentos.map((p) => ({
          id: p.id,
          tipoPagador: p.tipoPagador,
          status: p.status,
          valorCobrado: Number(p.valorCobrado),
          dataPagamento: p.dataPagamento,
          observacao: p.observacao,
          boleiro: p.boleiroGrupo
            ? { ...p.boleiroGrupo, kind: 'fixo' as const }
            : p.convidadoAvulso
              ? { ...p.convidadoAvulso, kind: 'convidado_avulso' as const }
              : null,
        })),
        totais,
      };
    },
  );

  /**
   * POST /api/partidas/:id/vaquinha
   * Cria a vaquinha quando a partida nao tinha (caso usuario tenha pulado o step 5 do wizard).
   */
  fastify.post(
    '/api/partidas/:id/vaquinha',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);
      const body = vaquinhaCreateSchema.safeParse(request.body);
      if (!body.success) return badRequest(reply, body.error.flatten().fieldErrors);

      const partida = await fastify.prisma.partida.findUnique({
        where: { id: params.data.id },
        select: {
          id: true,
          grupoId: true,
          dataHora: true,
          tipoCobranca: true,
          vaquinha: { select: { id: true } },
        },
      });
      if (!partida) return notFound(reply);

      const acesso = await getGrupoAcesso(fastify.prisma, partida.grupoId, auth.sub);
      if (!acesso) return forbidden(reply);

      if (partida.vaquinha) {
        return reply
          .code(409)
          .send({ error: 'Conflict', message: 'Esta partida ja possui vaquinha' });
      }

      const data = body.data;
      if (data.tipoCobranca !== partida.tipoCobranca) {
        return badRequest(reply, {
          tipoCobranca: 'Deve coincidir com o tipo de cobranca definido na partida',
        });
      }

      const tipoVaq = partida.tipoCobranca;
      const mesRef =
        tipoVaq === 'mensalidade'
          ? mesReferenciaBr(partida.dataHora)
          : (data.mesReferencia ?? null);
      let dataLimFix = data.dataLimitePagamento ?? null;
      let dataLimConv = data.dataLimitePagamentoConvidados ?? null;
      if (tipoVaq === 'mensalidade' && mesRef) {
        if (!dataLimFix) dataLimFix = ultimoInstanteMesReferencia(mesRef);
        if (!dataLimConv) dataLimConv = fimDoDiaDataHora(partida.dataHora);
      }

      const result = await fastify.prisma.$transaction(async (tx) => {
        const v = await tx.vaquinha.create({
          data: {
            partidaId: partida.id,
            tipo: tipoVaq,
            chavePix: data.chavePix,
            tipoChavePix: data.tipoChavePix,
            valorBoleiroFixo: data.valorBoleiroFixo,
            valorConvidadoAvulso: data.valorConvidadoAvulso,
            dataLimitePagamento: dataLimFix,
            dataLimitePagamentoConvidados: tipoVaq === 'mensalidade' ? dataLimConv : null,
            mesReferencia: mesRef,
          },
        });
        await sincronizarPagamentos(tx, v.id);
        return v;
      });

      return reply.code(201).send({ vaquinha: { id: result.id } });
    },
  );

  /**
   * PATCH /api/vaquinhas/:id
   * Atualiza config da vaquinha. Quando o valor muda, atualiza tambem os
   * Pagamentos pendentes para refletir o novo valor cobrado.
   */
  fastify.patch(
    '/api/vaquinhas/:id',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);
      const body = vaquinhaUpdateSchema.safeParse(request.body);
      if (!body.success) return badRequest(reply, body.error.flatten().fieldErrors);

      const vaquinha = await fastify.prisma.vaquinha.findUnique({
        where: { id: params.data.id },
        include: { partida: { select: { grupoId: true } } },
      });
      if (!vaquinha) return notFound(reply);

      const acesso = await getGrupoAcesso(
        fastify.prisma,
        vaquinha.partida.grupoId,
        auth.sub,
      );
      if (!acesso) return forbidden(reply);

      const data = body.data;
      const result = await fastify.prisma.$transaction(async (tx) => {
        const updated = await tx.vaquinha.update({
          where: { id: vaquinha.id },
          data: {
            ...(data.chavePix !== undefined ? { chavePix: data.chavePix } : {}),
            ...(data.tipoChavePix !== undefined ? { tipoChavePix: data.tipoChavePix } : {}),
            ...(data.valorBoleiroFixo !== undefined
              ? { valorBoleiroFixo: data.valorBoleiroFixo }
              : {}),
            ...(data.valorConvidadoAvulso !== undefined
              ? { valorConvidadoAvulso: data.valorConvidadoAvulso }
              : {}),
            ...(data.dataLimitePagamento !== undefined
              ? { dataLimitePagamento: data.dataLimitePagamento ?? null }
              : {}),
            ...(data.dataLimitePagamentoConvidados !== undefined
              ? { dataLimitePagamentoConvidados: data.dataLimitePagamentoConvidados ?? null }
              : {}),
          },
        });

        if (data.valorBoleiroFixo !== undefined) {
          await tx.pagamento.updateMany({
            where: {
              vaquinhaId: vaquinha.id,
              tipoPagador: 'fixo',
              status: { in: ['pendente', 'inadimplente'] },
            },
            data: { valorCobrado: data.valorBoleiroFixo },
          });
        }
        if (data.valorConvidadoAvulso !== undefined) {
          await tx.pagamento.updateMany({
            where: {
              vaquinhaId: vaquinha.id,
              tipoPagador: 'convidado_avulso',
              status: { in: ['pendente', 'inadimplente'] },
            },
            data: { valorCobrado: data.valorConvidadoAvulso },
          });
        }
        return updated;
      });

      return { vaquinha: { id: result.id } };
    },
  );

  /**
   * DELETE /api/vaquinhas/:id
   * Remove vaquinha (e os pagamentos por cascade).
   */
  fastify.delete(
    '/api/vaquinhas/:id',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const vaquinha = await fastify.prisma.vaquinha.findUnique({
        where: { id: params.data.id },
        include: { partida: { select: { grupoId: true } } },
      });
      if (!vaquinha) return notFound(reply);

      const acesso = await getGrupoAcesso(
        fastify.prisma,
        vaquinha.partida.grupoId,
        auth.sub,
      );
      if (!acesso) return forbidden(reply);

      await fastify.prisma.vaquinha.delete({ where: { id: vaquinha.id } });
      return { ok: true };
    },
  );

  /**
   * POST /api/vaquinhas/:id/sincronizar-pagamentos
   * Util quando a lista de presencas muda fora do fluxo normal.
   */
  fastify.post(
    '/api/vaquinhas/:id/sincronizar-pagamentos',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const vaquinha = await fastify.prisma.vaquinha.findUnique({
        where: { id: params.data.id },
        include: { partida: { select: { grupoId: true } } },
      });
      if (!vaquinha) return notFound(reply);

      const acesso = await getGrupoAcesso(
        fastify.prisma,
        vaquinha.partida.grupoId,
        auth.sub,
      );
      if (!acesso) return forbidden(reply);

      const res = await fastify.prisma.$transaction(async (tx) => {
        return sincronizarPagamentos(tx, vaquinha.id);
      });
      return { ok: true, ...res };
    },
  );

  /**
   * PATCH /api/pagamentos/:id
   * Marca pagamento como pago / pendente / inadimplente.
   */
  fastify.patch(
    '/api/pagamentos/:id',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);
      const body = pagamentoUpdateSchema.safeParse(request.body);
      if (!body.success) return badRequest(reply, body.error.flatten().fieldErrors);

      const pagamento = await fastify.prisma.pagamento.findUnique({
        where: { id: params.data.id },
        include: {
          vaquinha: { include: { partida: { select: { grupoId: true } } } },
        },
      });
      if (!pagamento) return notFound(reply);

      const acesso = await getGrupoAcesso(
        fastify.prisma,
        pagamento.vaquinha.partida.grupoId,
        auth.sub,
      );
      if (!acesso) return forbidden(reply);

      const data = body.data;
      const dataPagamento =
        data.status === 'pago'
          ? (data.dataPagamento ?? new Date())
          : data.status === 'pendente'
            ? null
            : (data.dataPagamento ?? pagamento.dataPagamento);

      const updated = await fastify.prisma.pagamento.update({
        where: { id: pagamento.id },
        data: {
          status: data.status,
          dataPagamento,
          ...(data.observacao !== undefined ? { observacao: data.observacao } : {}),
        },
      });

      return {
        ok: true,
        pagamento: {
          id: updated.id,
          status: updated.status,
          dataPagamento: updated.dataPagamento,
        },
      };
    },
  );

  /**
   * POST /api/vaquinhas/:id/cobrar
   * Gera links wa.me para os boleiros selecionados com mensagem personalizada.
   * Tags substituidas por boleiro: [Nome] [data] [X] [chave].
   * O cliente abre `wa.me/<num>?text=...` em sequencia.
   */
  fastify.post(
    '/api/vaquinhas/:id/cobrar',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);
      const body = cobrancaLoteSchema.safeParse(request.body);
      if (!body.success) return badRequest(reply, body.error.flatten().fieldErrors);

      const vaquinha = await fastify.prisma.vaquinha.findUnique({
        where: { id: params.data.id },
        include: {
          partida: { select: { grupoId: true, dataHora: true } },
        },
      });
      if (!vaquinha) return notFound(reply);

      const acesso = await getGrupoAcesso(
        fastify.prisma,
        vaquinha.partida.grupoId,
        auth.sub,
      );
      if (!acesso) return forbidden(reply);

      const pagamentos = await fastify.prisma.pagamento.findMany({
        where: { id: { in: body.data.pagamentoIds }, vaquinhaId: vaquinha.id },
        include: {
          boleiroGrupo: { select: { nome: true, celular: true } },
          convidadoAvulso: { select: { nome: true, celular: true } },
        },
      });

      const dataFmt = new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo',
      }).format(vaquinha.partida.dataHora);

      const links: Array<{
        pagamentoId: string;
        nome: string;
        url: string;
      }> = [];
      let semWhatsapp = 0;

      for (const p of pagamentos) {
        const dest = p.boleiroGrupo ?? p.convidadoAvulso;
        if (!dest) continue;
        const celular = dest.celular?.startsWith('email:') ? null : (dest.celular ?? null);
        if (!celular) {
          semWhatsapp++;
          continue;
        }
        const valor = Number(p.valorCobrado).toFixed(2).replace('.', ',');
        const corpo = body.data.mensagem
          .replaceAll('[Nome]', dest.nome)
          .replaceAll('[data]', dataFmt)
          .replaceAll('[X]', valor)
          .replaceAll('[chave]', vaquinha.chavePix);
        const url = buildWhatsAppLink(celular, corpo);
        if (!url) {
          semWhatsapp++;
          continue;
        }
        links.push({
          pagamentoId: p.id,
          nome: dest.nome,
          url,
        });
      }

      return {
        ok: true,
        links,
        semWhatsapp,
      };
    },
  );

  /**
   * Util interno: hook chamado por outras rotas quando convite e confirmado/promovido.
   * Mantido publico aqui para POST /api/partidas/:id/vaquinha/sincronizar (atalho).
   */
  fastify.post(
    '/api/partidas/:id/vaquinha/sincronizar',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const partida = await fastify.prisma.partida.findUnique({
        where: { id: params.data.id },
        select: { grupoId: true, id: true },
      });
      if (!partida) return notFound(reply);

      const acesso = await getGrupoAcesso(fastify.prisma, partida.grupoId, auth.sub);
      if (!acesso) return forbidden(reply);

      await fastify.prisma.$transaction(async (tx) => {
        await sincronizarPagamentosPartida(tx, partida.id);
      });
      return { ok: true };
    },
  );
};

export default vaquinhasRoutes;
