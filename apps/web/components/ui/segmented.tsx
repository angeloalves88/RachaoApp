'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Controle segmentado tipo iOS (radio group estilizado).
 * Touch-friendly e funciona bem para selecao de nivel/posicao.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'inline-flex w-full rounded-md border border-border bg-surface p-1',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex flex-1 items-center justify-center rounded-sm font-medium transition-colors',
              size === 'sm' ? 'min-h-[36px] px-2 text-xs' : 'min-h-[40px] px-3 text-sm',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted hover:bg-surface-offset hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
