import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { getGrupoAcesso } from '../lib/grupos.js';
import {
  aplicarInadimplenciaVaquinha,
  boleiroElegivelMensalidadeMes,
  mesReferenciaBr,
  precisaSincronizarPagamentos,
  sincronizarPagamentos,
} from '../lib/vaquinha.js';

const grupoIdSchema = z.object({ id: z.string().min(1) });

const financeiroQuerySchema = z.object({
  mes: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Use AAAA-MM')
    .optional(),
});

const gruposFinanceiroRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/grupos/:id/financeiro — visao consolidada de pagamentos
   */
  fastify.get(
    '/api/grupos/:id/financeiro',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = grupoIdSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const acesso = await getGrupoAcesso(fastify.prisma, params.data.id, auth.sub);
      if (!acesso) return forbidden(reply);

      const query = financeiroQuerySchema.safeParse(request.query);
      if (!query.success) return badRequest(reply, query.error.flatten().fieldErrors);

      const mesReferencia = query.data.mes ?? mesReferenciaBr(new Date());

      const grupo = await fastify.prisma.grupo.findUnique({
        where: { id: params.data.id },
        select: { id: true, nome: true, criadoEm: true },
      });
      if (!grupo) return notFound(reply);

      const vaquinhasMes = await fastify.prisma.vaquinha.findMany({
        where: {
          tipo: 'mensalidade',
          mesReferencia,
          partida: { grupoId: params.data.id },
        },
        select: { id: true, valorBoleiroFixo: true },
      });

      if (vaquinhasMes.length > 0) {
        for (const v of vaquinhasMes) {
          const precisaSync = await precisaSincronizarPagamentos(fastify.prisma, v.id);
          if (precisaSync) {
            await sincronizarPagamentos(fastify.prisma, v.id);
          } else {
            await aplicarInadimplenciaVaquinha(fastify.prisma, v.id);
          }
        }
      }

      const boleirosAtivos = await fastify.prisma.boleiroGrupo.findMany({
        where: { grupoId: params.data.id, status: 'ativo' },
        select: {
          id: true,
          nome: true,
          apelido: true,
          celular: true,
          fotoUrl: true,
          criadoEm: true,
        },
        orderBy: { nome: 'asc' },
      });

      const pagamentosFixosMes =
        boleirosAtivos.length === 0
          ? []
          : await fastify.prisma.pagamento.findMany({
              where: {
                tipoPagador: 'fixo',
                boleiroGrupoId: { in: boleirosAtivos.map((b) => b.id) },
                vaquinha: {
                  tipo: 'mensalidade',
                  mesReferencia,
                  partida: { grupoId: params.data.id },
                },
              },
              select: {
                id: true,
                status: true,
                valorCobrado: true,
                boleiroGrupoId: true,
              },
            });

      const pagamentoPorBoleiro = new Map<string, (typeof pagamentosFixosMes)[number]>();
      for (const p of pagamentosFixosMes) {
        if (p.boleiroGrupoId && !pagamentoPorBoleiro.has(p.boleiroGrupoId)) {
          pagamentoPorBoleiro.set(p.boleiroGrupoId, p);
        }
      }

      const valorMensalPadrao =
        vaquinhasMes.length > 0 ? Number(vaquinhasMes[0]!.valorBoleiroFixo) : null;

      const mensalidadeMes = {
        mesReferencia,
        temVaquinha: vaquinhasMes.length > 0,
        valorMensal: valorMensalPadrao,
        boleiros: boleirosAtivos.map((b) => {
          const pag = pagamentoPorBoleiro.get(b.id);
          const elegivel = boleiroElegivelMensalidadeMes(
            mesReferencia,
            grupo.criadoEm,
            b.criadoEm,
          );
          return {
            boleiroId: b.id,
            nome: b.nome,
            apelido: b.apelido,
            celular: b.celular,
            fotoUrl: b.fotoUrl,
            pagamentoId: elegivel ? (pag?.id ?? null) : null,
            status: !elegivel
              ? 'sem_cobranca'
              : (pag?.status ?? (vaquinhasMes.length > 0 ? 'pendente' : 'sem_cobranca')),
            valorCobrado: elegivel
              ? pag
                ? Number(pag.valorCobrado)
                : valorMensalPadrao
              : null,
          };
        }),
      };

      const pagamentos = await fastify.prisma.pagamento.findMany({
        where: {
          vaquinha: {
            partida: { grupoId: params.data.id },
          },
        },
        include: {
          boleiroGrupo: { select: { id: true, nome: true, apelido: true, celular: true } },
          convidadoAvulso: { select: { id: true, nome: true, apelido: true, celular: true } },
          vaquinha: {
            select: {
              id: true,
              tipo: true,
              mesReferencia: true,
              chavePix: true,
              valorBoleiroFixo: true,
              valorConvidadoAvulso: true,
              partida: {
                select: {
                  id: true,
                  dataHora: true,
                  status: true,
                  tipoCobranca: true,
                },
              },
            },
          },
        },
        orderBy: { criadoEm: 'desc' },
        take: 500,
      });

      const mapPag = (p: (typeof pagamentos)[number]) => {
        const isFixo = p.tipoPagador === 'fixo' && p.boleiroGrupo;
        const isConv = p.tipoPagador === 'convidado_avulso' && p.convidadoAvulso;
        if (!isFixo && !isConv) return null;

        return {
          id: p.id,
          status: p.status,
          tipoPagador: p.tipoPagador,
          valorCobrado: Number(p.valorCobrado),
          dataPagamento: p.dataPagamento,
          observacao: p.observacao,
          pagador: isFixo
            ? {
                kind: 'fixo' as const,
                id: p.boleiroGrupo!.id,
                nome: p.boleiroGrupo!.nome,
                apelido: p.boleiroGrupo!.apelido,
                celular: p.boleiroGrupo!.celular,
              }
            : {
                kind: 'convidado_avulso' as const,
                id: p.convidadoAvulso!.id,
                nome: p.convidadoAvulso!.nome,
                apelido: p.convidadoAvulso!.apelido,
                celular: p.convidadoAvulso!.celular,
              },
          vaquinha: {
            id: p.vaquinha.id,
            tipo: p.vaquinha.tipo,
            mesReferencia: p.vaquinha.mesReferencia,
            chavePix: p.vaquinha.chavePix,
          },
          partida: p.vaquinha.partida,
        };
      };

      const linhas = pagamentos.map(mapPag).filter((l): l is NonNullable<typeof l> => l != null);
      const mensalidades = linhas.filter((l) => l.vaquinha.tipo === 'mensalidade');
      const porPartida = linhas.filter(
        (l) => l.vaquinha.tipo === 'por_partida' && l.tipoPagador === 'fixo',
      );
      const convidados = linhas.filter((l) => l.tipoPagador === 'convidado_avulso');

      const totais = {
        arrecadado: linhas
          .filter((l) => l.status === 'pago')
          .reduce((s, l) => s + l.valorCobrado, 0),
        pendente: linhas
          .filter((l) => l.status === 'pendente')
          .reduce((s, l) => s + l.valorCobrado, 0),
        inadimplente: linhas
          .filter((l) => l.status === 'inadimplente')
          .reduce((s, l) => s + l.valorCobrado, 0),
      };

      return {
        grupo,
        totais,
        mensalidadeMes,
        mensalidades,
        porPartida,
        convidados,
      };
    },
  );
};

export default gruposFinanceiroRoutes;
