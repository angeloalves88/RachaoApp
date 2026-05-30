'use client';

import { useState, useTransition } from 'react';
import { Camera } from 'lucide-react';
import { POSICOES } from '@rachao/shared/enums';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Spinner } from '@/components/ui/spinner';
import { uploadBoleiroFotoPublic } from '@/lib/storage';
import { resolveApiUrl } from '@/lib/api';

interface Props {
  token: string;
  grupoNome: string;
  grupoFotoUrl: string | null;
}

export function CadastroBoleiroClient({ token, grupoNome, grupoFotoUrl }: Props) {
  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [posicao, setPosicao] = useState<'GOL' | 'ZAG' | 'MEI' | 'ATA'>('MEI');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErro(null);
    try {
      const url = await uploadBoleiroFotoPublic(token, file);
      setFotoUrl(url);
    } catch {
      setErro('Não foi possível enviar a foto. Você pode concluir sem foto.');
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    if (nome.trim().length < 2) {
      setErro('Informe seu nome completo.');
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(
          `${resolveApiUrl()}/api/convites-boleiro/publico/${token}/completar`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nome: nome.trim(),
              apelido: apelido.trim() || null,
              posicao,
              fotoUrl,
            }),
          },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { message?: string }).message ?? 'Falha ao salvar');
        }
        setDone(true);
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Não foi possível concluir o cadastro.');
      }
    });
  }

  if (done) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="font-display text-2xl font-bold text-success">Cadastro concluído!</p>
        <p className="mt-2 text-sm text-muted">
          Você faz parte do grupo <strong>{grupoNome}</strong>. Aguarde os convites das partidas.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Avatar name={grupoNome} src={grupoFotoUrl} size="lg" />
        <div>
          <p className="text-sm text-muted">Grupo</p>
          <p className="font-display text-xl font-bold">{grupoNome}</p>
        </div>
      </div>

      <p className="text-sm text-muted">
        Complete seu cadastro para entrar na pelada. Envie uma foto para aparecer na lista do grupo.
      </p>

      <div className="flex flex-col items-center gap-2">
        <Avatar name={nome || 'Boleiro'} src={fotoUrl} size="xl" />
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary">
          <Camera size={16} />
          {uploading ? 'Enviando…' : 'Escolher foto'}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onPickPhoto} disabled={uploading} />
        </label>
      </div>

      <Field label="Nome completo">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
      </Field>
      <Field label="Apelido (opcional)">
        <Input value={apelido} onChange={(e) => setApelido(e.target.value)} />
      </Field>
      <Field label="Posição">
        <Segmented
          value={posicao}
          onChange={(v) => setPosicao(v as typeof posicao)}
          options={POSICOES.map((p) => ({ value: p, label: p }))}
        />
      </Field>

      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

      <Button type="button" className="w-full" onClick={submit} disabled={pending || uploading}>
        {pending ? <Spinner size={14} /> : null}
        Concluir cadastro
      </Button>
    </div>
  );
}
