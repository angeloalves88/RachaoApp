/**
 * Convites para boleiro completar cadastro publico (foto + dados).
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  conviteBoleiroCompletarSchema,
  conviteBoleiroCreateSchema,
} from '@rachao/shared/zod';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { getGrupoAcesso } from '../lib/grupos.js';
import { sincronizarBoleiroEmPartidasAgendadas } from '../lib/presencas.js';
import { sincronizarPagamentosPartida } from '../lib/vaquinha.js';
import {
  buildWhatsAppLink,
  enviarConviteCadastroBoleiroEmail,
} from '../lib/email.js';
import { env } from '../env.js';

const TOKEN_TTL_DAYS = 14;

const tokenParam = z.object({ token: z.string().min(1) });
const grupoIdSchema = z.object({ id: z.string().min(1) });

function mascararCelular(celular: string): string {
  if (!/^\d{11}$/.test(celular)) return '***';
  return `(**) *****-${celular.slice(-4)}`;
}

function linkCadastroBoleiro(token: string): string {
  return `${env.WEB_URL}/cadastro-boleiro/${token}`;
}

const convitesBoleiroRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/grupos/:id/boleiros/convidar
   */
  fastify.post(
    '/api/grupos/:id/boleiros/convidar',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const params = grupoIdSchema.safeParse(request.params);
      if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

      const acesso = await getGrupoAcesso(fastify.prisma, params.data.id, auth.sub);
      if (!acesso) return forbidden(reply);

      const parsed = conviteBoleiroCreateSchema.safeParse(request.body);
      if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

      const { celular, email, canalPreferido } = parsed.data;
      const celularFinal =
        celular && celular.length === 11 ? celular : email ? `email:${email}` : '';

      const existing = await fastify.prisma.boleiroGrupo.findUnique({
        where: {
          grupoId_celular: { grupoId: params.data.id, celular: celularFinal },
        },
      });
      if (existing) {
        return conflict(reply, 'Ja existe um boleiro com este contato no grupo');
      }

      const pending = await fastify.prisma.conviteBoleiro.findFirst({
        where: {
          grupoId: params.data.id,
          celular: celularFinal,
          status: 'pendente',
          tokenExpiresAt: { gt: new Date() },
        },
      });
      if (pending) {
        return conflict(reply, 'Ja existe um convite pendente para este contato');
      }

      const grupo = await fastify.prisma.grupo.findUnique({
        where: { id: params.data.id },
        select: { nome: true },
      });
      if (!grupo) return notFound(reply);

      const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
      const convite = await fastify.prisma.conviteBoleiro.create({
        data: {
          grupoId: params.data.id,
          celular: celularFinal,
          email: email ?? null,
          canalPreferido,
          tokenExpiresAt,
        },
      });

      const link = linkCadastroBoleiro(convite.token);
      const mensagemWhatsApp = `Ola! Voce foi convidado(a) para fazer parte do grupo ${grupo.nome} no RachaoApp. Complete seu cadastro e envie sua foto: ${link}`;

      let whatsappLink: string | null = null;
      if (/^\d{11}$/.test(celularFinal)) {
        whatsappLink = buildWhatsAppLink(celularFinal, mensagemWhatsApp);
      }

      let emailResult = null;
      if (canalPreferido === 'email' && email) {
        emailResult = await enviarConviteCadastroBoleiroEmail(
          {
            to: email,
            nomeGrupo: grupo.nome,
            linkCadastro: link,
          },
          request.log,
        );
      }

      return reply.code(201).send({
        convite: {
          id: convite.id,
          token: convite.token,
          status: convite.status,
          tokenExpiresAt: convite.tokenExpiresAt,
          canalPreferido,
        },
        linkCadastro: link,
        whatsappLink,
        emailEnviado: emailResult,
        mensagemWhatsApp,
      });
    },
  );

  /**
   * GET /api/convites-boleiro/publico/:token
   */
  fastify.get('/api/convites-boleiro/publico/:token', async (request, reply) => {
    const params = tokenParam.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

    const convite = await fastify.prisma.conviteBoleiro.findUnique({
      where: { token: params.data.token },
      include: {
        grupo: { select: { id: true, nome: true, fotoUrl: true } },
        boleiroGrupo: {
          select: { id: true, nome: true, apelido: true, fotoUrl: true, posicao: true },
        },
      },
    });
    if (!convite) return notFound(reply, 'Convite nao encontrado');

    const expirado = convite.tokenExpiresAt.getTime() < Date.now();
    const concluido = convite.status === 'concluido';

    return {
      convite: {
        id: convite.id,
        status: convite.status,
        celularMascarado: mascararCelular(convite.celular),
        canalPreferido: convite.canalPreferido,
      },
      grupo: convite.grupo,
      boleiro: convite.boleiroGrupo,
      expirado,
      concluido,
      podeCompletar: !expirado && !concluido,
    };
  });

  /**
   * POST /api/convites-boleiro/publico/:token/foto — upload via servidor (publico)
   */
  fastify.post('/api/convites-boleiro/publico/:token/foto', async (request, reply) => {
    const params = tokenParam.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

    const bodySchema = z.object({
      imageBase64: z.string().min(20),
      mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    });
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

    const convite = await fastify.prisma.conviteBoleiro.findUnique({
      where: { token: params.data.token },
    });
    if (!convite) return notFound(reply);
    if (convite.status === 'concluido') return conflict(reply, 'Cadastro ja concluido');
    if (convite.tokenExpiresAt.getTime() < Date.now()) {
      return badRequest(reply, { token: ['Convite expirado'] });
    }

    const buf = Buffer.from(parsed.data.imageBase64, 'base64');
    if (buf.length > 5 * 1024 * 1024) {
      return badRequest(reply, { imageBase64: ['Arquivo muito grande (max 5MB)'] });
    }

    const ext =
      parsed.data.mimeType === 'image/png'
        ? 'png'
        : parsed.data.mimeType === 'image/webp'
          ? 'webp'
          : 'jpg';
    const path = `${convite.grupoId}/${convite.id}-${Date.now()}.${ext}`;

    try {
      const { getSupabaseAdmin } = await import('../lib/supabase-admin.js');
      const admin = getSupabaseAdmin();
      const { error } = await admin.storage.from('boleiros-fotos').upload(path, buf, {
        contentType: parsed.data.mimeType,
        upsert: true,
      });
      if (error) {
        request.log.warn({ err: error }, 'Falha upload boleiro foto');
        return badRequest(reply, { imageBase64: ['Falha no upload da foto'] });
      }
      const { data } = admin.storage.from('boleiros-fotos').getPublicUrl(path);
      return { fotoUrl: data.publicUrl };
    } catch (err) {
      request.log.warn({ err }, 'Supabase admin indisponivel para upload');
      return badRequest(reply, { imageBase64: ['Upload indisponivel no momento'] });
    }
  });

  /**
   * POST /api/convites-boleiro/publico/:token/completar
   */
  fastify.post('/api/convites-boleiro/publico/:token/completar', async (request, reply) => {
    const params = tokenParam.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error.flatten().fieldErrors);

    const parsed = conviteBoleiroCompletarSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.flatten().fieldErrors);

    const convite = await fastify.prisma.conviteBoleiro.findUnique({
      where: { token: params.data.token },
    });
    if (!convite) return notFound(reply, 'Convite nao encontrado');
    if (convite.status === 'concluido') {
      return conflict(reply, 'Cadastro ja foi concluido');
    }
    if (convite.tokenExpiresAt.getTime() < Date.now()) {
      return badRequest(reply, { token: ['Convite expirado'] });
    }

    const { nome, apelido, posicao, fotoUrl } = parsed.data;

    const result = await fastify.prisma.$transaction(async (tx) => {
      const boleiro = await tx.boleiroGrupo.create({
        data: {
          grupoId: convite.grupoId,
          nome,
          apelido: apelido ?? null,
          posicao: posicao ?? null,
          celular: convite.celular,
          email: convite.email,
          fotoUrl: fotoUrl ?? null,
        },
      });

      await tx.conviteBoleiro.update({
        where: { id: convite.id },
        data: { status: 'concluido', boleiroGrupoId: boleiro.id },
      });

      await sincronizarBoleiroEmPartidasAgendadas(tx, {
        boleiroGrupoId: boleiro.id,
        grupoId: convite.grupoId,
      });

      const partidasAfetadas = await tx.partida.findMany({
        where: { grupoId: convite.grupoId, status: 'agendada' },
        select: { id: true },
      });
      for (const p of partidasAfetadas) {
        await sincronizarPagamentosPartida(tx, p.id);
      }

      return boleiro;
    });

    return { boleiro: result, ok: true };
  });
};

export default convitesBoleiroRoutes;
