'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CreditCard, LogOut, Settings, User } from 'lucide-react';
import { signOut } from '@/lib/auth-actions';

interface UserMenuProps {
  nome: string;
  email: string;
}

function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export function UserMenu({ nome, email }: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/login');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-offset text-sm font-semibold text-foreground hover:bg-surface-2"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {initials(nome)}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-md border border-border bg-surface-2 shadow-lg"
          >
            <div className="border-b border-border p-3">
              <p className="truncate text-sm font-medium text-foreground">{nome}</p>
              <p className="truncate text-xs text-muted">{email}</p>
            </div>
            <Link
              href="/perfil"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface"
            >
              <User size={16} strokeWidth={1.5} /> Perfil pessoal
            </Link>
            <Link
              href="/planos"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface"
            >
              <CreditCard size={16} strokeWidth={1.5} /> Planos
            </Link>
            <Link
              href="/configuracoes"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface"
            >
              <Settings size={16} strokeWidth={1.5} /> Configurações
            </Link>
            <div className="border-t border-border" />
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface disabled:opacity-50"
            >
              <LogOut size={16} strokeWidth={1.5} /> Sair
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
