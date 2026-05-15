'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface RuleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  active: boolean;
  onToggle: (next: boolean) => void;
  /** Renderiza conteudo extra abaixo quando ativo (ex: stepper de duracao). */
  expandedContent?: React.ReactNode;
  className?: string;
}

/**
 * Card com toggle on/off e conteudo expansivo opcional.
 * Usado no Step 4 do wizard de partida.
 */
export function RuleCard({
  icon,
  title,
  description,
  active,
  onToggle,
  expandedContent,
  className,
}: RuleCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-surface p-4 transition-colors',
        active ? 'border-primary/60 bg-primary-highlight/30' : 'border-border',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(!active)}
        aria-pressed={active}
        className="flex w-full items-start gap-3 text-left"
      >
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-base',
            active ? 'bg-primary/20 text-primary' : 'bg-surface-offset text-muted',
          )}
          aria-hidden
        >
          {icon}
        </div>
        <div className="flex-1">
          <p className={cn('font-medium', active ? 'text-foreground' : 'text-muted')}>{title}</p>
          <p className="text-xs text-muted">{description}</p>
        </div>
        <div
          role="switch"
          aria-checked={active}
          className={cn(
            'mt-1 h-6 w-10 shrink-0 rounded-full border transition-colors',
            active ? 'border-primary bg-primary' : 'border-border bg-surface-offset',
          )}
        >
          <span
            className={cn(
              'block h-5 w-5 rounded-full bg-white shadow transition-transform',
              active ? 'translate-x-4' : 'translate-x-0.5',
              'mt-[1px]',
            )}
          />
        </div>
      </button>
      {active && expandedContent ? (
        <div className="mt-3 border-t border-border/60 pt-3">{expandedContent}</div>
      ) : null}
    </div>
  );
}
