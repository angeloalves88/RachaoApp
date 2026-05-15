'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * Registra o service worker `/sw.js` na primeira navegacao. Controlado pela
 * env `NEXT_PUBLIC_PWA_ENABLED=true` para permitir desligar em dev.
 *
 * Tambem mostra um toast quando ha uma nova versao do SW esperando (waiting),
 * com botao "Recarregar".
 */
export function SwRegister() {
  const [enabled] = useState<boolean>(
    () => process.env.NEXT_PUBLIC_PWA_ENABLED === 'true',
  );

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    let cancelled = false;
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        if (cancelled) return;

        function trackUpdate(worker: ServiceWorker | null) {
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              toast.info('Nova versão disponível — clique para recarregar.', {
                duration: 12000,
                action: {
                  label: 'Recarregar',
                  onClick: () => {
                    worker.postMessage('SKIP_WAITING');
                    window.location.reload();
                  },
                },
              });
            }
          });
        }

        if (reg.waiting) trackUpdate(reg.waiting);
        reg.addEventListener('updatefound', () => trackUpdate(reg.installing));
      } catch (err) {
        console.warn('[sw] register falhou', err);
      }
    };

    void register();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return null;
}
