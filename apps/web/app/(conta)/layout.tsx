import Link from 'next/link';
import { headers } from 'next/headers';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { UserMenu } from '@/components/auth/user-menu';
import { Toaster } from '@/components/ui/toaster';
import { defaultAppHomePath } from '@/lib/app-home';
import { requireOnboarded } from '@/lib/auth-server';

/**
 * Layout das paginas de Conta/Configuracoes (Bloco 9 - T31..T34).
 * Compartilhado entre Presidente e Dono do Estadio — sem bottom nav, apenas
 * header com voltar.
 */
export default async function ContaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = await headers();
  const path = hdrs.get('x-rachao-path') ?? '/perfil';
  const session = await requireOnboarded(path);

  const home = defaultAppHomePath(session.usuario!.perfis);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-divider bg-surface/95 backdrop-blur safe-top">
        <div className="container flex h-14 items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href={home}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} />
            </Link>
            <Logo size="sm" />
          </div>
          <UserMenu nome={session.usuario!.nome} email={session.email} />
        </div>
      </header>
      <main className="flex-1 pb-10">{children}</main>
      <Toaster />
    </div>
  );
}
