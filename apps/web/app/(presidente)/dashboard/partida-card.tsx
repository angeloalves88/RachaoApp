'use client';

import Link from 'next/link';
import { CalendarPlus, MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CountdownBadge } from '@/components/dashboard/countdown-badge';
import { formatDataPartida } from '@/lib/format';
import type { DashboardSummary } from '@/lib/types';
import { CancelarPartidaButton } from '@/app/(presidente)/partidas/[id]/cancelar-button';

type Partida = DashboardSummary['proximasPartidas'][number];

interface Props {
  partida: Partida;
  /** Se true, exibe a badge "PROXIMA PARTIDA" em destaque (use para o primeiro card). */
  destaque?: boolean;
}

/**
 * Card clicavel de uma partida no dashboard. Toda a area do card navega para
 * /partidas/[id]; o botao de 3 pontos (canto superior direito) abre um menu de
 * acoes (Cancelar partida) sem disparar a navegacao.
 *
 * Se a partida pertence a uma serie recorrente, o item Cancelar abre um dialog
 * com escolha de escopo (apenas esta vs esta + proximas).
 *
 * Nota: o endpoint /api/dashboard nao expoe serieRestantes (so serieId), entao
 * passamos um valor estimado (1) quando ha serieId. O dialog ajusta o texto
 * dinamicamente; a quantidade real e mostrada na pagina de detalhe.
 */
export function PartidaCard({ partida, destaque = false }: Props) {
  const pendentes = Math.max(0, partida.totalConvites - partida.confirmados);
  const vagasLivres = Math.max(0, partida.vagasTotais - partida.confirmados);
  const progresso =
    partida.vagasTotais > 0
      ? Math.min(100, Math.round((partida.confirmados / partida.vagasTotais) * 100))
      : 0;

  const podeCancelar = partida.status === 'agendada' || partida.status === 'em_andamento';

  return (
    <Card
      className={
        destaque
          ? 'relative h-full overflow-hidden border-primary/40 bg-gradient-to-br from-primary-highlight to-surface'
          : 'relative h-full overflow-hidden'
      }
    >
      <Link
        href={`/partidas/${partida.id}`}
        aria-label={`Abrir partida de ${partida.grupo.nome}`}
        className="absolute inset-0 z-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="pointer-events-none absolute left-3 top-3 z-10">
        {destaque ? (
          <Badge variant="primary">PROXIMA PARTIDA</Badge>
        ) : (
          <Badge variant="default">AGENDADA</Badge>
        )}
      </div>

      <div className="absolute right-2 top-2 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Mais acoes"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface/80 text-foreground backdrop-blur-sm transition-colors hover:bg-surface"
            >
              <MoreVertical size={18} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuItem asChild>
              <Link
                href={`/partidas/${partida.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                Abrir detalhe
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={`/partidas/nova?grupoId=${partida.grupo.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <CalendarPlus size={14} />
                Nova partida deste grupo
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <CancelarPartidaButton
              partidaId={partida.id}
              disabled={!podeCancelar}
              serieId={partida.serieId}
              serieRestantes={partida.serieId ? 1 : 0}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardContent className="relative z-10 space-y-3 p-5 pt-12">
        <div>
          <p className="truncate text-xs uppercase tracking-wider text-muted">
            {partida.grupo.nome}
          </p>
          <p className="font-display text-xl font-bold leading-tight">
            {formatDataPartida(partida.dataHora)}
          </p>
          {partida.local ? (
            <p className="truncate text-sm text-muted">📍 {partida.local}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted">
            <span className="font-medium text-foreground">{partida.confirmados} confirmados</span>
            {' · '}
            {vagasLivres} {vagasLivres === 1 ? 'vaga' : 'vagas'}
            {' · '}
            {pendentes} pendentes
          </p>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface-offset"
            aria-hidden
          >
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progresso}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CountdownBadge dataHora={partida.dataHora} />
            {partida.serieId ? (
              <Badge variant="primarySoft" className="text-[10px]">
                ↻ Recorrente
              </Badge>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
