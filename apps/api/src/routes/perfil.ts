/**
 * Rotas de Perfil e Configuracoes (Bloco 9 - T31..T34):
 *
 * - PATCH /api/me                                       (T31) atualizar perfil pessoal
 * - POST  /api/me/senha                                 (T31) alterar senha
 * - POST  /api/me/logout-all                            (T31) deslogar todos os dispositivos
 * - DELETE /api/me                                      (T31) excluir conta
 * - POST  /api/me/perfis                                (T31) ativar perfil adicional
 *
 * - GET   /api/me/preferencias-notificacao              (T33)
 * - PUT   /api/me/preferencias-notificacao              (T33)
 *
 * - GET   /api/me/preferencias                          (T34) padroes para partidas
 * - PUT   /api/me/preferencias                          (T34)
 *
 * - GET   /api/me/plano                                 (T32) plano atual
 * - POST  /api/me/plano                                 (T32) escolher plano (stub, sem gateway)
 */
import type { FastifyPluginAsync } from 'fastify';
import {
  alterarSenhaSchema,
  ativarPerfilSchema,
  escolherPlanoSchema,
  excluirContaSchema,
  perfilUpdateSchema,
  preferenciasGeraisSchema,
  preferenciasNotificacaoSchema,
  EVENTOS_NOTIFICACAO,
} from '@rachao/shared/zod';
import { env } from '../env.js';
import { badRequest, notFound } from '../lib/errors.js';
import { getSupabaseAdmin } from '../lib/supabase-admin.js';

const perfilRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * PATCH /api/me - atualiza dados pessoais
   */
  fastify.patch('/api/me', { preHandler: fastify.requireAuth }, async (request, reply) => {
    const auth = request.user!;
    const parsed = perfilUpdateSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

    const usuario = await fastify.prisma.usuario.update({
      where: { id: auth.sub },
      data: parsed.data,
    });
    return { usuario };
  });

  /**
   * POST /api/me/senha - usa Supabase Admin para atualizar a senha.
   * Para validar a "senha atual", chamamos signInWithPassword via service role
   * (admin nao tem este metodo direto; usamos o REST do GoTrue manualmente).
   */
  fastify.post('/api/me/senha', { preHandler: fastify.requireAuth }, async (request, reply) => {
    const auth = request.user!;
    const parsed = alterarSenhaSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

    const { senhaAtual, senhaNova } = parsed.data;
    if (!auth.email) {
      return reply.code(400).send({ error: 'BadRequest', message: 'Email indisponivel' });
    }

    // Validar a senha atual chamando o endpoint /auth/v1/token?grant_type=password
    // do Supabase (publico, apenas precisa do anon key — aqui usamos service role
    // que tambem aceita).
    try {
      const tokenRes = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: auth.email, password: senhaAtual }),
      });
      if (!tokenRes.ok) {
        return reply.code(400).send({
          error: 'BadRequest',
          message: 'Senha atual incorreta',
        });
      }
    } catch (err) {
      request.log.error({ err }, 'Falha ao validar senha atual');
      return reply.code(500).send({ error: 'InternalError', message: 'Falha ao validar senha atual' });
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin.auth.admin.updateUserById(auth.sub, {
      password: senhaNova,
    });
    if (error) {
      request.log.error({ err: error }, 'Falha ao atualizar senha');
      return reply.code(500).send({ error: 'InternalError', message: error.message });
    }
    return { ok: true };
  });

  /**
   * POST /api/me/logout-all - invalida todas as sessoes do usuario.
   */
  fastify.post('/api/me/logout-all', { preHandler: fastify.requireAuth }, async (request, reply) => {
    const auth = request.user!;
    const admin = getSupabaseAdmin();
    const { error } = await admin.auth.admin.signOut(auth.sub, 'global');
    if (error) {
      request.log.error({ err: error }, 'Falha ao deslogar globalmente');
      return reply.code(500).send({ error: 'InternalError', message: error.message });
    }
    return { ok: true };
  });

  /**
   * DELETE /api/me - exclui a conta apos confirmacao "EXCLUIR".
   * Remove o Usuario (cascade) e o usuario no GoTrue.
   */
  fastify.delete('/api/me', { preHandler: fastify.requireAuth }, async (request, reply) => {
    const auth = request.user!;
    const parsed = excluirContaSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

    const admin = getSupabaseAdmin();
    // Apaga no Prisma (cascades cuidam de Grupos/Estadio/Notificacoes/etc.)
    try {
      await fastify.prisma.usuario.delete({ where: { id: auth.sub } });
    } catch (err) {
      request.log.warn({ err }, 'Usuario nao existe no DB local');
    }
    const { error } = await admin.auth.admin.deleteUser(auth.sub);
    if (error) {
      request.log.error({ err: error }, 'Falha ao excluir usuario no GoTrue');
      return reply.code(500).send({ error: 'InternalError', message: error.message });
    }
    return { ok: true };
  });

  /**
   * POST /api/me/perfis - ativa um perfil adicional (presidente | dono_estadio).
   */
  fastify.post('/api/me/perfis', { preHandler: fastify.requireAuth }, async (request, reply) => {
    const auth = request.user!;
    const parsed = ativarPerfilSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);
    const { perfil } = parsed.data;
    const usuario = await fastify.prisma.usuario.findUnique({ where: { id: auth.sub } });
    if (!usuario) return notFound(reply);
    if (usuario.perfis.includes(perfil)) return { usuario };
    const updated = await fastify.prisma.usuario.update({
      where: { id: auth.sub },
      data: { perfis: [...usuario.perfis, perfil] },
    });
    return { usuario: updated };
  });

  // ---------------------------------------------------------------------------
  // T33 - Preferencias de notificacao
  // ---------------------------------------------------------------------------

  /**
   * GET /api/me/preferencias-notificacao
   * Retorna toggles globais + linha por evento (com defaults true/true).
   */
  fastify.get(
    '/api/me/preferencias-notificacao',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const usuario = await fastify.prisma.usuario.findUnique({
        where: { id: auth.sub },
        select: { notifEmail: true, notifWhatsapp: true },
      });
      if (!usuario) return notFound(reply);
      const prefs = await fastify.prisma.preferenciaNotificacao.findMany({
        where: { usuarioId: auth.sub },
      });
      const byEvento = new Map(prefs.map((p) => [p.evento, p]));
      const eventos = EVENTOS_NOTIFICACAO.map((evt) => {
        const p = byEvento.get(evt);
        return {
          evento: evt,
          canalEmail: p?.canalEmail ?? true,
          canalWhatsapp: p?.canalWhatsapp ?? true,
        };
      });
      return {
        notifEmail: usuario.notifEmail,
        notifWhatsapp: usuario.notifWhatsapp,
        eventos,
      };
    },
  );

  /**
   * PUT /api/me/preferencias-notificacao
   */
  fastify.put(
    '/api/me/preferencias-notificacao',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const parsed = preferenciasNotificacaoSchema.safeParse(request.body);
      if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

      const { notifEmail, notifWhatsapp, eventos } = parsed.data;

      await fastify.prisma.$transaction(async (tx) => {
        if (notifEmail !== undefined || notifWhatsapp !== undefined) {
          await tx.usuario.update({
            where: { id: auth.sub },
            data: {
              ...(notifEmail !== undefined ? { notifEmail } : {}),
              ...(notifWhatsapp !== undefined ? { notifWhatsapp } : {}),
            },
          });
        }
        if (eventos) {
          for (const e of eventos) {
            await tx.preferenciaNotificacao.upsert({
              where: {
                usuarioId_evento: { usuarioId: auth.sub, evento: e.evento },
              },
              update: { canalEmail: e.canalEmail, canalWhatsapp: e.canalWhatsapp },
              create: {
                usuarioId: auth.sub,
                evento: e.evento,
                canalEmail: e.canalEmail,
                canalWhatsapp: e.canalWhatsapp,
              },
            });
          }
        }
      });

      return { ok: true };
    },
  );

  // ---------------------------------------------------------------------------
  // T34 - Preferencias gerais (padroes de partida + formato hora)
  // ---------------------------------------------------------------------------

  fastify.get(
    '/api/me/preferencias',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const usuario = await fastify.prisma.usuario.findUnique({
        where: { id: auth.sub },
        select: {
          prefNumTimes: true,
          prefBoleirosPorTime: true,
          prefTempoPartida: true,
          prefTempoTotal: true,
          prefRegrasPadrao: true,
          prefFormatoHora: true,
        },
      });
      if (!usuario) return notFound(reply);
      return { preferencias: usuario };
    },
  );

  fastify.put(
    '/api/me/preferencias',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const parsed = preferenciasGeraisSchema.safeParse(request.body);
      if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

      const data = parsed.data;
      const usuario = await fastify.prisma.usuario.update({
        where: { id: auth.sub },
        data: {
          ...(data.prefNumTimes !== undefined ? { prefNumTimes: data.prefNumTimes } : {}),
          ...(data.prefBoleirosPorTime !== undefined
            ? { prefBoleirosPorTime: data.prefBoleirosPorTime }
            : {}),
          ...(data.prefTempoPartida !== undefined ? { prefTempoPartida: data.prefTempoPartida } : {}),
          ...(data.prefTempoTotal !== undefined ? { prefTempoTotal: data.prefTempoTotal } : {}),
          ...(data.prefRegrasPadrao !== undefined
            ? { prefRegrasPadrao: data.prefRegrasPadrao ?? [] }
            : {}),
          ...(data.prefFormatoHora ? { prefFormatoHora: data.prefFormatoHora } : {}),
        },
        select: {
          prefNumTimes: true,
          prefBoleirosPorTime: true,
          prefTempoPartida: true,
          prefTempoTotal: true,
          prefRegrasPadrao: true,
          prefFormatoHora: true,
        },
      });
      return { preferencias: usuario };
    },
  );

  // ---------------------------------------------------------------------------
  // T32 - Plano (sem gateway real)
  // ---------------------------------------------------------------------------

  fastify.get('/api/me/plano', { preHandler: fastify.requireAuth }, async (request, reply) => {
    const auth = request.user!;
    const usuario = await fastify.prisma.usuario.findUnique({
      where: { id: auth.sub },
      select: { plano: true, planoExpiraEm: true, perfis: true, criadoEm: true },
    });
    if (!usuario) return notFound(reply);
    // Calcula dias restantes de trial (14 dias a partir do criadoEm) se aplicavel.
    let trialRestante: number | null = null;
    if (usuario.plano === 'trial') {
      const fimTrial = new Date(usuario.criadoEm);
      fimTrial.setDate(fimTrial.getDate() + 14);
      const diff = fimTrial.getTime() - Date.now();
      trialRestante = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }
    return {
      plano: usuario.plano,
      expiraEm: usuario.planoExpiraEm,
      trialRestante,
      perfis: usuario.perfis,
    };
  });

  /**
   * POST /api/me/plano - apenas marca a escolha no DB (MVP, sem gateway).
   */
  fastify.post('/api/me/plano', { preHandler: fastify.requireAuth }, async (request, reply) => {
    const auth = request.user!;
    const parsed = escolherPlanoSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

    const usuario = await fastify.prisma.usuario.update({
      where: { id: auth.sub },
      data: {
        plano: parsed.data.plano,
        planoExpiraEm:
          parsed.data.plano === 'trial' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      select: { plano: true, planoExpiraEm: true },
    });
    return {
      ok: true,
      plano: usuario.plano,
      expiraEm: usuario.planoExpiraEm,
      message: 'Plano marcado. Cobrança real chega em breve.',
    };
  });
};

export default perfilRoutes;
