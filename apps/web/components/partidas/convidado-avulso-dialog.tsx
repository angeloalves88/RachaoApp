'use client';

import { useEffect, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { POSICOES } from '@rachao/shared/enums';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { lookupConvidadoPorCelular } from '@/lib/convidados-actions';
import { listConvidadosGrupo } from '@/lib/grupos-actions';
import { addConvidadoAvulso } from '@/lib/partidas-actions';
import type { ConvidadoGrupoItem } from '@/lib/types';
import { formatCelular, unmaskCelular } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  partidaId: string;
  grupoId?: string;
  disabled?: boolean;
  onAdded?: () => void;
  trigger?: React.ReactNode;
}

export function ConvidadoAvulsoDialog({
  partidaId,
  grupoId,
  disabled,
  onAdded,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [aba, setAba] = useState<'pool' | 'novo'>('pool');
  const [pool, setPool] = useState<ConvidadoGrupoItem[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [celular, setCelular] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [posicao, setPosicao] = useState<'GOL' | 'ZAG' | 'MEI' | 'ATA' | ''>('');
  const [erro, setErro] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupHit, setLookupHit] = useState<{
    convidado: {
      id: string;
      nome: string;
      apelido: string | null;
      posicao: 'GOL' | 'ZAG' | 'MEI' | 'ATA' | null;
      celular: string;
    };
    totalPartidasComoConvidado: number;
  } | null>(null);
  const [manual, setManual] = useState(false);
  const [pending, startTransition] = useTransition();

  const digits = unmaskCelular(celular);

  useEffect(() => {
    if (!open || !grupoId || aba !== 'pool') return;
    setPoolLoading(true);
    void listConvidadosGrupo(grupoId)
      .then(({ convidados }) => setPool(convidados))
      .catch(() => setPool([]))
      .finally(() => setPoolLoading(false));
  }, [open, grupoId, aba]);

  useEffect(() => {
    if (!open || manual || aba !== 'novo') {
      setLookupHit(null);
      return;
    }
    if (digits.length !== 11) {
      setLookupHit(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      setLookupLoading(true);
      void lookupConvidadoPorCelular(digits)
        .then((res) => {
          if (cancelled) return;
          if (res.convidado) {
            setLookupHit({
              convidado: res.convidado,
              totalPartidasComoConvidado: res.totalPartidasComoConvidado,
            });
            setNome(res.convidado.nome);
            setPosicao(res.convidado.posicao ?? '');
          } else {
            setLookupHit(null);
          }
        })
        .catch(() => setLookupHit(null))
        .finally(() => {
          if (!cancelled) setLookupLoading(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, manual, aba, digits]);

  function resetForm() {
    setCelular('');
    setNome('');
    setEmail('');
    setPosicao('');
    setErro(null);
    setLookupHit(null);
    setManual(false);
    setSelected(new Set());
    setAba(grupoId ? 'pool' : 'novo');
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetForm();
  }

  function togglePool(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function submitPool() {
    if (selected.size === 0) {
      setErro('Selecione ao menos um convidado.');
      return;
    }
    startTransition(async () => {
      try {
        for (const id of selected) {
          const c = pool.find((p) => p.id === id);
          if (!c) continue;
          await addConvidadoAvulso(partidaId, {
            convidadoAvulsoId: c.id,
            celular: c.celular,
            nome: c.nome,
            posicao: c.posicao ?? undefined,
          });
        }
        toast.success(
          selected.size === 1 ? 'Convidado adicionado.' : `${selected.size} convidados adicionados.`,
        );
        handleOpenChange(false);
        onAdded?.();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Não foi possível adicionar.');
      }
    });
  }

  function submitNovo() {
    setErro(null);
    if (lookupHit && !manual) {
      startTransition(async () => {
        try {
          const res = await addConvidadoAvulso(partidaId, {
            convidadoAvulsoId: lookupHit.convidado.id,
            celular: lookupHit.convidado.celular,
            nome: lookupHit.convidado.nome,
            posicao: lookupHit.convidado.posicao ?? undefined,
          });
          if (res.whatsappLink) {
            toast.success('Convidado adicionado. Abra o WhatsApp para enviar a confirmação.');
          } else {
            toast.success('Convidado adicionado.');
          }
          handleOpenChange(false);
          onAdded?.();
        } catch (e) {
          setErro(e instanceof Error ? e.message : 'Não foi possível adicionar.');
        }
      });
      return;
    }
    if (digits.length !== 11) {
      setErro('Informe o WhatsApp com 11 dígitos.');
      return;
    }
    if (!nome.trim()) {
      setErro('Informe o nome.');
      return;
    }
    startTransition(async () => {
      try {
        const res = await addConvidadoAvulso(partidaId, {
          celular: digits,
          nome: nome.trim(),
          email: email.trim() || undefined,
          posicao: posicao || undefined,
        });
        if (res.whatsappLink) {
          toast.success('Convidado adicionado. Abra o WhatsApp para enviar valor e PIX.');
        } else {
          toast.success('Convidado adicionado.');
        }
        handleOpenChange(false);
        onAdded?.();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Não foi possível adicionar.');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" size="sm" variant="outline" disabled={disabled}>
            <Plus size={16} />
            Convidado
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar convidado avulso</DialogTitle>
        </DialogHeader>

        {grupoId ? (
          <Tabs value={aba} onValueChange={(v) => setAba(v as 'pool' | 'novo')}>
            <TabsList className="w-full">
              <TabsTrigger value="pool" className="flex-1">
                Lista de espera
              </TabsTrigger>
              <TabsTrigger value="novo" className="flex-1">
                Novo convidado
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pool" className="space-y-3 mt-3">
              {poolLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner size={20} />
                </div>
              ) : pool.length === 0 ? (
                <p className="text-sm text-muted text-center py-4">
                  Nenhum convidado na lista do grupo. Use a aba &quot;Novo convidado&quot;.
                </p>
              ) : (
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {pool.map((c) => (
                    <li key={c.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-2 py-2 hover:bg-surface-2">
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => togglePool(c.id)}
                          className="h-4 w-4"
                        />
                        <Avatar name={c.nome} src={c.fotoUrl} size="sm" />
                        <span className="text-sm font-medium">{c.nome}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="novo" className="mt-3">
              <NovoConvidadoForm
                celular={celular}
                setCelular={setCelular}
                nome={nome}
                setNome={setNome}
                email={email}
                setEmail={setEmail}
                posicao={posicao}
                setPosicao={setPosicao}
                lookupLoading={lookupLoading}
                lookupHit={lookupHit}
                manual={manual}
                setManual={setManual}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <NovoConvidadoForm
            celular={celular}
            setCelular={setCelular}
            nome={nome}
            setNome={setNome}
            email={email}
            setEmail={setEmail}
            posicao={posicao}
            setPosicao={setPosicao}
            lookupLoading={lookupLoading}
            lookupHit={lookupHit}
            manual={manual}
            setManual={setManual}
          />
        )}

        {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={aba === 'pool' && grupoId ? submitPool : submitNovo}
            disabled={pending}
          >
            {pending ? 'Salvando…' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoConvidadoForm({
  celular,
  setCelular,
  nome,
  setNome,
  email,
  setEmail,
  posicao,
  setPosicao,
  lookupLoading,
  lookupHit,
  manual,
  setManual,
}: {
  celular: string;
  setCelular: (v: string) => void;
  nome: string;
  setNome: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  posicao: 'GOL' | 'ZAG' | 'MEI' | 'ATA' | '';
  setPosicao: (v: 'GOL' | 'ZAG' | 'MEI' | 'ATA' | '') => void;
  lookupLoading: boolean;
  lookupHit: {
    convidado: {
      id: string;
      nome: string;
      apelido: string | null;
      posicao: 'GOL' | 'ZAG' | 'MEI' | 'ATA' | null;
      celular: string;
    };
    totalPartidasComoConvidado: number;
  } | null;
  manual: boolean;
  setManual: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="WhatsApp" hint="11 dígitos — busca cadastro existente">
        <Input
          value={celular}
          onChange={(e) => {
            setManual(false);
            setCelular(formatCelular(e.target.value));
          }}
          placeholder="(11) 99999-9999"
          inputMode="numeric"
        />
      </Field>
      {lookupLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Spinner size={14} />
          Buscando…
        </div>
      ) : null}
      {lookupHit && !manual ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
          <Avatar name={lookupHit.convidado.nome} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{lookupHit.convidado.nome}</p>
            <p className="text-xs text-muted">
              Já jogou {lookupHit.totalPartidasComoConvidado}× como convidado
            </p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => setManual(true)}>
            Outro
          </Button>
        </div>
      ) : (
        <>
          <Field label="Nome">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </Field>
          <Field label="E-mail (opcional)">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </Field>
          <Field label="Posição (opcional)">
            <Segmented
              value={posicao}
              onChange={(v) => setPosicao(v as typeof posicao)}
              options={[{ value: '', label: '—' }, ...POSICOES.map((p) => ({ value: p, label: p }))]}
            />
          </Field>
        </>
      )}
    </div>
  );
}
