import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Props {
  mensagem: string;
}

export function EntradaErro({ mensagem }: Props) {
  return (
    <main className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-10 text-center">
      <p className="font-display text-xl font-bold">Não foi possível continuar</p>
      <p className="max-w-md text-sm text-muted">{mensagem}</p>
      <ol className="max-w-md list-inside list-decimal text-left text-sm text-muted">
        <li>Confirme que a API está rodando: <code className="text-foreground">pnpm dev:api</code></li>
        <li>
          No <code className="text-foreground">apps/web/.env.local</code>, use{' '}
          <code className="text-foreground">NEXT_PUBLIC_API_URL=http://127.0.0.1:3333</code>
        </li>
        <li>Reinicie o Next após alterar o `.env.local`</li>
      </ol>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/entrada">
          <Button>Tentar novamente</Button>
        </Link>
        <Link href="/login">
          <Button variant="outline">Voltar ao login</Button>
        </Link>
      </div>
    </main>
  );
}
