'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Play } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { iniciarPartida } from '@/lib/aovivo-actions';

interface Props {
  partidaId: string;
  temEscalacao: boolean;
}

export function IniciarPartidaCard({ partidaId, temEscalacao }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleIniciar() {
    setLoading(true);
    try {
      await iniciarPartida(partidaId);
      toast.success('Partida iniciada!');
      router.push(`/partidas/${partidaId}/ao-vivo`);
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível iniciar a partida.');
      setLoading(false);
    }
  }

  if (!temEscalacao) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-medium text-foreground">Pronto para começar?</p>
        <p className="mt-1 text-sm text-muted">
          Salve a escalação dos times antes de iniciar a partida.
        </p>
        <Button asChild variant="secondary" size="sm" className="mt-3">
          <Link href={`/partidas/${partidaId}/escalacao`}>Montar escalação</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-primary-highlight p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">Tudo pronto!</p>
        <p className="text-sm text-muted">Inicie para registrar gols, cartões e o cronômetro.</p>
      </div>
      <Button type="button" onClick={handleIniciar} disabled={loading}>
        <Play className="h-4 w-4" />
        Iniciar partida
      </Button>
    </div>
  );
}
