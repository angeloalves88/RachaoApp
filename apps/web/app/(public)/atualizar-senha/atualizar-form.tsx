'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';

import { AuthShell } from '@/components/auth/auth-shell';
import { PasswordStrengthMeter } from '@/components/auth/password-strength';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Spinner } from '@/components/ui/spinner';
import { authErrorMessage, updatePassword } from '@/lib/auth-actions';

const schema = z
  .object({
    senha: z
      .string()
      .min(8, { message: 'Mínimo 8 caracteres' })
      .regex(/\d/, { message: 'Inclua ao menos um número' })
      .regex(/[A-Za-z]/, { message: 'Inclua ao menos uma letra' }),
    confirmacao: z.string(),
  })
  .refine((v) => v.senha === v.confirmacao, {
    path: ['confirmacao'],
    message: 'As senhas não conferem',
  });
type FormValues = z.infer<typeof schema>;

export function AtualizarSenhaForm() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { senha: '', confirmacao: '' },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await updatePassword(values.senha);
      router.replace('/entrada');
      router.refresh();
    } catch (err) {
      setServerError(authErrorMessage(err));
    }
  }

  return (
    <AuthShell>
      <div className="space-y-1 text-center">
        <h1 className="font-display text-3xl font-bold">Definir nova senha</h1>
        <p className="text-sm text-muted">Escolha uma senha segura para sua conta</p>
      </div>

      {serverError ? <Alert variant="destructive">{serverError}</Alert> : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <FormField
          id="senha"
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          label="Nova senha"
          placeholder="Mínimo 8 caracteres"
          error={errors.senha?.message}
          rightSlot={
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded text-muted hover:text-foreground"
              aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
          {...register('senha')}
        />
        <PasswordStrengthMeter value={watch('senha') ?? ''} />

        <FormField
          id="confirmacao"
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          label="Confirmar nova senha"
          placeholder="Repita a senha"
          error={errors.confirmacao?.message}
          {...register('confirmacao')}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null} Salvar nova senha
        </Button>
      </form>
    </AuthShell>
  );
}
