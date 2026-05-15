'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Home, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Início', icon: Home },
  { href: '/grupos', label: 'Grupos', icon: Users },
  { href: '/partidas', label: 'Partidas', icon: CalendarDays },
  { href: '/configuracoes', label: 'Conta', icon: Settings },
] as const;

/**
 * Bottom Navigation mobile. Marca o item ativo conforme o pathname atual.
 * O matching e por prefixo: /grupos/123 acende "Grupos".
 */
export function BottomNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-surface safe-bottom md:hidden"
    >
      <ul className="flex items-center justify-around py-1 text-[11px]">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-2',
                  active ? 'text-primary' : 'text-muted hover:text-foreground',
                )}
              >
                <Icon size={20} strokeWidth={active ? 2 : 1.5} />
                <span className="leading-tight">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
