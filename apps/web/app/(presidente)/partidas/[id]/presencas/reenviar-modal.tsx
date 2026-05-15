'use client';

import { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
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
import { Segmented } from '@/components/ui/segmented';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { CanalReenvio } from '@rachao/shared/zod';
import { reenviarConvites } from '@/lib/partidas-actions';
import type { PartidaDetalhe } from '@/lib/types';
import { formatDataPartida } from '@/lib/format';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partida: PartidaDetalhe;
  /** IDs ja selecionados quando o modal abre. */
  seedConviteIds?: string[] | null;
}

type ChipMode = 'pendentes' | 'todos' | 'manual';

export function ReenviarModal({ open, onOpenChange, partida, seedConviteIds }: Props) {
  const pendentes = useMemo(
    () => partida.convites.filter((c) => c.status === 'pendente'),
    [partida.convites],
  );
  const todos = useMemo(
    () =>
      partida.convites.filter(
        (c) => c.status === 'pendente' || c.status === 'confirmado',
      ),
    [partida.convites],
  );

  const [mode, setMode] = useState<ChipMode>('pendentes');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [canais, setCanais] = useState<CanalReenvio>('email');
  const [mensagem, setMensagem] = useState('');
  const [busy, setBusy] = useState(false);

  const mensagemPadrao = useMemo(() => {
    const data = formatDataPartida(partida.dataHora);
    return `E aí, [Nome]! O ${partida.grupo.nome} agendou um rachão em ${data}. Confirma se você vai? [link]`;
  }, [partida]);

  // Sincroniza selecao quando abre/altera modo.
  useEffect(() => {
    if (!open) return;
    const seed = seedConviteIds ?? null;
    if (seed && seed.length > 0) {
      setMode(
        seed.length === pendentes.length && seed.every((id) => pendentes.find((p) => p.id === id))
          ? 'pendentes'
          : 'manual',
      );
      setSelecionados(new Set(seed));
      return;
    }
    if (mode === 'pendentes') {
      setSelecionados(new Set(pendentes.map((c) => c.id)));
    } else if (mode === 'todos') {
      setSelecionados(new Set(todos.map((c) => c.id)));
    }
  }, [open, mode, seedConviteIds, pendentes, todos]);

  function toggle(id: string) {
    setMode('manual');
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleEnviar() {
    if (selecionados.size === 0) {
      toast.error('Selecione ao menos um boleiro.');
      return;
    }
    setBusy(true);
    try {
      const result = await reenviarConvites(partida.id, {
        conviteIds: Array.from(selecionados),
        canais,
        mensagemPersonalizada: mensagem.trim() || null,
      });

      if (canais === 'email' || canais === 'both') {
        if (result.enviadosEmail > 0) {
          toast.success(`${result.enviadosEmail} email(s) reenviado(s).`);
        }
        if (result.semContatoEmail > 0) {
          toast.warning(`${result.semContatoEmail} sem email cadastrado.`);
        }
      }
      if ((canais === 'whatsapp' || canais === 'both') && result.whatsappLinks.length > 0) {
        // Abre o primeiro link automaticamente; o presidente clica nos demais.
        const [primeiro, ...resto] = result.whatsappLinks;
        if (primeiro) window.open(primeiro.url, '_blank', 'noopener');
        if (resto.length > 0) {
          toast.success(
            `Abrindo conversa de ${primeiro?.nome}. ${resto.length} restante(s) abaixo.`,
          );
        }
      }
      onOpenChange(false);
    } catch {
      toast.error('Falha ao reenviar.');
    } finally {
      setBusy(false);
    }
  }

  // Render lista quando modo manual.
  const lista = mode === 'manual' ? partida.convites : todos;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reenviar convites</DialogTitle>
          <DialogDescription>
            Envia novamente o link de confirmacao para os boleiros escolhidos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted">Selecao rapida</p>
            <div className="flex flex-wrap gap-2">
              <ChipBtn
                active={mode === 'pendentes'}
                onClick={() => setMode('pendentes')}
                label={`Todos os pendentes (${pendentes.length})`}
              />
              <ChipBtn
                active={mode === 'todos'}
                onClick={() => setMode('todos')}
                label={`Todos os boleiros (${todos.length})`}
              />
              <ChipBtn
                active={mode === 'manual'}
                onClick={() => setMode('manual')}
                label="Selecionar manualmente"
              />
            </div>
          </div>

          {mode === 'manual' ? (
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border bg-surface-2 p-2">
              {lista.map((c) => {
                const nome = c.boleiro?.nome ?? 'Boleiro removido';
                return (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 hover:bg-surface-offset"
                  >
                    <Checkbox
                      checked={selecionados.has(c.id)}
                      onCheckedChange={() => toggle(c.id)}
                    />
                    <span className="flex-1 truncate text-sm">{nome}</span>
                    <span className="text-xs text-muted">{c.status}</span>
                  </label>
                );
              })}
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted">Canal de envio</p>
            <Segmented<CanalReenvio>
              value={canais}
              onChange={setCanais}
              options={[
                { value: 'email', label: 'E-mail' },
                { value: 'whatsapp', label: 'WhatsApp' },
                { value: 'both', label: 'Ambos' },
              ]}
            />
            {canais !== 'email' ? (
              <p className="text-xs text-muted">
                WhatsApp abre <code>wa.me</code> em nova aba — voce envia manualmente. Numeros sem
                celular cadastrado serao ignorados.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted">
              Mensagem (opcional)
            </p>
            <Textarea
              placeholder={mensagemPadrao}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted">
              Se deixar em branco, usamos a mensagem padrao com o link unico de cada boleiro.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleEnviar} disabled={busy || selecionados.size === 0}>
            <Send size={14} />
            {busy ? 'Enviando…' : `Enviar para ${selecionados.size}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChipBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ' +
        (active
          ? 'border-primary/50 bg-primary-highlight text-primary'
          : 'border-border bg-surface text-muted hover:bg-surface-2 hover:text-foreground')
      }
    >
      {label}
    </button>
  );
}
