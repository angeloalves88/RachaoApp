'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { getContagemNaoLidas } from '@/lib/notificacoes-actions';

/**
 * Sino de notificacoes no header. Faz polling leve a cada 60s para manter o
 * badge atualizado entre interacoes (evita websockets na V1).
 */
export function NotificationsBell() {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function refresh() {
      try {
        const res = await getContagemNaoLidas();
        if (mounted) setCount(res.naoLidas);
      } catch {
        // ignora; ainda fica visivel sem badge
      }
    }

    void refresh();
    timer = setInterval(() => void refresh(), 60_000);

    function onFocus() {
      void refresh();
    }
    window.addEventListener('focus', onFocus);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const visivel = Math.min(count, 99);

  return (
    <Link
      href="/notificacoes"
      aria-label={count > 0 ? `${count} notificacoes nao lidas` : 'Notificacoes'}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-offset hover:text-foreground"
    >
      <Bell size={18} strokeWidth={1.5} />
      {count > 0 ? (
        <span
          className="absolute right-1 top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
          aria-hidden
        >
          {visivel === 99 && count > 99 ? '99+' : visivel}
        </span>
      ) : null}
    </Link>
  );
}
