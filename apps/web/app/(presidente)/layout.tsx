import Link from 'next/link';
import { headers } from 'next/headers';
import { Logo } from '@/components/brand/logo';
import { UserMenu } from '@/components/auth/user-menu';
import { BottomNav } from '@/components/layout/bottom-nav';
import { LiveMatchBar } from '@/components/layout/live-match-bar';
import { NotificationsBell } from '@/components/layout/notifications-bell';
import { Toaster } from '@/components/ui/toaster';
import { requireOnboarded } from '@/lib/auth-server';

export default async function PresidenteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = await headers();
  const path = hdrs.get('x-rachao-path') ?? '/dashboard';
  const session = await requireOnboarded(path);

  return (
    <div className="flex min-h-dvh flex-col" data-theme="presidente">
      <header className="sticky top-0 z-20 border-b border-divider bg-surface/95 backdrop-blur safe-top">
        <div className="container flex h-14 items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center" aria-label="Início">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <UserMenu nome={session.usuario!.nome} email={session.email} />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24">{children}</main>

      <LiveMatchBar />
      <BottomNav />
      <Toaster />
    </div>
  );
}
