'use client';

import Link from 'next/link';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface FabProps {
  href?: string;
  onClick?: () => void;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Floating Action Button mobile. Posicionado acima da bottom-nav.
 * Aparece apenas em telas md ou menores (mobile-first).
 */
export function Fab({ href, onClick, label, icon, className }: FabProps) {
  const classes = cn(
    'fixed bottom-20 right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary-hover active:bg-primary-active md:hidden',
    className,
  );

  if (href) {
    return (
      <Link href={href} aria-label={label} className={classes}>
        {icon ?? <span className="text-2xl leading-none">+</span>}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={onClick} className={classes}>
      {icon ?? <span className="text-2xl leading-none">+</span>}
    </button>
  );
}
