import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import { cn } from '@/lib/utils';

interface AuthShellProps {
  children: ReactNode;
  /// Width do card. Default 400px (telas de login/cadastro).
  width?: 'sm' | 'md';
}

/**
 * Container das telas de auth. Aplica:
 * - fundo Azul Noite com gradiente laranja sutil
 * - padrao de losangos sutil (svg pattern via mask)
 * - card centralizado com logo no topo
 */
export function AuthShell({ children, width = 'sm' }: AuthShellProps) {
  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_15%,#e8530a25,transparent_55%),radial-gradient(circle_at_10%_90%,#1c2d4555,transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04] [background-image:repeating-linear-gradient(45deg,_#ffffff_0_1px,_transparent_1px_24px),_repeating-linear-gradient(-45deg,_#ffffff_0_1px,_transparent_1px_24px)]"
      />

      <div
        className={cn(
          'flex w-full flex-col gap-4 rounded-xl border border-border bg-surface/80 p-6 shadow-lg backdrop-blur-sm',
          width === 'sm' ? 'max-w-[400px]' : 'max-w-md',
        )}
      >
        <div className="flex justify-center">
          <Logo size="md" />
        </div>
        {children}
      </div>
    </main>
  );
}
