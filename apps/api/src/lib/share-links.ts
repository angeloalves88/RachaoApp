import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@rachao/db';

export type ShareLinkTipo = 'escalacao' | 'resumo';

const MS_24H = 24 * 60 * 60 * 1000;

export function isShareLinkExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() < Date.now();
}

export async function ensureShareLink(
  prisma: PrismaClient,
  partidaId: string,
  tipo: ShareLinkTipo,
): Promise<{ token: string; expiresAt: Date | null }> {
  const existing = await prisma.partidaLinkPublico.findUnique({
    where: { partidaId_tipo: { partidaId, tipo } },
    select: { token: true, expiresAt: true },
  });
  if (existing) return existing;

  return prisma.partidaLinkPublico.create({
    data: {
      partidaId,
      tipo,
      token: randomUUID(),
    },
    select: { token: true, expiresAt: true },
  });
}

export async function resolveShareLink(
  prisma: PrismaClient,
  token: string,
  tipo: ShareLinkTipo,
): Promise<
  | { ok: true; partidaId: string; expiresAt: Date | null }
  | { ok: false; reason: 'not_found' | 'expired' | 'cancelled' }
> {
  const link = await prisma.partidaLinkPublico.findUnique({
    where: { token },
    include: {
      partida: { select: { id: true, status: true } },
    },
  });
  if (!link || link.tipo !== tipo) return { ok: false, reason: 'not_found' };
  if (link.partida.status === 'cancelada') return { ok: false, reason: 'cancelled' };
  if (isShareLinkExpired(link.expiresAt)) return { ok: false, reason: 'expired' };
  return { ok: true, partidaId: link.partidaId, expiresAt: link.expiresAt };
}

export async function expireShareLinks(
  prisma: PrismaClient,
  partidaId: string,
  encerradaEm: Date,
): Promise<void> {
  const expiresAt = new Date(encerradaEm.getTime() + MS_24H);
  await prisma.partidaLinkPublico.updateMany({
    where: { partidaId },
    data: { expiresAt },
  });
}
