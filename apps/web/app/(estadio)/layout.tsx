import Link from 'next/link';
import { headers } from 'next/headers';
import { Logo } from '@/components/brand/logo';
import { UserMenu } from '@/components/auth/user-menu';
import { EstadioBottomNav } from '@/components/estadio/bottom-nav';
import { Toaster } from '@/components/ui/toaster';
import { requireOnboarded } from '@/lib/auth-server';

export default async function EstadioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = await headers();
  const path = hdrs.get('x-rachao-path') ?? '/estadio/dashboard';
  const session = await requireOnboarded(path);

  return (
    <div className="flex min-h-dvh flex-col" data-theme="estadio">
      <header className="border-b border-divider bg-surface">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/estadio/dashboard" className="flex items-center">
            <Logo size="sm" />
          </Link>
          <UserMenu nome={session.usuario!.nome} email={session.email} />
        </div>
      </header>
      <main className="flex-1 pb-24">{children}</main>
      <EstadioBottomNav />
      <Toaster />
    </div>
  );
}
