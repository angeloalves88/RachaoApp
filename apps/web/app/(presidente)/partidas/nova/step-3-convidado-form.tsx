'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { POSICOES } from '@rachao/shared/enums';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Spinner } from '@/components/ui/spinner';
import { lookupConvidadoPorCelular } from '@/lib/convidados-actions';
import { formatCelular, unmaskCelular } from '@/lib/utils';
import { useWizardStore } from './wizard-store';

export function ConvidadoForm() {
  const add = useWizardStore((s) => s.addConvidado);
  const [open, setOpen] = useState(false);
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

  const digits = unmaskCelular(celular);

  useEffect(() => {
    if (!open || manual) {
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
      lookupConvidadoPorCelular(digits)
        .then((res) => {
          if (cancelled) return;
          if (res.convidado) {
            setLookupHit({ convidado: res.convidado, totalPartidasComoConvidado: res.totalPartidasComoConvidado });
          } else {
            setLookupHit(null);
          }
        })
        .catch(() => {
          if (!cancelled) setLookupHit(null);
        })
        .finally(() => {
          if (!cancelled) setLookupLoading(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [digits, open, manual]);

  function reset() {
    setNome('');
    setCelular('');
    setEmail('');
    setPosicao('');
    setErro(null);
    setLookupHit(null);
    setManual(false);
  }

  function submitManual() {
    if (!nome.trim() || nome.trim().length < 2) {
      setErro('Informe o nome');
      return;
    }
    const cel = unmaskCelular(celular);
    if (cel && cel.length !== 11) {
      setErro('Celular inválido');
      return;
    }
    if (!cel && !email.trim()) {
      setErro('Informe celular ou e-mail');
      return;
    }
    add({
      nome: nome.trim(),
      celular: cel,
      email: email.trim() || undefined,
      posicao: posicao || undefined,
    });
    reset();
    setOpen(false);
  }

  function usarCadastroExistente() {
    if (!lookupHit) return;
    const c = lookupHit.convidado;
    add({
      convidadoAvulsoId: c.id,
      nome: c.nome,
      apelido: c.apelido ?? undefined,
      celular: /^\d{11}$/.test(c.celular) ? c.celular : digits,
      posicao: (c.posicao ?? undefined) as 'GOL' | 'ZAG' | 'MEI' | 'ATA' | undefined,
    });
    reset();
    setOpen(false);
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus size={16} /> Adicionar convidado
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-primary/30 bg-primary-highlight/20 p-3">
      <Field label="WhatsApp do convidado" hint="Digite 11 dígitos para buscar cadastro existente">
        <Input
          placeholder="(11) 9XXXX-XXXX"
          inputMode="numeric"
          value={celular}
          onChange={(e) => {
            setCelular(formatCelular(e.target.value));
            setErro(null);
          }}
          maxLength={16}
        />
      </Field>

      {lookupLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted">
          <Spinner size={14} /> Buscando cadastro...
        </div>
      ) : null}

      {!manual && lookupHit && digits.length === 11 ? (
        <div className="rounded-md border border-border bg-surface p-3 text-sm">
          <div className="flex items-start gap-3">
            <Avatar name={lookupHit.convidado.nome} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{lookupHit.convidado.nome}</p>
              <p className="text-xs text-muted">
                Já jogou como convidado em {lookupHit.totalPartidasComoConvidado}{' '}
                {lookupHit.totalPartidasComoConvidado === 1 ? 'partida' : 'partidas'}.
              </p>
              {lookupHit.convidado.posicao ? (
                <Badge variant="primarySoft" className="mt-1">
                  {lookupHit.convidado.posicao}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={usarCadastroExistente}>
              Usar este cadastro
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setManual(true)}>
              Cadastrar outro manualmente
            </Button>
          </div>
        </div>
      ) : null}

      {!manual && !lookupLoading && digits.length === 11 && !lookupHit ? (
        <p className="text-xs text-muted">
          Nenhum cadastro encontrado para este celular. Preencha os dados abaixo para criar.
        </p>
      ) : null}

      {(manual || (digits.length === 11 && !lookupHit && !lookupLoading)) && (
        <>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Input
              placeholder="Nome do convidado"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={80}
            />
            <Input
              placeholder="E-mail (alternativa)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Field label="Posição">
            <Segmented<string>
              value={posicao || 'NONE'}
              onChange={(v) => setPosicao(v === 'NONE' ? '' : (v as 'GOL' | 'ZAG' | 'MEI' | 'ATA'))}
              options={[
                { value: 'NONE', label: '—' },
                ...POSICOES.map((p) => ({ value: p, label: p })),
              ]}
              size="sm"
            />
          </Field>
        </>
      )}

      {erro ? <p className="text-xs text-destructive">{erro}</p> : null}

      <div className="flex gap-2 pt-1">
        {(manual || (digits.length === 11 && !lookupHit && !lookupLoading)) && (
          <Button type="button" size="sm" onClick={submitManual} className="flex-1">
            Adicionar
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
