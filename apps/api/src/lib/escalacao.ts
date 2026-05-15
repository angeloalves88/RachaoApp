/**
 * Logica de sorteio e deteccao de bloqueios para escalacao (Bloco 5).
 */
import type { Prisma, PrismaClient } from '@rachao/db';
import type { CorTime, SorteioOptionsInput } from '@rachao/shared/zod';
import { CORES_TIME } from '@rachao/shared/zod';
import { mesReferenciaBr } from './vaquinha.js';

export type MotivoBloqueio = 'cartao_vermelho' | 'pagamento_pendente';

export interface BloqueioInfo {
  conviteId: string;
  motivo: MotivoBloqueio;
  detalhe?: string;
}

export interface ElegivelConvite {
  conviteId: string;
  tipo: string;
  boleiroGrupoId: string | null;
  convidadoAvulsoId: string | null;
  nome: string;
  apelido: string | null;
  posicao: string | null;
}

type RegrasJson = Record<string, { ativo?: boolean; [k: string]: unknown }>;

function regraAtiva(regras: unknown, key: string): boolean {
  if (!regras || typeof regras !== 'object') return false;
  const r = regras as RegrasJson;
  const block = r[key];
  return !!(block && typeof block === 'object' && block.ativo === true);
}

/** PRNG determinístico (32-bit) a partir de string seed. */
function seedToUint32(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rand: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

const ORDEM_POS: Record<string, number> = { GOL: 0, ZAG: 1, MEI: 2, ATA: 3 };

const NOMES_TIME_PADRAO = ['Time A', 'Time B', 'Time C', 'Time D'] as const;

export interface TimeSorteado {
  nome: string;
  cor: CorTime;
  conviteIds: string[];
  conviteIdsReservas: string[];
  capitaoConviteId: null;
}

/**
 * Sorteia distribuicao de convites entre N times respeitando o limite de
 * titulares por time. Quando ha `reservasPorTime > 0`, distribui os
 * excedentes (ate o limite de reservas) em uma sublista `conviteIdsReservas`.
 *
 * Garante que nenhum time passe de `boleirosPorTime` titulares nem de
 * `reservasPorTime` reservas. Boleiros alem da capacidade total
 * (`numTimes * (boleirosPorTime + reservasPorTime)`) ficam fora do sorteio e
 * sao reportados via `excedentes` para a UI alertar o presidente.
 */
export function sortearTimes(
  elegiveis: ElegivelConvite[],
  numTimes: number,
  boleirosPorTime: number,
  opts: SorteioOptionsInput,
  reservasPorTime = 0,
): { times: TimeSorteado[]; excedentes: number } {
  if (numTimes < 2 || numTimes > 4) {
    throw new Error('numTimes deve estar entre 2 e 4');
  }

  let pool = [...elegiveis];
  if (!opts.incluirConvidadosAvulsos) {
    pool = pool.filter((e) => e.tipo === 'fixo');
  }

  const seedStr = opts.seed ?? `rachao-${Date.now()}`;
  const rand = mulberry32(seedToUint32(seedStr));

  if (opts.balancearPorPosicao) {
    pool.sort((a, b) => {
      const pa = a.posicao && ORDEM_POS[a.posicao] !== undefined ? ORDEM_POS[a.posicao]! : 99;
      const pb = b.posicao && ORDEM_POS[b.posicao] !== undefined ? ORDEM_POS[b.posicao]! : 99;
      if (pa !== pb) return pa - pb;
      return rand() - 0.5;
    });
  } else {
    shuffleInPlace(pool, rand);
  }

  const times: TimeSorteado[] = [];
  for (let i = 0; i < numTimes; i++) {
    times.push({
      nome: NOMES_TIME_PADRAO[i] ?? `Time ${i + 1}`,
      cor: CORES_TIME[i % CORES_TIME.length]!,
      conviteIds: [],
      conviteIdsReservas: [],
      capitaoConviteId: null,
    });
  }

  const capTitulares = numTimes * boleirosPorTime;
  const capReservas = numTimes * Math.max(0, reservasPorTime);

  // Fase 1: titulares (round-robin ate `boleirosPorTime` por time).
  let idx = 0;
  for (; idx < pool.length && idx < capTitulares; idx++) {
    const teamIdx = idx % numTimes;
    times[teamIdx]!.conviteIds.push(pool[idx]!.conviteId);
  }

  // Fase 2: reservas (round-robin ate `reservasPorTime` por time).
  if (capReservas > 0) {
    let placed = 0;
    for (; idx < pool.length && placed < capReservas; idx++, placed++) {
      const teamIdx = placed % numTimes;
      times[teamIdx]!.conviteIdsReservas.push(pool[idx]!.conviteId);
    }
  }

  const excedentes = Math.max(0, pool.length - idx);
  return { times, excedentes };
}

/**
 * Detecta convites bloqueados para escalacao conforme regras da partida.
 */
export async function detectarBloqueios(
  prisma: PrismaClient,
  partida: {
    id: string;
    grupoId: string;
    dataHora: Date;
    tipoCobranca: string;
    regras: Prisma.JsonValue;
  },
  convitesConfirmados: Array<{
    id: string;
    boleiroGrupoId: string | null;
    convidadoAvulsoId: string | null;
  }>,
): Promise<BloqueioInfo[]> {
  const bloqueios: BloqueioInfo[] = [];
  const byBoleiroId = new Map<string, string>();
  const byConvidadoId = new Map<string, string>();
  for (const c of convitesConfirmados) {
    if (c.boleiroGrupoId) byBoleiroId.set(c.boleiroGrupoId, c.id);
    if (c.convidadoAvulsoId) byConvidadoId.set(c.convidadoAvulsoId, c.id);
  }

  if (regraAtiva(partida.regras, 'bloqueio_vermelho')) {
    const anterior = await prisma.partida.findFirst({
      where: {
        grupoId: partida.grupoId,
        status: 'encerrada',
        dataHora: { lt: partida.dataHora },
        id: { not: partida.id },
      },
      orderBy: { dataHora: 'desc' },
      select: { id: true },
    });

    if (anterior) {
      const vermelhos = await prisma.evento.findMany({
        where: { partidaId: anterior.id, tipo: 'vermelho' },
        select: { boleiroId: true },
      });
      for (const e of vermelhos) {
        if (!e.boleiroId) continue;
        const conviteId = byBoleiroId.get(e.boleiroId);
        if (conviteId) {
          bloqueios.push({
            conviteId,
            motivo: 'cartao_vermelho',
            detalhe: 'Cartao vermelho na ultima partida do grupo',
          });
        }
      }
    }
  }

  if (regraAtiva(partida.regras, 'bloqueio_inadimplente')) {
    const boleiroIds = convitesConfirmados
      .map((c) => c.boleiroGrupoId)
      .filter((id): id is string => !!id);
    const convidadoIds = convitesConfirmados
      .map((c) => c.convidadoAvulsoId)
      .filter((id): id is string => !!id);

    const orCond: Prisma.PagamentoWhereInput[] = [];

    if (partida.tipoCobranca === 'mensalidade') {
      const mesRef = mesReferenciaBr(partida.dataHora);
      if (boleiroIds.length > 0) {
        orCond.push({
          boleiroGrupoId: { in: boleiroIds },
          tipoPagador: 'fixo',
          vaquinha: {
            tipo: 'mensalidade',
            mesReferencia: mesRef,
            partida: { grupoId: partida.grupoId },
          },
        });
      }
      if (convidadoIds.length > 0) {
        orCond.push({
          convidadoAvulsoId: { in: convidadoIds },
          tipoPagador: 'convidado_avulso',
          vaquinha: { partidaId: partida.id },
        });
      }
    } else {
      if (boleiroIds.length > 0) {
        orCond.push({
          boleiroGrupoId: { in: boleiroIds },
          vaquinha: { partidaId: partida.id },
        });
      }
      if (convidadoIds.length > 0) {
        orCond.push({
          convidadoAvulsoId: { in: convidadoIds },
          vaquinha: { partidaId: partida.id },
        });
      }
    }

    if (orCond.length > 0) {
      const pendentes = await prisma.pagamento.findMany({
        where: {
          status: { in: ['pendente', 'inadimplente'] },
          OR: orCond,
        },
        select: { boleiroGrupoId: true, convidadoAvulsoId: true },
      });

      for (const p of pendentes) {
        if (p.boleiroGrupoId) {
          const conviteId = byBoleiroId.get(p.boleiroGrupoId);
          if (conviteId && !bloqueios.some((b) => b.conviteId === conviteId)) {
            bloqueios.push({
              conviteId,
              motivo: 'pagamento_pendente',
              detalhe: 'Pagamento pendente ou inadimplente',
            });
          }
        } else if (p.convidadoAvulsoId) {
          const conviteId = byConvidadoId.get(p.convidadoAvulsoId);
          if (conviteId && !bloqueios.some((b) => b.conviteId === conviteId)) {
            bloqueios.push({
              conviteId,
              motivo: 'pagamento_pendente',
              detalhe: 'Pagamento pendente ou inadimplente',
            });
          }
        }
      }
    }
  }

  return bloqueios;
}
