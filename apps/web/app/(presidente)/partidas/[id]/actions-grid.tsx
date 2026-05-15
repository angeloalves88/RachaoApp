'use client';

import Link from 'next/link';
import type { PartidaDetalhe } from '@/lib/types';

interface Props {
  partida: PartidaDetalhe;
}

interface ActionCard {
  href: string;
  label: string;
  icon: string;
  hint?: string;
  disabled?: boolean;
}

export function ActionsGrid({ partida }: Props) {
  const cards = cardsFor(partida);
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {cards.map((c, idx) => (
        <ActionTile key={idx} {...c} />
      ))}
    </div>
  );
}

function cardsFor(partida: PartidaDetalhe): ActionCard[] {
  const vagas = partida.numTimes * (partida.boleirosPorTime + (partida.reservasPorTime ?? 0));
  const confs = partida.resumo.confirmados;
  switch (partida.status) {
    case 'agendada':
      return [
        {
          href: `/partidas/${partida.id}/presencas`,
          label: 'Presenças',
          icon: '👥',
          hint: `${confs}/${vagas}`,
        },
        {
          href: `/partidas/${partida.id}/escalacao`,
          label: 'Escalação',
          icon: '⚽',
          hint: 'Montar times',
        },
        {
          href: `/partidas/${partida.id}/vaquinha`,
          label: 'Vaquinha',
          icon: '💰',
          hint: partida.vaquinha ? `R$ ${partida.vaquinha.totalEsperado.toFixed(0)}` : 'Sem',
        },
        {
          href: `/partidas/${partida.id}/presencas?reenviar=true`,
          label: 'Reenviar convites',
          icon: '✉️',
          hint: `${partida.resumo.pendentes} pendentes`,
        },
      ];
    case 'em_andamento':
      return [
        { href: `/partidas/${partida.id}/ao-vivo`, label: 'Ao vivo', icon: '🔴', hint: 'Registrar eventos' },
        { href: `/partidas/${partida.id}/escalacao`, label: 'Escalação', icon: '⚽', hint: 'Visualizar' },
        {
          href: `/partidas/${partida.id}/vaquinha`,
          label: 'Vaquinha',
          icon: '💰',
          hint: partida.vaquinha ? `R$ ${partida.vaquinha.arrecadado.toFixed(0)}` : 'Sem',
        },
        { href: '#', label: '—', icon: '·', disabled: true },
      ];
    case 'encerrada':
      return [
        { href: `/partidas/${partida.id}/resumo`, label: 'Resumo', icon: '📊', hint: 'Placar e artilharia' },
        {
          href: `/partidas/${partida.id}/vaquinha`,
          label: 'Vaquinha',
          icon: '💰',
          hint: partida.vaquinha
            ? `R$ ${partida.vaquinha.arrecadado.toFixed(0)} / ${partida.vaquinha.totalEsperado.toFixed(0)}`
            : 'Sem',
        },
        {
          href: `/partidas/nova?grupoId=${partida.grupo.id}`,
          label: 'Repetir partida',
          icon: '🔁',
        },
        { href: '#', label: '—', icon: '·', disabled: true },
      ];
    case 'cancelada':
      return [
        {
          href: `/partidas/nova?grupoId=${partida.grupo.id}`,
          label: 'Reagendar',
          icon: '📅',
        },
        { href: '#', label: '—', icon: '·', disabled: true },
        { href: '#', label: '—', icon: '·', disabled: true },
        { href: '#', label: '—', icon: '·', disabled: true },
      ];
  }
}

function ActionTile({ href, label, icon, hint, disabled }: ActionCard) {
  const base =
    'flex flex-col items-start gap-1 rounded-lg border border-border bg-surface p-3 transition-colors';
  if (disabled) {
    return (
      <div className={`${base} cursor-not-allowed opacity-50`} aria-disabled>
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      </div>
    );
  }
  return (
    <Link href={href} className={`${base} hover:bg-surface-2`}>
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <p className="text-sm font-medium">{label}</p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </Link>
  );
}
