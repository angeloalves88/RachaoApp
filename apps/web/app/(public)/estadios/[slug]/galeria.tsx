'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Lightbox } from '@/components/ui/lightbox';

interface Props {
  fotos: string[];
  alt?: string;
}

export function GaleriaPublica({ fotos, alt = '' }: Props) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  if (fotos.length === 0) return null;
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {fotos.map((url, idx) => (
          <button
            key={url}
            type="button"
            onClick={() => setOpenAt(idx)}
            aria-label={`Abrir foto ${idx + 1} de ${fotos.length}`}
            className="relative aspect-video overflow-hidden rounded-md border border-border bg-surface-2 transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <Image
              src={url}
              alt={alt}
              fill
              sizes="33vw"
              className="object-cover"
              unoptimized
            />
          </button>
        ))}
      </div>

      <Lightbox
        images={fotos}
        startIndex={openAt}
        onClose={() => setOpenAt(null)}
        alt={alt}
      />
    </>
  );
}
