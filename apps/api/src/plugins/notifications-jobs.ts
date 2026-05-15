/**
 * Plugin Fastify que dispara jobs periodicos de notificacao em background.
 *
 * Jobs implementados (V1, escopo "medio"):
 *  - lembrete_24h: para cada partida agendada cuja dataHora esta entre
 *    `now+23h` e `now+25h`, cria uma Notificacao tipo `partida_24h` para cada
 *    presidente do grupo. Idempotente via deduplicacao por (usuarioId, tipo,
 *    partidaId) nas ultimas 48h.
 *  - vaquinha_pendente: para cada Vaquinha com Pagamento pendente/inadimplente
 *    cuja partida ja aconteceu (ate 14 dias atras) ou esta nas proximas 48h,
 *    cria uma notificacao para os presidentes do grupo. Dedup por dia.
 *
 * Os jobs rodam em `setInterval` no processo da API. Em multi-instancia seria
 * necessario um lock (out of scope).
 */
import fp from 'fastify-plugin';
import { env } from '../env.js';
import {
  criarNotificacao,
  existeNotificacaoRecente,
} from '../lib/notificacoes.js';

const HOUR_MS = 60 * 60 * 1000;

async function rodarJobsUmaVez(fastify: import('fastify').FastifyInstance): Promise<void> {
  const log = fastify.log;
  try {
    await rodarLembrete24h(fastify);
  } catch (err) {
    log.warn({ err }, 'Falha em rodarLembrete24h');
  }
  try {
    await rodarVaquinhaPendente(fastify);
  } catch (err) {
    log.warn({ err }, 'Falha em rodarVaquinhaPendente');
  }
}

async function rodarLembrete24h(
  fastify: import('fastify').FastifyInstance,
): Promise<void> {
  const now = Date.now();
  const inicio = new Date(now + 23 * HOUR_MS);
  const fim = new Date(now + 25 * HOUR_MS);

  const partidas = await fastify.prisma.partida.findMany({
    where: {
      status: 'agendada',
      dataHora: { gte: inicio, lte: fim },
    },
    include: {
      grupo: { select: { id: true, nome: true } },
      presidentes: { select: { usuarioId: true } },
    },
  });
  if (partidas.length === 0) return;

  const desde = new Date(now - 48 * HOUR_MS);
  for (const p of partidas) {
    const usuarios = Array.from(
      new Set([
        // presidentes da partida (PartidaPresidente)
        ...p.presidentes.map((x) => x.usuarioId),
        // todos os presidentes do grupo
        ...(
          await fastify.prisma.grupoPresidente.findMany({
            where: { grupoId: p.grupoId },
            select: { usuarioId: true },
          })
        ).map((x) => x.usuarioId),
      ]),
    );
    const dataFmt = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(p.dataHora);

    for (const usuarioId of usuarios) {
      const ja = await existeNotificacaoRecente(fastify.prisma, {
        usuarioId,
        tipo: 'partida_24h',
        partidaId: p.id,
        desde,
      });
      if (ja) continue;
      await criarNotificacao(fastify.prisma, usuarioId, {
        tipo: 'partida_24h',
        categoria: 'partidas',
        titulo: 'Sua partida e amanha',
        corpo: `${p.grupo.nome}: rachao em ${dataFmt}.`,
        link: `/partidas/${p.id}`,
        partidaId: p.id,
        grupoId: p.grupoId,
      });
    }
  }
}

async function rodarVaquinhaPendente(
  fastify: import('fastify').FastifyInstance,
): Promise<void> {
  const now = Date.now();
  const limiteSuperior = new Date(now + 48 * HOUR_MS);
  const limiteInferior = new Date(now - 14 * 24 * HOUR_MS);

  const vaquinhas = await fastify.prisma.vaquinha.findMany({
    where: {
      partida: { dataHora: { gte: limiteInferior, lte: limiteSuperior } },
      pagamentos: { some: { status: { in: ['pendente', 'inadimplente'] } } },
    },
    include: {
      partida: { select: { id: true, grupoId: true, dataHora: true } },
      pagamentos: { where: { status: { in: ['pendente', 'inadimplente'] } }, select: { id: true } },
    },
  });
  if (vaquinhas.length === 0) return;

  // Dedup: 1x por dia por (usuario, tipo, partida).
  const desde = new Date(now - 22 * HOUR_MS);

  for (const v of vaquinhas) {
    const presidentes = await fastify.prisma.grupoPresidente.findMany({
      where: { grupoId: v.partida.grupoId },
      select: { usuarioId: true },
    });
    const grupo = await fastify.prisma.grupo.findUnique({
      where: { id: v.partida.grupoId },
      select: { nome: true },
    });
    if (!grupo) continue;

    for (const { usuarioId } of presidentes) {
      const ja = await existeNotificacaoRecente(fastify.prisma, {
        usuarioId,
        tipo: 'vaquinha_pendente',
        partidaId: v.partida.id,
        desde,
      });
      if (ja) continue;
      await criarNotificacao(fastify.prisma, usuarioId, {
        tipo: 'vaquinha_pendente',
        categoria: 'financeiro',
        titulo: 'Vaquinha com pagamentos em aberto',
        corpo: `${grupo.nome}: ${v.pagamentos.length} pagamento(s) pendente(s).`,
        link: `/partidas/${v.partida.id}/vaquinha`,
        partidaId: v.partida.id,
        grupoId: v.partida.grupoId,
      });
    }
  }
}

export default fp(async (fastify) => {
  if (!env.ENABLE_NOTIFICATION_JOBS) {
    fastify.log.info('Notification jobs desativados (ENABLE_NOTIFICATION_JOBS=false)');
    return;
  }
  const intervalMs = env.NOTIFICATION_JOBS_INTERVAL_MIN * 60 * 1000;
  fastify.log.info(
    { intervalMin: env.NOTIFICATION_JOBS_INTERVAL_MIN },
    'Notification jobs habilitados',
  );

  // Roda uma vez logo apos o boot (apos 5s para nao competir com startup).
  const boot = setTimeout(() => {
    void rodarJobsUmaVez(fastify);
  }, 5_000);

  const tick = setInterval(() => {
    void rodarJobsUmaVez(fastify);
  }, intervalMs);

  fastify.addHook('onClose', async () => {
    clearTimeout(boot);
    clearInterval(tick);
  });
});
