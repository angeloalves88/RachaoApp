'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirmed: () => Promise<void>;
}

export function ExcluirContaDialog({ open, onOpenChange, onConfirmed }: Props) {
  const [texto, setTexto] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  function reset() {
    setTexto('');
  }

  async function confirmar() {
    if (texto !== 'EXCLUIR') {
      toast.error('Digite EXCLUIR para confirmar');
      return;
    }
    setExcluindo(true);
    try {
      await onConfirmed();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao excluir conta');
      setExcluindo(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle size={20} /> Excluir conta
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="rounded-md border border-destructive/40 bg-error-highlight px-3 py-2 text-xs text-destructive">
            Esta ação é <strong>irreversível</strong>. Todos os seus grupos, partidas, vaquinhas e
            histórico serão removidos. Se você é Dono do Estádio, o estádio também será excluído.
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmacao-excluir">
              Digite <code className="font-mono text-destructive">EXCLUIR</code> para confirmar
            </Label>
            <Input
              id="confirmacao-excluir"
              value={texto}
              onChange={(e) => setTexto(e.target.value.toUpperCase())}
              autoComplete="off"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={excluindo}>
            Cancelar
          </Button>
          <Button
            onClick={confirmar}
            disabled={excluindo || texto !== 'EXCLUIR'}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {excluindo ? <Loader2 size={14} className="animate-spin" /> : null}
            Excluir conta permanentemente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
