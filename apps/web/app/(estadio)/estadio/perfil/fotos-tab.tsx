'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Image as ImageIcon, Star, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { patchMeuEstadio, type EstadioCompleto } from '@/lib/estadios-actions';
import { UploadError, uploadEstadioFoto, removerEstadioFoto } from '@/lib/storage';

interface Props {
  estadio: EstadioCompleto;
  onUpdate: (e: EstadioCompleto) => void;
}

export function FotosTab({ estadio, onUpdate }: Props) {
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const total = (estadio.fotoCapaUrl ? 1 : 0) + estadio.fotos.length;
  const limite = 10;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setEnviando(true);
    try {
      const novas: string[] = [...estadio.fotos];
      let capa = estadio.fotoCapaUrl;
      for (const f of Array.from(files)) {
        if (total + (novas.length - estadio.fotos.length) >= limite) {
          toast.warning('Limite de 10 fotos atingido');
          break;
        }
        const url = await uploadEstadioFoto(f, estadio.id);
        if (!capa) capa = url;
        else novas.push(url);
      }
      const res = await patchMeuEstadio({
        fotos: novas,
        fotoCapaUrl: capa,
      });
      onUpdate(res.estadio);
      toast.success('Fotos enviadas');
    } catch (err) {
      if (err instanceof UploadError) toast.error(err.message);
      else toast.error('Falha ao enviar fotos');
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function definirComoCapa(url: string) {
    try {
      // Remove `url` da galeria e antiga capa volta para galeria.
      const novas = estadio.fotos.filter((u) => u !== url);
      if (estadio.fotoCapaUrl) novas.push(estadio.fotoCapaUrl);
      const res = await patchMeuEstadio({
        fotos: novas,
        fotoCapaUrl: url,
      });
      onUpdate(res.estadio);
      toast.success('Capa atualizada');
    } catch {
      toast.error('Falha ao atualizar capa');
    }
  }

  async function excluir(url: string) {
    if (!window.confirm('Excluir esta foto?')) return;
    try {
      const isCapa = estadio.fotoCapaUrl === url;
      const novasFotos = estadio.fotos.filter((u) => u !== url);
      const res = await patchMeuEstadio({
        fotos: novasFotos,
        fotoCapaUrl: isCapa ? null : estadio.fotoCapaUrl,
      });
      onUpdate(res.estadio);
      // Best-effort: tenta remover do storage também.
      try {
        await removerEstadioFoto(url);
      } catch {
        // Silencia — a foto ficou orfã no storage mas saiu da galeria.
      }
      toast.success('Foto excluída');
    } catch {
      toast.error('Falha ao excluir foto');
    }
  }

  const todas = [
    ...(estadio.fotoCapaUrl ? [{ url: estadio.fotoCapaUrl, isCapa: true }] : []),
    ...estadio.fotos.map((u) => ({ url: u, isCapa: false })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{total} de {limite} fotos</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={enviando || total >= limite}
        >
          <Upload size={14} />
          {enviando ? 'Enviando...' : 'Adicionar'}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {todas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          <ImageIcon size={28} strokeWidth={1.5} className="mx-auto mb-2 text-faint" />
          <p>Nenhuma foto ainda. Adicione até 10 imagens.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {todas.map((f) => (
            <div
              key={f.url}
              className="group relative aspect-video overflow-hidden rounded-md border border-border bg-surface-2"
            >
              <Image
                src={f.url}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover"
                unoptimized
              />
              {f.isCapa ? (
                <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  <Star size={10} /> Capa
                </span>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                {!f.isCapa ? (
                  <button
                    type="button"
                    onClick={() => definirComoCapa(f.url)}
                    className="rounded bg-surface/90 p-1 text-xs hover:bg-surface"
                    aria-label="Definir como capa"
                  >
                    <Star size={12} />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => excluir(f.url)}
                  className="rounded bg-error-highlight/90 p-1 text-destructive hover:bg-error-highlight"
                  aria-label="Excluir"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted">
        JPG, PNG ou WEBP. Máximo 5MB por foto. Total: {limite} fotos.
      </p>
    </div>
  );
}
