import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Exibe o texto ao lado do ícone (padrão: sim). */
  showText?: boolean;
}

const config = {
  sm: { px: 28, text: 'text-[0.95rem]', gap: 'gap-1.5' },
  md: { px: 36, text: 'text-lg', gap: 'gap-2' },
  lg: { px: 44, text: 'text-xl', gap: 'gap-2.5' },
} as const;

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const s = config[size];

  return (
    <div className={cn('inline-flex items-center', s.gap, className)}>
      <Image
        src="/brand/logo-rachaoapp.png"
        alt=""
        width={s.px}
        height={s.px}
        className="shrink-0 object-contain"
        priority={size !== 'sm'}
      />
      {showText ? (
        <span
          className={cn(
            'font-brand font-semibold leading-none tracking-tight text-foreground',
            s.text,
          )}
        >
          Rachão
          <span className="font-normal text-muted"> App</span>
        </span>
      ) : null}
    </div>
  );
}
