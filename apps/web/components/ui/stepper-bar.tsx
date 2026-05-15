import { cn } from '@/lib/utils';

interface StepperBarProps {
  /** Indice do step atual (0-based). */
  current: number;
  /** Numero total de steps. */
  total: number;
  /** Label do step atual (ex: "Onde vai ser?"). */
  label?: string;
  className?: string;
}

/**
 * Barra de progresso para wizards multi-step. Renderiza N segmentos onde
 * os ja preenchidos ficam em laranja e o atual em laranja com pulso.
 */
export function StepperBar({ current, total, label, className }: StepperBarProps) {
  return (
    <div className={cn('space-y-2', className)} aria-label={`Passo ${current + 1} de ${total}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted">
          Passo {current + 1} de {total}
        </span>
        {label ? <span className="font-medium text-foreground">{label}</span> : null}
      </div>
      <div className="flex gap-1.5" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={total}>
        {Array.from({ length: total }).map((_, i) => {
          const filled = i < current;
          const active = i === current;
          return (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                filled
                  ? 'bg-primary'
                  : active
                    ? 'bg-primary/70 animate-pulse'
                    : 'bg-surface-offset',
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
