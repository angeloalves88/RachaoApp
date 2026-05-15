'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import {
  archiveGrupo,
  createGrupo,
  removeCoPresidente,
  updateGrupo,
  addCoPresidente,
} from '@/lib/grupos-actions';
import { NIVEIS_GRUPO, type NivelGrupo } from '@rachao/shared/enums';
import { ESPORTES_GRUPO, type EsporteGrupo } from '@rachao/shared/zod';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import type { GrupoDetalhe } from '@/lib/types';

const ESPORTE_LABEL: Record<EsporteGrupo, string> = {
  futebol: 'Futebol',
  futsal: 'Futsal',
  society: 'Society',
  areia: 'Areia',
};
const NIVEL_LABEL: Record<NivelGrupo, string> = {
  casual: 'Casual',
  intermediario: 'Intermediário',
  competitivo: 'Competitivo',
};

const formSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, { message: 'Informe um nome para o grupo' })
    .max(40, { message: 'Máximo de 40 caracteres' }),
  esporte: z.enum(ESPORTES_GRUPO),
  nivel: z.enum(NIVEIS_GRUPO),
  descricao: z
    .string()
    .trim()
    .max(200, { message: 'Máximo de 200 caracteres' })
    .optional(),
  fotoUrl: z.string().url({ message: 'URL inválida' }).optional().or(z.literal('')),
});
type FormValues = z.infer<typeof formSchema>;

interface GrupoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se passado, modo edicao. */
  grupo?: GrupoDetalhe | null;
}

export function GrupoFormDialog({ open, onOpenChange, grupo }: GrupoFormDialogProps) {
  const router = useRouter();
  const isEdit = !!grupo;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      esporte: 'futebol',
      nivel: 'casual',
      descricao: '',
      fotoUrl: '',
    },
  });

  // Sincroniza valores quando reabrir/trocar de grupo
  useEffect(() => {
    if (!open) return;
    reset({
      nome: grupo?.nome ?? '',
      esporte: (grupo?.esporte as EsporteGrupo) ?? 'futebol',
      nivel: (grupo?.nivel as NivelGrupo) ?? 'casual',
      descricao: grupo?.descricao ?? '',
      fotoUrl: grupo?.fotoUrl ?? '',
    });
  }, [open, grupo, reset]);

  const nomeValue = watch('nome');
  const descricaoValue = watch('descricao') ?? '';

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        ...values,
        descricao: values.descricao || null,
        fotoUrl: values.fotoUrl ? values.fotoUrl : null,
      };
      if (isEdit && grupo) {
        await updateGrupo(grupo.id, payload);
        toast.success('Grupo atualizado.');
      } else {
        const { grupo: created } = await createGrupo(payload);
        toast.success('Grupo criado!');
        router.push(`/grupos/${created.id}`);
      }
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? typeof (err.body as { message?: string })?.message === 'string'
            ? (err.body as { message: string }).message
            : 'Não foi possível salvar.'
          : 'Não foi possível salvar.';
      toast.error(msg);
    }
  }

  async function handleDelete() {
    if (!grupo) return;
    if (!window.confirm('Arquivar este grupo? Você pode restaurá-lo depois.')) return;
    try {
      await archiveGrupo(grupo.id);
      toast.success('Grupo arquivado.');
      onOpenChange(false);
      router.push('/grupos');
      router.refresh();
    } catch {
      toast.error('Não foi possível arquivar.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Grupo' : 'Novo Grupo'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar name={nomeValue || 'Grupo'} src={watch('fotoUrl') || undefined} size="xl" />
            <div className="flex-1">
              <Field
                label="URL da foto (opcional)"
                error={errors.fotoUrl?.message}
                hint="Cole o link de uma imagem (PNG/JPG)."
              >
                <Input type="url" autoComplete="off" {...register('fotoUrl')} />
              </Field>
            </div>
          </div>

          <Field
            label="Nome do grupo"
            error={errors.nome?.message}
            hint={`${nomeValue?.length ?? 0}/40`}
          >
            <Input
              placeholder="Ex.: Rachão das quartas"
              maxLength={40}
              autoFocus={!isEdit}
              {...register('nome')}
            />
          </Field>

          <Field label="Esporte">
            <Controller
              control={control}
              name="esporte"
              render={({ field }) => (
                <Segmented<EsporteGrupo>
                  value={field.value}
                  onChange={field.onChange}
                  options={ESPORTES_GRUPO.map((e) => ({ value: e, label: ESPORTE_LABEL[e] }))}
                  size="sm"
                />
              )}
            />
          </Field>

          <Field label="Nível">
            <Controller
              control={control}
              name="nivel"
              render={({ field }) => (
                <Segmented<NivelGrupo>
                  value={field.value}
                  onChange={field.onChange}
                  options={NIVEIS_GRUPO.map((n) => ({ value: n, label: NIVEL_LABEL[n] }))}
                />
              )}
            />
          </Field>

          <Field
            label="Descrição"
            error={errors.descricao?.message}
            hint={`${descricaoValue.length}/200`}
          >
            <Textarea
              maxLength={200}
              placeholder="Ex.: Rachão das quartas no Parque..."
              {...register('descricao')}
            />
          </Field>

          {isEdit && grupo ? (
            <CoPresidentesSection grupo={grupo} />
          ) : null}

          <div className="flex flex-col gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting ? <Spinner size={14} /> : null}
              {isEdit ? 'Salvar alterações' : 'Criar grupo'}
            </Button>
            {isEdit ? (
              <Button type="button" variant="ghost" onClick={handleDelete} className="text-destructive">
                <Trash2 size={16} /> Arquivar grupo
              </Button>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CoPresidentesSection({ grupo }: { grupo: GrupoDetalhe }) {
  const router = useRouter();
  const [presidentes, setPresidentes] = useState(grupo.presidentes);
  const [contato, setContato] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    const trimmed = contato.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const isEmail = trimmed.includes('@');
      const { copresidente } = await addCoPresidente(grupo.id, {
        email: isEmail ? trimmed : undefined,
        celular: isEmail ? undefined : trimmed.replace(/\D/g, ''),
      });
      toast.success(`${copresidente.nome} adicionado.`);
      setContato('');
      setPresidentes((prev) => [
        ...prev,
        {
          grupoId: grupo.id,
          usuarioId: copresidente.id,
          papel: 'copresidente',
          criadoEm: new Date().toISOString(),
          usuario: {
            id: copresidente.id,
            nome: copresidente.nome,
            email: copresidente.email,
            avatarUrl: null,
          },
        },
      ]);
      router.refresh();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 404) toast.error('Esse usuário ainda não tem conta no app.');
      else toast.error('Não foi possível adicionar.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(usuarioId: string) {
    if (!window.confirm('Remover este co-presidente?')) return;
    try {
      await removeCoPresidente(grupo.id, usuarioId);
      setPresidentes((prev) => prev.filter((p) => p.usuarioId !== usuarioId));
      toast.success('Co-presidente removido.');
      router.refresh();
    } catch {
      toast.error('Não foi possível remover.');
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface-offset/50 p-4">
      <header>
        <h3 className="font-display text-base font-bold">Co-presidentes</h3>
        <p className="text-xs text-muted">
          Co-presidentes têm as mesmas permissões que você neste grupo.
        </p>
      </header>

      <ul className="space-y-2">
        {presidentes.map((p) => (
          <li key={p.usuarioId} className="flex items-center gap-3">
            <Avatar name={p.usuario.nome} src={p.usuario.avatarUrl ?? undefined} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.usuario.nome}</p>
              <p className="truncate text-xs text-muted">{p.usuario.email}</p>
            </div>
            {p.papel === 'criador' ? (
              <span className="text-xs text-muted">Criador</span>
            ) : (
              <button
                type="button"
                onClick={() => handleRemove(p.usuarioId)}
                aria-label="Remover co-presidente"
                className="rounded-md p-1.5 text-muted hover:bg-error-highlight hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={contato}
          onChange={(e) => setContato(e.target.value)}
          placeholder="E-mail ou celular do co-presidente"
        />
        <Button type="button" variant="outline" onClick={handleAdd} disabled={!contato || loading}>
          {loading ? <Spinner size={14} /> : 'Adicionar'}
        </Button>
      </div>
    </section>
  );
}
