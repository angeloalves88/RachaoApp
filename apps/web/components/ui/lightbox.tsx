'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

interface LightboxProps {
  /** Lista de URLs (ordenadas). */
  images: string[];
  /** Indice inicial; null mantem o modal fechado. */
  startIndex: number | null;
  onClose: () => void;
  /** Texto alternativo aplicado a todas as imagens. */
  alt?: string;
}

/**
 * Lightbox modal simples: setas (teclado + UI), swipe touch e fecha por ESC ou
 * clique fora. Usa o `Dialog` ja existente para garantir foco e a11y.
 */
export function Lightbox({ images, startIndex, onClose, alt = '' }: LightboxProps) {
  const open = startIndex !== null;
  const [index, setIndex] = useState(startIndex ?? 0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    if (startIndex !== null) setIndex(startIndex);
  }, [startIndex]);

  const total = images.length;

  const next = useCallback(() => {
    if (total === 0) return;
    setIndex((i) => (i + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    if (total === 0) return;
    setIndex((i) => (i - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, next, prev]);

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX == null) return;
    const dx = e.changedTouches[0]!.clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      if (dx < 0) next();
      else prev();
    }
    setTouchStartX(null);
  }

  if (!open) return null;
  const src = images[index];

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent
        className="max-w-3xl border-none bg-black/95 p-0 sm:rounded-md"
        showClose={false}
        fullScreenOnMobile={false}
      >
        <DialogTitle className="sr-only">Visualizador de foto</DialogTitle>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
        >
          <X size={18} aria-hidden />
        </button>

        <div
          className="relative flex h-[70vh] items-center justify-center"
          onTouchStart={(e) => setTouchStartX(e.touches[0]!.clientX)}
          onTouchEnd={handleTouchEnd}
        >
          {src ? (
            <Image
              key={src}
              src={src}
              alt={alt}
              fill
              className="object-contain"
              sizes="100vw"
              unoptimized
              priority
            />
          ) : null}

          {total > 1 ? (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Foto anterior"
                className="absolute left-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <ChevronLeft size={20} aria-hidden />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Próxima foto"
                className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <ChevronRight size={20} aria-hidden />
              </button>
            </>
          ) : null}
        </div>

        {total > 1 ? (
          <p className="bg-black/70 px-3 py-1.5 text-center text-xs text-white">
            {index + 1} / {total}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
