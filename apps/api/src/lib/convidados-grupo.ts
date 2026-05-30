import type { PrismaClient, Prisma } from '@rachao/db';
import type { ConvidadoAvulsoCreateInput } from '@rachao/shared/zod';

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Garante ConvidadoAvulso + entrada no pool do grupo (lista_espera).
 */
export async function upsertConvidadoNoPool(
  tx: Tx,
  grupoId: string,
  input: ConvidadoAvulsoCreateInput,
) {
  let convidado = null as Awaited<ReturnType<typeof tx.convidadoAvulso.findUnique>>;

  if (input.convidadoAvulsoId) {
    convidado = await tx.convidadoAvulso.findUnique({
      where: { id: input.convidadoAvulsoId },
    });
    if (!convidado) throw new Error('Convidado avulso nao encontrado');
  } else {
    const celularKey = input.celular?.length === 11 ? input.celular : `email:${input.email ?? ''}`;
    convidado = input.celular
      ? await tx.convidadoAvulso.findUnique({ where: { celular: input.celular } })
      : null;
    if (!convidado) {
      convidado = await tx.convidadoAvulso.create({
        data: {
          nome: input.nome!.trim(),
          apelido: input.apelido ?? null,
          posicao: input.posicao ?? null,
          celular: celularKey,
        },
      });
    }
  }

  await tx.convidadoGrupo.upsert({
    where: {
      grupoId_convidadoAvulsoId: {
        grupoId,
        convidadoAvulsoId: convidado.id,
      },
    },
    create: {
      grupoId,
      convidadoAvulsoId: convidado.id,
      status: 'lista_espera',
    },
    update: {
      status: 'lista_espera',
    },
  });

  return convidado;
}

export async function promoverConvidadoGrupoParaBoleiro(
  tx: Tx,
  grupoId: string,
  convidadoGrupoId: string,
) {
  const cg = await tx.convidadoGrupo.findFirst({
    where: { id: convidadoGrupoId, grupoId },
    include: { convidado: true },
  });
  if (!cg) throw new Error('Convidado do grupo nao encontrado');

  const celular = cg.convidado.celular;
  const existing = await tx.boleiroGrupo.findUnique({
    where: { grupoId_celular: { grupoId, celular } },
  });
  if (existing) throw new Error('Ja existe boleiro com este contato');

  const boleiro = await tx.boleiroGrupo.create({
    data: {
      grupoId,
      convidadoRefId: cg.convidadoAvulsoId,
      nome: cg.convidado.nome,
      apelido: cg.convidado.apelido,
      posicao: cg.convidado.posicao,
      celular,
      fotoUrl: cg.convidado.fotoUrl,
    },
  });

  await tx.convidadoGrupo.update({
    where: { id: cg.id },
    data: { status: 'promovido' },
  });

  return boleiro;
}
