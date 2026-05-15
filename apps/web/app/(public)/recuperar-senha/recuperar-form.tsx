'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail } from 'lucide-react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Spinner } from '@/components/ui/spinner';
import { authErrorMessage, requestPasswordReset } from '@/lib/auth-actions';

const schema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'E-mail inválido' }),
});
type FormValues = z.infer<typeof schema>;

const RESEND_COOLDOWN_S = 60;

function maskEmail(email: string): string {
  const [user = '', domain = ''] = email.split('@');
  if (!user || !domain) return email;
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}${'•'.repeat(Math.max(1, user.length - visible.length))}@${domain}`;
}

export function RecuperarSenhaForm() {
  const [step, setStep] = useState<'request' | 'sent'>('request');
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string>('');
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function send(email: string) {
    setServerError(null);
    try {
      await requestPasswordReset(email);
      setSentEmail(email);
      setStep('sent');
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      setServerError(authErrorMessage(err));
    }
  }

  if (step === 'sent') {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Mail size={28} strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-2xl font-bold">Verifique seu e-mail</h1>
          <p className="text-sm text-muted">
            Enviamos um link para <strong className="text-foreground">{maskEmail(sentEmail)}</strong>.
            Válido por 30 minutos.
          </p>
        </div>

        {serverError ? <Alert variant="destructive">{serverError}</Alert> : null}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={cooldown > 0}
          onClick={() => send(sentEmail)}
        >
          {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar e-mail'}
        </Button>

        <Link href="/login" className="text-center text-xs text-primary hover:text-primary-hover">
          Voltar para o login
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="space-y-1 text-center">
        <h1 className="font-display text-3xl font-bold">Esqueceu a senha?</h1>
        <p className="text-sm text-muted">
          Informe seu e-mail e enviaremos um link para redefinição
        </p>
      </div>

      {serverError ? <Alert variant="destructive">{serverError}</Alert> : null}

      <form onSubmit={handleSubmit((v) => send(v.email))} className="space-y-3" noValidate>
        <FormField
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          label="E-mail"
          placeholder="seu@email.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null} Enviar link
        </Button>
      </form>

      <Link href="/login" className="text-center text-xs text-primary hover:text-primary-hover">
        Voltar para o login
      </Link>
    </AuthShell>
  );
}
