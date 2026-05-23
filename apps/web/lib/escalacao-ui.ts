import { POSICOES } from '@rachao/shared/enums';
import type { CorTime } from '@rachao/shared/zod';
import type { EscalacaoElegivel } from '@/lib/escalacao-actions';

export const COR_HEX: Record<CorTime, string> = {
  orange: '#f97316',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  purple: '#a855f7',
};

export const COR_LABEL: Record<CorTime, string> = {
  orange: 'Laranja',
  blue: 'Azul',
  green: 'Verde',
  yellow: 'Amarelo',
  red: 'Vermelho',
  purple: 'Roxo',
};

const POSICAO_ORDER = new Map(POSICOES.map((p, i) => [p, i]));

export function posicaoSortIndex(posicao: string | null | undefined): number {
  if (!posicao) return POSICOES.length;
  return POSICAO_ORDER.get(posicao as (typeof POSICOES)[number]) ?? POSICOES.length;
}

export function compareByPosicao(
  a: { posicao?: string | null; nome: string },
  b: { posicao?: string | null; nome: string },
): number {
  const d = posicaoSortIndex(a.posicao) - posicaoSortIndex(b.posicao);
  if (d !== 0) return d;
  return a.nome.localeCompare(b.nome, 'pt-BR');
}

export function sortConviteIds(
  ids: string[],
  elegMap: Map<string, EscalacaoElegivel>,
): string[] {
  return [...ids].sort((a, b) => {
    const ea = elegMap.get(a);
    const eb = elegMap.get(b);
    if (!ea || !eb) return 0;
    return compareByPosicao(ea, eb);
  });
}

/** Classes Tailwind para grid de colunas de time na escalação (auto/manual). */
export function teamGridClass(numTimes: number): string {
  const base = 'grid gap-3';
  if (numTimes === 2) return `${base} grid-cols-1 sm:grid-cols-2`;
  if (numTimes === 3) return `${base} grid-cols-1 md:grid-cols-3`;
  if (numTimes >= 4) return `${base} grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`;
  return `${base} grid-cols-1`;
}

export function motivoBloqueioLabel(m: 'cartao_vermelho' | 'pagamento_pendente'): string {
  switch (m) {
    case 'cartao_vermelho':
      return 'Cartão vermelho na última partida';
    case 'pagamento_pendente':
      return 'Pagamento pendente';
    default:
      return m;
  }
}
