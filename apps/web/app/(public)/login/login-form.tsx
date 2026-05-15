'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';

import { AuthShell } from '@/components/auth/auth-shell';
import { GoogleIcon } from '@/components/brand/google-icon';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Spinner } from '@/components/ui/spinner';
import { authErrorMessage, signInWithEmail, signInWithGoogle } from '@/lib/auth-actions';

const schema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'E-mail inválido' }),
  senha: z.string().min(1, { message: 'Informe sua senha' }),
});
type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/entrada';
  const initialErro = params.get('erro');

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(initialErro);
  const [oauthLoading, setOauthLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', senha: '' },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await signInWithEmail({ email: values.email, senha: values.senha });
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
      await signInWithGoogle(redirect);
    } catch (err) {
      setServerError(authErrorMessage(err));
      setOauthLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="space-y-1 text-center">
        <h1 className="font-display text-3xl font-bold">Bem-vindo de volta</h1>
        <p className="text-sm text-muted">Entre para gerenciar suas peladas</p>
      </div>

      {serverError ? (
        <Alert variant="destructive" className="mt-2">
          {serverError}
        </Alert>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onGoogle}
        disabled={oauthLoading}
      >
        {oauthLoading ? <Spinner /> : <GoogleIcon />} Continuar com Google
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-divider" />
        ou
        <span className="h-px flex-1 bg-divider" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
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
        <FormField
          id="senha"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          label="Senha"
          placeholder="Sua senha"
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

        <div className="flex justify-end">
          <Link
            href="/recuperar-senha"
            className="text-xs text-primary transition-colors hover:text-primary-hover"
          >
            Esqueci minha senha
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null} Entrar
        </Button>
      </form>

      <p className="text-center text-xs text-muted">
        Não tem conta?{' '}
        <Link href="/cadastro" className="font-medium text-primary hover:text-primary-hover">
          Cadastrar grátis
        </Link>
      </p>
    </AuthShell>
  );
}
