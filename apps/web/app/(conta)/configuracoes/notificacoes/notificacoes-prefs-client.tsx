'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { EventoNotificacao } from '@rachao/shared/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { putPrefsNotificacao, type PrefsNotificacaoResponse } from '@/lib/perfil-actions';

const EVENTO_LABEL: Record<EventoNotificacao, string> = {
  presenca_confirmada: 'Boleiro confirmou presença',
  presenca_recusada: 'Boleiro recusou presença',
  lista_espera_promovido: 'Vaga aberta na lista de espera',
  partida_24h: 'Lembrete de partida (24h antes)',
  vaquinha_pendente: 'Vaquinha pendente',
  estadio_aprovado: 'Dono do Estádio aprovou vínculo',
  estadio_recusado: 'Dono do Estádio recusou vínculo',
  partida_cancelada: 'Partida cancelada',
  nova_solicitacao: 'Nova solicitação de vínculo',
  presidente_cancelou_partida: 'Presidente cancelou partida',
};

const PRESIDENTE_EVENTOS: EventoNotificacao[] = [
  'presenca_confirmada',
  'presenca_recusada',
  'lista_espera_promovido',
  'partida_24h',
  'vaquinha_pendente',
  'estadio_aprovado',
  'estadio_recusado',
  'partida_cancelada',
];
const DONO_EVENTOS: EventoNotificacao[] = ['nova_solicitacao', 'presidente_cancelou_partida'];

interface Props {
  initial: PrefsNotificacaoResponse;
  perfis: string[];
  email: string;
}

export function NotificacoesPrefsClient({ initial, perfis, email }: Props) {
  const router = useRouter();
  const [notifEmail, setNotifEmail] = useState(initial.notifEmail);
  const [notifWhatsapp, setNotifWhatsapp] = useState(initial.notifWhatsapp);
  const [eventos, setEventos] = useState(() => {
    const m = new Map(initial.eventos.map((e) => [e.evento, e]));
    return m;
  });
  const [isPending, startTransition] = useTransition();

  const isDono = perfis.includes('dono_estadio');

  function setEvento(evt: EventoNotificacao, field: 'canalEmail' | 'canalWhatsapp', v: boolean) {
    setEventos((prev) => {
      const n = new Map(prev);
      const cur = n.get(evt) ?? { evento: evt, canalEmail: true, canalWhatsapp: true };
      n.set(evt, { ...cur, [field]: v });
      return n;
    });
  }

  function salvar() {
    startTransition(async () => {
      try {
        const arr = Array.from(eventos.values());
        await putPrefsNotificacao({
          notifEmail,
          notifWhatsapp,
          eventos: arr,
        });
        toast.success('Preferências salvas');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Falha ao salvar');
      }
    });
  }

  return (
    <div className="container space-y-5 py-5">
      <header>
        <h1 className="font-display text-2xl font-bold leading-tight">Notificações</h1>
        <p className="text-xs text-muted">Escolha por qual canal deseja receber cada aviso.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Canais globais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label>E-mail</Label>
              <p className="text-xs text-muted">{email}</p>
            </div>
            <Switch checked={notifEmail} onCheckedChange={setNotifEmail} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label>WhatsApp</Label>
              <p className="text-xs text-muted">Número cadastrado no perfil</p>
            </div>
            <Switch checked={notifWhatsapp} onCheckedChange={setNotifWhatsapp} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Presidente</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0 pb-4">
          <EventosTable
            keys={PRESIDENTE_EVENTOS}
            eventos={eventos}
            onToggle={setEvento}
            disabledGlobalEmail={!notifEmail}
            disabledGlobalWa={!notifWhatsapp}
          />
        </CardContent>
      </Card>

      {isDono ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dono do Estádio</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto px-0 pb-4">
            <EventosTable
              keys={DONO_EVENTOS}
              eventos={eventos}
              onToggle={setEvento}
              disabledGlobalEmail={!notifEmail}
              disabledGlobalWa={!notifWhatsapp}
            />
          </CardContent>
        </Card>
      ) : null}

      <Button onClick={salvar} disabled={isPending} className="w-full">
        {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
        Salvar preferências
      </Button>
    </div>
  );
}

function EventosTable({
  keys,
  eventos,
  onToggle,
  disabledGlobalEmail,
  disabledGlobalWa,
}: {
  keys: EventoNotificacao[];
  eventos: Map<EventoNotificacao, { evento: EventoNotificacao; canalEmail: boolean; canalWhatsapp: boolean }>;
  onToggle: (e: EventoNotificacao, f: 'canalEmail' | 'canalWhatsapp', v: boolean) => void;
  disabledGlobalEmail: boolean;
  disabledGlobalWa: boolean;
}) {
  return (
    <table className="w-full min-w-[320px] text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs text-muted">
          <th className="px-4 py-2 font-medium">Evento</th>
          <th className="px-2 py-2 text-center font-medium">E-mail</th>
          <th className="px-2 py-2 text-center font-medium">WhatsApp</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((evt) => {
          const row = eventos.get(evt) ?? { evento: evt, canalEmail: true, canalWhatsapp: true };
          return (
            <tr key={evt} className="border-b border-border last:border-0">
              <td className="px-4 py-2.5">{EVENTO_LABEL[evt]}</td>
              <td className="px-2 py-2 text-center">
                <Switch
                  checked={row.canalEmail}
                  disabled={disabledGlobalEmail}
                  onCheckedChange={(v) => onToggle(evt, 'canalEmail', v)}
                />
              </td>
              <td className="px-2 py-2 text-center">
                <Switch
                  checked={row.canalWhatsapp}
                  disabled={disabledGlobalWa}
                  onCheckedChange={(v) => onToggle(evt, 'canalWhatsapp', v)}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
