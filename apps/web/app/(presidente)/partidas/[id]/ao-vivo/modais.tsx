'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar } from '@/components/ui/avatar';
import { COR_HEX } from '@/lib/escalacao-ui';
import type { CorTime } from '@rachao/shared/zod';

export interface TimeAovivo {
  id: string;
  nome: string;
  cor: CorTime | string;
  boleiros: Array<{
    boleiroId: string | null;
    nome: string;
    apelido: string | null;
  }>;
}

interface BaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  times: TimeAovivo[];
  minutoAtual: number;
}

function timeColor(t: TimeAovivo): string {
  return COR_HEX[(t.cor as CorTime) ?? 'blue'] ?? '#3b82f6';
}

function TimeSelector({
  times,
  value,
  onChange,
}: {
  times: TimeAovivo[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {times.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors ${
            value === t.id ? 'border-primary bg-primary/10' : 'border-border bg-surface-2'
          }`}
        >
          <span
            className="h-4 w-4 rounded-full border-2 border-white/40"
            style={{ backgroundColor: timeColor(t) }}
          />
          <span className="truncate text-sm font-semibold">{t.nome}</span>
        </button>
      ))}
    </div>
  );
}

function BoleiroSelector({
  boleiros,
  value,
  onChange,
  allowAnonymous = false,
}: {
  boleiros: TimeAovivo['boleiros'];
  value: string | null;
  onChange: (id: string | null) => void;
  allowAnonymous?: boolean;
}) {
  if (!boleiros.length) {
    return <p className="text-sm text-muted">Sem boleiros escalados neste time.</p>;
  }
  return (
    <div className="max-h-72 space-y-1 overflow-y-auto">
      {allowAnonymous ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left text-sm ${
            value === null ? 'border-primary bg-primary/10' : 'border-border bg-surface-2'
          }`}
        >
          <span className="text-xl" aria-hidden>?</span>
          Sem atribuição
        </button>
      ) : null}
      {boleiros.map((b) => (
        <button
          key={b.boleiroId ?? b.nome}
          type="button"
          onClick={() => b.boleiroId && onChange(b.boleiroId)}
          disabled={!b.boleiroId}
          className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left text-sm disabled:opacity-50 ${
            value === b.boleiroId ? 'border-primary bg-primary/10' : 'border-border bg-surface-2'
          }`}
        >
          <Avatar name={b.nome} size="sm" />
          <span className="min-w-0 flex-1 truncate">{b.nome}</span>
          {b.apelido ? <span className="text-xs text-muted">{b.apelido}</span> : null}
        </button>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Modal: Gol
// -----------------------------------------------------------------------------

interface GolValue {
  timeId: string;
  boleiroId: string | null;
  minuto: number;
  golOlimpico: boolean;
}

interface GolModalProps extends BaseModalProps {
  defaultTimeId?: string | null;
  permitirOlimpico: boolean;
  onConfirm: (v: GolValue) => Promise<void> | void;
}

export function GolModal({
  open,
  onOpenChange,
  times,
  minutoAtual,
  defaultTimeId,
  permitirOlimpico,
  onConfirm,
}: GolModalProps) {
  const [timeId, setTimeId] = useState<string | null>(defaultTimeId ?? null);
  const [boleiroId, setBoleiroId] = useState<string | null>(null);
  const [minuto, setMinuto] = useState(minutoAtual);
  const [olimpico, setOlimpico] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTimeId(defaultTimeId ?? null);
      setBoleiroId(null);
      setMinuto(minutoAtual);
      setOlimpico(false);
    }
  }, [open, defaultTimeId, minutoAtual]);

  const time = useMemo(() => times.find((t) => t.id === timeId), [times, timeId]);

  async function handleConfirm() {
    if (!timeId) return;
    setSaving(true);
    try {
      await onConfirm({ timeId, boleiroId, minuto, golOlimpico: olimpico });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar gol</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs uppercase text-muted">Time</Label>
            <TimeSelector times={times} value={timeId} onChange={setTimeId} />
          </div>
          {time ? (
            <div>
              <Label className="mb-1 block text-xs uppercase text-muted">Boleiro</Label>
              <BoleiroSelector
                boleiros={time.boleiros}
                value={boleiroId}
                onChange={setBoleiroId}
                allowAnonymous
              />
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="gol-min" className="mb-1 block text-xs uppercase text-muted">
                Minuto
              </Label>
              <Input
                id="gol-min"
                type="number"
                min={0}
                max={200}
                value={minuto}
                onChange={(e) => setMinuto(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            {permitirOlimpico ? (
              <div className="flex items-end gap-2">
                <Checkbox
                  id="gol-olim"
                  checked={olimpico}
                  onCheckedChange={(v) => setOlimpico(!!v)}
                />
                <Label htmlFor="gol-olim" className="text-sm font-normal">
                  Gol olímpico
                </Label>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!timeId || saving}>
            Registrar gol
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Modal: Cartão (amarelo / vermelho / azul)
// -----------------------------------------------------------------------------

type TipoCartao = 'amarelo' | 'vermelho' | 'azul';

interface CartaoValue {
  tipo: TipoCartao;
  timeId: string;
  boleiroId: string;
  minuto: number;
  duracaoAzul?: number;
}

interface CartaoModalProps extends BaseModalProps {
  cartaoAzulAtivo: boolean;
  duracaoAzulPadrao: number;
  onConfirm: (v: CartaoValue) => Promise<void> | void;
}

export function CartaoModal({
  open,
  onOpenChange,
  times,
  minutoAtual,
  cartaoAzulAtivo,
  duracaoAzulPadrao,
  onConfirm,
}: CartaoModalProps) {
  const [tipo, setTipo] = useState<TipoCartao>('amarelo');
  const [timeId, setTimeId] = useState<string | null>(null);
  const [boleiroId, setBoleiroId] = useState<string | null>(null);
  const [minuto, setMinuto] = useState(minutoAtual);
  const [duracaoAzul, setDuracaoAzul] = useState(duracaoAzulPadrao);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTipo('amarelo');
      setTimeId(null);
      setBoleiroId(null);
      setMinuto(minutoAtual);
      setDuracaoAzul(duracaoAzulPadrao);
    }
  }, [open, minutoAtual, duracaoAzulPadrao]);

  const time = useMemo(() => times.find((t) => t.id === timeId), [times, timeId]);

  async function handleConfirm() {
    if (!timeId || !boleiroId) return;
    setSaving(true);
    try {
      await onConfirm({
        tipo,
        timeId,
        boleiroId,
        minuto,
        duracaoAzul: tipo === 'azul' ? duracaoAzul : undefined,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const tipos: TipoCartao[] = cartaoAzulAtivo
    ? ['amarelo', 'vermelho', 'azul']
    : ['amarelo', 'vermelho'];
  const cores: Record<TipoCartao, string> = {
    amarelo: 'bg-warning text-warning-foreground',
    vermelho: 'bg-destructive text-destructive-foreground',
    azul: 'bg-info text-info-foreground',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar cartão</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {tipos.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`rounded-md px-3 py-2 text-sm font-semibold capitalize ${
                  tipo === t ? cores[t] : 'border border-border bg-surface-2'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div>
            <Label className="mb-1 block text-xs uppercase text-muted">Time</Label>
            <TimeSelector times={times} value={timeId} onChange={setTimeId} />
          </div>
          {time ? (
            <div>
              <Label className="mb-1 block text-xs uppercase text-muted">Boleiro</Label>
              <BoleiroSelector
                boleiros={time.boleiros}
                value={boleiroId}
                onChange={setBoleiroId}
              />
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="card-min" className="mb-1 block text-xs uppercase text-muted">
                Minuto
              </Label>
              <Input
                id="card-min"
                type="number"
                min={0}
                max={200}
                value={minuto}
                onChange={(e) => setMinuto(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            {tipo === 'azul' ? (
              <div>
                <Label htmlFor="card-dur" className="mb-1 block text-xs uppercase text-muted">
                  Duração (min)
                </Label>
                <Input
                  id="card-dur"
                  type="number"
                  min={1}
                  max={120}
                  value={duracaoAzul}
                  onChange={(e) => setDuracaoAzul(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!timeId || !boleiroId || saving}>
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Modal: Substituição
// -----------------------------------------------------------------------------

interface SubValue {
  timeId: string;
  saiBoleiroId: string;
  entraBoleiroId: string;
  minuto: number;
}

interface SubModalProps extends BaseModalProps {
  onConfirm: (v: SubValue) => Promise<void> | void;
}

export function SubstituicaoModal({
  open,
  onOpenChange,
  times,
  minutoAtual,
  onConfirm,
}: SubModalProps) {
  const [timeId, setTimeId] = useState<string | null>(null);
  const [sai, setSai] = useState<string | null>(null);
  const [entra, setEntra] = useState<string | null>(null);
  const [minuto, setMinuto] = useState(minutoAtual);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTimeId(null);
      setSai(null);
      setEntra(null);
      setMinuto(minutoAtual);
    }
  }, [open, minutoAtual]);

  const time = useMemo(() => times.find((t) => t.id === timeId), [times, timeId]);

  async function handleConfirm() {
    if (!timeId || !sai || !entra || sai === entra) return;
    setSaving(true);
    try {
      await onConfirm({ timeId, saiBoleiroId: sai, entraBoleiroId: entra, minuto });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Substituição</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs uppercase text-muted">Time</Label>
            <TimeSelector times={times} value={timeId} onChange={setTimeId} />
          </div>
          {time ? (
            <>
              <div>
                <Label className="mb-1 block text-xs uppercase text-muted">Sai</Label>
                <BoleiroSelector boleiros={time.boleiros} value={sai} onChange={setSai} />
              </div>
              <div>
                <Label className="mb-1 block text-xs uppercase text-muted">Entra</Label>
                <BoleiroSelector
                  boleiros={time.boleiros.filter((b) => b.boleiroId !== sai)}
                  value={entra}
                  onChange={setEntra}
                />
              </div>
            </>
          ) : null}
          <div>
            <Label htmlFor="sub-min" className="mb-1 block text-xs uppercase text-muted">
              Minuto
            </Label>
            <Input
              id="sub-min"
              type="number"
              min={0}
              max={200}
              value={minuto}
              onChange={(e) => setMinuto(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!timeId || !sai || !entra || sai === entra || saving}
          >
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
