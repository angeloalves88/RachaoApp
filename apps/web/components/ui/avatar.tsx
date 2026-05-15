'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

/**
 * Avatar com fallback automatico para iniciais coloridas.
 * As cores sao geradas deterministicamente a partir do nome.
 */
const PALETTE = [
  'bg-primary text-primary-foreground',
  'bg-info text-text-inverse',
  'bg-success text-text-inverse',
  'bg-warning text-text-inverse',
  'bg-surface-offset text-foreground',
  'bg-surface-2 text-foreground',
];

export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]!;
}

export function initialsFromName(name: string, max = 2): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, max);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-20 w-20 text-2xl',
} as const;

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name: string;
  size?: keyof typeof sizeClasses;
  className?: string;
}

export function Avatar({ src, alt, name, size = 'md', className }: AvatarProps) {
  const initials = initialsFromName(name);
  const color = colorForName(name);

  return (
    <AvatarPrimitive.Root
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold',
        sizeClasses[size],
        className,
      )}
    >
      {src ? (
        <AvatarPrimitive.Image
          src={src}
          alt={alt ?? name}
          className="h-full w-full object-cover"
        />
      ) : null}
      <AvatarPrimitive.Fallback
        delayMs={src ? 200 : 0}
        className={cn('flex h-full w-full items-center justify-center', color)}
      >
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
