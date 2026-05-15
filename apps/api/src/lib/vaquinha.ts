/**
 * Helpers da Vaquinha (financeiro da partida / mensalidade).
 *
 * Por partida: cria Pagamento apenas para convites `confirmado` (cobranca so
 * apos confirmacao — PRD v1.2).
 *
 * Mensalidade: cria Pagamento para todos os boleiros fixos ativos do grupo
 * (com dedupe por grupo + mesReferencia + boleiro em qualquer partida do mes).
 * Convidados avulsos continuam vinculados ao convite confirmado desta partida.
 *
 * Inadimplencia: `dataLimitePagamento` para fixos na mensalidade; convidados
 * usam `dataLimitePagamentoConvidados` ou, se null, `partida.dataHora`.
 */
import type { Prisma, PrismaClient } from '@rachao/db';

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
> | Prisma.TransactionClient;

export interface VaquinhaTotais {
  arrecadado: number;
  esperado: number;
  pagos: number;
  pendentes: number;
  inadimplentes: number;
}

/** Mes AAAA-MM no fuso America/Sao_Paulo. */
export function mesReferenciaBr(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).format(d);
}

/** Ultimo instante do calendario do mes AAAA-MM (mes 1-12 no string). */
export function ultimoInstanteMesReferencia(mesReferencia: string): Date {
  const [y, m] = mesReferencia.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return new Date();
  return new Date(y, m, 0, 23, 59, 59, 999);
}

/** Fim do dia local (23:59:59.999) na mesma data civil de `dataHora`. */
export function fimDoDiaDataHora(dataHora: Date): Date {
  const x = new Date(dataHora.getTime());
  x.setHours(23, 59, 59, 999);
  return x;
}

/**
 * Ja existe cobranca de mensalidade pendente ou paga para este fixo no mesmo
 * mes no grupo (em qualquer partida) — dedupe v1.2.
 */
export async function existeMensalidadeFixoNoGrupoMes(
  tx: TxClient,
  opts: { grupoId: string; mesReferencia: string; boleiroGrupoId: string },
): Promise<boolean> {
  const found = await tx.pagamento.findFirst({
    where: {
      tipoPagador: 'fixo',
      boleiroGrupoId: opts.boleiroGrupoId,
      status: { in: ['pendente', 'pago'] },
      vaquinha: {
        tipo: 'mensalidade',
        mesReferencia: opts.mesReferencia,
        partida: { grupoId: opts.grupoId },
      },
    },
    select: { id: true },
  });
  return !!found;
}

export async function sincronizarPagamentos(
  tx: TxClient,
  vaquinhaId: string,
): Promise<{ criados: number; marcadosInadimplente: number }> {
  const vaq = await tx.vaquinha.findUnique({
    where: { id: vaquinhaId },
    select: {
      id: true,
      partidaId: true,
      tipo: true,
      mesReferencia: true,
      valorBoleiroFixo: true,
      valorConvidadoAvulso: true,
      dataLimitePagamento: true,
      dataLimitePagamentoConvidados: true,
      partida: {
        select: {
          id: true,
          grupoId: true,
          dataHora: true,
          tipoCobranca: true,
        },
      },
    },
  });
  if (!vaq) return { criados: 0, marcadosInadimplente: 0 };

  const partida = vaq.partida;
  const mesRef =
    vaq.tipo === 'mensalidade'
      ? (vaq.mesReferencia ?? mesReferenciaBr(partida.dataHora))
      : null;

  let criados = 0;

  if (vaq.tipo === 'mensalidade') {
    const fixos = await tx.boleiroGrupo.findMany({
      where: { grupoId: partida.grupoId, status: 'ativo' },
      select: { id: true },
    });

    for (const bg of fixos) {
      const existeNesta = await tx.pagamento.findFirst({
        where: { vaquinhaId: vaq.id, boleiroGrupoId: bg.id },
        select: { id: true },
      });
      if (existeNesta) continue;

      if (
        mesRef &&
        (await existeMensalidadeFixoNoGrupoMes(tx, {
          grupoId: partida.grupoId,
          mesReferencia: mesRef,
          boleiroGrupoId: bg.id,
        }))
      ) {
        continue;
      }

      await tx.pagamento.create({
        data: {
          vaquinhaId: vaq.id,
          boleiroGrupoId: bg.id,
          convidadoAvulsoId: null,
          tipoPagador: 'fixo',
          valorCobrado: vaq.valorBoleiroFixo,
          status: 'pendente',
        },
      });
      criados++;
    }

    const convitesConv = await tx.convitePartida.findMany({
      where: {
        partidaId: vaq.partidaId,
        tipo: 'convidado_avulso',
        status: 'confirmado',
        convidadoAvulsoId: { not: null },
      },
      select: { id: true, convidadoAvulsoId: true },
    });

    for (const c of convitesConv) {
      if (!c.convidadoAvulsoId) continue;
      const where: Prisma.PagamentoWhereInput = {
        vaquinhaId: vaq.id,
        convidadoAvulsoId: c.convidadoAvulsoId,
      };
      const existe = await tx.pagamento.findFirst({ where, select: { id: true } });
      if (existe) continue;

      await tx.pagamento.create({
        data: {
          vaquinhaId: vaq.id,
          boleiroGrupoId: null,
          convidadoAvulsoId: c.convidadoAvulsoId,
          tipoPagador: 'convidado_avulso',
          valorCobrado: vaq.valorConvidadoAvulso,
          status: 'pendente',
        },
      });
      criados++;
    }
  } else {
    const convites = await tx.convitePartida.findMany({
      where: {
        partidaId: vaq.partidaId,
        status: 'confirmado',
      },
      select: {
        id: true,
        tipo: true,
        boleiroGrupoId: true,
        convidadoAvulsoId: true,
      },
    });

    for (const c of convites) {
      const where: Prisma.PagamentoWhereInput = { vaquinhaId: vaq.id };
      if (c.boleiroGrupoId) where.boleiroGrupoId = c.boleiroGrupoId;
      else if (c.convidadoAvulsoId) where.convidadoAvulsoId = c.convidadoAvulsoId;
      else continue;

      const existe = await tx.pagamento.findFirst({ where, select: { id: true } });
      if (existe) continue;

      const tipoPagador = c.tipo === 'fixo' ? 'fixo' : 'convidado_avulso';
      const valor = tipoPagador === 'fixo' ? vaq.valorBoleiroFixo : vaq.valorConvidadoAvulso;

      await tx.pagamento.create({
        data: {
          vaquinhaId: vaq.id,
          boleiroGrupoId: c.boleiroGrupoId ?? null,
          convidadoAvulsoId: c.convidadoAvulsoId ?? null,
          tipoPagador,
          valorCobrado: valor,
          status: 'pendente',
        },
      });
      criados++;
    }
  }

  let marcadosInadimplente = 0;
  const now = Date.now();

  if (vaq.tipo === 'mensalidade') {
    if (vaq.dataLimitePagamento && vaq.dataLimitePagamento.getTime() < now) {
      const r1 = await tx.pagamento.updateMany({
        where: { vaquinhaId: vaq.id, tipoPagador: 'fixo', status: 'pendente' },
        data: { status: 'inadimplente' },
      });
      marcadosInadimplente += r1.count;
    }
    const limConv = vaq.dataLimitePagamentoConvidados ?? partida.dataHora;
    if (limConv.getTime() < now) {
      const r2 = await tx.pagamento.updateMany({
        where: { vaquinhaId: vaq.id, tipoPagador: 'convidado_avulso', status: 'pendente' },
        data: { status: 'inadimplente' },
      });
      marcadosInadimplente += r2.count;
    }
  } else if (vaq.dataLimitePagamento && vaq.dataLimitePagamento.getTime() < now) {
    const res = await tx.pagamento.updateMany({
      where: { vaquinhaId: vaq.id, status: 'pendente' },
      data: { status: 'inadimplente' },
    });
    marcadosInadimplente = res.count;
  }

  return { criados, marcadosInadimplente };
}

export async function sincronizarPagamentosPartida(
  tx: TxClient,
  partidaId: string,
): Promise<void> {
  const v = await tx.vaquinha.findUnique({
    where: { partidaId },
    select: { id: true },
  });
  if (!v) return;
  await sincronizarPagamentos(tx, v.id);
}

export function calcularTotais(
  pagamentos: Array<{ status: string; valorCobrado: Prisma.Decimal | number }>,
): VaquinhaTotais {
  let arrecadado = 0;
  let esperado = 0;
  let pagos = 0;
  let pendentes = 0;
  let inadimplentes = 0;
  for (const p of pagamentos) {
    const v = Number(p.valorCobrado);
    esperado += v;
    if (p.status === 'pago') {
      arrecadado += v;
      pagos++;
    } else if (p.status === 'inadimplente') {
      inadimplentes++;
    } else {
      pendentes++;
    }
  }
  return { arrecadado, esperado, pagos, pendentes, inadimplentes };
}
