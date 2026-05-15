'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Segmented } from '@/components/ui/segmented';
import { Textarea } from '@/components/ui/textarea';
import { formatDataPartida } from '@/lib/format';
import type { VaquinhaPagador } from '@/lib/vaquinha-actions';

type ModoSelecao = 'pendentes' | 'inadimplentes' | 'manual';

const MENSAGEM_PADRAO =
  `E aí, [Nome]! 👋\n` +
  `Sua parte da pelada de [data] ainda está em aberto.\n\n` +
  `💰 Valor: R$ [X]\n` +
  `🏦 Pix: [chave]\n\n` +
  `Qualquer dúvida é só falar!`;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pagadores: VaquinhaPagador[];
  chavePix: string;
  dataPartida: string;
  onConfirm: (mensagem: string, pagamentoIds: string[]) => Promise<void>;
}

export function CobrarLoteDialog({
  open,
  onOpenChange,
  pagadores,
  chavePix,
  dataPartida,
  onConfirm,
}: Props) {
  const [modo, setModo] = useState<ModoSelecao>('pendentes');
  const [manuais, setManuais] = useState<Record<string, boolean>>({});
  const [mensagem, setMensagem] = useState(MENSAGEM_PADRAO);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (open) {
      setModo('pendentes');
      setManuais({});
      setMensagem(MENSAGEM_PADRAO);
    }
  }, [open]);

  const selecionados = useMemo(() => {
    if (modo === 'pendentes') return pagadores.filter((p) => p.status === 'pendente');
    if (modo === 'inadimplentes') return pagadores.filter((p) => p.status === 'inadimplente');
    return pagadores.filter((p) => manuais[p.id]);
  }, [modo, manuais, pagadores]);

  const semWhatsapp = selecionados.filter(
    (p) =>
      !p.boleiro?.celular ||
      p.boleiro.celular.replace(/\D/g, '').length !== 11 ||
      p.boleiro.celular.startsWith('email:'),
  ).length;

  const totalEnviar = selecionados.length - semWhatsapp;

  function toggleManual(id: string) {
    setManuais((s) => ({ ...s, [id]: !s[id] }));
  }

  async function handleConfirm() {
    if (selecionados.length === 0 || mensagem.trim().length < 5) return;
    setEnviando(true);
    try {
      await onConfirm(
        mensagem,
        selecionados.map((p) => p.id),
      );
    } finally {
      setEnviando(false);
    }
  }

  const dataFmt = formatDataPartida(dataPartida);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3" fullScreenOnMobile>
        <DialogHeader>
          <DialogTitle>Enviar cobrança</DialogTitle>
          <DialogDescription>
            Será aberto o WhatsApp para cada boleiro, um por vez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto pb-2">
          <Segmented<ModoSelecao>
            value={modo}
            onChange={(v) => setModo(v)}
            options={[
              { value: 'pendentes', label: 'Pendentes' },
              { value: 'inadimplentes', label: 'Inadimplentes' },
              { value: 'manual', label: 'Manual' },
            ]}
            size="sm"
          />

          {modo === 'manual' ? (
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-border bg-surface-2 p-2">
              {pagadores
                .filter((p) => p.status !== 'pago')
                .map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 rounded p-1.5 hover:bg-surface"
                  >
                    <input
                      type="checkbox"
                      checked={!!manuais[p.id]}
                      onChange={() => toggleManual(p.id)}
                      className="h-4 w-4 rounded border-border bg-surface-2 text-primary focus:ring-primary"
                    />
                    <span className="flex-1 text-sm">
                      {p.boleiro?.nome ?? 'Convidado'}{' '}
                      <span className="text-xs text-muted">
                        · R$ {p.valorCobrado.toFixed(2).replace('.', ',')}
                      </span>
                    </span>
                  </label>
                ))}
            </div>
          ) : null}

          <div>
            <label htmlFor="mensagem-cobranca" className="mb-1 block text-sm font-medium">
              Mensagem
            </label>
            <Textarea
              id="mensagem-cobranca"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={6}
              className="font-mono text-xs"
            />
            <p className="mt-1 text-xs text-muted">
              Tags: <code>[Nome]</code>, <code>[data]</code> = {dataFmt},{' '}
              <code>[X]</code> = valor, <code>[chave]</code> = {chavePix}
            </p>
          </div>

          {semWhatsapp > 0 ? (
            <p className="rounded-md border border-warning/40 bg-warning-highlight px-3 py-2 text-xs text-warning">
              {semWhatsapp} boleiro(s) sem WhatsApp não receberão a cobrança.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={enviando || totalEnviar === 0 || mensagem.trim().length < 5}
          >
            <MessageCircle size={14} />
            {enviando ? 'Abrindo...' : `Enviar para ${totalEnviar}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
