/**
 * Helpers de gestao de convites e lista de espera.
 *
 * A capacidade de uma partida e `numTimes * (boleirosPorTime + reservasPorTime)`. Quando um boleiro
 * recusa (libera vaga) ou um Presidente altera status manualmente, o proximo
 * da lista de espera (menor `posicaoEspera`) e promovido para `pendente`.
 */
import type { Prisma, PrismaClient } from '@rachao/db';

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
> | Prisma.TransactionClient;

export interface ResolvedDestino {
  email: string | null;
  celular: string | null;
  nome: string;
}

/**
 * Resolve email/celular/nome para um convite (boleiro fixo ou avulso).
 */
export async function resolveContatoConvite(
  prisma: TxClient,
  convite: {
    boleiroGrupoId: string | null;
    convidadoAvulsoId: string | null;
  },
): Promise<ResolvedDestino | null> {
  if (convite.boleiroGrupoId) {
    const b = await prisma.boleiroGrupo.findUnique({
      where: { id: convite.boleiroGrupoId },
      select: { email: true, celular: true, nome: true },
    });
    if (!b) return null;
    return {
      nome: b.nome,
      email: b.email ?? null,
      celular: b.celular || null,
    };
  }
  if (convite.convidadoAvulsoId) {
    const c = await prisma.convidadoAvulso.findUnique({
      where: { id: convite.convidadoAvulsoId },
      select: { celular: true, nome: true },
    });
    if (!c) return null;
    if (c.celular?.startsWith('email:')) {
      return { nome: c.nome, email: c.celular.slice(6), celular: null };
    }
    return { nome: c.nome, email: null, celular: c.celular || null };
  }
  return null;
}

export interface PromocaoResult {
  promovidos: Array<{
    conviteId: string;
    nome: string;
    email: string | null;
    celular: string | null;
  }>;
}

/**
 * Promove ate `vagasLivres` boleiros da lista de espera para `pendente`.
 *
 * - vagasLivres = capacidade - (confirmados + pendentes)
 * - escolhe os menores `posicaoEspera` dentro da partida
 * - retorna a lista promovida para que o caller possa enviar email / criar
 *   notificacao "vaga abriu na lista de espera"
 *
 * Esta funcao deve rodar dentro de uma transacao para evitar corrida.
 */
export async function promoverListaEspera(
  tx: TxClient,
  partidaId: string,
): Promise<PromocaoResult> {
  const partida = await tx.partida.findUnique({
    where: { id: partidaId },
    select: {
      numTimes: true,
      boleirosPorTime: true,
      reservasPorTime: true,
      status: true,
    },
  });
  if (!partida) return { promovidos: [] };
  if (partida.status !== 'agendada' && partida.status !== 'em_andamento') {
    return { promovidos: [] };
  }

  const capacidade =
    partida.numTimes * (partida.boleirosPorTime + (partida.reservasPorTime ?? 0));

  const ocupados = await tx.convitePartida.count({
    where: { partidaId, status: { in: ['pendente', 'confirmado'] } },
  });
  const vagasLivres = Math.max(0, capacidade - ocupados);
  if (vagasLivres === 0) return { promovidos: [] };

  const candidatos = await tx.convitePartida.findMany({
    where: { partidaId, status: 'lista_espera' },
    orderBy: [{ posicaoEspera: 'asc' }, { criadoEm: 'asc' }],
    take: vagasLivres,
  });
  if (candidatos.length === 0) return { promovidos: [] };

  const promovidos: PromocaoResult['promovidos'] = [];
  for (const c of candidatos) {
    await tx.convitePartida.update({
      where: { id: c.id },
      data: { status: 'pendente', posicaoEspera: null },
    });
    const dest = await resolveContatoConvite(tx, c);
    promovidos.push({
      conviteId: c.id,
      nome: dest?.nome ?? 'Boleiro',
      email: dest?.email ?? null,
      celular: dest?.celular ?? null,
    });
  }

  return { promovidos };
}

const SYNC_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias

/**
 * Cria ConvitePartida em todas as partidas `agendada` do grupo do boleiro que
 * ainda nao tenham convite para ele. Usado ao adicionar um novo boleiro no
 * grupo: alinha automaticamente as partidas futuras sem exigir recriacao.
 *
 * Respeita a capacidade `numTimes * (boleirosPorTime + reservasPorTime)`:
 * - status `pendente` quando ainda ha vagas;
 * - status `lista_espera` com `posicaoEspera` quando esgotada.
 *
 * Deve rodar dentro de uma transacao para evitar corridas.
 */
export async function sincronizarBoleiroEmPartidasAgendadas(
  tx: TxClient,
  params: { boleiroGrupoId: string; grupoId: string; tokenExpiresAt?: Date },
): Promise<{ criados: number }> {
  const tokenExpiresAt = params.tokenExpiresAt ?? new Date(Date.now() + SYNC_TOKEN_TTL_MS);

  const partidas = await tx.partida.findMany({
    where: { grupoId: params.grupoId, status: 'agendada' },
    select: { id: true, numTimes: true, boleirosPorTime: true, reservasPorTime: true },
  });
  if (partidas.length === 0) return { criados: 0 };

  let criados = 0;
  for (const p of partidas) {
    const ja = await tx.convitePartida.findFirst({
      where: { partidaId: p.id, boleiroGrupoId: params.boleiroGrupoId },
      select: { id: true },
    });
    if (ja) continue;

    const capacidade = p.numTimes * (p.boleirosPorTime + (p.reservasPorTime ?? 0));
    const ocupados = await tx.convitePartida.count({
      where: { partidaId: p.id, status: { in: ['pendente', 'confirmado'] } },
    });
    const dentro = ocupados < capacidade;
    const ultimaEspera = dentro
      ? null
      : await tx.convitePartida.aggregate({
          where: { partidaId: p.id, status: 'lista_espera' },
          _max: { posicaoEspera: true },
        });

    await tx.convitePartida.create({
      data: {
        partidaId: p.id,
        boleiroGrupoId: params.boleiroGrupoId,
        tipo: 'fixo',
        tokenExpiresAt,
        status: dentro ? 'pendente' : 'lista_espera',
        posicaoEspera: dentro ? null : (ultimaEspera?._max.posicaoEspera ?? 0) + 1,
      },
    });
    criados++;
  }

  return { criados };
}

/**
 * Formata data ISO em fuso BR para uso em emails/copy.
 */
export function formatarDataPartidaBr(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}
