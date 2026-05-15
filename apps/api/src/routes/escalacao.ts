/**
 * Escalação de times (T18): leitura, sorteio server-side, persistência, e
 * endpoint público sanitizado para OG / link compartilhável.
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  escalacaoSaveSchema,
  sorteioOptionsSchema,
} from '@rachao/shared/zod';
import { getGrupoAcesso } from '../lib/grupos.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import {
  detectarBloqueios,
  sortearTimes,
  type ElegivelConvite,
} from '../lib/escalacao.js';

const idParam = z.object({ id: z.string().min(1) });

function nomeConvite(c: {
  boleiroGrupo: { nome: string; apelido: string | null; posicao: string | null } | null;
  convidadoAvulso: { nome: string; apelido: string | null; posicao: string | null } | null;
}): { nome: string; apelido: string | null; posicao: string | null } {
  if (c.boleiroGrupo) {
    return {
      nome: c.boleiroGrupo.nome,
      apelido: c.boleiroGrupo.apelido,
      posicao: c.boleiroGrupo.posicao,
    };
  }
  if (c.convidadoAvulso) {
    return {
      nome: c.convidadoAvulso.nome,
      apelido: c.convidadoAvulso.apelido,
      posicao: c.convidadoAvulso.posicao,
    };
  }
  return { nome: 'Boleiro', apelido: null, posicao: null };
}

const escalacaoRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/partidas/publico/:id/escalacao — sem auth (OG + página pública).
   */
  fastify.get('/api/partidas/publico/:id/escalacao', async (request, reply) => {
    const params = idParam.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

    const partida = await fastify.prisma.partida.findUnique({
      where: { id: params.data.id },
      include: {
        grupo: { select: { nome: true, fotoUrl: true } },
        estadio: { select: { nome: true } },
        times: {
          orderBy: { nome: 'asc' },
          include: {
            boleiros: {
              orderBy: { ordem: 'asc' },
              include: {
                boleiroGrupo: { select: { nome: true, apelido: true, posicao: true } },
                convidadoAvulso: { select: { nome: true, apelido: true, posicao: true } },
              },
            },
          },
        },
      },
    });
    if (!partida || partida.status === 'cancelada') return notFound(reply);

    const times = partida.times.map((t) => ({
      id: t.id,
      nome: t.nome,
      cor: t.cor,
      boleiros: t.boleiros.map((tb) => {
        const { nome, apelido, posicao } = nomeConvite({
          boleiroGrupo: tb.boleiroGrupo,
          convidadoAvulso: tb.convidadoAvulso,
        });
        return {
          nome,
          apelido,
          posicao,
          capitao: tb.capitao,
        };
      }),
    }));

    return {
      partida: {
        id: partida.id,
        dataHora: partida.dataHora,
        status: partida.status,
        localLivre: partida.localLivre,
        estadio: partida.estadio?.nome ?? null,
        numTimes: partida.numTimes,
        boleirosPorTime: partida.boleirosPorTime,
        grupo: partida.grupo,
      },
      times,
    };
  });

  /**
   * GET /api/partidas/:id/escalacao
   */
  fastify.get(
    '/api/partidas/:id/escalacao',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const partida = await fastify.prisma.partida.findUnique({
        where: { id: params.data.id },
        include: {
          grupo: { select: { id: true, nome: true, fotoUrl: true } },
          estadio: { select: { nome: true } },
          convites: {
            where: { status: 'confirmado' },
            include: {
              boleiroGrupo: {
                select: { id: true, nome: true, apelido: true, posicao: true },
              },
              convidadoAvulso: {
                select: { id: true, nome: true, apelido: true, posicao: true },
              },
            },
          },
          times: {
            orderBy: { nome: 'asc' },
            include: {
              boleiros: {
                orderBy: { ordem: 'asc' },
                include: {
                  boleiroGrupo: {
                    select: { id: true, nome: true, apelido: true, posicao: true },
                  },
                  convidadoAvulso: {
                    select: { id: true, nome: true, apelido: true, posicao: true },
                  },
                },
              },
            },
          },
        },
      });
      if (!partida) return notFound(reply);

      const acesso = await getGrupoAcesso(fastify.prisma, partida.grupoId, auth.sub);
      if (!acesso) return forbidden(reply);

      const bloqueiosRaw = await detectarBloqueios(fastify.prisma, partida, partida.convites);

      const elegiveis: ElegivelConvite[] = partida.convites.map((c) => {
        const { nome, apelido, posicao } = nomeConvite(c);
        return {
          conviteId: c.id,
          tipo: c.tipo,
          boleiroGrupoId: c.boleiroGrupoId,
          convidadoAvulsoId: c.convidadoAvulsoId,
          nome,
          apelido,
          posicao,
        };
      });

      const bloqueados = bloqueiosRaw.map((b) => {
        const conv = partida.convites.find((c) => c.id === b.conviteId);
        const { nome, apelido, posicao } = conv
          ? nomeConvite(conv)
          : { nome: '?', apelido: null, posicao: null };
        return {
          conviteId: b.conviteId,
          motivo: b.motivo,
          detalhe: b.detalhe,
          nome,
          apelido,
          posicao,
        };
      });

      const bloqueadoIds = new Set(bloqueiosRaw.map((b) => b.conviteId));

      // Presenca dos ultimos 5 jogos encerrados do grupo (para tipo=fixo).
      const ultimasPartidas = await fastify.prisma.partida.findMany({
        where: {
          grupoId: partida.grupoId,
          status: 'encerrada',
          id: { not: partida.id },
        },
        orderBy: { dataHora: 'desc' },
        take: 5,
        select: { id: true, dataHora: true },
      });

      const presencaUltimos5: Record<string, Array<'ok' | 'nao' | 'neutro'>> = {};
      if (ultimasPartidas.length > 0) {
        const partidaIds = ultimasPartidas.map((p) => p.id);
        const boleiroIds = partida.convites
          .map((c) => c.boleiroGrupoId)
          .filter((id): id is string => !!id);

        if (boleiroIds.length > 0) {
          const convitesAnt = await fastify.prisma.convitePartida.findMany({
            where: {
              partidaId: { in: partidaIds },
              boleiroGrupoId: { in: boleiroIds },
            },
            select: { partidaId: true, boleiroGrupoId: true, status: true },
          });
          const byKey = new Map<string, 'confirmado' | 'recusado' | 'outro'>();
          for (const c of convitesAnt) {
            if (!c.boleiroGrupoId) continue;
            const key = `${c.partidaId}:${c.boleiroGrupoId}`;
            const v: 'confirmado' | 'recusado' | 'outro' =
              c.status === 'confirmado'
                ? 'confirmado'
                : c.status === 'recusado'
                  ? 'recusado'
                  : 'outro';
            byKey.set(key, v);
          }
          for (const bid of boleiroIds) {
            presencaUltimos5[bid] = ultimasPartidas.map((p) => {
              const v = byKey.get(`${p.id}:${bid}`);
              if (v === 'confirmado') return 'ok';
              if (v === 'recusado') return 'nao';
              return 'neutro';
            });
          }
        }
      }

      const times = partida.times.map((t) => {
        const conviteIds: string[] = [];
        const conviteIdsReservas: string[] = [];
        let capitaoConviteId: string | null = null;
        for (const tb of t.boleiros) {
          const match = partida.convites.find(
            (c) =>
              (c.boleiroGrupoId && c.boleiroGrupoId === tb.boleiroGrupoId) ||
              (c.convidadoAvulsoId && c.convidadoAvulsoId === tb.convidadoAvulsoId),
          );
          if (match) {
            if (tb.reserva) conviteIdsReservas.push(match.id);
            else conviteIds.push(match.id);
            if (tb.capitao) capitaoConviteId = match.id;
          }
        }
        return {
          id: t.id,
          nome: t.nome,
          cor: t.cor,
          conviteIds,
          conviteIdsReservas,
          capitaoConviteId,
          boleiros: t.boleiros.map((tb) => {
            const { nome, apelido, posicao } = nomeConvite({
              boleiroGrupo: tb.boleiroGrupo,
              convidadoAvulso: tb.convidadoAvulso,
            });
            const match = partida.convites.find(
              (c) =>
                (c.boleiroGrupoId && c.boleiroGrupoId === tb.boleiroGrupoId) ||
                (c.convidadoAvulsoId && c.convidadoAvulsoId === tb.convidadoAvulsoId),
            );
            return {
              conviteId: match?.id ?? null,
              boleiroId: tb.boleiroGrupoId ?? tb.convidadoAvulsoId ?? null,
              nome,
              apelido,
              posicao,
              capitao: tb.capitao,
              reserva: tb.reserva,
            };
          }),
        };
      });

      return {
        partida: {
          id: partida.id,
          dataHora: partida.dataHora,
          status: partida.status,
          localLivre: partida.localLivre,
          estadio: partida.estadio,
          numTimes: partida.numTimes,
          boleirosPorTime: partida.boleirosPorTime,
          reservasPorTime: partida.reservasPorTime ?? 0,
          tempoPartida: partida.tempoPartida,
          tempoTotal: partida.tempoTotal,
          regras: partida.regras,
          grupo: partida.grupo,
        },
        elegiveis: elegiveis.map((e) => ({
          ...e,
          boleiroGrupoId: e.boleiroGrupoId,
          bloqueado: bloqueadoIds.has(e.conviteId),
        })),
        bloqueados,
        times,
        ultimasPartidas: ultimasPartidas.map((p) => ({
          partidaId: p.id,
          dataHora: p.dataHora,
        })),
        presencaUltimos5,
        readOnly: partida.status === 'encerrada' || partida.status === 'cancelada',
      };
    },
  );

  /**
   * POST /api/partidas/:id/escalacao/sortear
   */
  fastify.post(
    '/api/partidas/:id/escalacao/sortear',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);
      const body = sorteioOptionsSchema.safeParse(request.body ?? {});
      if (!body.success) return badRequest(reply, body.error.flatten().fieldErrors);

      const partida = await fastify.prisma.partida.findUnique({
        where: { id: params.data.id },
        include: {
          convites: {
            where: { status: 'confirmado' },
            include: {
              boleiroGrupo: { select: { nome: true, apelido: true, posicao: true } },
              convidadoAvulso: { select: { nome: true, apelido: true, posicao: true } },
            },
          },
        },
      });
      if (!partida) return notFound(reply);
      if (partida.status === 'encerrada' || partida.status === 'cancelada') {
        return badRequest(reply, null, 'Partida nao permite alterar escalacao');
      }

      const acesso = await getGrupoAcesso(fastify.prisma, partida.grupoId, auth.sub);
      if (!acesso) return forbidden(reply);

      const bloqueios = await detectarBloqueios(fastify.prisma, partida, partida.convites);
      const bloqueadoSet = new Set(bloqueios.map((b) => b.conviteId));

      const elegiveis: ElegivelConvite[] = partida.convites
        .filter((c) => !bloqueadoSet.has(c.id))
        .map((c) => {
          const { nome, apelido, posicao } = nomeConvite(c);
          return {
            conviteId: c.id,
            tipo: c.tipo,
            boleiroGrupoId: c.boleiroGrupoId,
            convidadoAvulsoId: c.convidadoAvulsoId,
            nome,
            apelido,
            posicao,
          };
        });

      let pool = elegiveis;
      if (!body.data.incluirConvidadosAvulsos) {
        pool = pool.filter((e) => e.tipo === 'fixo');
      }

      if (pool.length < partida.numTimes) {
        return badRequest(
          reply,
          null,
          `E necessario ao menos ${partida.numTimes} boleiros confirmados e nao bloqueados para sortear (${pool.length} disponiveis)`,
        );
      }

      const seed =
        body.data.seed ??
        `sort-${partida.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const { times, excedentes } = sortearTimes(
        pool,
        partida.numTimes,
        partida.boleirosPorTime,
        { ...body.data, seed },
        partida.reservasPorTime ?? 0,
      );

      return { times, seedUsado: seed, excedentes };
    },
  );

  /**
   * PUT /api/partidas/:id/escalacao
   */
  fastify.put(
    '/api/partidas/:id/escalacao',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = idParam.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);
      const body = escalacaoSaveSchema.safeParse(request.body);
      if (!body.success) return badRequest(reply, body.error.flatten().fieldErrors);

      const partida = await fastify.prisma.partida.findUnique({
        where: { id: params.data.id },
        include: {
          convites: {
            where: { status: 'confirmado' },
            select: {
              id: true,
              boleiroGrupoId: true,
              convidadoAvulsoId: true,
            },
          },
        },
      });
      if (!partida) return notFound(reply);
      if (partida.status === 'encerrada' || partida.status === 'cancelada') {
        return badRequest(reply, null, 'Partida encerrada — escalacao somente leitura');
      }

      const acesso = await getGrupoAcesso(fastify.prisma, partida.grupoId, auth.sub);
      if (!acesso) return forbidden(reply);

      if (body.data.times.length !== partida.numTimes) {
        return badRequest(
          reply,
          { times: `Informe exatamente ${partida.numTimes} times` },
          'Quantidade de times invalida',
        );
      }

      const bloqueios = await detectarBloqueios(fastify.prisma, partida, partida.convites);
      const bloqueadoSet = new Set(bloqueios.map((b) => b.conviteId));

      const conviteMap = new Map(partida.convites.map((c) => [c.id, c]));
      const allIds = new Set<string>();
      const reservasPorTime = partida.reservasPorTime ?? 0;

      for (const t of body.data.times) {
        const titIds = t.conviteIds;
        const resIds = t.conviteIdsReservas ?? [];

        if (t.capitaoConviteId) {
          if (!titIds.includes(t.capitaoConviteId) && !resIds.includes(t.capitaoConviteId)) {
            return badRequest(reply, null, 'Capitao deve pertencer ao mesmo time');
          }
        }

        for (const cid of [...titIds, ...resIds]) {
          if (allIds.has(cid)) {
            return badRequest(reply, null, 'Cada boleiro so pode estar em um time');
          }
          allIds.add(cid);
          const conv = conviteMap.get(cid);
          if (!conv) {
            return badRequest(reply, { conviteIds: `Convite ${cid} invalido ou nao confirmado` });
          }
          if (bloqueadoSet.has(cid)) {
            return badRequest(reply, null, 'Boleiro bloqueado nao pode ser escalado');
          }
        }
        if (titIds.length > partida.boleirosPorTime) {
          return badRequest(
            reply,
            null,
            `Time "${t.nome}" excede o limite de ${partida.boleirosPorTime} titulares`,
          );
        }
        if (resIds.length > reservasPorTime) {
          return badRequest(
            reply,
            null,
            `Time "${t.nome}" excede o limite de ${reservasPorTime} reservas`,
          );
        }
      }

      await fastify.prisma.$transaction(async (tx) => {
        await tx.time.deleteMany({ where: { partidaId: partida.id } });

        for (const t of body.data.times) {
          const time = await tx.time.create({
            data: {
              partidaId: partida.id,
              nome: t.nome,
              cor: t.cor,
              golsFinal: 0,
            },
          });

          let ordem = 0;
          for (const cid of t.conviteIds) {
            const conv = conviteMap.get(cid)!;
            await tx.timeBoleiro.create({
              data: {
                timeId: time.id,
                boleiroGrupoId: conv.boleiroGrupoId,
                convidadoAvulsoId: conv.convidadoAvulsoId,
                ordem: ordem++,
                capitao: t.capitaoConviteId === cid,
                reserva: false,
              },
            });
          }
          let ordemR = 0;
          for (const cid of t.conviteIdsReservas ?? []) {
            const conv = conviteMap.get(cid)!;
            await tx.timeBoleiro.create({
              data: {
                timeId: time.id,
                boleiroGrupoId: conv.boleiroGrupoId,
                convidadoAvulsoId: conv.convidadoAvulsoId,
                ordem: ordemR++,
                capitao: t.capitaoConviteId === cid,
                reserva: true,
              },
            });
          }
        }
      });

      return { ok: true };
    },
  );
};

export default escalacaoRoutes;
