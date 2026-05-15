import type { CorTime } from '@rachao/shared/zod';

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
