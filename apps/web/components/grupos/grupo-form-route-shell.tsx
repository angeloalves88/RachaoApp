'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GrupoFormDialog } from './grupo-form-dialog';
import type { GrupoDetalhe } from '@/lib/types';

interface Props {
  grupo?: GrupoDetalhe | null;
}

/**
 * Wrapper para usar o GrupoFormDialog em rotas dedicadas (/grupos/novo,
 * /grupos/[id]/editar). Mantem o dialog aberto e, ao fechar, navega de volta.
 */
export function GrupoFormRouteShell({ grupo }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) {
      // Pequeno delay para a animacao de close terminar antes de navegar
      const id = setTimeout(() => {
        if (grupo) router.push(`/grupos/${grupo.id}`);
        else router.push('/grupos');
      }, 120);
      return () => clearTimeout(id);
    }
  }, [open, router, grupo]);

  return <GrupoFormDialog open={open} onOpenChange={setOpen} grupo={grupo ?? undefined} />;
}
