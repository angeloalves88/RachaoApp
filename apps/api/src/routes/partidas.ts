import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  convidadoAvulsoCreateSchema,
  convitePresidenteUpdateSchema,
  partidaCreateSchema,
  partidaUpdateSchema,
  reenvioConvitesSchema,
} from '@rachao/shared/zod';
import { STATUS_PARTIDA } from '@rachao/shared/enums';
import { getGrupoAcesso } from '../lib/grupos.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { agregarResumo } from '../lib/resumo.js';
import { buildWhatsAppLink, enviarConviteEmail } from '../lib/email.js';
import {
  formatarDataPartidaBr,
  promoverListaEspera,
  resolveContatoConvite,
} from '../lib/presencas.js';
import { criarNotificacoesPresidentesGrupo } from '../lib/notificacoes.js';
import { env } from '../env.js';
import {
  fimDoDiaDataHora,
  mesReferenciaBr,
  ultimoInstanteMesReferencia,
} from '../lib/vaquinha.js';

const idParamSchema = z.object({ id: z.string().min(1) });
const partidaConviteParams = z.object({
  id: z.string().min(1),
  conviteId: z.string().min(1),
});

const listQuerySchema = z.object({
  grupoId: z.string().optional(),
  status: z
    .union([z.enum(STATUS_PARTIDA), z.literal('todos')])
    .default('todos')
    .optional(),
});

/**
 * Token de convite (ConvitePartida.token) expira em 30 dias.
 */
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function addWeeksUtc(d: Date, weeks: number): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + weeks * 7);
  return out;
}

const partidasRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/partidas
   * Lista partidas dos grupos onde o user e presidente.
   * Query: ?grupoId=...&status=agendada|encerrada|todos
   */
  fastify.get('/api/partidas', { preHandler: fastify.requireAuth }, async (request, reply) => {
    const auth = request.user!;
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

    const { grupoId, status } = parsed.data;

    const grupoIds = grupoId
      ? [grupoId]
      : (
          await fastify.prisma.grupoPresidente.findMany({
            where: { usuarioId: auth.sub },
            select: { grupoId: true },
          })
        ).map((g) => g.grupoId);

    if (grupoId) {
      const acesso = await getGrupoAcesso(fastify.prisma, grupoId, auth.sub);
      if (!acesso) return forbidden(reply);
    }

    const partidas = await fastify.prisma.partida.findMany({
      where: {
        grupoId: { in: grupoIds },
        ...(status && status !== 'todos' ? { status } : {}),
      },
      orderBy: { dataHora: 'desc' },
      include: {
        grupo: { select: { id: true, nome: true, fotoUrl: true } },
        estadio: { select: { id: true, nome: true } },
        _count: { select: { convites: true } },
        convites: {
          where: { status: 'confirmado' },
          select: { id: true },
        },
      },
    });

    return {
      partidas: partidas.map((p) => ({
        id: p.id,
        dataHora: p.dataHora,
        status: p.status,
        local: p.estadio?.nome ?? p.localLivre ?? null,
        grupo: p.grupo,
        numTimes: p.numTimes,
        boleirosPorTime: p.boleirosPorTime,
        reservasPorTime: p.reservasPorTime ?? 0,
        tempoPartida: p.tempoPartida,
        tempoTotal: p.tempoTotal,
        confirmados: p.convites.length,
        totalConvites: p._count.convites,
        vagasTotais: p.numTimes * (p.boleirosPorTime + (p.reservasPorTime ?? 0)),
        serieId: p.serieId,
      })),
    };
  });

  /**
   * POST /api/partidas
   * Cria partida + convites + (opcional) vaquinha.
   * Boleiros excedentes da capacidade entram com status=lista_espera + posicaoEspera.
   */
  fastify.post('/api/partidas', { preHandler: fastify.requireAuth }, async (request, reply) => {
    const auth = request.user!;
    const parsed = partidaCreateSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

    const data = parsed.data;
    const acesso = await getGrupoAcesso(fastify.prisma, data.grupoId, auth.sub);
    if (!acesso) return forbidden(reply);

    // Capacidade total inclui titulares + reservas (T20+).
    const capacidade =
      data.numTimes * (data.boleirosPorTime + (data.reservasPorTime ?? 0));

    // Valida boleiros: todos pertencem ao grupo e estao ativos.
    let boleirosOrdenados: { id: string; nome: string; email: string | null; celular: string | null }[] = [];
    if (data.boleirosIds.length > 0) {
      const boleiros = await fastify.prisma.boleiroGrupo.findMany({
        where: { id: { in: data.boleirosIds }, grupoId: data.grupoId, status: 'ativo' },
        select: { id: true, nome: true, email: true, celular: true },
      });
      const setEncontrados = new Set(boleiros.map((b) => b.id));
      const faltando = data.boleirosIds.filter((id) => !setEncontrados.has(id));
      if (faltando.length > 0) {
        return badRequest(reply, { boleirosIds: faltando }, 'Alguns boleiros nao pertencem ao grupo');
      }
      // Mantem a ordem enviada pelo cliente (relevante para lista de espera).
      const byId = new Map(boleiros.map((b) => [b.id, b]));
      boleirosOrdenados = data.boleirosIds
        .map((id) => byId.get(id))
        .filter((b): b is NonNullable<typeof b> => !!b);
    }

    const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    for (const c of data.convidadosAvulsos) {
      if (!c.convidadoAvulsoId) continue;
      const exists = await fastify.prisma.convidadoAvulso.findUnique({
        where: { id: c.convidadoAvulsoId },
        select: { id: true },
      });
      if (!exists) {
        return badRequest(reply, { convidadosAvulsos: 'Convidado avulso não encontrado' });
      }
    }

    const ocorrencias = data.serieSemanal?.ocorrencias ?? 1;
    // Gera um identificador compartilhado para todas as partidas da serie quando ha
    // recorrencia (ocorrencias > 1). Permite cancelar a serie inteira de uma vez.
    const serieId = ocorrencias > 1 ? randomUUID() : null;

    type Criada = {
      partida: { id: string; dataHora: Date };
      convites: Awaited<ReturnType<typeof fastify.prisma.convitePartida.create>>[];
      vaquinha: { id: string } | null;
    };

    const criadas = await fastify.prisma.$transaction(async (tx) => {
      const out: Criada[] = [];

      for (let w = 0; w < ocorrencias; w++) {
        const dataHora = w === 0 ? data.dataHora : addWeeksUtc(data.dataHora, w);

        const partida = await tx.partida.create({
          data: {
            grupoId: data.grupoId,
            dataHora,
            numTimes: data.numTimes,
            boleirosPorTime: data.boleirosPorTime,
            reservasPorTime: data.reservasPorTime ?? 0,
            tempoPartida: data.tempoPartida,
            tempoTotal: data.tempoTotal,
            tipoCobranca: data.tipoCobranca,
            localLivre: data.localLivre ?? null,
            estadioId: data.estadioId ?? null,
            observacoes: data.observacoes ?? null,
            regras: data.regras as object,
            statusEstadio: data.estadioId ? 'pendente' : 'sem_estadio',
            serieId,
            presidentes: { create: { usuarioId: auth.sub } },
          },
        });

        // Cria SolicitacaoVinculo quando partida tem estadio cadastrado (T29).
        if (data.estadioId) {
          await tx.solicitacaoVinculo.create({
            data: {
              partidaId: partida.id,
              estadioId: data.estadioId,
              status: 'pendente',
              observacoesPres: data.observacoes ?? null,
            },
          });
        }

        let posicaoEspera = 1;
        const convites = [] as Awaited<ReturnType<typeof tx.convitePartida.create>>[];
        for (let i = 0; i < boleirosOrdenados.length; i++) {
          const b = boleirosOrdenados[i]!;
          const dentroDaCapacidade = i < capacidade;
          const convite = await tx.convitePartida.create({
            data: {
              partidaId: partida.id,
              boleiroGrupoId: b.id,
              tipo: 'fixo',
              tokenExpiresAt,
              status: dentroDaCapacidade ? 'pendente' : 'lista_espera',
              posicaoEspera: dentroDaCapacidade ? null : posicaoEspera++,
            },
          });
          convites.push(convite);
        }

        for (const c of data.convidadosAvulsos) {
          let convidado = null as Awaited<ReturnType<typeof tx.convidadoAvulso.findUnique>>;
          if (c.convidadoAvulsoId) {
            convidado = await tx.convidadoAvulso.findUnique({
              where: { id: c.convidadoAvulsoId },
            });
            if (!convidado) {
              throw new Error('Convidado avulso nao encontrado');
            }
          } else {
            convidado = c.celular
              ? await tx.convidadoAvulso.findUnique({ where: { celular: c.celular } })
              : null;
            if (!convidado) {
              convidado = await tx.convidadoAvulso.create({
                data: {
                  nome: c.nome!.trim(),
                  apelido: c.apelido ?? null,
                  posicao: c.posicao ?? null,
                  celular: c.celular || `email:${c.email ?? ''}`,
                },
              });
            }
          }
          const dentroDaCapacidade =
            convites.filter((c2) => c2.status !== 'lista_espera').length < capacidade;
          const convite = await tx.convitePartida.create({
            data: {
              partidaId: partida.id,
              convidadoAvulsoId: convidado.id,
              tipo: 'convidado_avulso',
              tokenExpiresAt,
              status: dentroDaCapacidade ? 'pendente' : 'lista_espera',
              posicaoEspera: dentroDaCapacidade ? null : posicaoEspera++,
            },
          });
          convites.push(convite);
        }

        let vaquinha: { id: string } | null = null;
        if (data.vaquinha) {
          const tipoVaq = data.tipoCobranca;
          const mesRef =
            tipoVaq === 'mensalidade'
              ? mesReferenciaBr(dataHora)
              : (data.vaquinha.mesReferencia ?? null);
          let dataLimFix = data.vaquinha.dataLimitePagamento ?? null;
          let dataLimConv = data.vaquinha.dataLimitePagamentoConvidados ?? null;
          if (tipoVaq === 'mensalidade' && mesRef) {
            if (!dataLimFix) dataLimFix = ultimoInstanteMesReferencia(mesRef);
            if (!dataLimConv) dataLimConv = fimDoDiaDataHora(dataHora);
          }
          const v = await tx.vaquinha.create({
            data: {
              partidaId: partida.id,
              tipo: tipoVaq,
              chavePix: data.vaquinha.chavePix,
              tipoChavePix: data.vaquinha.tipoChavePix,
              valorBoleiroFixo: data.vaquinha.valorBoleiroFixo,
              valorConvidadoAvulso: data.vaquinha.valorConvidadoAvulso,
              dataLimitePagamento: dataLimFix,
              dataLimitePagamentoConvidados: tipoVaq === 'mensalidade' ? dataLimConv : null,
              mesReferencia: mesRef,
            },
          });
          vaquinha = { id: v.id };
        }

        out.push({
          partida: { id: partida.id, dataHora: partida.dataHora },
          convites,
          vaquinha,
        });
      }

      return out;
    });

    const primeira = criadas[0]!;

    // Dispara envio assincrono para todos os convites de todas as partidas da serie.
    queueMicrotask(async () => {
      try {
        const grupo = await fastify.prisma.grupo.findUnique({
          where: { id: data.grupoId },
          select: { nome: true },
        });
        const fmtOpts = {
          dateStyle: 'full' as const,
          timeStyle: 'short' as const,
          timeZone: 'America/Sao_Paulo',
        };

        for (const bloco of criadas) {
          const dataFmt = new Intl.DateTimeFormat('pt-BR', fmtOpts).format(bloco.partida.dataHora);
          for (const c of bloco.convites) {
            if (c.status === 'lista_espera') continue;
            const dest = await resolveEmailConvite(fastify.prisma, c);
            if (!dest) continue;
            await enviarConviteEmail(
              {
                to: dest.email,
                nomeBoleiro: dest.nome,
                nomeGrupo: grupo?.nome ?? 'RachãoApp',
                dataPartidaFormatada: dataFmt,
                localPartida: data.localLivre ?? null,
                linkConfirmacao: `${env.WEB_URL}/confirmar/${c.token}`,
              },
              fastify.log,
            );
          }
        }

        // Notifica dono do estadio quando ha vinculacao (T29 - nova solicitacao).
        if (data.estadioId) {
          const estadio = await fastify.prisma.estadio.findUnique({
            where: { id: data.estadioId },
            select: { donoId: true, nome: true },
          });
          if (estadio) {
            for (const bloco of criadas) {
              const dataFmt = new Intl.DateTimeFormat('pt-BR', fmtOpts).format(
                bloco.partida.dataHora,
              );
              await fastify.prisma.notificacao.create({
                data: {
                  usuarioId: estadio.donoId,
                  tipo: 'nova_solicitacao_vinculo',
                  categoria: 'estadio',
                  titulo: `Nova solicitacao de ${grupo?.nome ?? 'um grupo'}`,
                  corpo: `Partida agendada para ${dataFmt} aguarda sua aprovacao.`,
                  link: `/estadio/solicitacoes`,
                  partidaId: bloco.partida.id,
                  grupoId: data.grupoId,
                },
              });
            }
          }
        }
      } catch (err) {
        fastify.log.warn({ err }, 'Falha ao enviar convites assincronamente');
      }
    });

    return reply.code(201).send({
      partida: { id: primeira.partida.id },
      convites: primeira.convites,
      vaquinha: primeira.vaquinha,
      serie:
        ocorrencias > 1
          ? { total: ocorrencias, ids: criadas.map((c) => c.partida.id) }
          : null,
    });
  });

  /**
   * GET /api/partidas/:id
   */
  fastify.get('/api/partidas/:id', { preHandler: fastify.requireAuth }, async (request, reply) => {
    const auth = request.user!;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

    const partida = await fastify.prisma.partida.findUnique({
      where: { id: params.data.id },
      include: {
        grupo: { select: { id: true, nome: true, fotoUrl: true } },
        estadio: { select: { id: true, slug: true, nome: true, endereco: true, cidade: true } },
        presidentes: {
          include: { usuario: { select: { id: true, nome: true, email: true, avatarUrl: true } } },
        },
        convites: {
          orderBy: [{ status: 'asc' }, { posicaoEspera: 'asc' }, { criadoEm: 'asc' }],
          include: {
            boleiroGrupo: {
              select: { id: true, nome: true, apelido: true, posicao: true, celular: true, email: true },
            },
            convidadoAvulso: {
              select: { id: true, nome: true, apelido: true, posicao: true, celular: true },
            },
          },
        },
        vaquinha: {
          include: {
            pagamentos: {
              select: { id: true, status: true, valorCobrado: true },
            },
          },
        },
        times: {
          select: { id: true, _count: { select: { boleiros: true } } },
        },
      },
    });
    if (!partida) return notFound(reply);

    const acesso = await getGrupoAcesso(fastify.prisma, partida.grupoId, auth.sub);
    if (!acesso) return forbidden(reply);

    const temEscalacao =
      partida.times.length >= 2 && partida.times.every((t) => t._count.boleiros > 0);

    const confirmados = partida.convites.filter((c) => c.status === 'confirmado').length;
    const recusados = partida.convites.filter((c) => c.status === 'recusado').length;
    const pendentes = partida.convites.filter((c) => c.status === 'pendente').length;
    const listaEspera = partida.convites.filter((c) => c.status === 'lista_espera').length;
    const departamentoMedico = partida.convites.filter(
      (c) => c.status === 'departamento_medico',
    ).length;
    const vagasTotais =
      partida.numTimes * (partida.boleirosPorTime + (partida.reservasPorTime ?? 0));

    // Conta quantas partidas da mesma serie ainda estao pendentes na data atual ou
    // futura, excluindo a propria. Usado para decidir mostrar a opcao "Cancelar esta
    // e as proximas da serie" no menu de acoes.
    const serieRestantes = partida.serieId
      ? await fastify.prisma.partida.count({
          where: {
            serieId: partida.serieId,
            status: { in: ['agendada', 'em_andamento'] },
            dataHora: { gte: partida.dataHora },
            id: { not: partida.id },
          },
        })
      : 0;

    let vaquinhaResumo = null;
    if (partida.vaquinha) {
      const arrecadado = partida.vaquinha.pagamentos
        .filter((p) => p.status === 'pago')
        .reduce((acc, p) => acc + Number(p.valorCobrado), 0);
      const totalEsperado = partida.vaquinha.pagamentos.reduce(
        (acc, p) => acc + Number(p.valorCobrado),
        0,
      );
      vaquinhaResumo = {
        id: partida.vaquinha.id,
        tipo: partida.vaquinha.tipo,
        chavePix: partida.vaquinha.chavePix,
        tipoChavePix: partida.vaquinha.tipoChavePix,
        valorBoleiroFixo: Number(partida.vaquinha.valorBoleiroFixo),
        valorConvidadoAvulso: Number(partida.vaquinha.valorConvidadoAvulso),
        dataLimitePagamento: partida.vaquinha.dataLimitePagamento,
        arrecadado,
        totalEsperado,
      };
    }

    return {
      partida: {
        id: partida.id,
        dataHora: partida.dataHora,
        status: partida.status,
        statusEstadio: partida.statusEstadio,
        numTimes: partida.numTimes,
        boleirosPorTime: partida.boleirosPorTime,
        reservasPorTime: partida.reservasPorTime ?? 0,
        tempoPartida: partida.tempoPartida,
        tempoTotal: partida.tempoTotal,
        tipoCobranca: partida.tipoCobranca,
        localLivre: partida.localLivre,
        observacoes: partida.observacoes,
        regras: partida.regras,
        grupo: partida.grupo,
        estadio: partida.estadio,
        presidentes: partida.presidentes.map((p) => ({
          ...p.usuario,
        })),
        convites: partida.convites.map((c) => ({
          id: c.id,
          tipo: c.tipo,
          status: c.status,
          posicaoEspera: c.posicaoEspera,
          recado: c.recado,
          confirmadoEm: c.confirmadoEm,
          token: c.token,
          boleiro: c.boleiroGrupo
            ? { ...c.boleiroGrupo, kind: 'fixo' as const }
            : c.convidadoAvulso
              ? { ...c.convidadoAvulso, email: null, kind: 'convidado_avulso' as const }
              : null,
        })),
        resumo: {
          confirmados,
          recusados,
          pendentes,
          listaEspera,
          departamentoMedico,
          vagasTotais,
        },
        vaquinha: vaquinhaResumo,
        serieId: partida.serieId,
        serieRestantes,
        temEscalacao,
        criadoEm: partida.criadoEm,
        atualizadoEm: partida.atualizadoEm,
      },
    };
  });

  /**
   * PATCH /api/partidas/:id
   */
  fastify.patch('/api/partidas/:id', { preHandler: fastify.requireAuth }, async (request, reply) => {
    const auth = request.user!;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

    const partida = await fastify.prisma.partida.findUnique({
      where: { id: params.data.id },
      select: { grupoId: true, status: true },
    });
    if (!partida) return notFound(reply);

    const acesso = await getGrupoAcesso(fastify.prisma, partida.grupoId, auth.sub);
    if (!acesso) return forbidden(reply);

    const parsed = partidaUpdateSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

    const { regras, ...rest } = parsed.data;
    const updated = await fastify.prisma.partida.update({
      where: { id: params.data.id },
      data: {
        ...rest,
        ...(regras !== undefined ? { regras: regras as object } : {}),
      },
    });
    return { partida: updated };
  });

  /**
   * DELETE /api/partidas/:id
   * Soft delete: marca status=cancelada. Hard delete via ?hard=true.
   * Para partidas com serieId, ?escopo=serie cancela esta + todas as futuras
   * pendentes da mesma serie. Default = 'apenas' (so a partida atual).
   */
  fastify.delete('/api/partidas/:id', { preHandler: fastify.requireAuth }, async (request, reply) => {
    const auth = request.user!;
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

    const partida = await fastify.prisma.partida.findUnique({
      where: { id: params.data.id },
      select: { grupoId: true, serieId: true, dataHora: true },
    });
    if (!partida) return notFound(reply);

    const acesso = await getGrupoAcesso(fastify.prisma, partida.grupoId, auth.sub);
    if (!acesso) return forbidden(reply);

    const query = (request.query as { hard?: string; escopo?: string }) ?? {};
    const hard = query.hard === 'true';
    if (hard) {
      if (acesso.papel !== 'criador') {
        return forbidden(reply, 'Apenas o criador do grupo pode excluir definitivamente');
      }
      await fastify.prisma.partida.delete({ where: { id: params.data.id } });
      return { ok: true, deleted: true };
    }

    const escopo = query.escopo === 'serie' ? 'serie' : 'apenas';
    if (escopo === 'serie' && partida.serieId) {
      // Cancela esta partida + todas as futuras pendentes da serie. Partidas ja
      // encerradas/canceladas/passadas ficam intactas para preservar historico.
      const result = await fastify.prisma.partida.updateMany({
        where: {
          serieId: partida.serieId,
          status: { in: ['agendada', 'em_andamento'] },
          dataHora: { gte: partida.dataHora },
        },
        data: { status: 'cancelada' },
      });
      return { ok: true, cancelled: true, total: result.count, escopo: 'serie' as const };
    }

    await fastify.prisma.partida.update({
      where: { id: params.data.id },
      data: { status: 'cancelada' },
    });
    return { ok: true, cancelled: true, total: 1, escopo: 'apenas' as const };
  });

  /**
   * POST /api/partidas/:id/convidados-avulsos
   * Adiciona um convidado avulso a partida. Reaproveita ConvidadoAvulso por celular.
   */
  fastify.post(
    '/api/partidas/:id/convidados-avulsos',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParamSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const partida = await fastify.prisma.partida.findUnique({
        where: { id: params.data.id },
        select: {
          grupoId: true,
          numTimes: true,
          boleirosPorTime: true,
          reservasPorTime: true,
        },
      });
      if (!partida) return notFound(reply);
      const acesso = await getGrupoAcesso(fastify.prisma, partida.grupoId, auth.sub);
      if (!acesso) return forbidden(reply);

      const parsed = convidadoAvulsoCreateSchema.safeParse(request.body);
      if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);
      const c = parsed.data;

      if (c.convidadoAvulsoId) {
        const exists = await fastify.prisma.convidadoAvulso.findUnique({
          where: { id: c.convidadoAvulsoId },
        });
        if (!exists) return notFound(reply, 'Convidado avulso nao encontrado');
      }

      const capacidade =
        partida.numTimes * (partida.boleirosPorTime + (partida.reservasPorTime ?? 0));
      const usadas = await fastify.prisma.convitePartida.count({
        where: {
          partidaId: params.data.id,
          status: { in: ['pendente', 'confirmado'] },
        },
      });
      const ultimasEspera = await fastify.prisma.convitePartida.aggregate({
        where: { partidaId: params.data.id, status: 'lista_espera' },
        _max: { posicaoEspera: true },
      });

      let convidado = null as Awaited<ReturnType<typeof fastify.prisma.convidadoAvulso.findUnique>>;
      if (c.convidadoAvulsoId) {
        convidado = await fastify.prisma.convidadoAvulso.findUnique({
          where: { id: c.convidadoAvulsoId },
        });
        if (!convidado) return notFound(reply, 'Convidado avulso nao encontrado');
      } else {
        convidado = c.celular
          ? await fastify.prisma.convidadoAvulso.findUnique({ where: { celular: c.celular } })
          : null;
        if (!convidado) {
          convidado = await fastify.prisma.convidadoAvulso.create({
            data: {
              nome: c.nome!.trim(),
              apelido: c.apelido ?? null,
              posicao: c.posicao ?? null,
              celular: c.celular || `email:${c.email ?? ''}`,
            },
          });
        }
      }

      const dentroDaCapacidade = usadas < capacidade;
      const convite = await fastify.prisma.convitePartida.create({
        data: {
          partidaId: params.data.id,
          convidadoAvulsoId: convidado.id,
          tipo: 'convidado_avulso',
          tokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
          status: dentroDaCapacidade ? 'pendente' : 'lista_espera',
          posicaoEspera: dentroDaCapacidade ? null : (ultimasEspera._max.posicaoEspera ?? 0) + 1,
        },
      });

      return reply.code(201).send({ convite, convidadoAvulso: convidado });
    },
  );

  /**
   * PATCH /api/partidas/:id/convites/:conviteId
   * Atualizacao manual pelo Presidente: forca status do convite (T15).
   * Quando libera vaga (recusado/lista_espera) tenta promover a lista de espera.
   */
  fastify.patch(
    '/api/partidas/:id/convites/:conviteId',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = partidaConviteParams.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);
      const body = convitePresidenteUpdateSchema.safeParse(request.body);
      if (!body.success) return badRequest(reply, body.error.flatten().fieldErrors);

      const convite = await fastify.prisma.convitePartida.findUnique({
        where: { id: params.data.conviteId },
        include: { partida: { select: { id: true, grupoId: true, status: true } } },
      });
      if (!convite || convite.partidaId !== params.data.id) return notFound(reply);

      const acesso = await getGrupoAcesso(fastify.prisma, convite.partida.grupoId, auth.sub);
      if (!acesso) return forbidden(reply);

      const updates: Record<string, unknown> = {};
      if (body.data.status) {
        updates.status = body.data.status;
        if (body.data.status === 'confirmado') {
          updates.confirmadoEm = new Date();
        } else if (body.data.status !== 'lista_espera') {
          updates.posicaoEspera = null;
        }
      }
      if (body.data.posicaoEspera !== undefined) {
        updates.posicaoEspera = body.data.posicaoEspera;
      }

      const updated = await fastify.prisma.$transaction(async (tx) => {
        const u = await tx.convitePartida.update({
          where: { id: convite.id },
          data: updates,
        });
        const promovidos =
          body.data.status === 'recusado' || body.data.status === 'lista_espera'
            ? await promoverListaEspera(tx, convite.partidaId)
            : { promovidos: [] };
        return { convite: u, promovidos: promovidos.promovidos };
      });

      // Side effect: notificar promovidos por email + presidentes (vaga aberta).
      if (updated.promovidos.length > 0) {
        queueMicrotask(async () => {
          try {
            const partida = await fastify.prisma.partida.findUnique({
              where: { id: convite.partidaId },
              select: { dataHora: true, grupoId: true, id: true, localLivre: true, estadio: { select: { nome: true } } },
            });
            const grupo = partida
              ? await fastify.prisma.grupo.findUnique({
                  where: { id: partida.grupoId },
                  select: { nome: true },
                })
              : null;
            if (!partida || !grupo) return;
            const dataFmt = formatarDataPartidaBr(partida.dataHora);
            const linkPresencas = `/partidas/${partida.id}/presencas`;
            for (const p of updated.promovidos) {
              await criarNotificacoesPresidentesGrupo(
                fastify.prisma,
                partida.grupoId,
                {
                  tipo: 'lista_espera_promovido',
                  categoria: 'partidas',
                  titulo: 'Vaga aberta na partida',
                  corpo: `${p.nome} foi promovido(a) da lista de espera.`,
                  link: linkPresencas,
                  partidaId: partida.id,
                  grupoId: partida.grupoId,
                },
                { exceptUsuarioId: auth.sub },
              );

              if (p.email) {
                const conv = await fastify.prisma.convitePartida.findUnique({
                  where: { id: p.conviteId },
                  select: { token: true },
                });
                if (conv) {
                  await enviarConviteEmail(
                    {
                      to: p.email,
                      nomeBoleiro: p.nome,
                      nomeGrupo: grupo.nome,
                      dataPartidaFormatada: dataFmt,
                      localPartida: partida.estadio?.nome ?? partida.localLivre ?? null,
                      linkConfirmacao: `${env.WEB_URL}/confirmar/${conv.token}`,
                      variant: 'convite',
                    },
                    fastify.log,
                  );
                }
              }
            }
          } catch (err) {
            fastify.log.warn({ err }, 'Falha ao processar promovidos no PATCH convite');
          }
        });
      }

      return { ok: true, convite: updated.convite, promovidos: updated.promovidos.length };
    },
  );

  /**
   * POST /api/partidas/:id/convites/reenviar
   * Reenvia convites em lote por email (Resend) e/ou retorna links wa.me para
   * o Presidente abrir manualmente no WhatsApp.
   */
  fastify.post(
    '/api/partidas/:id/convites/reenviar',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParamSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);
      const body = reenvioConvitesSchema.safeParse(request.body);
      if (!body.success) return badRequest(reply, body.error.flatten().fieldErrors);

      const partida = await fastify.prisma.partida.findUnique({
        where: { id: params.data.id },
        include: {
          grupo: { select: { id: true, nome: true } },
          estadio: { select: { nome: true } },
        },
      });
      if (!partida) return notFound(reply);
      const acesso = await getGrupoAcesso(fastify.prisma, partida.grupoId, auth.sub);
      if (!acesso) return forbidden(reply);

      const convites = await fastify.prisma.convitePartida.findMany({
        where: {
          partidaId: params.data.id,
          id: { in: body.data.conviteIds },
        },
      });

      const dataFmt = formatarDataPartidaBr(partida.dataHora);
      const localPartida = partida.estadio?.nome ?? partida.localLivre ?? null;
      const enviarEmail = body.data.canais === 'email' || body.data.canais === 'both';
      const enviarWhatsapp = body.data.canais === 'whatsapp' || body.data.canais === 'both';

      let enviadosEmail = 0;
      let semContatoEmail = 0;
      let semContatoWhatsapp = 0;
      const whatsappLinks: Array<{ conviteId: string; nome: string; url: string }> = [];

      for (const c of convites) {
        const dest = await resolveContatoConvite(fastify.prisma, c);
        if (!dest) {
          if (enviarEmail) semContatoEmail++;
          if (enviarWhatsapp) semContatoWhatsapp++;
          continue;
        }

        if (enviarEmail) {
          if (!dest.email) {
            semContatoEmail++;
          } else {
            await enviarConviteEmail(
              {
                to: dest.email,
                nomeBoleiro: dest.nome,
                nomeGrupo: partida.grupo.nome,
                dataPartidaFormatada: dataFmt,
                localPartida,
                linkConfirmacao: `${env.WEB_URL}/confirmar/${c.token}`,
                variant: 'lembrete',
                mensagemPersonalizada: body.data.mensagemPersonalizada,
              },
              fastify.log,
            );
            enviadosEmail++;
          }
        }

        if (enviarWhatsapp) {
          const link = `${env.WEB_URL}/confirmar/${c.token}`;
          const texto =
            body.data.mensagemPersonalizada ??
            `E aí, ${dest.nome}! O ${partida.grupo.nome} agendou um rachão em ${dataFmt}. Confirma aqui: ${link}`;
          const url = dest.celular ? buildWhatsAppLink(dest.celular, texto) : null;
          if (!url) {
            semContatoWhatsapp++;
          } else {
            whatsappLinks.push({ conviteId: c.id, nome: dest.nome, url });
          }
        }
      }

      return {
        ok: true,
        enviadosEmail,
        semContatoEmail,
        semContatoWhatsapp,
        whatsappLinks,
      };
    },
  );

  /**
   * DELETE /api/partidas/:id/convites/:conviteId
   */
  fastify.delete(
    '/api/partidas/:id/convites/:conviteId',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = partidaConviteParams.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const convite = await fastify.prisma.convitePartida.findUnique({
        where: { id: params.data.conviteId },
        include: { partida: { select: { grupoId: true } } },
      });
      if (!convite || convite.partidaId !== params.data.id) return notFound(reply);

      const acesso = await getGrupoAcesso(fastify.prisma, convite.partida.grupoId, auth.sub);
      if (!acesso) return forbidden(reply);

      await fastify.prisma.convitePartida.delete({ where: { id: convite.id } });
      // Liberou vaga: tenta promover a lista de espera.
      await fastify.prisma.$transaction(async (tx) => {
        await promoverListaEspera(tx, convite.partidaId);
      });
      return { ok: true };
    },
  );

  /**
   * POST /api/partidas/:id/iniciar
   * Transição agendada -> em_andamento (T20). Exige escalação salva
   * (ao menos 1 Time com boleiros).
   */
  fastify.post(
    '/api/partidas/:id/iniciar',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParamSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const partida = await fastify.prisma.partida.findUnique({
        where: { id: params.data.id },
        select: {
          id: true,
          grupoId: true,
          status: true,
          times: { select: { id: true, _count: { select: { boleiros: true } } } },
        },
      });
      if (!partida) return notFound(reply);

      const acesso = await getGrupoAcesso(fastify.prisma, partida.grupoId, auth.sub);
      if (!acesso) return forbidden(reply);

      if (partida.status === 'em_andamento') {
        return { ok: true, partida: { id: partida.id, status: partida.status } };
      }
      if (partida.status !== 'agendada') {
        return badRequest(reply, null, 'Apenas partidas agendadas podem ser iniciadas');
      }

      const escalacaoOk =
        partida.times.length >= 2 && partida.times.every((t) => t._count.boleiros > 0);
      if (!escalacaoOk) {
        return badRequest(
          reply,
          null,
          'Salve a escalacao (ao menos 2 times com boleiros) antes de iniciar a partida',
        );
      }

      const updated = await fastify.prisma.partida.update({
        where: { id: partida.id },
        data: { status: 'em_andamento' },
        select: { id: true, status: true },
      });
      return { ok: true, partida: updated };
    },
  );

  /**
   * POST /api/partidas/:id/encerrar
   * Transição em_andamento -> encerrada (T21). Recalcula `Time.golsFinal`
   * a partir dos eventos `tipo='gol'` agrupados por `timeId`.
   */
  fastify.post(
    '/api/partidas/:id/encerrar',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParamSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const partida = await fastify.prisma.partida.findUnique({
        where: { id: params.data.id },
        select: { id: true, grupoId: true, status: true },
      });
      if (!partida) return notFound(reply);

      const acesso = await getGrupoAcesso(fastify.prisma, partida.grupoId, auth.sub);
      if (!acesso) return forbidden(reply);

      if (partida.status === 'encerrada') {
        return { ok: true, partida: { id: partida.id, status: partida.status } };
      }
      if (partida.status !== 'em_andamento') {
        return badRequest(reply, null, 'Apenas partidas em andamento podem ser encerradas');
      }

      const updated = await fastify.prisma.$transaction(async (tx) => {
        const gols = await tx.evento.groupBy({
          by: ['timeId'],
          where: { partidaId: partida.id, tipo: 'gol' },
          _count: { _all: true },
        });
        const golsPorTime = new Map<string, number>();
        for (const g of gols) {
          if (g.timeId) golsPorTime.set(g.timeId, g._count._all);
        }
        const times = await tx.time.findMany({
          where: { partidaId: partida.id },
          select: { id: true },
        });
        for (const t of times) {
          await tx.time.update({
            where: { id: t.id },
            data: { golsFinal: golsPorTime.get(t.id) ?? 0 },
          });
        }
        return tx.partida.update({
          where: { id: partida.id },
          data: { status: 'encerrada' },
          select: { id: true, status: true },
        });
      });

      return { ok: true, partida: updated };
    },
  );

  /**
   * GET /api/partidas/publico/:id/resumo
   * Resumo publico (sem auth) — usado por OG e link compartilhavel.
   */
  fastify.get('/api/partidas/publico/:id/resumo', async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

    const partida = await fastify.prisma.partida.findUnique({
      where: { id: params.data.id },
      select: { status: true },
    });
    if (!partida) return notFound(reply);
    if (partida.status === 'cancelada' || partida.status === 'agendada') {
      return notFound(reply);
    }

    const data = await agregarResumo(fastify.prisma, params.data.id);
    if (!data) return notFound(reply);
    return data;
  });

  /**
   * GET /api/partidas/:id/resumo (autenticado).
   */
  fastify.get(
    '/api/partidas/:id/resumo',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParamSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const partida = await fastify.prisma.partida.findUnique({
        where: { id: params.data.id },
        select: { grupoId: true },
      });
      if (!partida) return notFound(reply);
      const acesso = await getGrupoAcesso(fastify.prisma, partida.grupoId, auth.sub);
      if (!acesso) return forbidden(reply);

      const data = await agregarResumo(fastify.prisma, params.data.id);
      if (!data) return notFound(reply);
      return data;
    },
  );
};

async function resolveEmailConvite(
  prisma: import('@rachao/db').PrismaClient,
  convite: { boleiroGrupoId: string | null; convidadoAvulsoId: string | null },
): Promise<{ email: string; nome: string } | null> {
  if (convite.boleiroGrupoId) {
    const b = await prisma.boleiroGrupo.findUnique({
      where: { id: convite.boleiroGrupoId },
      select: { email: true, nome: true },
    });
    return b?.email ? { email: b.email, nome: b.nome } : null;
  }
  if (convite.convidadoAvulsoId) {
    const c = await prisma.convidadoAvulso.findUnique({
      where: { id: convite.convidadoAvulsoId },
      select: { celular: true, nome: true },
    });
    if (c?.celular?.startsWith('email:')) {
      return { email: c.celular.slice(6), nome: c.nome };
    }
  }
  return null;
}

export default partidasRoutes;
