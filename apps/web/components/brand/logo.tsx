import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const text =
    size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl';
  const dot =
    size === 'sm' ? 'h-6 w-6 text-sm' : size === 'lg' ? 'h-10 w-10 text-base' : 'h-8 w-8 text-sm';

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span
        aria-hidden
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-primary font-bold text-primary-foreground',
          dot,
        )}
      >
        ●
      </span>
      <span className={cn('font-display font-extrabold tracking-tight', text)}>RACHÃO</span>
    </div>
  );
}
