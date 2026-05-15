'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cancelPartida } from '@/lib/partidas-actions';

interface Props {
  partidaId: string;
  disabled?: boolean;
  /** Quando preenchido e ha outras partidas pendentes na serie, exibe escolha de escopo. */
  serieId?: string | null;
  serieRestantes?: number;
  /** Callback opcional apos cancelar com sucesso (alem do router.refresh). */
  onCancelled?: () => void;
}

/**
 * Item de DropdownMenu para cancelar uma partida.
 *
 * Comportamento:
 * - Partida avulsa (sem serieId ou sem outras pendentes na serie): pede confirmacao
 *   simples e cancela apenas esta.
 * - Partida em serie recorrente com pelo menos 1 outra pendente: abre um Dialog
 *   com radios "Apenas esta" vs "Esta e todas as proximas da serie", e dispara o
 *   cancelamento conforme a escolha.
 */
export function CancelarPartidaButton({
  partidaId,
  disabled,
  serieId,
  serieRestantes = 0,
  onCancelled,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [escopo, setEscopo] = useState<'apenas' | 'serie'>('apenas');

  const temSerie = !!serieId && serieRestantes > 0;

  function handleSelect(e: Event) {
    e.preventDefault();
    if (disabled) return;
    if (temSerie) {
      setEscopo('apenas');
      setOpen(true);
      return;
    }
    if (!window.confirm('Cancelar esta partida? Os boleiros nao serao mais notificados.')) return;
    void executar('apenas');
  }

  async function executar(escopoChoice: 'apenas' | 'serie') {
    setBusy(true);
    try {
      const res = await cancelPartida(partidaId, escopoChoice);
      if (escopoChoice === 'serie' && res.total > 1) {
        toast.success(`${res.total} partidas da serie canceladas.`);
      } else {
        toast.success('Partida cancelada.');
      }
      setOpen(false);
      onCancelled?.();
      router.refresh();
    } catch {
      toast.error('Nao foi possivel cancelar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenuItem
        onSelect={handleSelect}
        disabled={disabled || busy}
        className="text-destructive focus:text-destructive"
      >
        {busy ? 'Cancelando…' : temSerie ? 'Cancelar partida…' : 'Cancelar partida'}
      </DropdownMenuItem>

      {temSerie ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent fullScreenOnMobile={false} className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cancelar partida recorrente</DialogTitle>
              <DialogDescription>
                Esta partida faz parte de uma serie semanal. Escolha o que cancelar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface-2 p-3 hover:bg-surface-offset">
                <input
                  type="radio"
                  name="escopo-cancelar"
                  value="apenas"
                  checked={escopo === 'apenas'}
                  onChange={() => setEscopo('apenas')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">Apenas esta partida</p>
                  <p className="text-xs text-muted">
                    As proximas {serieRestantes}{' '}
                    {serieRestantes === 1 ? 'partida' : 'partidas'} da serie continuam ativas.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface-2 p-3 hover:bg-surface-offset">
                <input
                  type="radio"
                  name="escopo-cancelar"
                  value="serie"
                  checked={escopo === 'serie'}
                  onChange={() => setEscopo('serie')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">Esta e todas as proximas da serie</p>
                  <p className="text-xs text-muted">
                    Cancela esta + {serieRestantes}{' '}
                    {serieRestantes === 1 ? 'partida futura' : 'partidas futuras'}. Partidas ja
                    realizadas nao sao afetadas.
                  </p>
                </div>
              </label>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={() => void executar(escopo)}
                disabled={busy}
              >
                {busy ? 'Cancelando…' : 'Confirmar cancelamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
