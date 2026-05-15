import type { FastifyPluginAsync } from 'fastify';
import { onboardingSchema, slugify } from '@rachao/shared/zod';

const onboardingRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/onboarding
   *
   * Idempotente. Atualiza Usuario.perfis e, opcionalmente:
   * - cria primeiro Grupo (se selecionou 'presidente' + nomeGrupo)
   * - cria Estadio rascunho (se selecionou 'dono_estadio' + nomeEstadio)
   *
   * Retorna a URL de redirect: prioriza Dono do Estádio se estiver entre os perfis
   * (alinhado ao fluxo de login em `/entrada` no web).
   */
  fastify.post(
    '/api/onboarding',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const auth = request.user!;
      const userId = auth.sub;

      const parsed = onboardingSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'ValidationError',
          issues: parsed.error.flatten().fieldErrors,
        });
      }

      const usuario = await fastify.prisma.usuario.findUnique({ where: { id: userId } });
      if (!usuario) {
        return reply.code(404).send({
          error: 'NotFound',
          message: 'Usuario nao sincronizado. Chame /api/auth/sync antes.',
        });
      }

      const { perfis, nomeGrupo, nomeEstadio, cidadeEstadio, cidade } = parsed.data;

      const result = await fastify.prisma.$transaction(async (tx) => {
        await tx.usuario.update({
          where: { id: userId },
          data: {
            perfis,
            ...(cidade ? { cidade } : {}),
          },
        });

        // 1) Cria primeiro grupo se houver dado
        if (perfis.includes('presidente') && nomeGrupo) {
          await tx.grupo.create({
            data: {
              nome: nomeGrupo,
              presidentes: {
                create: { usuarioId: userId, papel: 'criador' },
              },
            },
          });
        }

        // 2) Cria estadio rascunho se houver dado e usuario nao tem estadio
        if (perfis.includes('dono_estadio') && nomeEstadio && cidadeEstadio) {
          const existingEstadio = await tx.estadio.findUnique({ where: { donoId: userId } });
          if (!existingEstadio) {
            const baseSlug = slugify(`${nomeEstadio}-${cidadeEstadio}`);
            const suffix = userId.slice(-6).toLowerCase();
            await tx.estadio.create({
              data: {
                donoId: userId,
                nome: nomeEstadio,
                slug: `${baseSlug}-${suffix}`,
                endereco: '',
                cidade: cidadeEstadio,
                estado: '',
                tipoPiso: [],
                capacidade: 0,
                comodidades: [],
                ativo: false,
                publico: false,
              },
            });
          }
        }

        return tx.usuario.findUnique({ where: { id: userId } });
      });

      const perfisFinais = result?.perfis ?? perfis;
      const redirect = perfisFinais.includes('dono_estadio') ? '/estadio/dashboard' : '/dashboard';

      return { ok: true, redirect, perfis: perfisFinais };
    },
  );
};

export default onboardingRoutes;
