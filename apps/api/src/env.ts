import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

const envDir = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(envDir, '..', '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_JWT_SECRET: z.string().min(16),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  WEB_URL: z.string().url().default('http://localhost:3001'),
  /** Credenciais do gateway Asaas. Ausente => modo simulado (T32). */
  ASAAS_API_KEY: z.string().optional(),
  /** Base URL do Asaas (sandbox ou prod). */
  ASAAS_BASE_URL: z.string().url().default('https://sandbox.asaas.com/api/v3'),
  /** Token configurado no painel Asaas e enviado no header asaas-access-token. */
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),
  /** Liga/desliga jobs periodicos de notificacoes (lembrete 24h e vaquinha). */
  ENABLE_NOTIFICATION_JOBS: z
    .string()
    .optional()
    .transform((v) => (v ?? '').toLowerCase() !== 'false'),
  /** Intervalo em minutos para os jobs (default 30). */
  NOTIFICATION_JOBS_INTERVAL_MIN: z.coerce.number().int().min(1).max(1440).default(30),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
