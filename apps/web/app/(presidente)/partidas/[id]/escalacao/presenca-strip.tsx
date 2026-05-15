'use client';

import type { PresencaStripEstado } from '@/lib/escalacao-actions';

interface Props {
  estados: PresencaStripEstado[];
  /** Numero total de slots a exibir (preenche com 'neutro' se faltar). */
  total?: number;
}

const COR: Record<PresencaStripEstado, string> = {
  ok: 'bg-success',
  nao: 'bg-destructive',
  neutro: 'bg-surface-offset',
};

const LABEL: Record<PresencaStripEstado, string> = {
  ok: 'Confirmou',
  nao: 'Recusou',
  neutro: 'Sem registro',
};

/**
 * Mini-strip de 5 bolinhas indicando presenca nos ultimos 5 jogos do grupo.
 * Ordem: mais antigo a esquerda, mais recente a direita.
 */
export function PresencaStrip({ estados, total = 5 }: Props) {
  const slots: PresencaStripEstado[] = Array.from({ length: total }, (_, i) => {
    const fromEnd = total - 1 - i;
    const idx = estados.length - 1 - fromEnd;
    return idx >= 0 ? estados[idx]! : 'neutro';
  });
  return (
    <span className="inline-flex items-center gap-0.5" aria-label="Presença nos últimos jogos">
      {slots.map((s, i) => (
        <span
          key={i}
          className={`block h-2 w-2 rounded-full ${COR[s]}`}
          title={LABEL[s]}
          aria-label={LABEL[s]}
        />
      ))}
    </span>
  );
}
