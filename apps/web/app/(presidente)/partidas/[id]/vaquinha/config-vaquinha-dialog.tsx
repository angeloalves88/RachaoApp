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
import { VaquinhaForm, type VaquinhaFormValue } from '@/components/vaquinha/vaquinha-form';
import { createVaquinha, updateVaquinha, type VaquinhaResponse } from '@/lib/vaquinha-actions';
import type { TipoChavePix } from '@rachao/shared/zod';
import type { TipoCobranca } from '@rachao/shared/enums';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partidaId: string;
  vaquinha: VaquinhaResponse['vaquinha'];
  /** Tipo de cobranca persistido na partida (nao editavel aqui). */
  tipoCobrancaPartida: TipoCobranca;
  numFixos: number;
  numConvidados: number;
  onSaved: () => Promise<void>;
}

export function ConfigVaquinhaDialog({
  open,
  onOpenChange,
  partidaId,
  vaquinha,
  tipoCobrancaPartida,
  numFixos,
  numConvidados,
  onSaved,
}: Props) {
  const [value, setValue] = useState<VaquinhaFormValue>(() => fromVaquinha(vaquinha, tipoCobrancaPartida));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(fromVaquinha(vaquinha, tipoCobrancaPartida));
    }
  }, [open, vaquinha, tipoCobrancaPartida]);

  async function handleSave() {
    if (!value.tipoChavePix) {
      toast.error('Escolha o tipo da chave Pix');
      return;
    }
    if (!value.chavePix.trim()) {
      toast.error('Informe a chave Pix');
      return;
    }
    if (value.valorBoleiroFixo < 0) {
      toast.error('Valor inválido');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tipoCobranca: tipoCobrancaPartida,
        tipoChavePix: value.tipoChavePix as TipoChavePix,
        chavePix: value.chavePix.trim(),
        valorBoleiroFixo: value.valorBoleiroFixo,
        valorConvidadoAvulso: value.mesmoValor
          ? value.valorBoleiroFixo
          : value.valorConvidadoAvulso,
        dataLimitePagamento: value.dataLimitePagamento
          ? new Date(value.dataLimitePagamento)
          : null,
        dataLimitePagamentoConvidados:
          tipoCobrancaPartida === 'mensalidade' && value.dataLimitePagamentoConvidados
            ? new Date(value.dataLimitePagamentoConvidados)
            : null,
        mesReferencia: null,
      };

      if (vaquinha) {
        await updateVaquinha(vaquinha.id, payload);
        toast.success('Configurações atualizadas');
      } else {
        await createVaquinha(partidaId, payload);
        toast.success('Vaquinha criada');
      }
      await onSaved();
      onOpenChange(false);
    } catch {
      toast.error('Falha ao salvar configurações');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3" fullScreenOnMobile>
        <DialogHeader>
          <DialogTitle>{vaquinha ? 'Editar vaquinha' : 'Configurar vaquinha'}</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto pb-2">
          <VaquinhaForm
            tipoCobrancaLocked
            value={value}
            onChange={(patch) => setValue((s) => ({ ...s, ...patch, tipoCobranca: tipoCobrancaPartida }))}
            numFixos={numFixos}
            numConvidados={numConvidados}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function fromVaquinha(
  v: VaquinhaResponse['vaquinha'],
  tipoPartida: TipoCobranca,
): VaquinhaFormValue {
  if (!v) {
    return {
      tipoChavePix: '',
      chavePix: '',
      tipoCobranca: tipoPartida,
      valorBoleiroFixo: 0,
      valorConvidadoAvulso: 0,
      mesmoValor: true,
      dataLimitePagamento: undefined,
      dataLimitePagamentoConvidados: undefined,
    };
  }
  return {
    tipoChavePix: (v.tipoChavePix as TipoChavePix | null) ?? '',
    chavePix: v.chavePix,
    tipoCobranca: tipoPartida,
    valorBoleiroFixo: v.valorBoleiroFixo,
    valorConvidadoAvulso: v.valorConvidadoAvulso,
    mesmoValor: v.valorBoleiroFixo === v.valorConvidadoAvulso,
    dataLimitePagamento: v.dataLimitePagamento
      ? new Date(v.dataLimitePagamento).toISOString().slice(0, 10)
      : undefined,
    dataLimitePagamentoConvidados:
      v.dataLimitePagamentoConvidados != null
        ? new Date(v.dataLimitePagamentoConvidados).toISOString().slice(0, 10)
        : undefined,
  };
}
