import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';

import { env } from './env.js';
import authPlugin from './plugins/auth.js';
import prismaPlugin from './plugins/prisma.js';
import assinaturasRoutes from './routes/assinaturas.js';
import authSyncRoutes from './routes/auth-sync.js';
import boleirosRoutes from './routes/boleiros.js';
import convidadosAvulsosRoutes from './routes/convidados-avulsos.js';
import convitesPublicoRoutes from './routes/convites-publico.js';
import cronometroRoutes from './routes/cronometro.js';
import dashboardRoutes from './routes/dashboard.js';
import escalacaoRoutes from './routes/escalacao.js';
import estadiosRoutes from './routes/estadios.js';
import eventosRoutes from './routes/eventos.js';
import gruposRoutes from './routes/grupos.js';
import healthRoutes from './routes/health.js';
import meRoutes from './routes/me.js';
import notificacoesRoutes from './routes/notificacoes.js';
import perfilRoutes from './routes/perfil.js';
import notificationsJobsPlugin from './plugins/notifications-jobs.js';
import onboardingRoutes from './routes/onboarding.js';
import partidasRoutes from './routes/partidas.js';
import vaquinhasRoutes from './routes/vaquinhas.js';
import webhooksAsaasRoutes from './routes/webhooks-asaas.js';
import webhooksResendRoutes from './routes/webhooks-resend.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'debug' : 'info',
      transport:
        env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
            }
          : undefined,
    },
    disableRequestLogging: false,
    trustProxy: true,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
  });
  await app.register(sensible);

  await app.register(prismaPlugin);
  await app.register(authPlugin);

  await app.register(healthRoutes);
  await app.register(meRoutes, { prefix: '/api' });
  await app.register(authSyncRoutes);
  await app.register(onboardingRoutes);
  await app.register(dashboardRoutes);
  await app.register(gruposRoutes);
  await app.register(boleirosRoutes);
  await app.register(convidadosAvulsosRoutes);
  await app.register(escalacaoRoutes);
  await app.register(estadiosRoutes);
  await app.register(eventosRoutes);
  await app.register(cronometroRoutes);
  await app.register(partidasRoutes);
  await app.register(vaquinhasRoutes);
  await app.register(convitesPublicoRoutes);
  await app.register(notificacoesRoutes);
  await app.register(perfilRoutes);
  await app.register(assinaturasRoutes);
  await app.register(webhooksResendRoutes);
  await app.register(webhooksAsaasRoutes);
  await app.register(notificationsJobsPlugin);

  return app;
}
