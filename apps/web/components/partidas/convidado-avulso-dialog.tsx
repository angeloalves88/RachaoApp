'use client';

import { useEffect, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { POSICOES } from '@rachao/shared/enums';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Spinner } from '@/components/ui/spinner';
import { lookupConvidadoPorCelular } from '@/lib/convidados-actions';
import { addConvidadoAvulso } from '@/lib/partidas-actions';
import { formatCelular, unmaskCelular } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  partidaId: string;
  disabled?: boolean;
  onAdded?: () => void;
  trigger?: React.ReactNode;
}

export function ConvidadoAvulsoDialog({ partidaId, disabled, onAdded, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [celular, setCelular] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [posicao, setPosicao] = useState<'GOL' | 'ZAG' | 'MEI' | 'ATA' | ''>('');
  const [erro, setErro] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupHit, setLookupHit] = useState<{
    convidado: {
      id: string;
      nome: string;
      apelido: string | null;
      posicao: 'GOL' | 'ZAG' | 'MEI' | 'ATA' | null;
      celular: string;
    };
    totalPartidasComoConvidado: number;
  } | null>(null);
  const [manual, setManual] = useState(false);
  const [pending, startTransition] = useTransition();

  const digits = unmaskCelular(celular);

  useEffect(() => {
    if (!open || manual) {
      setLookupHit(null);
      return;
    }
    if (digits.length !== 11) {
      setLookupHit(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      setLookupLoading(true);
      void lookupConvidadoPorCelular(digits)
        .then((res) => {
          if (cancelled) return;
          if (res.convidado) {
            setLookupHit({
              convidado: res.convidado,
              totalPartidasComoConvidado: res.totalPartidasComoConvidado,
            });
            setNome(res.convidado.nome);
            setPosicao(res.convidado.posicao ?? '');
          } else {
            setLookupHit(null);
          }
        })
        .catch(() => setLookupHit(null))
        .finally(() => {
          if (!cancelled) setLookupLoading(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, manual, digits]);

  function resetForm() {
    setCelular('');
    setNome('');
    setEmail('');
    setPosicao('');
    setErro(null);
    setLookupHit(null);
    setManual(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetForm();
  }

  function submit() {
    setErro(null);
    if (lookupHit && !manual) {
      startTransition(async () => {
        try {
          await addConvidadoAvulso(partidaId, {
            convidadoAvulsoId: lookupHit.convidado.id,
            celular: lookupHit.convidado.celular,
            nome: lookupHit.convidado.nome,
            posicao: lookupHit.convidado.posicao ?? undefined,
          });
          toast.success('Convidado adicionado.');
          handleOpenChange(false);
          onAdded?.();
        } catch (e) {
          setErro(e instanceof Error ? e.message : 'Não foi possível adicionar.');
        }
      });
      return;
    }
    if (digits.length !== 11) {
      setErro('Informe o WhatsApp com 11 dígitos.');
      return;
    }
    if (!nome.trim()) {
      setErro('Informe o nome.');
      return;
    }
    startTransition(async () => {
      try {
        await addConvidadoAvulso(partidaId, {
          celular: digits,
          nome: nome.trim(),
          email: email.trim() || undefined,
          posicao: posicao || undefined,
        });
        toast.success('Convidado adicionado.');
        handleOpenChange(false);
        onAdded?.();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Não foi possível adicionar.');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" size="sm" variant="outline" disabled={disabled}>
            <Plus size={16} />
            Convidado
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar convidado avulso</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="WhatsApp" hint="11 dígitos — busca cadastro existente">
            <Input
              value={celular}
              onChange={(e) => {
                setManual(false);
                setCelular(formatCelular(e.target.value));
              }}
              placeholder="(11) 99999-9999"
              inputMode="numeric"
            />
          </Field>
          {lookupLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Spinner size="sm" />
              Buscando…
            </div>
          ) : null}
          {lookupHit && !manual ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
              <Avatar name={lookupHit.convidado.nome} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{lookupHit.convidado.nome}</p>
                <p className="text-xs text-muted">
                  Já jogou {lookupHit.totalPartidasComoConvidado}× como convidado
                </p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setManual(true)}>
                Outro
              </Button>
            </div>
          ) : (
            <>
              <Field label="Nome">
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              </Field>
              <Field label="E-mail (opcional)">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
              </Field>
              <Field label="Posição (opcional)">
                <Segmented
                  value={posicao}
                  onChange={(v) => setPosicao(v as typeof posicao)}
                  options={[{ value: '', label: '—' }, ...POSICOES.map((p) => ({ value: p, label: p }))]}
                />
              </Field>
            </>
          )}
          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? 'Salvando…' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
