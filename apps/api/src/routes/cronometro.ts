/**
 * Cronometro server-side da partida ao vivo (Fase 3 / PWA).
 *
 * Mantemos o estado em `Partida.cronometroEstado` (Json) com o shape:
 *   { status: 'parado' | 'rodando' | 'pausado',
 *     iniciadoEm?: ISO,
 *     segundosAcumulados: number,
 *     ultimaAcaoClientId?: string }
 *
 * Idempotencia: cada acao envia um `clientId`. Se o `clientId` coincide com
 * `ultimaAcaoClientId` salvo, a acao eh ignorada (retorno do estado atual).
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getGrupoAcesso } from '../lib/grupos.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';

const partidaParam = z.object({ id: z.string().min(1) });

const cronometroSchema = z.object({
  acao: z.enum(['iniciar', 'pausar', 'retomar', 'ajustar', 'zerar']),
  /** Para `ajustar`: setar segundos absolutos (>=0). */
  segundos: z.number().int().min(0).max(24 * 60 * 60).optional(),
  /** Idempotencia. */
  clientId: z.string().min(1),
});

type CronometroStatus = 'parado' | 'rodando' | 'pausado';

interface CronometroEstado {
  status: CronometroStatus;
  iniciadoEm: string | null;
  segundosAcumulados: number;
  ultimaAcaoClientId: string | null;
  atualizadoEm: string;
}

function estadoInicial(): CronometroEstado {
  return {
    status: 'parado',
    iniciadoEm: null,
    segundosAcumulados: 0,
    ultimaAcaoClientId: null,
    atualizadoEm: new Date().toISOString(),
  };
}

function parseEstado(raw: unknown): CronometroEstado {
  if (!raw || typeof raw !== 'object') return estadoInicial();
  const o = raw as Record<string, unknown>;
  return {
    status: ((['parado', 'rodando', 'pausado'] as const).includes(o.status as CronometroStatus)
      ? o.status
      : 'parado') as CronometroStatus,
    iniciadoEm: typeof o.iniciadoEm === 'string' ? o.iniciadoEm : null,
    segundosAcumulados:
      typeof o.segundosAcumulados === 'number' ? Math.max(0, o.segundosAcumulados) : 0,
    ultimaAcaoClientId:
      typeof o.ultimaAcaoClientId === 'string' ? o.ultimaAcaoClientId : null,
    atualizadoEm:
      typeof o.atualizadoEm === 'string' ? o.atualizadoEm : new Date().toISOString(),
  };
}

function computarSegundosTotais(e: CronometroEstado, agora: Date = new Date()): number {
  let extra = 0;
  if (e.status === 'rodando' && e.iniciadoEm) {
    extra = Math.max(0, Math.floor((agora.getTime() - new Date(e.iniciadoEm).getTime()) / 1000));
  }
  return e.segundosAcumulados + extra;
}

function aplicarAcao(
  prev: CronometroEstado,
  acao: z.infer<typeof cronometroSchema>['acao'],
  agora: Date,
  segundosAjuste?: number,
): CronometroEstado {
  const totalAtual = computarSegundosTotais(prev, agora);
  switch (acao) {
    case 'iniciar':
    case 'retomar':
      if (prev.status === 'rodando') return prev;
      return {
        status: 'rodando',
        iniciadoEm: agora.toISOString(),
        segundosAcumulados: prev.segundosAcumulados,
        ultimaAcaoClientId: null,
        atualizadoEm: agora.toISOString(),
      };
    case 'pausar':
      if (prev.status !== 'rodando') return prev;
      return {
        status: 'pausado',
        iniciadoEm: null,
        segundosAcumulados: totalAtual,
        ultimaAcaoClientId: null,
        atualizadoEm: agora.toISOString(),
      };
    case 'zerar':
      return {
        status: 'parado',
        iniciadoEm: null,
        segundosAcumulados: 0,
        ultimaAcaoClientId: null,
        atualizadoEm: agora.toISOString(),
      };
    case 'ajustar': {
      const segs = segundosAjuste ?? totalAtual;
      const rodando = prev.status === 'rodando';
      return {
        status: rodando ? 'rodando' : 'pausado',
        iniciadoEm: rodando ? agora.toISOString() : null,
        segundosAcumulados: rodando ? 0 : segs,
        ultimaAcaoClientId: null,
        atualizadoEm: agora.toISOString(),
      };
    }
    default:
      return prev;
  }
}

const cronometroRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/partidas/:id/cronometro
   */
  fastify.get(
    '/api/partidas/:id/cronometro',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = partidaParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const partida = await fastify.prisma.partida.findUnique({
        where: { id: params.data.id },
        select: { grupoId: true, cronometroEstado: true },
      });
      if (!partida) return notFound(reply);
      const acesso = await getGrupoAcesso(fastify.prisma, partida.grupoId, auth.sub);
      if (!acesso) return forbidden(reply);

      const estado = parseEstado(partida.cronometroEstado);
      return {
        ...estado,
        segundosAtuais: computarSegundosTotais(estado),
      };
    },
  );

  /**
   * POST /api/partidas/:id/cronometro
   */
  fastify.post(
    '/api/partidas/:id/cronometro',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = partidaParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const body = cronometroSchema.safeParse(request.body);
      if (!body.success) return badRequest(reply, body.error.flatten().fieldErrors);

      const partida = await fastify.prisma.partida.findUnique({
        where: { id: params.data.id },
        select: { grupoId: true, status: true, cronometroEstado: true },
      });
      if (!partida) return notFound(reply);
      const acesso = await getGrupoAcesso(fastify.prisma, partida.grupoId, auth.sub);
      if (!acesso) return forbidden(reply);
      if (partida.status === 'cancelada' || partida.status === 'encerrada') {
        return badRequest(reply, null, 'Partida nao esta ativa');
      }

      const prev = parseEstado(partida.cronometroEstado);

      // Idempotencia por clientId
      if (prev.ultimaAcaoClientId === body.data.clientId) {
        return {
          ...prev,
          segundosAtuais: computarSegundosTotais(prev),
          idempotent: true,
        };
      }

      const agora = new Date();
      const next = aplicarAcao(prev, body.data.acao, agora, body.data.segundos);
      const final: CronometroEstado = {
        ...next,
        ultimaAcaoClientId: body.data.clientId,
      };

      await fastify.prisma.partida.update({
        where: { id: params.data.id },
        data: { cronometroEstado: final as unknown as object },
      });

      return {
        ...final,
        segundosAtuais: computarSegundosTotais(final),
        idempotent: false,
      };
    },
  );
};

export default cronometroRoutes;
