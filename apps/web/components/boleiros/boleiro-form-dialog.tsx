'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Search, Trash2 } from 'lucide-react';
import { POSICOES, type Posicao } from '@rachao/shared/enums';
import { ApiError } from '@/lib/api';
import {
  archiveBoleiro,
  createBoleiro,
  lookupBoleiroPorCelular,
  updateBoleiro,
} from '@/lib/grupos-actions';
import { lookupConvidadoPorCelular } from '@/lib/convidados-actions';
import { formatCelular, unmaskCelular } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { Spinner } from '@/components/ui/spinner';
import type { BoleiroListItem } from '@/lib/types';

const formSchema = z
  .object({
    nome: z.string().trim().min(2, { message: 'Informe o nome completo' }).max(80),
    apelido: z.string().trim().max(40).optional(),
    posicao: z.enum(POSICOES).optional(),
    celular: z
      .string()
      .transform((v) => unmaskCelular(v))
      .refine((v) => v === '' || v.length === 11, {
        message: 'Celular deve ter 11 dígitos',
      }),
    email: z.string().trim().toLowerCase().email({ message: 'E-mail inválido' }).or(z.literal('')),
  })
  .refine((d) => d.celular.length === 11 || d.email !== '', {
    message: 'Informe WhatsApp ou e-mail para poder enviar convites',
    path: ['celular'],
  });
type FormValues = z.infer<typeof formSchema>;

interface BoleiroFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grupoId: string;
  /** Quando passado, modo edicao. */
  boleiro?: BoleiroListItem | null;
  onSaved?: (b: BoleiroListItem) => void;
  onArchived?: (id: string) => void;
}

export function BoleiroFormDialog({
  open,
  onOpenChange,
  grupoId,
  boleiro,
  onSaved,
  onArchived,
}: BoleiroFormDialogProps) {
  const isEdit = !!boleiro;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: '', apelido: '', celular: '', email: '' },
  });

  /**
   * Lookup celular-first (T12 v1.2): comeca em "busca", quando encontra um
   * boleiro existente no grupo bloqueia novo cadastro, quando encontra um
   * convidado avulso global usa o cadastro como semente, e caso contrario
   * abre o formulario completo com o celular preenchido.
   */
  type Step = 'busca' | 'form';
  const [step, setStep] = useState<Step>(isEdit ? 'form' : 'busca');
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [hitBoleiro, setHitBoleiro] = useState<BoleiroListItem | null>(null);
  const [hitConvidado, setHitConvidado] = useState<{
    nome: string;
    apelido: string | null;
    posicao: 'GOL' | 'ZAG' | 'MEI' | 'ATA' | null;
    totalPartidasComoConvidado: number;
  } | null>(null);
  const [searchErro, setSearchErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Celular vindo da API pode estar no formato "email:foo@bar" quando o
    // boleiro foi criado apenas com email — nao mostramos isso no input.
    const celularValido =
      boleiro && boleiro.celular && /^\d{11}$/.test(boleiro.celular)
        ? formatCelular(boleiro.celular)
        : '';
    reset({
      nome: boleiro?.nome ?? '',
      apelido: boleiro?.apelido ?? '',
      posicao: (boleiro?.posicao as Posicao | undefined) ?? undefined,
      celular: celularValido,
      email: boleiro?.email ?? '',
    });
    setStep(isEdit ? 'form' : 'busca');
    setSearch('');
    setHitBoleiro(null);
    setHitConvidado(null);
    setSearchErro(null);
  }, [open, boleiro, reset, isEdit]);

  async function buscarPorCelular() {
    const cel = unmaskCelular(search);
    if (cel.length !== 11) {
      setSearchErro('Informe 11 dígitos do WhatsApp');
      return;
    }
    setSearching(true);
    setSearchErro(null);
    try {
      const [b, c] = await Promise.all([
        lookupBoleiroPorCelular(grupoId, cel),
        lookupConvidadoPorCelular(cel),
      ]);
      if (b.encontrado && b.boleiro) {
        setHitBoleiro(b.boleiro);
        setHitConvidado(null);
        return;
      }
      setHitBoleiro(null);
      if (c.convidado) {
        setHitConvidado({
          nome: c.convidado.nome,
          apelido: c.convidado.apelido,
          posicao: c.convidado.posicao,
          totalPartidasComoConvidado: c.totalPartidasComoConvidado,
        });
      } else {
        setHitConvidado(null);
      }
      // Pre-preenche celular no formulario.
      setValue('celular', formatCelular(cel));
    } catch {
      setSearchErro('Falha ao buscar cadastro');
    } finally {
      setSearching(false);
    }
  }

  function abrirFormularioVazio() {
    setStep('form');
  }

  function usarConvidadoComoSemente() {
    if (!hitConvidado) return;
    setValue('nome', hitConvidado.nome);
    if (hitConvidado.posicao) setValue('posicao', hitConvidado.posicao as Posicao);
    setStep('form');
  }

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        nome: values.nome,
        apelido: values.apelido || null,
        posicao: values.posicao ?? null,
        celular: values.celular,
        email: values.email || null,
      };
      if (isEdit && boleiro) {
        const { boleiro: updated } = await updateBoleiro(grupoId, boleiro.id, payload);
        toast.success('Boleiro atualizado.');
        onSaved?.(updated);
      } else {
        const { boleiro: created } = await createBoleiro(grupoId, payload);
        toast.success('Boleiro adicionado.');
        onSaved?.(created);
      }
      onOpenChange(false);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 409) toast.error('Já existe um boleiro com este contato no grupo.');
      else toast.error('Não foi possível salvar.');
    }
  }

  async function handleArchive() {
    if (!boleiro) return;
    if (!window.confirm('Arquivar este boleiro? Você pode restaurá-lo depois.')) return;
    try {
      await archiveBoleiro(grupoId, boleiro.id);
      toast.success('Boleiro arquivado.');
      onArchived?.(boleiro.id);
      onOpenChange(false);
    } catch {
      toast.error('Não foi possível arquivar.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Boleiro' : 'Novo Boleiro'}</DialogTitle>
        </DialogHeader>

        {!isEdit && step === 'busca' ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Comece pelo WhatsApp do boleiro. Buscamos primeiro se já existe no grupo ou se já
              jogou como convidado avulso.
            </p>

            <Field label="WhatsApp" error={searchErro ?? undefined}>
              <div className="flex gap-2">
                <Input
                  inputMode="numeric"
                  placeholder="(11) 9XXXX-XXXX"
                  value={search}
                  onChange={(e) => {
                    setSearch(formatCelular(e.target.value));
                    setSearchErro(null);
                    setHitBoleiro(null);
                    setHitConvidado(null);
                  }}
                  autoFocus
                />
                <Button
                  type="button"
                  onClick={buscarPorCelular}
                  disabled={searching || unmaskCelular(search).length !== 11}
                >
                  {searching ? <Spinner size={14} /> : <Search size={16} />}
                  Buscar
                </Button>
              </div>
            </Field>

            {hitBoleiro ? (
              <div className="rounded-md border border-warning/40 bg-warning-highlight p-3 text-sm">
                <div className="flex items-start gap-3">
                  <Avatar name={hitBoleiro.nome} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">Já existe boleiro com este contato no grupo</p>
                    <p className="truncate text-xs text-muted">{hitBoleiro.nome}</p>
                    {hitBoleiro.apelido ? (
                      <p className="text-xs italic text-muted">&ldquo;{hitBoleiro.apelido}&rdquo;</p>
                    ) : null}
                    {hitBoleiro.posicao ? (
                      <Badge variant="primarySoft" className="mt-1">
                        {hitBoleiro.posicao}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 text-xs">
                  Use a lista de boleiros para editar este cadastro.
                </p>
              </div>
            ) : null}

            {!hitBoleiro && hitConvidado ? (
              <div className="rounded-md border border-info/30 bg-info-highlight p-3 text-sm">
                <div className="flex items-start gap-3">
                  <Avatar name={hitConvidado.nome} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">Já jogou aqui como convidado</p>
                    <p className="truncate text-xs text-muted">{hitConvidado.nome}</p>
                    <p className="text-xs text-muted">
                      {hitConvidado.totalPartidasComoConvidado}{' '}
                      {hitConvidado.totalPartidasComoConvidado === 1 ? 'partida' : 'partidas'} como
                      convidado avulso
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={usarConvidadoComoSemente}>
                    Cadastrar como fixo no grupo
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={abrirFormularioVazio}>
                    Cadastrar outra pessoa
                  </Button>
                </div>
              </div>
            ) : null}

            {!hitBoleiro && !hitConvidado && unmaskCelular(search).length === 11 && !searching ? (
              <Button type="button" variant="outline" onClick={abrirFormularioVazio} className="w-full">
                Não encontrado — cadastrar novo
              </Button>
            ) : null}
          </div>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Nome completo" error={errors.nome?.message}>
            <Input
              placeholder="Ex.: João da Silva"
              maxLength={80}
              autoFocus
              {...register('nome')}
            />
          </Field>

          <Field label="Apelido (opcional)" error={errors.apelido?.message}>
            <Input
              placeholder="Ex.: Ronaldinho, Jacaré, Baixinho"
              maxLength={40}
              {...register('apelido')}
            />
          </Field>

          <Field label="Posição preferida">
            <Controller
              control={control}
              name="posicao"
              render={({ field }) => (
                <Segmented<Posicao>
                  value={field.value ?? ('GOL' as Posicao)}
                  onChange={field.onChange}
                  options={POSICOES.map((p) => ({ value: p, label: p }))}
                  size="sm"
                />
              )}
            />
          </Field>

          <Controller
            control={control}
            name="celular"
            render={({ field }) => (
              <Field
                label="WhatsApp"
                error={errors.celular?.message}
                hint="Usado para enviar convites de partida"
              >
                <Input
                  inputMode="numeric"
                  placeholder="(11) 9XXXX-XXXX"
                  value={field.value}
                  onChange={(e) => field.onChange(formatCelular(e.target.value))}
                />
              </Field>
            )}
          />

          <Field
            label="E-mail (opcional)"
            error={errors.email?.message}
            hint="Alternativa ao WhatsApp para convites"
          >
            <Input type="email" autoComplete="email" {...register('email')} />
          </Field>

          <p className="text-xs text-muted">
            Ao menos WhatsApp ou e-mail é obrigatório para enviar convites.
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner size={14} /> : null}
              {isEdit ? 'Salvar boleiro' : 'Adicionar boleiro'}
            </Button>
            {isEdit ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleArchive}
                className="text-destructive"
              >
                <Trash2 size={16} /> Remover do grupo
              </Button>
            ) : null}
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Re-export para conveniencia. */
export { POSICOES };
