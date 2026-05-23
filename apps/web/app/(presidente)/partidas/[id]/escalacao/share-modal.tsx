'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ensureShareLink } from '@/lib/share-links-actions';

interface Props {
  partidaId: string;
  disabled?: boolean;
}

export function ShareModal({ partidaId, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [formato, setFormato] = useState<'horizontal' | 'compacto'>('horizontal');
  const [info, setInfo] = useState(true);
  const [logo, setLogo] = useState(true);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);

  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingLink(true);
    ensureShareLink(partidaId, 'escalacao')
      .then((r) => {
        if (!cancelled) setShareToken(r.token);
      })
      .catch(() => {
        if (!cancelled) toast.error('Não foi possível gerar o link.');
      })
      .finally(() => {
        if (!cancelled) setLoadingLink(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, partidaId]);

  const publicPath = shareToken ? `/partidas/publico/${shareToken}/escalacao` : '';
  const publicUrl = shareToken ? `${baseUrl}${publicPath}` : '';

  function ogQuery() {
    const p = new URLSearchParams();
    p.set('formato', formato);
    p.set('info', info ? '1' : '0');
    p.set('logo', logo ? '1' : '0');
    return p.toString();
  }

  const ogUrl = shareToken ? `${baseUrl}/api/og/escalacao/${shareToken}?${ogQuery()}` : '';

  async function baixarImagem() {
    if (!ogUrl) return;
    try {
      const res = await fetch(ogUrl);
      if (!res.ok) throw new Error('fetch');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `escalacao-${partidaId}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Imagem baixada.');
    } catch {
      toast.error('Não foi possível gerar a imagem.');
    }
  }

  async function compartilharNativo() {
    if (!publicUrl || !ogUrl) return;
    try {
      const res = await fetch(ogUrl);
      if (!res.ok) throw new Error('fetch');
      const blob = await res.blob();
      const file = new File([blob], 'escalacao.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Escalação',
          text: 'Veja a escalação no RachãoApp',
          url: publicUrl,
        });
        toast.success('Compartilhado.');
      } else if (navigator.share) {
        await navigator.share({ title: 'Escalação', text: 'RachãoApp', url: publicUrl });
      } else {
        await copiarLink();
        toast.message('Link copiado — compartilhamento de arquivo não suportado neste aparelho.');
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      toast.error('Não foi possível compartilhar.');
    }
  }

  async function copiarLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Link público copiado.');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm" disabled={disabled}>
          Compartilhar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar escalação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="fmt"
                checked={formato === 'horizontal'}
                onChange={() => setFormato('horizontal')}
                className="accent-primary"
              />
              <span className="text-sm">Horizontal (1920×1080)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="fmt"
                checked={formato === 'compacto'}
                onChange={() => setFormato('compacto')}
                className="accent-primary"
              />
              <span className="text-sm">Compacto (1350×1080)</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="sh-info" checked={info} onCheckedChange={(v) => setInfo(!!v)} />
            <Label htmlFor="sh-info" className="text-sm font-normal">
              Incluir horário e local
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="sh-logo" checked={logo} onCheckedChange={(v) => setLogo(!!v)} />
            <Label htmlFor="sh-logo" className="text-sm font-normal">
              Logo RachãoApp
            </Label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button type="button" onClick={baixarImagem} disabled={!shareToken}>
              Baixar imagem
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={compartilharNativo}
              disabled={!shareToken}
            >
              Compartilhar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={copiarLink}
              disabled={!shareToken || loadingLink}
            >
              Copiar link público
            </Button>
          </div>
          {loadingLink ? (
            <p className="text-xs text-muted">Gerando link…</p>
          ) : publicUrl ? (
            <p className="break-all text-xs text-muted">{publicUrl}</p>
          ) : null}
          <p className="text-xs text-muted">
            O link expira 24 horas após o término da partida.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
