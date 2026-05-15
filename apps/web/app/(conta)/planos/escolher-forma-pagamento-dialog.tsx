'use client';

import { useState } from 'react';
import { CreditCard, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { BillingType } from '@/lib/assinatura-actions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nome amigavel do plano (mostrado no header do dialog). */
  planoLabel: string;
  /** Acao a executar quando o usuario confirma. Recebe o billingType. */
  onConfirm: (billingType: BillingType) => Promise<void> | void;
  saving?: boolean;
}

export function EscolherFormaPagamentoDialog({
  open,
  onOpenChange,
  planoLabel,
  onConfirm,
  saving = false,
}: Props) {
  const [billingType, setBillingType] = useState<BillingType>('PIX');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Como você prefere pagar?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted">
          Plano <strong className="text-foreground">{planoLabel}</strong>. Você pode trocar de
          forma de pagamento depois.
        </p>

        <div className="grid gap-2">
          <OpcaoForma
            value="PIX"
            atual={billingType}
            onSelect={setBillingType}
            icon={<QrCode size={20} aria-hidden />}
            titulo="Pix"
            descricao="Pagamento instantâneo. Aprovação na hora; renova mês a mês com novo QR code."
          />
          <OpcaoForma
            value="CREDIT_CARD"
            atual={billingType}
            onSelect={setBillingType}
            icon={<CreditCard size={20} aria-hidden />}
            titulo="Cartão de crédito"
            descricao="Cobrança automática mensal. Bandeiras Visa, Master, Elo, Amex."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(billingType)} disabled={saving}>
            {saving ? 'Processando…' : 'Continuar para pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OpcaoForma({
  value,
  atual,
  onSelect,
  icon,
  titulo,
  descricao,
}: {
  value: BillingType;
  atual: BillingType;
  onSelect: (v: BillingType) => void;
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
}) {
  const active = value === atual;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={active}
      className={
        'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ' +
        (active
          ? 'border-primary/60 bg-primary-highlight/30'
          : 'border-border bg-surface hover:bg-surface-2')
      }
    >
      <span className={active ? 'text-primary' : 'text-muted'}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{titulo}</span>
        <span className="block text-xs text-muted">{descricao}</span>
      </span>
    </button>
  );
}
