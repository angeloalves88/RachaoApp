'use client';

/**
 * Modal T25 — Configurar / Editar Vaquinha.
 *
 * Permite criar a vaquinha (quando partida nao tinha) ou editar a config
 * existente. Tambem oferece botao para remover a vaquinha da partida.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import { Spinner } from '@/components/ui/spinner';
import { VaquinhaForm, type VaquinhaFormValue } from '@/components/vaquinha/vaquinha-form';
import {
  createVaquinha,
  deleteVaquinha,
  updateVaquinha,
} from '@/lib/vaquinha-actions';
import type { TipoChavePix } from '@rachao/shared/zod';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partidaId: string;
  /** Vaquinha existente para edicao; null = criar nova. */
  vaquinha: {
    id: string;
    tipoChavePix: string | null;
    chavePix: string;
    tipo: 'por_partida' | 'mensalidade';
    valorBoleiroFixo: number;
    valorConvidadoAvulso: number;
    dataLimitePagamento: string | null;
  } | null;
  numFixos: number;
  numConvidados: number;
}

export function ConfigModal({
  open,
  onOpenChange,
  partidaId,
  vaquinha,
  numFixos,
  numConvidados,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removing, setRemoving] = useState(false);

  const [value, setValue] = useState<VaquinhaFormValue>(() => ({
    tipoChavePix: (vaquinha?.tipoChavePix as TipoChavePix) || 'cpf',
    chavePix: vaquinha?.chavePix || '',
    tipoCobranca: vaquinha?.tipo || 'por_partida',
    valorBoleiroFixo: vaquinha?.valorBoleiroFixo || 0,
    valorConvidadoAvulso: vaquinha?.valorConvidadoAvulso || 0,
    mesmoValor:
      !vaquinha || vaquinha.valorBoleiroFixo === vaquinha.valorConvidadoAvulso,
    dataLimitePagamento: vaquinha?.dataLimitePagamento
      ? vaquinha.dataLimitePagamento.slice(0, 10)
      : undefined,
  }));

  function salvar() {
    if (!value.tipoChavePix) {
      toast.error('Escolha o tipo da chave Pix');
      return;
    }
    if (!value.chavePix.trim()) {
      toast.error('Informe a chave Pix');
      return;
    }
    if (value.valorBoleiroFixo < 0) {
      toast.error('Valor invalido');
      return;
    }

    const valorConvidado = value.mesmoValor
      ? value.valorBoleiroFixo
      : value.valorConvidadoAvulso;

    const payload = {
      tipoCobranca: value.tipoCobranca,
      tipoChavePix: value.tipoChavePix as TipoChavePix,
      chavePix: value.chavePix.trim(),
      valorBoleiroFixo: value.valorBoleiroFixo,
      valorConvidadoAvulso: valorConvidado,
      dataLimitePagamento: value.dataLimitePagamento
        ? new Date(value.dataLimitePagamento)
        : null,
    };

    startTransition(async () => {
      try {
        if (vaquinha) {
          await updateVaquinha(vaquinha.id, payload);
          toast.success('Vaquinha atualizada');
        } else {
          await createVaquinha(partidaId, payload);
          toast.success('Vaquinha configurada');
        }
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
      }
    });
  }

  async function remover() {
    if (!vaquinha) return;
    if (!window.confirm('Remover a vaquinha desta partida? Os pagamentos serao apagados.')) return;
    setRemoving(true);
    try {
      await deleteVaquinha(vaquinha.id);
      toast.success('Vaquinha removida');
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{vaquinha ? 'Editar Vaquinha' : 'Configurar Vaquinha'}</DialogTitle>
          <DialogDescription>
            Cobranca via Pix; voce marca quem pagou depois.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 px-1">
          <VaquinhaForm
            value={value}
            onChange={(patch) => setValue((v) => ({ ...v, ...patch }))}
            numFixos={numFixos}
            numConvidados={numConvidados}
          />
        </div>

        <DialogFooter>
          {vaquinha ? (
            <Button
              type="button"
              variant="outline"
              onClick={remover}
              disabled={pending || removing}
              className="border-destructive/50 text-destructive hover:bg-error-highlight hover:text-destructive"
            >
              {removing ? <Spinner size={14} /> : null} Remover
            </Button>
          ) : null}
          <Button type="button" onClick={salvar} disabled={pending || removing}>
            {pending ? <Spinner size={14} /> : null}
            {vaquinha ? 'Salvar' : 'Configurar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
