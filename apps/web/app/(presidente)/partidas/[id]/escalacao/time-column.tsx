'use client';

import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import type { CorTime } from '@rachao/shared/zod';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PresencaStripEstado } from '@/lib/escalacao-actions';
import { COR_HEX } from '@/lib/escalacao-ui';
import { PresencaStrip } from './presenca-strip';

export interface TimeColumnMember {
  conviteId: string;
  nome: string;
  apelido: string | null;
  posicao?: string | null;
  presencaStrip?: PresencaStripEstado[] | null;
  isConvidado?: boolean;
}

interface Props {
  nome: string;
  onNomeChange: (v: string) => void;
  cor: CorTime;
  members: TimeColumnMember[];
  /** Reservas opcionais (renderiza segunda lista quando reservasPorTime > 0). */
  reservasMembers?: TimeColumnMember[];
  reservasPorTime?: number;
  capitaoConviteId: string | null;
  onCapitaoChange: (conviteId: string | null) => void;
  onRemove: (conviteId: string) => void;
  /** Promove um reserva a titular ou rebaixa um titular para reserva. */
  onMoverReserva?: (conviteId: string, paraReserva: boolean) => void;
  readOnly: boolean;
  boleirosPorTime: number;
  /** No modo automático costuma-se ocultar remoção (re-sortear). */
  showRemove?: boolean;
}

export function TimeColumn({
  nome,
  onNomeChange,
  cor,
  members,
  reservasMembers = [],
  reservasPorTime = 0,
  capitaoConviteId,
  onCapitaoChange,
  onRemove,
  onMoverReserva,
  readOnly,
  boleirosPorTime,
  showRemove = true,
}: Props) {
  const reservasIlimitadas = boleirosPorTime === 0 || reservasPorTime === 0;
  const hasReservasZone =
    reservasIlimitadas || reservasPorTime > 0 || reservasMembers.length > 0;
  return (
    <div
      className="flex min-h-[200px] flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3"
      style={{ borderTopWidth: 4, borderTopColor: COR_HEX[cor] }}
    >
      <div className="flex flex-wrap items-center gap-2">
        {readOnly ? (
          <p className="font-display text-base font-semibold">{nome}</p>
        ) : (
          <Input
            value={nome}
            onChange={(e) => onNomeChange(e.target.value)}
            className="h-9 max-w-[140px] font-display text-sm font-semibold"
            maxLength={20}
            aria-label="Nome do time"
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span>
          Titulares: {members.length}/{boleirosPorTime}
          {members.length > boleirosPorTime ? (
            <span className="ml-1 font-medium text-destructive"> — acima do limite</span>
          ) : null}
        </span>
        {hasReservasZone ? (
          <span>
            Reservas: {reservasMembers.length}
            {!reservasIlimitadas ? `/${reservasPorTime}` : ''}
            {!reservasIlimitadas && reservasMembers.length > reservasPorTime ? (
              <span className="ml-1 font-medium text-destructive"> — acima do limite</span>
            ) : null}
          </span>
        ) : null}
      </div>

      <MemberList
        members={members}
        readOnly={readOnly}
        onRemove={onRemove}
        showRemove={showRemove}
        emptyLabel="Sem titulares"
        moveButton={
          onMoverReserva && !readOnly
            ? {
                icon: <ArrowDown className="h-3.5 w-3.5" />,
                label: 'Mover para reservas',
                onClick: (id) => onMoverReserva(id, true),
              }
            : null
        }
      />

      {hasReservasZone ? (
        <div className="mt-1 border-t border-dashed border-border pt-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Reservas
          </p>
          <MemberList
            members={reservasMembers}
            readOnly={readOnly}
            onRemove={onRemove}
            showRemove={showRemove}
            emptyLabel="Sem reservas"
            moveButton={
              onMoverReserva && !readOnly
                ? {
                    icon: <ArrowUp className="h-3.5 w-3.5" />,
                    label: 'Promover a titular',
                    onClick: (id) => onMoverReserva(id, false),
                  }
                : null
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function MemberList({
  members,
  readOnly,
  onRemove,
  showRemove,
  emptyLabel,
  moveButton,
}: {
  members: TimeColumnMember[];
  readOnly: boolean;
  onRemove: (conviteId: string) => void;
  showRemove: boolean;
  emptyLabel: string;
  moveButton: { icon: React.ReactNode; label: string; onClick: (id: string) => void } | null;
}) {
  if (members.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border py-3 text-center text-xs text-muted">
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {members.map((m) => (
        <li
          key={m.conviteId}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5"
        >
          <Avatar name={m.nome} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-medium">{m.nome}</p>
              {m.posicao ? (
                <span className="rounded bg-surface-2 px-1 py-0.5 text-[10px] font-semibold text-muted">
                  {m.posicao}
                </span>
              ) : null}
              {m.isConvidado ? (
                <Badge variant="outline" className="px-1 py-0 text-[10px]">
                  Convidado
                </Badge>
              ) : null}
              {m.presencaStrip ? <PresencaStrip estados={m.presencaStrip} /> : null}
            </div>
            {m.apelido ? <p className="truncate text-xs text-muted">{m.apelido}</p> : null}
          </div>
          {!readOnly ? (
            <div className="flex shrink-0 items-center gap-0.5">
              {moveButton ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={moveButton.label}
                  onClick={() => moveButton.onClick(m.conviteId)}
                >
                  {moveButton.icon}
                </Button>
              ) : null}
              {showRemove ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  aria-label="Remover do time"
                  onClick={() => onRemove(m.conviteId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
