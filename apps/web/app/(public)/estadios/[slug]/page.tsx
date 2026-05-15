import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GaleriaPublica } from './galeria';

export const dynamic = 'force-dynamic';

interface PublicEstadio {
  id: string;
  slug: string;
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
  tipoEspaco: string;
  tipoPiso: string[];
  capacidade: number;
  comodidades: string[];
  descricao: string | null;
  fotoCapaUrl: string | null;
  fotos: string[];
}

interface PublicHorario {
  id: string;
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  intervaloMinutos: number;
}

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const COMODIDADES_LABEL: Record<string, string> = {
  vestiario: 'Vestiário',
  estacionamento: 'Estacionamento',
  iluminacao_noturna: 'Iluminação noturna',
  banheiros: 'Banheiros',
  lanchonete: 'Lanchonete',
  arquibancada: 'Arquibancada',
};

const PISO_LABEL: Record<string, string> = {
  grama_natural: 'Grama natural',
  sintetico: 'Sintético',
  cimento: 'Cimento',
  saibro: 'Saibro',
  areia: 'Areia',
  parquet: 'Parquet',
  salao: 'Salão',
};

export default async function EstadioPublicoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let data: { estadio: PublicEstadio; horarios: PublicHorario[] } | null = null;
  try {
    data = await apiFetch(`/api/estadios/publico/${slug}`);
  } catch {
    notFound();
  }
  if (!data) notFound();
  const { estadio, horarios } = data;

  return (
    <div className="min-h-dvh bg-background pb-12">
      {/* Hero */}
      <header className="relative h-64 w-full bg-gradient-to-br from-primary-highlight to-surface-2">
        {estadio.fotoCapaUrl ? (
          <Image
            src={estadio.fotoCapaUrl}
            alt={estadio.nome}
            fill
            sizes="100vw"
            className="object-cover"
            priority
            unoptimized
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="container relative flex h-full flex-col justify-end pb-4">
          <Badge variant="primarySoft" className="self-start">
            {estadio.tipoEspaco}
          </Badge>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-foreground">
            {estadio.nome}
          </h1>
          <p className="flex items-center gap-1 text-sm text-foreground/90">
            <MapPin size={14} />
            {estadio.cidade}/{estadio.estado}
          </p>
        </div>
      </header>

      <main className="container space-y-6 py-5">
        {/* CTA */}
        <Card>
          <CardContent className="space-y-2 px-4 py-4">
            <p className="text-sm">
              Gostou do espaço? Faça login como Presidente e solicite seu horário.
            </p>
            <Button asChild className="w-full">
              <Link href={`/partidas/nova?estadioId=${estadio.id}`}>
                Solicitar horário
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Info */}
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Informações</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Endereço</dt>
              <dd>{estadio.endereco || 'Não informado'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Capacidade</dt>
              <dd className="flex items-center gap-1">
                <Users size={14} /> Até {estadio.capacidade} por time
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-muted">Piso</dt>
              <dd>
                {estadio.tipoPiso.length === 0
                  ? 'Não informado'
                  : estadio.tipoPiso.map((p) => PISO_LABEL[p] ?? p).join(', ')}
              </dd>
            </div>
          </dl>
        </section>

        {/* Descricao */}
        {estadio.descricao ? (
          <section className="space-y-1">
            <h2 className="font-display text-lg font-semibold">Sobre</h2>
            <p className="text-sm text-foreground/90">{estadio.descricao}</p>
          </section>
        ) : null}

        {/* Comodidades */}
        {estadio.comodidades.length > 0 ? (
          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold">Comodidades</h2>
            <div className="flex flex-wrap gap-1.5">
              {estadio.comodidades.map((c) => (
                <Badge key={c} variant="outline">
                  {COMODIDADES_LABEL[c] ?? c}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        {/* Horarios */}
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Horários disponíveis</h2>
          {horarios.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-surface px-3 py-3 text-sm text-muted">
              Horários não configurados ainda.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {horarios.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm"
                >
                  <span className="font-medium">{DIAS[h.diaSemana]}</span>
                  <span className="text-muted">
                    {h.horaInicio} – {h.horaFim}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Galeria */}
        {estadio.fotos.length > 0 ? (
          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold">Galeria</h2>
            <GaleriaPublica fotos={estadio.fotos} alt={`Foto de ${estadio.nome}`} />
          </section>
        ) : null}
      </main>
    </div>
  );
}
