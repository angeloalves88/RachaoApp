'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (motivo: string) => void;
}

export function RecusarDialog({ open, onOpenChange, onConfirm }: Props) {
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (!open) setMotivo('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recusar partida</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="motivo">Motivo (opcional)</Label>
          <Textarea
            id="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: horário em manutenção, conflito com outra partida..."
            rows={3}
          />
          <p className="text-xs text-muted">
            O Presidente receberá uma notificação com o motivo.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(motivo)}>Recusar partida</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
