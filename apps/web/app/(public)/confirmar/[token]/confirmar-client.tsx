'use client';

import { useState } from 'react';
import { Check, Stethoscope, X } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type ConviteStatus = 'pendente' | 'confirmado' | 'recusado' | 'lista_espera' | 'departamento_medico';
type RespostaStatus = 'confirmado' | 'recusado' | 'departamento_medico';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

interface InitialData {
  convite: {
    id: string;
    status: ConviteStatus;
    recado: string | null;
    confirmadoEm: string | null;
    tipo: string;
  };
  partida: {
    id: string;
    dataHora: string;
    dataFormatada: string;
    status: string;
    local: string | null;
    numTimes: number;
    boleirosPorTime: number;
    reservasPorTime?: number;
    tempoTotal: number;
  };
  grupo: { id: string; nome: string; fotoUrl: string | null };
  boleiro: { nome: string; apelido: string | null };
  expirado: boolean;
  partidaCancelada: boolean;
  podeResponder: boolean;
}

interface Props {
  token: string;
  initialData: InitialData;
}

const STATUS_LABEL: Record<ConviteStatus, string> = {
  pendente: 'Pendente',
  confirmado: 'Voce confirmou presenca',
  recusado: 'Voce recusou o convite',
  lista_espera: 'Lista de espera',
  departamento_medico: 'Voce esta no departamento medico',
};

export function ConfirmarClient({ token, initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [recado, setRecado] = useState(data.convite.recado ?? '');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const respondido =
    data.convite.status === 'confirmado' ||
    data.convite.status === 'recusado' ||
    data.convite.status === 'departamento_medico';

  async function responder(status: RespostaStatus) {
    setBusy(true);
    setErro(null);
    try {
      const res = await fetch(`${API_URL}/api/convites/publico/${token}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, recado: recado.trim() || null }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setErro(body?.message ?? 'Nao foi possivel registrar sua resposta.');
        return;
      }
      const body = (await res.json()) as { convite: { status: RespostaStatus } };
      setData({
        ...data,
        convite: {
          ...data.convite,
          status: body.convite.status,
          recado: recado.trim() || null,
          confirmadoEm: status === 'confirmado' ? new Date().toISOString() : null,
        },
        podeResponder: false,
      });
    } catch {
      setErro('Falha ao conectar com o servidor.');
    } finally {
      setBusy(false);
    }
  }

  if (data.partidaCancelada) {
    return (
      <Card>
        <p className="text-xs uppercase tracking-wider text-destructive">Partida cancelada</p>
        <h1 className="mt-1 font-display text-2xl font-bold">
          Esta partida foi cancelada.
        </h1>
        <p className="mt-2 text-sm text-muted">
          Aguarde novidades do {data.grupo.nome} ou entre em contato com o presidente.
        </p>
      </Card>
    );
  }

  if (data.expirado) {
    return (
      <Card>
        <p className="text-xs uppercase tracking-wider text-warning">Link expirado</p>
        <h1 className="mt-1 font-display text-2xl font-bold">
          Esse link nao e mais valido.
        </h1>
        <p className="mt-2 text-sm text-muted">
          Peca para o presidente do {data.grupo.nome} reenviar o convite.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-3">
        <Avatar name={data.grupo.nome} src={data.grupo.fotoUrl ?? undefined} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-muted">{data.grupo.nome}</p>
          <h1 className="font-display text-2xl font-bold leading-tight">
            E ai, {data.boleiro.nome.split(' ')[0]}!
          </h1>
        </div>
      </div>

      <div className="mt-4 space-y-2 rounded-md border border-border bg-surface-2 p-3 text-sm">
        <p>
          <strong>Quando:</strong> {data.partida.dataFormatada}
        </p>
        {data.partida.local ? (
          <p>
            <strong>Onde:</strong> {data.partida.local}
          </p>
        ) : null}
        <p className="text-xs text-muted">
          {data.partida.numTimes} times · {data.partida.numTimes * (data.partida.boleirosPorTime + (data.partida.reservasPorTime ?? 0))} vagas · {data.partida.tempoTotal} min
        </p>
      </div>

      {respondido ? (
        <div className="mt-4 space-y-2">
          <Badge
            variant={
              data.convite.status === 'confirmado'
                ? 'success'
                : data.convite.status === 'departamento_medico'
                  ? 'warning'
                  : 'destructive'
            }
          >
            {STATUS_LABEL[data.convite.status]}
          </Badge>
          <p className="text-xs text-muted">
            Voce pode mudar sua resposta usando os botoes abaixo enquanto o convite estiver ativo.
          </p>
          {data.convite.recado ? (
            <p className="rounded-md bg-surface-2 px-3 py-2 text-sm">
              <strong>Seu recado:</strong> {data.convite.recado}
            </p>
          ) : null}
          {data.podeResponder ? (
            <RespostaActions
              busy={busy}
              recado={recado}
              setRecado={setRecado}
              responder={responder}
              statusAtual={data.convite.status}
            />
          ) : null}
          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted">
            Bata o joinha pra galera saber se voce vai.
          </p>
          <RespostaActions
            busy={busy}
            recado={recado}
            setRecado={setRecado}
            responder={responder}
          />
          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
        </div>
      )}
    </Card>
  );
}

function RespostaActions({
  busy,
  recado,
  setRecado,
  responder,
  statusAtual,
}: {
  busy: boolean;
  recado: string;
  setRecado: (v: string) => void;
  responder: (s: RespostaStatus) => void;
  statusAtual?: ConviteStatus;
}) {
  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Recado pro grupo (opcional)"
        value={recado}
        onChange={(e) => setRecado(e.target.value)}
        rows={3}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="flex-1"
          onClick={() => responder('confirmado')}
          disabled={busy || statusAtual === 'confirmado'}
        >
          <Check size={16} /> Vou jogar
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => responder('recusado')}
          disabled={busy || statusAtual === 'recusado'}
        >
          <X size={16} /> Nao posso ir
        </Button>
      </div>
      <Button
        variant="ghost"
        className="w-full text-warning hover:bg-warning/10"
        onClick={() => responder('departamento_medico')}
        disabled={busy || statusAtual === 'departamento_medico'}
      >
        <Stethoscope size={16} /> Estou no departamento medico
      </Button>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full rounded-lg border border-border bg-surface p-6 shadow-md">{children}</div>
  );
}
