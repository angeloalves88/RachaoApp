'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  /** HH:mm */
  value?: string;
  onChange: (value: string) => void;
  /** Intervalo em minutos (default 15). */
  step?: number;
  className?: string;
  ariaLabel?: string;
  id?: string;
}

/**
 * Wrapper sobre <input type="time"> com step de 15 min por padrao.
 */
export function TimePicker({
  value = '',
  onChange,
  step = 15,
  className,
  ariaLabel,
  id,
}: TimePickerProps) {
  return (
    <div
      className={cn(
        'relative flex h-11 w-full items-center rounded-md border border-border bg-surface-2 pl-10 pr-3 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25',
        className,
      )}
    >
      <Clock size={16} className="absolute left-3 text-muted" aria-hidden />
      <input
        id={id}
        type="time"
        step={step * 60}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-faint [color-scheme:dark]"
      />
    </div>
  );
}
