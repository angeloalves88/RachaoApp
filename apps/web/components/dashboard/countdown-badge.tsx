'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { formatContagemRegressiva, toDate } from '@/lib/format';

/**
 * Badge de contagem regressiva. Atualiza a cada 60s. Marca pulse quando faltam
 * menos de 24h.
 */
export function CountdownBadge({ dataHora }: { dataHora: string | Date }) {
  const target = toDate(dataHora);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return null;

  const diffMs = target.getTime() - Date.now();
  const isUrgente = diffMs > 0 && diffMs < 24 * 60 * 60 * 1000;

  return (
    <Badge
      variant={isUrgente ? 'warning' : 'default'}
      className={isUrgente ? 'animate-pulse-warning' : undefined}
    >
      ⏱ {formatContagemRegressiva(target)}
    </Badge>
  );
}
