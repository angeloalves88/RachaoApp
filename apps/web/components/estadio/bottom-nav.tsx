'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Home, MapPin, Mail, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITENS = [
  { href: '/estadio/dashboard', label: 'Início', icon: Home },
  { href: '/estadio/perfil', label: 'Estádio', icon: MapPin },
  { href: '/estadio/agenda', label: 'Agenda', icon: Calendar },
  { href: '/estadio/solicitacoes', label: 'Solicitações', icon: Mail },
  { href: '/configuracoes', label: 'Conta', icon: Settings },
] as const;

export function EstadioBottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-surface/95 backdrop-blur">
      <ul className="container flex items-stretch justify-around">
        {ITENS.map((it) => {
          const ativo = path === it.href || path.startsWith(`${it.href}/`);
          const Icon = it.icon;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={ativo ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-2 text-xs',
                  ativo ? 'text-primary' : 'text-muted hover:text-foreground',
                )}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
