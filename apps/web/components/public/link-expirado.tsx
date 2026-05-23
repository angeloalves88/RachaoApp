import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function LinkExpirado() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#0f1b2d] to-[#0a1018] px-4 text-center text-white">
      <p className="text-xs uppercase tracking-wider text-orange-400">RachãoApp</p>
      <h1 className="mt-2 font-display text-2xl font-bold">Link expirado</h1>
      <p className="mt-2 max-w-sm text-sm text-white/70">
        Este link público expirou 24 horas após o término da partida. Peça um novo link ao
        organizador.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Ir para o RachãoApp</Link>
      </Button>
    </div>
  );
}
