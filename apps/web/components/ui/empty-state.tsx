import * as React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'dashed';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = 'default',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg p-8 text-center',
        variant === 'dashed'
          ? 'border-2 border-dashed border-border bg-surface/40'
          : 'bg-surface',
        className,
      )}
    >
      {icon ? <div className="text-4xl">{icon}</div> : null}
      <h3 className="font-display text-xl font-bold">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
