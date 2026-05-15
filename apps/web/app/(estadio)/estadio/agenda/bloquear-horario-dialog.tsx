'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import { Textarea } from '@/components/ui/textarea';
import { addMeuBloqueio, type BloqueioRow } from '@/lib/estadios-actions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Data sugerida em formato YYYY-MM-DD. */
  dataInicial?: string | null;
  onBlocked?: (bloqueio: BloqueioRow) => void;
}

export function BloquearHorarioDialog({
  open,
  onOpenChange,
  dataInicial,
  onBlocked,
}: Props) {
  const [data, setData] = useState(dataInicial ?? '');
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setData(dataInicial ?? '');
      setMotivo('');
    }
  }, [open, dataInicial]);

  async function handleSubmit() {
    if (!data) {
      toast.error('Escolha a data a bloquear.');
      return;
    }
    setSaving(true);
    try {
      const res = await addMeuBloqueio({
        data: new Date(`${data}T00:00:00`),
        motivo: motivo.trim() ? motivo.trim() : null,
      });
      toast.success('Data bloqueada.');
      onBlocked?.(res.bloqueio);
      onOpenChange(false);
    } catch {
      toast.error('Não foi possível bloquear esta data.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bloquear data</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Data">
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </Field>
          <Field label="Motivo (opcional)">
            <Textarea
              value={motivo}
              maxLength={200}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: manutenção, feriado..."
            />
          </Field>
          <p className="text-xs text-muted">
            Datas bloqueadas não aceitam solicitações de partida.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !data}>
            {saving ? 'Bloqueando…' : 'Bloquear data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
