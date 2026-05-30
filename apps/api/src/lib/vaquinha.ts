/**
 * Helpers da Vaquinha (financeiro da partida / mensalidade).
 *
 * Por partida: cria Pagamento apenas para convites `confirmado` (cobranca so
 * apos confirmacao — PRD v1.2).
 *
 * Mensalidade: cria Pagamento para boleiros fixos ativos elegiveis no mes
 * (mes >= max(criacao do grupo, cadastro do boleiro), fuso America/Sao_Paulo).
 * Dedupe por grupo + mesReferencia + boleiro em qualquer partida do mes.
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

/** Mes AAAA-MM mais recente entre duas datas (fuso America/Sao_Paulo). */
export function mesReferenciaMaisRecente(a: Date, b: Date): string {
  const mesA = mesReferenciaBr(a);
  const mesB = mesReferenciaBr(b);
  return mesA >= mesB ? mesA : mesB;
}

/** Primeiro mes (AAAA-MM) em que o boleiro fixo deve pagar mensalidade no grupo. */
export function mesInicioMensalidadeBoleiro(
  grupoCriadoEm: Date,
  boleiroCriadoEm: Date,
): string {
  return mesReferenciaMaisRecente(grupoCriadoEm, boleiroCriadoEm);
}

/** Boleiro fixo deve ser cobrado na mensalidade deste mes de referencia? */
export function boleiroElegivelMensalidadeMes(
  mesReferencia: string,
  grupoCriadoEm: Date,
  boleiroCriadoEm: Date,
): boolean {
  return mesReferencia >= mesInicioMensalidadeBoleiro(grupoCriadoEm, boleiroCriadoEm);
}

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

const vaquinhaSyncSelect = {
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
      grupo: { select: { criadoEm: true } },
    },
  },
} as const;

type VaquinhaSync = NonNullable<
  Awaited<ReturnType<TxClient['vaquinha']['findUnique']>>
> & {
  partida: {
    id: string;
    grupoId: string;
    dataHora: Date;
    tipoCobranca: string;
    grupo: { criadoEm: Date };
  };
};

interface PagamentosFaltantes {
  fixos: string[];
  convidadosAvulsos: string[];
  porPartida: Array<{
    boleiroGrupoId: string | null;
    convidadoAvulsoId: string | null;
    tipoPagador: 'fixo' | 'convidado_avulso';
    valorCobrado: Prisma.Decimal;
  }>;
}

async function carregarVaquinhaSync(
  tx: TxClient,
  vaquinhaId: string,
): Promise<VaquinhaSync | null> {
  return tx.vaquinha.findUnique({
    where: { id: vaquinhaId },
    select: vaquinhaSyncSelect,
  }) as Promise<VaquinhaSync | null>;
}

async function calcularPagamentosFaltantes(
  tx: TxClient,
  vaq: VaquinhaSync,
): Promise<PagamentosFaltantes> {
  const partida = vaq.partida;
  const mesRef =
    vaq.tipo === 'mensalidade'
      ? (vaq.mesReferencia ?? mesReferenciaBr(partida.dataHora))
      : null;

  const faltantes: PagamentosFaltantes = {
    fixos: [],
    convidadosAvulsos: [],
    porPartida: [],
  };

  if (vaq.tipo === 'mensalidade') {
    const grupoCriadoEm = partida.grupo.criadoEm;
    const fixos = await tx.boleiroGrupo.findMany({
      where: { grupoId: partida.grupoId, status: 'ativo' },
      select: { id: true, criadoEm: true },
    });
    const fixoIds =
      mesRef != null
        ? fixos
            .filter((f) => boleiroElegivelMensalidadeMes(mesRef, grupoCriadoEm, f.criadoEm))
            .map((f) => f.id)
        : fixos.map((f) => f.id);

    const pagamentosNaVaquinha =
      fixoIds.length === 0
        ? []
        : await tx.pagamento.findMany({
            where: {
              vaquinhaId: vaq.id,
              tipoPagador: 'fixo',
              boleiroGrupoId: { in: fixoIds },
            },
            select: { boleiroGrupoId: true },
          });

    const comPagNaVaquinha = new Set(
      pagamentosNaVaquinha
        .map((p) => p.boleiroGrupoId)
        .filter((id): id is string => id != null),
    );
    const missingNaVaquinha = fixoIds.filter((id) => !comPagNaVaquinha.has(id));

    if (missingNaVaquinha.length > 0 && mesRef) {
      const dedupe = await tx.pagamento.findMany({
        where: {
          tipoPagador: 'fixo',
          boleiroGrupoId: { in: missingNaVaquinha },
          status: { in: ['pendente', 'pago'] },
          vaquinha: {
            tipo: 'mensalidade',
            mesReferencia: mesRef,
            partida: { grupoId: partida.grupoId },
          },
        },
        select: { boleiroGrupoId: true },
      });
      const dedupeIds = new Set(
        dedupe.map((p) => p.boleiroGrupoId).filter((id): id is string => id != null),
      );
      faltantes.fixos = missingNaVaquinha.filter((id) => !dedupeIds.has(id));
    } else {
      faltantes.fixos = missingNaVaquinha;
    }

    const convitesConv = await tx.convitePartida.findMany({
      where: {
        partidaId: vaq.partidaId,
        tipo: 'convidado_avulso',
        status: 'confirmado',
        convidadoAvulsoId: { not: null },
      },
      select: { convidadoAvulsoId: true },
    });
    const convIds = convitesConv
      .map((c) => c.convidadoAvulsoId)
      .filter((id): id is string => id != null);

    if (convIds.length > 0) {
      const pagConv = await tx.pagamento.findMany({
        where: { vaquinhaId: vaq.id, convidadoAvulsoId: { in: convIds } },
        select: { convidadoAvulsoId: true },
      });
      const comPagConv = new Set(
        pagConv.map((p) => p.convidadoAvulsoId).filter((id): id is string => id != null),
      );
      faltantes.convidadosAvulsos = convIds.filter((id) => !comPagConv.has(id));
    }

    return faltantes;
  }

  const convites = await tx.convitePartida.findMany({
    where: {
      partidaId: vaq.partidaId,
      status: 'confirmado',
    },
    select: {
      tipo: true,
      boleiroGrupoId: true,
      convidadoAvulsoId: true,
    },
  });

  if (convites.length === 0) return faltantes;

  const boleiroIds = convites
    .map((c) => c.boleiroGrupoId)
    .filter((id): id is string => id != null);
  const convidadoIds = convites
    .map((c) => c.convidadoAvulsoId)
    .filter((id): id is string => id != null);

  const [pagBoleiros, pagConvidados] = await Promise.all([
    boleiroIds.length === 0
      ? Promise.resolve([])
      : tx.pagamento.findMany({
          where: { vaquinhaId: vaq.id, boleiroGrupoId: { in: boleiroIds } },
          select: { boleiroGrupoId: true },
        }),
    convidadoIds.length === 0
      ? Promise.resolve([])
      : tx.pagamento.findMany({
          where: { vaquinhaId: vaq.id, convidadoAvulsoId: { in: convidadoIds } },
          select: { convidadoAvulsoId: true },
        }),
  ]);

  const comPagBoleiro = new Set(
    pagBoleiros.map((p) => p.boleiroGrupoId).filter((id): id is string => id != null),
  );
  const comPagConvidado = new Set(
    pagConvidados.map((p) => p.convidadoAvulsoId).filter((id): id is string => id != null),
  );

  for (const c of convites) {
    if (c.boleiroGrupoId) {
      if (comPagBoleiro.has(c.boleiroGrupoId)) continue;
      faltantes.porPartida.push({
        boleiroGrupoId: c.boleiroGrupoId,
        convidadoAvulsoId: null,
        tipoPagador: 'fixo',
        valorCobrado: vaq.valorBoleiroFixo,
      });
      continue;
    }
    if (c.convidadoAvulsoId) {
      if (comPagConvidado.has(c.convidadoAvulsoId)) continue;
      faltantes.porPartida.push({
        boleiroGrupoId: null,
        convidadoAvulsoId: c.convidadoAvulsoId,
        tipoPagador: 'convidado_avulso',
        valorCobrado: vaq.valorConvidadoAvulso,
      });
    }
  }

  return faltantes;
}

function temPagamentosFaltantes(faltantes: PagamentosFaltantes): boolean {
  return (
    faltantes.fixos.length > 0 ||
    faltantes.convidadosAvulsos.length > 0 ||
    faltantes.porPartida.length > 0
  );
}

async function criarPagamentosFaltantes(
  tx: TxClient,
  vaq: VaquinhaSync,
  faltantes: PagamentosFaltantes,
): Promise<number> {
  const rows: Prisma.PagamentoCreateManyInput[] = [];

  for (const boleiroGrupoId of faltantes.fixos) {
    rows.push({
      vaquinhaId: vaq.id,
      boleiroGrupoId,
      convidadoAvulsoId: null,
      tipoPagador: 'fixo',
      valorCobrado: vaq.valorBoleiroFixo,
      status: 'pendente',
    });
  }

  for (const convidadoAvulsoId of faltantes.convidadosAvulsos) {
    rows.push({
      vaquinhaId: vaq.id,
      boleiroGrupoId: null,
      convidadoAvulsoId,
      tipoPagador: 'convidado_avulso',
      valorCobrado: vaq.valorConvidadoAvulso,
      status: 'pendente',
    });
  }

  for (const p of faltantes.porPartida) {
    rows.push({
      vaquinhaId: vaq.id,
      boleiroGrupoId: p.boleiroGrupoId,
      convidadoAvulsoId: p.convidadoAvulsoId,
      tipoPagador: p.tipoPagador,
      valorCobrado: p.valorCobrado,
      status: 'pendente',
    });
  }

  if (rows.length === 0) return 0;

  const res = await tx.pagamento.createMany({ data: rows });
  return res.count;
}

async function marcarInadimplentes(
  tx: TxClient,
  vaq: VaquinhaSync,
): Promise<number> {
  let marcadosInadimplente = 0;
  const now = Date.now();
  const partida = vaq.partida;

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

  return marcadosInadimplente;
}

/** Checagem leve (contagens) antes da sync completa — evita queries extras na leitura. */
export async function precisaSincronizarPagamentos(
  tx: TxClient,
  vaquinhaId: string,
): Promise<boolean> {
  const vaq = await tx.vaquinha.findUnique({
    where: { id: vaquinhaId },
    select: {
      id: true,
      partidaId: true,
      tipo: true,
      mesReferencia: true,
      partida: {
        select: {
          grupoId: true,
          dataHora: true,
          grupo: { select: { criadoEm: true } },
        },
      },
    },
  });
  if (!vaq) return false;

  if (vaq.tipo === 'mensalidade') {
    const mesRef = vaq.mesReferencia ?? mesReferenciaBr(vaq.partida.dataHora);
    const grupoCriadoEm = vaq.partida.grupo.criadoEm;

    const fixos = await tx.boleiroGrupo.findMany({
      where: { grupoId: vaq.partida.grupoId, status: 'ativo' },
      select: { id: true, criadoEm: true },
    });
    const fixosElegiveis = fixos.filter((f) =>
      boleiroElegivelMensalidadeMes(mesRef, grupoCriadoEm, f.criadoEm),
    ).length;

    const [pagFixosVaquinha, convConfirmados, pagConvVaquinha] = await Promise.all([
      tx.pagamento.count({ where: { vaquinhaId: vaq.id, tipoPagador: 'fixo' } }),
      tx.convitePartida.count({
        where: {
          partidaId: vaq.partidaId,
          tipo: 'convidado_avulso',
          status: 'confirmado',
          convidadoAvulsoId: { not: null },
        },
      }),
      tx.pagamento.count({ where: { vaquinhaId: vaq.id, tipoPagador: 'convidado_avulso' } }),
    ]);

    if (pagFixosVaquinha < fixosElegiveis) return true;
    if (pagConvVaquinha < convConfirmados) return true;
    return false;
  }

  const [convConfirmados, pagamentos] = await Promise.all([
    tx.convitePartida.count({ where: { partidaId: vaq.partidaId, status: 'confirmado' } }),
    tx.pagamento.count({ where: { vaquinhaId: vaq.id } }),
  ]);
  return pagamentos < convConfirmados;
}

/** Atualiza status inadimplente quando o prazo venceu (leve; seguro em leituras). */
export async function aplicarInadimplenciaVaquinha(
  tx: TxClient,
  vaquinhaId: string,
): Promise<number> {
  const vaq = await carregarVaquinhaSync(tx, vaquinhaId);
  if (!vaq) return 0;
  return marcarInadimplentes(tx, vaq);
}

export async function sincronizarPagamentos(
  tx: TxClient,
  vaquinhaId: string,
): Promise<{ criados: number; marcadosInadimplente: number }> {
  const vaq = await carregarVaquinhaSync(tx, vaquinhaId);
  if (!vaq) return { criados: 0, marcadosInadimplente: 0 };

  const faltantes = await calcularPagamentosFaltantes(tx, vaq);
  const criados = await criarPagamentosFaltantes(tx, vaq, faltantes);
  const marcadosInadimplente = await marcarInadimplentes(tx, vaq);

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
