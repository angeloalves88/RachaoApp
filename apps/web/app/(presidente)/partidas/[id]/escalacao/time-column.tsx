'use client';

import { ArrowDown, ArrowUp, Crown } from 'lucide-react';
import type { CorTime } from '@rachao/shared/zod';
import { CORES_TIME } from '@rachao/shared/zod';
import { Avatar } from '@/components/ui/avatar';
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
}

interface Props {
  nome: string;
  onNomeChange: (v: string) => void;
  cor: CorTime;
  onCorChange: (c: CorTime) => void;
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
  onCorChange,
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
  const hasReservasZone = reservasPorTime > 0 || reservasMembers.length > 0;
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
        {!readOnly ? (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Cor do time">
            {CORES_TIME.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                className={`h-6 w-6 rounded-full border-2 transition-transform ${
                  cor === c ? 'scale-110 border-foreground' : 'border-transparent opacity-80'
                }`}
                style={{ backgroundColor: COR_HEX[c] }}
                onClick={() => onCorChange(c)}
              />
            ))}
          </div>
        ) : null}
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
            Reservas: {reservasMembers.length}/{reservasPorTime}
            {reservasMembers.length > reservasPorTime ? (
              <span className="ml-1 font-medium text-destructive"> — acima do limite</span>
            ) : null}
          </span>
        ) : null}
      </div>

      <MemberList
        members={members}
        readOnly={readOnly}
        capitaoConviteId={capitaoConviteId}
        onCapitaoChange={onCapitaoChange}
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
            capitaoConviteId={capitaoConviteId}
            onCapitaoChange={onCapitaoChange}
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
  capitaoConviteId,
  onCapitaoChange,
  onRemove,
  showRemove,
  emptyLabel,
  moveButton,
}: {
  members: TimeColumnMember[];
  readOnly: boolean;
  capitaoConviteId: string | null;
  onCapitaoChange: (conviteId: string | null) => void;
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
              <Button
                type="button"
                variant={capitaoConviteId === m.conviteId ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                aria-label={capitaoConviteId === m.conviteId ? 'Capitão' : 'Marcar capitão'}
                onClick={() =>
                  onCapitaoChange(capitaoConviteId === m.conviteId ? null : m.conviteId)
                }
              >
                <Crown className="h-4 w-4" />
              </Button>
              {showRemove ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-destructive"
                  onClick={() => onRemove(m.conviteId)}
                >
                  Remover
                </Button>
              ) : null}
            </div>
          ) : capitaoConviteId === m.conviteId ? (
            <Crown className="h-4 w-4 shrink-0 text-primary" aria-label="Capitão" />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
