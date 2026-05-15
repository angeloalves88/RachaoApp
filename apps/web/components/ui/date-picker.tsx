'use client';

import * as React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  /** Valor em formato YYYY-MM-DD. */
  value?: string;
  onChange: (value: string) => void;
  /** Data minima permitida (inclusive). */
  min?: string;
  /** Data maxima permitida (inclusive). */
  max?: string;
  className?: string;
  ariaLabel?: string;
  id?: string;
}

/**
 * Wrapper sobre <input type="date"> com icone e classes alinhadas ao design
 * system. Mostra calendario nativo (eficiente em mobile e desktop).
 */
export function DatePicker({
  value = '',
  onChange,
  min,
  max,
  className,
  ariaLabel,
  id,
}: DatePickerProps) {
  return (
    <div
      className={cn(
        'relative flex h-11 w-full items-center rounded-md border border-border bg-surface-2 pl-10 pr-3 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25',
        className,
      )}
    >
      <Calendar size={16} className="absolute left-3 text-muted" aria-hidden />
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-faint [color-scheme:dark]"
      />
    </div>
  );
}
