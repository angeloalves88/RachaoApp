/**
 * Helpers para criar e consultar Notificacoes.
 *
 * As notificacoes sao por usuario; eventos compartilhados (presenca, vaga
 * aberta, partida em 24h) sao replicados para todos os presidentes do grupo.
 */
import type { PrismaClient } from '@rachao/db';

export interface NotificacaoPayload {
  tipo: string;
  /** "partidas" | "financeiro" | "estadio" | "grupo" */
  categoria?: 'partidas' | 'financeiro' | 'estadio' | 'grupo';
  titulo: string;
  corpo: string;
  link?: string | null;
  partidaId?: string | null;
  grupoId?: string | null;
}

/**
 * Cria notificacoes para todos os presidentes (criador + copresidentes) do
 * grupo, exceto opcionalmente um usuario (`exceptUsuarioId`) — util quando o
 * proprio presidente disparou a acao.
 */
export async function criarNotificacoesPresidentesGrupo(
  prisma: PrismaClient,
  grupoId: string,
  payload: NotificacaoPayload,
  options: { exceptUsuarioId?: string } = {},
): Promise<number> {
  const presidentes = await prisma.grupoPresidente.findMany({
    where: { grupoId },
    select: { usuarioId: true },
  });
  const usuarios = presidentes
    .map((p) => p.usuarioId)
    .filter((id) => id !== options.exceptUsuarioId);
  if (usuarios.length === 0) return 0;

  const result = await prisma.notificacao.createMany({
    data: usuarios.map((usuarioId) => ({
      usuarioId,
      tipo: payload.tipo,
      categoria: payload.categoria ?? 'partidas',
      titulo: payload.titulo,
      corpo: payload.corpo,
      link: payload.link ?? null,
      partidaId: payload.partidaId ?? null,
      grupoId: payload.grupoId ?? grupoId,
    })),
  });
  return result.count;
}

/**
 * Cria uma notificacao para um unico usuario.
 */
export async function criarNotificacao(
  prisma: PrismaClient,
  usuarioId: string,
  payload: NotificacaoPayload,
): Promise<void> {
  await prisma.notificacao.create({
    data: {
      usuarioId,
      tipo: payload.tipo,
      categoria: payload.categoria ?? 'partidas',
      titulo: payload.titulo,
      corpo: payload.corpo,
      link: payload.link ?? null,
      partidaId: payload.partidaId ?? null,
      grupoId: payload.grupoId ?? null,
    },
  });
}

/**
 * Verifica se ja existe uma notificacao com mesmo (usuarioId, tipo, partidaId)
 * criada apos `desde`. Usado para deduplicar lembretes periodicos.
 */
export async function existeNotificacaoRecente(
  prisma: PrismaClient,
  params: {
    usuarioId: string;
    tipo: string;
    partidaId?: string | null;
    desde: Date;
  },
): Promise<boolean> {
  const found = await prisma.notificacao.findFirst({
    where: {
      usuarioId: params.usuarioId,
      tipo: params.tipo,
      partidaId: params.partidaId ?? null,
      criadoEm: { gte: params.desde },
    },
    select: { id: true },
  });
  return !!found;
}
