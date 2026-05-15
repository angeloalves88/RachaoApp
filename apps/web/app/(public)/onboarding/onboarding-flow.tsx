'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Building2, Check, Trophy } from 'lucide-react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Spinner } from '@/components/ui/spinner';
import { authErrorMessage, submitOnboarding } from '@/lib/auth-actions';
import { cn } from '@/lib/utils';
import type { Perfil } from '@rachao/shared/enums';

const PERFIL_CARDS: Array<{
  id: Perfil;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  bullets: string[];
}> = [
  {
    id: 'presidente',
    title: 'Presidente',
    description: 'Organizo peladas, escalo times e controlo a vaquinha do meu grupo',
    icon: Trophy,
    bullets: ['Gerencio meus Boleiros', 'Agendo e registro partidas', 'Controlo a vaquinha'],
  },
  {
    id: 'dono_estadio',
    title: 'Dono do Estádio',
    description: 'Tenho um campo ou quadra e quero gerenciar minha agenda',
    icon: Building2,
    bullets: ['Cadastro meu espaço', 'Defino horários disponíveis', 'Aprovo partidas no meu campo'],
  },
];

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 2 fields
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [cidade, setCidade] = useState('');
  const [nomeEstadio, setNomeEstadio] = useState('');
  const [cidadeEstadio, setCidadeEstadio] = useState('');

  function togglePerfil(p: Perfil) {
    setPerfis((current) =>
      current.includes(p) ? current.filter((x) => x !== p) : [...current, p],
    );
  }

  async function finalizar(skipExtras = false) {
    if (perfis.length === 0) return;
    setServerError(null);
    setSubmitting(true);
    try {
      const payload = skipExtras
        ? { perfis }
        : {
            perfis,
            nomeGrupo: perfis.includes('presidente') && nomeGrupo ? nomeGrupo : undefined,
            cidade: perfis.includes('presidente') && cidade ? cidade : undefined,
            nomeEstadio:
              perfis.includes('dono_estadio') && nomeEstadio ? nomeEstadio : undefined,
            cidadeEstadio:
              perfis.includes('dono_estadio') && cidadeEstadio ? cidadeEstadio : undefined,
          };
      const res = await submitOnboarding(payload);
      router.replace(res.redirect);
      router.refresh();
    } catch (err) {
      setServerError(authErrorMessage(err));
      setSubmitting(false);
    }
  }

  if (step === 1) {
    return (
      <AuthShell width="md">
        <div className="space-y-1 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-primary">Passo 1 de 2</p>
          <h1 className="font-display text-3xl font-bold">Como você vai usar o RachãoApp?</h1>
          <p className="text-sm text-muted">
            Escolha um ou os dois perfis — você pode mudar depois
          </p>
        </div>

        {serverError ? <Alert variant="destructive">{serverError}</Alert> : null}

        <div className="grid gap-3 md:grid-cols-2">
          {PERFIL_CARDS.map((card) => {
            const selected = perfis.includes(card.id);
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => togglePerfil(card.id)}
                aria-pressed={selected}
                className={cn(
                  'group relative flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition-all',
                  'min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  selected
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-surface-2 hover:bg-surface-offset',
                )}
              >
                {selected ? (
                  <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check size={14} strokeWidth={3} />
                  </span>
                ) : null}
                <Icon
                  className={cn('size-7', selected ? 'text-primary' : 'text-muted')}
                  strokeWidth={1.5}
                />
                <div>
                  <h3 className="font-display text-xl font-bold">{card.title}</h3>
                  <p className="mt-1 text-sm text-muted">{card.description}</p>
                </div>
                <ul className="space-y-1 text-xs text-muted">
                  {card.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-1.5">
                      <Check size={12} className="text-success" strokeWidth={3} />
                      {b}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted">
          Você pode ter os dois perfis ao mesmo tempo
        </p>

        <Button
          type="button"
          className="w-full"
          disabled={perfis.length === 0}
          onClick={() => setStep(2)}
        >
          Continuar
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell width="md">
      <div className="space-y-1 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-primary">Passo 2 de 2</p>
        <h1 className="font-display text-3xl font-bold">Quase lá</h1>
        <p className="text-sm text-muted">Conte um pouco sobre você (opcional)</p>
      </div>

      {serverError ? <Alert variant="destructive">{serverError}</Alert> : null}

      <div className="space-y-4">
        {perfis.includes('presidente') ? (
          <fieldset className="space-y-3 rounded-md border border-border bg-surface-2/40 p-4">
            <legend className="px-1 text-xs uppercase tracking-wider text-primary">
              Como Presidente
            </legend>
            <FormField
              id="nomeGrupo"
              label="Nome do seu grupo de pelada"
              placeholder="Ex: Galera do sábado"
              value={nomeGrupo}
              onChange={(e) => setNomeGrupo(e.target.value)}
            />
            <FormField
              id="cidade"
              label="Cidade onde joga"
              placeholder="Ex: São Paulo"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
            />
          </fieldset>
        ) : null}

        {perfis.includes('dono_estadio') ? (
          <fieldset className="space-y-3 rounded-md border border-border bg-surface-2/40 p-4">
            <legend className="px-1 text-xs uppercase tracking-wider text-primary">
              Como Dono do Estádio
            </legend>
            <FormField
              id="nomeEstadio"
              label="Nome do seu campo/quadra"
              placeholder="Ex: Arena do Bairro"
              value={nomeEstadio}
              onChange={(e) => setNomeEstadio(e.target.value)}
            />
            <FormField
              id="cidadeEstadio"
              label="Cidade"
              placeholder="Ex: Rio de Janeiro"
              value={cidadeEstadio}
              onChange={(e) => setCidadeEstadio(e.target.value)}
            />
          </fieldset>
        ) : null}
      </div>

      <Button type="button" className="w-full" disabled={submitting} onClick={() => finalizar(false)}>
        {submitting ? <Spinner /> : null} Entrar no app
      </Button>
      <button
        type="button"
        className="text-center text-xs text-muted hover:text-foreground"
        onClick={() => finalizar(true)}
        disabled={submitting}
      >
        Preencher depois
      </button>

      <button
        type="button"
        onClick={() => setStep(1)}
        className="text-center text-xs text-primary hover:text-primary-hover"
        disabled={submitting}
      >
        Voltar
      </button>
    </AuthShell>
  );
}
