/**
 * Helpers reutilizaveis para autorizacao em rotas de grupos / boleiros.
 * Garante que o usuario autenticado e presidente (criador ou copresidente) do
 * grupo antes de operacoes de leitura/escrita.
 */
import type { PrismaClient } from '@rachao/db';

export type Papel = 'criador' | 'copresidente';

export interface GrupoAcessoResult {
  papel: Papel;
}

/**
 * Retorna { papel } se `usuarioId` participa do grupo, ou null caso contrario.
 */
export async function getGrupoAcesso(
  prisma: PrismaClient,
  grupoId: string,
  usuarioId: string,
): Promise<GrupoAcessoResult | null> {
  const link = await prisma.grupoPresidente.findUnique({
    where: { grupoId_usuarioId: { grupoId, usuarioId } },
    select: { papel: true },
  });
  if (!link) return null;
  return { papel: link.papel as Papel };
}
