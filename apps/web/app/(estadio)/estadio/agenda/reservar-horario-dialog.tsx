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
import {
  addMinhaReservaManual,
  type ReservaManualRow,
} from '@/lib/estadios-actions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataInicial?: string | null;
  onCreated?: (reserva: ReservaManualRow) => void;
}

export function ReservarHorarioDialog({
  open,
  onOpenChange,
  dataInicial,
  onCreated,
}: Props) {
  const [data, setData] = useState(dataInicial ?? '');
  const [horaInicio, setHoraInicio] = useState('19:00');
  const [horaFim, setHoraFim] = useState('20:00');
  const [nomeContato, setNomeContato] = useState('');
  const [telefoneContato, setTelefoneContato] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setData(dataInicial ?? '');
    setHoraInicio('19:00');
    setHoraFim('20:00');
    setNomeContato('');
    setTelefoneContato('');
    setObservacoes('');
  }, [open, dataInicial]);

  async function handleSubmit() {
    if (!data || !horaInicio || !horaFim || !nomeContato.trim() || !telefoneContato.trim()) {
      toast.error('Preencha data, horários, nome e telefone.');
      return;
    }
    const inicio = new Date(`${data}T${horaInicio}:00`);
    const fim = new Date(`${data}T${horaFim}:00`);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim <= inicio) {
      toast.error('Informe uma faixa de horário válida.');
      return;
    }

    setSaving(true);
    try {
      const res = await addMinhaReservaManual({
        inicio,
        fim,
        nomeContato: nomeContato.trim(),
        telefoneContato: telefoneContato.trim(),
        observacoes: observacoes.trim() ? observacoes.trim() : null,
      });
      toast.success('Reserva manual criada.');
      onCreated?.(res.reserva);
      onOpenChange(false);
    } catch {
      toast.error('Não foi possível criar a reserva manual.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reservar horário</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Data">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Hora inicial">
              <Input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
              />
            </Field>
            <Field label="Hora final">
              <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
            </Field>
          </div>

          <Field label="Nome do cliente">
            <Input
              value={nomeContato}
              onChange={(e) => setNomeContato(e.target.value)}
              maxLength={80}
              placeholder="Ex.: João Silva"
            />
          </Field>

          <Field label="Telefone">
            <Input
              value={telefoneContato}
              onChange={(e) => setTelefoneContato(e.target.value)}
              maxLength={20}
              placeholder="11999999999"
            />
          </Field>

          <Field label="Observações (opcional)">
            <Textarea
              value={observacoes}
              maxLength={280}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex.: aluguel particular, pagamento no local..."
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Reservando…' : 'Salvar reserva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
