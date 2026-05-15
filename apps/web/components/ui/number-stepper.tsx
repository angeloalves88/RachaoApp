'use client';

import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NumberStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Sufixo opcional dentro do controle, ex: "min" / "boleiros". */
  suffix?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Controle numerico touch-friendly com botoes -/+ em volta de um label central.
 * Para valores numericos discretos (boleiros por time, tempo, num de times etc).
 */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix,
  className,
  ariaLabel,
}: NumberStepperProps) {
  function clamp(v: number) {
    return Math.max(min, Math.min(max, v));
  }
  return (
    <div
      className={cn(
        'inline-flex h-12 w-full items-stretch overflow-hidden rounded-md border border-border bg-surface-2',
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        aria-label="Diminuir"
        className="flex w-12 items-center justify-center text-muted transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus size={16} />
      </button>
      <div className="flex flex-1 items-center justify-center gap-1.5 border-x border-border text-base font-medium tabular-nums">
        <span>{value}</span>
        {suffix ? <span className="text-xs text-muted">{suffix}</span> : null}
      </div>
      <button
        type="button"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        aria-label="Aumentar"
        className="flex w-12 items-center justify-center text-muted transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
