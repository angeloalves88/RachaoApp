import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { COR_HEX } from '@/lib/escalacao-ui';
import { CORES_TIME, type CorTime } from '@rachao/shared/zod';

export interface EscalacaoFieldBoleiro {
  nome: string;
  apelido?: string | null;
  posicao?: string | null;
  capitao?: boolean;
  isConvidado?: boolean;
}

export interface EscalacaoFieldTime {
  id: string;
  nome: string;
  cor: string;
  /** Titulares — exibidos dentro do campo. */
  boleiros: EscalacaoFieldBoleiro[];
  /** Reservas — exibidas fora do campo. */
  reservas?: EscalacaoFieldBoleiro[];
}

interface Props {
  times: EscalacaoFieldTime[];
  compact?: boolean;
}

function safeCor(raw: string): CorTime {
  return CORES_TIME.includes(raw as CorTime) ? (raw as CorTime) : 'blue';
}

function PlayerRow({
  b,
  timeId,
  index,
  compact,
}: {
  b: EscalacaoFieldBoleiro;
  timeId: string;
  index: number;
  compact?: boolean;
}) {
  return (
    <li
      key={`${timeId}-${index}`}
      className="flex items-center gap-2 rounded-md bg-black/25 px-2 py-1.5 backdrop-blur-sm"
    >
      {!compact ? <Avatar name={b.nome} size="sm" /> : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1">
          <span className="truncate font-medium text-white">{b.nome}</span>
          {b.isConvidado ? (
            <Badge variant="outline" className="border-white/30 px-1 py-0 text-[9px] text-white/80">
              Conv.
            </Badge>
          ) : null}
          {b.capitao ? (
            <span className="rounded bg-orange-500/30 px-1 py-0 text-[9px] font-semibold text-orange-200">
              C
            </span>
          ) : null}
        </div>
        {b.posicao ? <span className="text-[10px] text-white/50">{b.posicao}</span> : null}
      </div>
    </li>
  );
}

function ReservePlayerRow({
  b,
  timeId,
  index,
  compact,
}: {
  b: EscalacaoFieldBoleiro;
  timeId: string;
  index: number;
  compact?: boolean;
}) {
  return (
    <li
      key={`${timeId}-res-${index}`}
      className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5"
    >
      {!compact ? <Avatar name={b.nome} size="sm" /> : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1">
          <span className="truncate text-sm font-medium text-white/90">{b.nome}</span>
          {b.isConvidado ? (
            <Badge variant="outline" className="border-white/20 px-1 py-0 text-[9px] text-white/60">
              Conv.
            </Badge>
          ) : null}
          {b.capitao ? (
            <span className="rounded bg-orange-500/20 px-1 py-0 text-[9px] font-semibold text-orange-300/80">
              C
            </span>
          ) : null}
        </div>
        {b.posicao ? <span className="text-[10px] text-white/40">{b.posicao}</span> : null}
      </div>
    </li>
  );
}

function TeamColumn({
  time,
  compact,
  players,
}: {
  time: EscalacaoFieldTime;
  compact?: boolean;
  players: EscalacaoFieldBoleiro[];
}) {
  const cor = COR_HEX[safeCor(time.cor)];
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div
        className={`mb-2 rounded-md px-2 py-1 text-center font-display font-bold uppercase tracking-wide text-white ${
          compact ? 'text-xs' : 'text-sm'
        }`}
        style={{ backgroundColor: cor, boxShadow: `0 0 12px ${cor}55` }}
      >
        {time.nome}
      </div>
      <ul className={`space-y-1 ${compact ? 'text-xs' : 'text-sm'}`}>
        {players.length === 0 ? (
          <li className="rounded-md bg-black/15 px-2 py-2 text-center text-[11px] text-white/40">
            —
          </li>
        ) : (
          players.map((b, i) => (
            <PlayerRow key={i} b={b} timeId={time.id} index={i} compact={compact} />
          ))
        )}
      </ul>
    </div>
  );
}

function ReservesSection({
  times,
  compact,
}: {
  times: EscalacaoFieldTime[];
  compact?: boolean;
}) {
  const teamsWithReservas = times.filter((t) => (t.reservas?.length ?? 0) > 0);
  if (teamsWithReservas.length === 0) return null;

  const n = teamsWithReservas.length;
  const gridClass =
    n === 2
      ? 'grid grid-cols-1 gap-3 sm:grid-cols-2'
      : n === 3
        ? 'grid grid-cols-1 gap-3 md:grid-cols-3'
        : 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className="mt-4">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-white/50">
        Reservas
      </p>
      <div className={gridClass}>
        {teamsWithReservas.map((t) => {
          const cor = COR_HEX[safeCor(t.cor)];
          return (
            <div
              key={t.id}
              className="rounded-xl border border-white/10 bg-white/5 p-3"
              style={{ borderTopWidth: 3, borderTopColor: cor }}
            >
              <p
                className={`mb-2 text-center font-display font-bold uppercase tracking-wide ${
                  compact ? 'text-xs' : 'text-sm'
                }`}
                style={{ color: cor }}
              >
                {t.nome}
              </p>
              <ul className="space-y-1">
                {t.reservas!.map((b, i) => (
                  <ReservePlayerRow
                    key={i}
                    b={b}
                    timeId={t.id}
                    index={i}
                    compact={compact}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EscalacaoFieldView({ times, compact = false }: Props) {
  const n = times.length;
  const isFour = n === 4;

  const pitchGridClass = isFour
    ? 'grid grid-cols-1 gap-3 sm:grid-cols-2'
    : n === 3
      ? 'flex flex-col gap-3 md:flex-row md:items-start md:gap-4'
      : 'flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6';

  return (
    <div>
      <div
        className={`relative overflow-hidden rounded-2xl border-2 border-white/20 ${
          compact ? 'min-h-[240px]' : 'min-h-[320px] md:min-h-[380px]'
        }`}
        style={{
          background:
            'linear-gradient(180deg, #1a5f2a 0%, #2d8a3e 35%, #3da352 50%, #2d8a3e 65%, #1a5f2a 100%)',
        }}
      >
        <div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-white/35" />
        <div className="pointer-events-none absolute left-1/2 top-3 bottom-3 w-0.5 -translate-x-1/2 bg-white/35" />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/35 md:h-32 md:w-32"
          aria-hidden
        />
        {!isFour && n === 2 ? (
          <div className="pointer-events-none absolute top-3 bottom-3 left-1/4 right-1/4 border-x border-white/20" />
        ) : null}

        <div className={`relative z-10 flex h-full p-3 md:p-5 ${pitchGridClass}`}>
          {times.map((t) => (
            <TeamColumn
              key={t.id}
              time={t}
              compact={compact || isFour}
              players={t.boleiros}
            />
          ))}
        </div>
      </div>

      <ReservesSection times={times} compact={compact} />
    </div>
  );
}
