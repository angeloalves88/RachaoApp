import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium leading-tight',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-surface-offset text-foreground',
        primary: 'border-transparent bg-primary text-primary-foreground',
        primarySoft: 'border-primary/40 bg-primary-highlight text-primary',
        success: 'border-transparent bg-success-highlight text-success',
        warning: 'border-transparent bg-warning-highlight text-warning',
        destructive: 'border-transparent bg-error-highlight text-destructive',
        info: 'border-transparent bg-info-highlight text-info',
        outline: 'border-border bg-transparent text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { badgeVariants };
