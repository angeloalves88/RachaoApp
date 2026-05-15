'use client';

import { Toaster as SonnerToaster } from 'sonner';

/**
 * Toaster global. Importado em (presidente)/layout.tsx (e demais layouts privados).
 * Utiliza tema custom escuro do RachaoApp.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      theme="dark"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'bg-surface-2 border border-border text-foreground shadow-lg rounded-md font-sans',
          title: 'font-medium',
          description: 'text-muted text-sm',
        },
      }}
    />
  );
}
