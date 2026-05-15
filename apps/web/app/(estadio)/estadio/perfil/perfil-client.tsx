'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  BloqueioRow,
  EstadioCompleto,
  HorarioRow,
} from '@/lib/estadios-actions';
import { InformacoesTab } from './informacoes-tab';
import { FotosTab } from './fotos-tab';
import { HorariosTab } from './horarios-tab';

interface Props {
  initial: {
    estadio: EstadioCompleto;
    horarios: HorarioRow[];
    bloqueios: BloqueioRow[];
  };
}

export function PerfilEstadioClient({ initial }: Props) {
  const [estadio, setEstadio] = useState<EstadioCompleto>(initial.estadio);
  const [horarios, setHorarios] = useState<HorarioRow[]>(initial.horarios);
  const [bloqueios, setBloqueios] = useState<BloqueioRow[]>(initial.bloqueios);

  return (
    <div className="container space-y-5 py-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold leading-tight">Meu estádio</h1>
          <p className="text-xs text-muted">
            Configure informações, fotos e horários disponíveis.
          </p>
        </div>
        {estadio.ativo && estadio.publicoBuscas ? (
          <a
            href={`/estadios/${estadio.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary"
          >
            Página pública <ExternalLink size={12} />
          </a>
        ) : null}
      </header>

      <Tabs defaultValue="informacoes">
        <TabsList>
          <TabsTrigger value="informacoes">Informações</TabsTrigger>
          <TabsTrigger value="fotos">Fotos</TabsTrigger>
          <TabsTrigger value="horarios">Horários</TabsTrigger>
        </TabsList>

        <TabsContent value="informacoes">
          <InformacoesTab estadio={estadio} onUpdate={setEstadio} />
        </TabsContent>

        <TabsContent value="fotos">
          <FotosTab estadio={estadio} onUpdate={setEstadio} />
        </TabsContent>

        <TabsContent value="horarios">
          <HorariosTab
            estadioId={estadio.id}
            initialHorarios={horarios}
            initialBloqueios={bloqueios}
            onHorariosChange={setHorarios}
            onBloqueiosChange={setBloqueios}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
