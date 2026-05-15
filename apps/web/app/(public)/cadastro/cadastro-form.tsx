'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';

import { AuthShell } from '@/components/auth/auth-shell';
import { GoogleIcon } from '@/components/brand/google-icon';
import { PasswordStrengthMeter } from '@/components/auth/password-strength';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Spinner } from '@/components/ui/spinner';
import {
  authErrorMessage,
  signInWithGoogle,
  signUpWithEmail,
  syncUsuario,
} from '@/lib/auth-actions';
import { formatCelular, unmaskCelular } from '@/lib/utils';

const schema = z.object({
  nome: z.string().trim().min(2, { message: 'Informe seu nome completo' }),
  email: z.string().trim().toLowerCase().email({ message: 'E-mail inválido' }),
  celular: z
    .string()
    .transform((v) => unmaskCelular(v))
    .refine((v) => v.length === 11, { message: 'Celular deve ter 11 dígitos' }),
  senha: z
    .string()
    .min(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
    .regex(/\d/, { message: 'A senha deve conter ao menos um número' })
    .regex(/[A-Za-z]/, { message: 'A senha deve conter ao menos uma letra' }),
  termos: z.literal(true, {
    errorMap: () => ({ message: 'Você precisa aceitar os termos para continuar' }),
  }),
});
type FormValues = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export function CadastroForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/onboarding';

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: '',
      email: '',
      celular: '',
      senha: '',
      termos: false as unknown as true,
    },
  });

  const senhaValue = watch('senha');

  async function onSubmit(values: FormOutput) {
    setServerError(null);
    try {
      await signUpWithEmail({
        nome: values.nome,
        email: values.email,
        celular: values.celular,
        senha: values.senha,
      });

      // Se o auto-confirm estiver ligado em GoTrue, ja temos session aqui.
      // Sincroniza Usuario no banco e segue para onboarding.
      try {
        await syncUsuario({ nome: values.nome, celular: values.celular });
      } catch {
        // Sem session (signup com email confirmation) — segue para login com aviso.
        router.replace('/login?confirm=1');
        return;
      }

      router.replace(redirect);
      router.refresh();
    } catch (err) {
      setServerError(authErrorMessage(err));
    }
  }

  async function onGoogle() {
    setServerError(null);
    setOauthLoading(true);
    try {
      await signInWithGoogle('/onboarding');
    } catch (err) {
      setServerError(authErrorMessage(err));
      setOauthLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="space-y-1 text-center">
        <h1 className="font-display text-3xl font-bold">Crie sua conta</h1>
        <p className="text-sm text-muted">Em menos de 1 minuto você está jogando</p>
      </div>

      {serverError ? <Alert variant="destructive">{serverError}</Alert> : null}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onGoogle}
        disabled={oauthLoading}
      >
        {oauthLoading ? <Spinner /> : <GoogleIcon />} Cadastrar com Google
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-divider" />
        ou
        <span className="h-px flex-1 bg-divider" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <FormField
          id="nome"
          type="text"
          autoComplete="name"
          label="Nome completo"
          placeholder="Como te chamam"
          error={errors.nome?.message}
          {...register('nome')}
        />

        <FormField
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          label="E-mail"
          placeholder="seu@email.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Controller
          control={control}
          name="celular"
          render={({ field }) => (
            <FormField
              id="celular"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              label="Celular (WhatsApp)"
              placeholder="(11) 99999-9999"
              hint="Usado para envio de convites aos Boleiros"
              error={errors.celular?.message}
              value={formatCelular(field.value)}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
            />
          )}
        />

        <div className="space-y-2">
          <FormField
            id="senha"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            label="Senha"
            placeholder="Mínimo 8 caracteres"
            error={errors.senha?.message}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded text-muted hover:text-foreground"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
            {...register('senha')}
          />
          <PasswordStrengthMeter value={senhaValue ?? ''} />
        </div>

        <Controller
          control={control}
          name="termos"
          render={({ field }) => (
            <div className="space-y-1">
              <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-sm">
                <Checkbox
                  id="termos"
                  checked={!!field.value}
                  onCheckedChange={(checked) => field.onChange(!!checked)}
                />
                <span className="text-muted">
                  Aceito os{' '}
                  <Link href="/termos" className="text-primary hover:text-primary-hover">
                    Termos de Uso
                  </Link>{' '}
                  e a{' '}
                  <Link href="/privacidade" className="text-primary hover:text-primary-hover">
                    Política de Privacidade
                  </Link>
                </span>
              </label>
              {errors.termos?.message ? (
                <p className="text-xs text-destructive">{errors.termos.message}</p>
              ) : null}
            </div>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null} Criar conta
        </Button>
      </form>

      <p className="text-center text-xs text-muted">
        Já tem conta?{' '}
        <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
