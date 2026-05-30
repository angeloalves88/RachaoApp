'use client';

import { useState, useTransition } from 'react';
import { POSICOES } from '@rachao/shared/enums';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { addConvidadoGrupo } from '@/lib/grupos-actions';
import { formatCelular, unmaskCelular } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grupoId: string;
  onSaved?: () => void;
}

export function ConvidadoPoolFormDialog({ open, onOpenChange, grupoId, onSaved }: Props) {
  const [nome, setNome] = useState('');
  const [celular, setCelular] = useState('');
  const [email, setEmail] = useState('');
  const [posicao, setPosicao] = useState<'GOL' | 'ZAG' | 'MEI' | 'ATA' | ''>('');
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setNome('');
    setCelular('');
    setEmail('');
    setPosicao('');
    setErro(null);
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  function submit() {
    const digits = unmaskCelular(celular);
    if (digits.length !== 11 && !email.trim()) {
      setErro('Informe WhatsApp ou e-mail.');
      return;
    }
    if (!nome.trim()) {
      setErro('Informe o nome.');
      return;
    }
    startTransition(async () => {
      try {
        await addConvidadoGrupo(grupoId, {
          nome: nome.trim(),
          celular: digits,
          email: email.trim() || undefined,
          posicao: posicao || undefined,
        });
        toast.success('Convidado adicionado à lista de espera.');
        handleOpenChange(false);
        onSaved?.();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Não foi possível adicionar.');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar convidado à lista</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="WhatsApp">
            <Input
              value={celular}
              onChange={(e) => setCelular(formatCelular(e.target.value))}
              placeholder="(11) 99999-9999"
            />
          </Field>
          <Field label="Nome">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </Field>
          <Field label="E-mail (opcional)">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </Field>
          <Field label="Posição">
            <Segmented
              value={posicao}
              onChange={(v) => setPosicao(v as typeof posicao)}
              options={[{ value: '', label: '—' }, ...POSICOES.map((p) => ({ value: p, label: p }))]}
            />
          </Field>
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
