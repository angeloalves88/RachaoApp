'use client';

import { useEffect, useState, useTransition } from 'react';
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
import { updateConvidadoAvulso } from '@/lib/convidados-actions';
import { formatCelular, unmaskCelular } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  convidado: {
    id: string;
    nome: string;
    apelido?: string | null;
    celular: string;
    posicao?: 'GOL' | 'ZAG' | 'MEI' | 'ATA' | null;
  } | null;
  onSaved?: () => void;
}

export function ConvidadoEditDialog({ open, onOpenChange, convidado, onSaved }: Props) {
  const [nome, setNome] = useState('');
  const [celular, setCelular] = useState('');
  const [apelido, setApelido] = useState('');
  const [posicao, setPosicao] = useState<'GOL' | 'ZAG' | 'MEI' | 'ATA' | ''>('');
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !convidado) return;
    setNome(convidado.nome);
    setApelido(convidado.apelido ?? '');
    setPosicao(convidado.posicao ?? '');
    const cel = /^\d{11}$/.test(convidado.celular) ? formatCelular(convidado.celular) : '';
    setCelular(cel);
    setErro(null);
  }, [open, convidado]);

  function submit() {
    if (!convidado) return;
    const digits = unmaskCelular(celular);
    if (digits.length !== 11) {
      setErro('Informe o WhatsApp com 11 dígitos.');
      return;
    }
    startTransition(async () => {
      try {
        await updateConvidadoAvulso(convidado.id, {
          nome: nome.trim(),
          celular: digits,
          apelido: apelido.trim() || null,
          posicao: posicao || undefined,
        });
        toast.success('Convidado atualizado.');
        onOpenChange(false);
        onSaved?.();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar convidado</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Nome">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </Field>
          <Field label="WhatsApp">
            <Input
              value={celular}
              onChange={(e) => setCelular(formatCelular(e.target.value))}
              inputMode="numeric"
            />
          </Field>
          <Field label="Apelido (opcional)">
            <Input value={apelido} onChange={(e) => setApelido(e.target.value)} />
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
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
