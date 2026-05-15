import Link from 'next/link';
import { ArrowRight, Calendar, Trophy, Wallet } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { defaultAppHomePath } from '@/lib/app-home';
import { getSession } from '@/lib/auth-server';

export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="relative isolate min-h-dvh">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh] bg-[radial-gradient(circle_at_70%_-10%,#e8530a30,transparent_60%),radial-gradient(circle_at_0%_30%,#1c2d4540,transparent_50%)]"
      />

      <header className="container flex items-center justify-between py-6">
        <Logo />
        <nav className="flex items-center gap-3 text-sm">
          {session?.usuario ? (
            <Link href={defaultAppHomePath(session.usuario.perfis)} className="btn-primary !min-h-0 !px-4 !py-2">
              Ir para o app
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-muted hover:text-foreground transition-colors">
                Entrar
              </Link>
              <Link href="/cadastro" className="btn-primary !min-h-0 !px-4 !py-2">
                Cadastrar grátis
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="container pb-16 pt-12 md:pt-20">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">
          Pelada noturna sob holofotes
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold leading-[0.95] md:text-6xl">
          Sua pelada organizada do convite à vaquinha.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted">
          Crie grupos, agende partidas, escale times, registre gols ao vivo e cobre a galera no
          PIX. Tudo em um app feito pra Presidente, Boleiro e Dono do Estádio.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/cadastro" className="btn-primary">
            Começar agora <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            Já tenho conta
          </Link>
        </div>
      </section>

      <section className="container grid gap-4 pb-16 md:grid-cols-3">
        {[
          {
            icon: Calendar,
            title: 'Agendamento simples',
            desc: 'Wizard de 6 passos para criar a partida com regras, vagas e local.',
          },
          {
            icon: Trophy,
            title: 'Partida ao vivo',
            desc: 'Placar, cronômetro e eventos — funciona até offline durante o jogo.',
          },
          {
            icon: Wallet,
            title: 'Vaquinha sem dor',
            desc: 'Controle pagamentos por partida ou mensalidade direto pelo PIX.',
          },
        ].map(({ icon: Icon, title, desc }) => (
          <article
            key={title}
            className="rounded-lg border border-border bg-surface p-5 shadow-sm"
          >
            <Icon className="size-6 text-primary" strokeWidth={1.5} />
            <h3 className="mt-3 font-sans text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{desc}</p>
          </article>
        ))}
      </section>

      <footer className="border-t border-divider">
        <div className="container flex flex-col items-start justify-between gap-2 py-6 text-xs text-muted md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} RachãoApp. Todos os direitos reservados.</span>
          <span className="font-display tracking-widest">v0.1 · DEV</span>
        </div>
      </footer>
    </main>
  );
}
