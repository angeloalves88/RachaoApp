/**
 * Rotas publicas (sem autenticacao) para o boleiro responder ao convite via
 * link recebido por email/WhatsApp em /confirmar/[token].
 *
 * - GET /api/convites/publico/:token: dados minimos da partida + status atual.
 * - POST /api/convites/publico/:token/responder: confirma ou recusa.
 *
 * Apos uma recusa, dispara `promoverListaEspera` e cria notificacao para os
 * presidentes do grupo. Em qualquer resposta, cria notificacao "X confirmou"
 * ou "X recusou" para o presidente.
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { conviteResponderSchema } from '@rachao/shared/zod';
import { badRequest, notFound } from '../lib/errors.js';
import {
  formatarDataPartidaBr,
  promoverListaEspera,
  resolveContatoConvite,
} from '../lib/presencas.js';
import { criarNotificacoesPresidentesGrupo } from '../lib/notificacoes.js';
import { enviarConviteEmail } from '../lib/email.js';
import { sincronizarPagamentosPartida } from '../lib/vaquinha.js';
import { env } from '../env.js';

const tokenParam = z.object({ token: z.string().min(1) });

const convitesPublicoRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/convites/publico/:token', async (request, reply) => {
    const params = tokenParam.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

    const convite = await fastify.prisma.convitePartida.findUnique({
      where: { token: params.data.token },
      include: {
        partida: {
          include: {
            grupo: { select: { id: true, nome: true, fotoUrl: true } },
            estadio: { select: { nome: true, endereco: true, cidade: true } },
          },
        },
        boleiroGrupo: { select: { nome: true, apelido: true } },
        convidadoAvulso: { select: { nome: true, apelido: true } },
      },
    });
    if (!convite) return notFound(reply, 'Convite nao encontrado');

    const expirado = convite.tokenExpiresAt.getTime() < Date.now();
    const partidaCancelada =
      convite.partida.status === 'cancelada' || convite.partida.status === 'encerrada';
    const podeResponder =
      !expirado && !partidaCancelada && convite.partida.status === 'agendada';

    const nomeBoleiro = convite.boleiroGrupo?.nome ?? convite.convidadoAvulso?.nome ?? 'Boleiro';
    const localPartida =
      convite.partida.estadio?.nome ?? convite.partida.localLivre ?? null;

    return {
      convite: {
        id: convite.id,
        status: convite.status,
        recado: convite.recado,
        confirmadoEm: convite.confirmadoEm,
        tipo: convite.tipo,
      },
      partida: {
        id: convite.partida.id,
        dataHora: convite.partida.dataHora,
        dataFormatada: formatarDataPartidaBr(convite.partida.dataHora),
        status: convite.partida.status,
        local: localPartida,
        numTimes: convite.partida.numTimes,
        boleirosPorTime: convite.partida.boleirosPorTime,
        reservasPorTime: convite.partida.reservasPorTime,
        tempoTotal: convite.partida.tempoTotal,
      },
      grupo: convite.partida.grupo,
      boleiro: { nome: nomeBoleiro, apelido: convite.boleiroGrupo?.apelido ?? convite.convidadoAvulso?.apelido ?? null },
      expirado,
      partidaCancelada,
      podeResponder,
    };
  });

  fastify.post('/api/convites/publico/:token/responder', async (request, reply) => {
    const params = tokenParam.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);
    const body = conviteResponderSchema.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error.flatten().fieldErrors);

    const result = await fastify.prisma.$transaction(async (tx) => {
      const convite = await tx.convitePartida.findUnique({
        where: { token: params.data.token },
        include: {
          partida: { select: { id: true, status: true, grupoId: true, dataHora: true } },
          boleiroGrupo: { select: { nome: true } },
          convidadoAvulso: { select: { nome: true } },
        },
      });
      if (!convite) return { error: 'not_found' as const };
      if (convite.tokenExpiresAt.getTime() < Date.now()) return { error: 'expirado' as const };
      if (convite.partida.status !== 'agendada') {
        return { error: 'partida_indisponivel' as const };
      }

      const novoStatus = body.data.status;

      const atualizado = await tx.convitePartida.update({
        where: { id: convite.id },
        data: {
          status: novoStatus,
          recado: body.data.recado ?? null,
          confirmadoEm: novoStatus === 'confirmado' ? new Date() : null,
        },
      });

      // Se recusou OU foi para o DM, libera vaga e tenta promover lista de espera.
      let promovidos: Awaited<ReturnType<typeof promoverListaEspera>>['promovidos'] = [];
      if (novoStatus === 'recusado' || novoStatus === 'departamento_medico') {
        const promo = await promoverListaEspera(tx, convite.partidaId);
        promovidos = promo.promovidos;
      }

      // Sincroniza pagamentos da vaquinha (se existir) para refletir presencas atuais.
      await sincronizarPagamentosPartida(tx, convite.partidaId);

      const nomeBoleiro =
        convite.boleiroGrupo?.nome ?? convite.convidadoAvulso?.nome ?? 'Boleiro';

      return {
        ok: true as const,
        atualizado,
        nomeBoleiro,
        partida: convite.partida,
        promovidos,
      };
    });

    if ('error' in result) {
      switch (result.error) {
        case 'not_found':
          return notFound(reply, 'Convite nao encontrado');
        case 'expirado':
          return reply.code(410).send({ error: 'Gone', message: 'Link expirado' });
        case 'partida_indisponivel':
          return reply
            .code(409)
            .send({ error: 'Conflict', message: 'Esta partida nao aceita mais respostas' });
      }
    }

    // Side-effects fora da transacao: notificacoes + reenvio de email para promovidos.
    queueMicrotask(async () => {
      try {
        const dataFmt = formatarDataPartidaBr(result.partida.dataHora);
        const linkPresencas = `/partidas/${result.partida.id}/presencas`;

        if (body.data.status === 'confirmado') {
          await criarNotificacoesPresidentesGrupo(fastify.prisma, result.partida.grupoId, {
            tipo: 'presenca_confirmada',
            categoria: 'partidas',
            titulo: `${result.nomeBoleiro} confirmou presenca`,
            corpo: `${result.nomeBoleiro} vai jogar no rachao de ${dataFmt}.`,
            link: linkPresencas,
            partidaId: result.partida.id,
            grupoId: result.partida.grupoId,
          });
        } else if (body.data.status === 'departamento_medico') {
          await criarNotificacoesPresidentesGrupo(fastify.prisma, result.partida.grupoId, {
            tipo: 'presenca_recusada',
            categoria: 'partidas',
            titulo: `${result.nomeBoleiro} esta no departamento medico`,
            corpo: `${result.nomeBoleiro} nao vai jogar no rachao de ${dataFmt} (DM).`,
            link: linkPresencas,
            partidaId: result.partida.id,
            grupoId: result.partida.grupoId,
          });
        } else {
          await criarNotificacoesPresidentesGrupo(fastify.prisma, result.partida.grupoId, {
            tipo: 'presenca_recusada',
            categoria: 'partidas',
            titulo: `${result.nomeBoleiro} recusou o convite`,
            corpo: `${result.nomeBoleiro} nao vai jogar no rachao de ${dataFmt}.`,
            link: linkPresencas,
            partidaId: result.partida.id,
            grupoId: result.partida.grupoId,
          });
        }

        for (const p of result.promovidos) {
          await criarNotificacoesPresidentesGrupo(fastify.prisma, result.partida.grupoId, {
            tipo: 'lista_espera_promovido',
            categoria: 'partidas',
            titulo: 'Vaga aberta na partida',
            corpo: `${p.nome} foi promovido(a) da lista de espera.`,
            link: linkPresencas,
            partidaId: result.partida.id,
            grupoId: result.partida.grupoId,
          });

          if (p.email) {
            const conv = await fastify.prisma.convitePartida.findUnique({
              where: { id: p.conviteId },
              select: { token: true },
            });
            const grupo = await fastify.prisma.grupo.findUnique({
              where: { id: result.partida.grupoId },
              select: { nome: true },
            });
            if (conv && grupo) {
              await enviarConviteEmail(
                {
                  to: p.email,
                  nomeBoleiro: p.nome,
                  nomeGrupo: grupo.nome,
                  dataPartidaFormatada: dataFmt,
                  localPartida: null,
                  linkConfirmacao: `${env.WEB_URL}/confirmar/${conv.token}`,
                  variant: 'convite',
                },
                fastify.log,
              );
            }
          }
        }
      } catch (err) {
        fastify.log.warn({ err }, 'Falha ao processar side-effects da resposta de convite');
      }
    });

    return {
      ok: true,
      convite: {
        id: result.atualizado.id,
        status: result.atualizado.status,
        recado: result.atualizado.recado,
        confirmadoEm: result.atualizado.confirmadoEm,
      },
      promovidos: result.promovidos.length,
    };
  });
};

export default convitesPublicoRoutes;
