'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Crown, Lock } from 'lucide-react';
import { toast } from 'sonner';
import type { CorTime } from '@rachao/shared/zod';
import { CORES_TIME } from '@rachao/shared/zod';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  EscalacaoElegivel,
  EscalacaoTimeRow,
  PresencaStripEstado,
} from '@/lib/escalacao-actions';
import { saveEscalacao } from '@/lib/escalacao-actions';
import { COR_HEX } from '@/lib/escalacao-ui';
import { PresencaStrip } from './presenca-strip';

type TimeMeta = { nome: string; cor: CorTime; capitaoConviteId: string | null };

// IDs dos containers do dnd-kit usam o prefixo `col:` para nao colidir com IDs
// de convites (cuids). Mantemos `pool` mapeado em `col:pool`, cada time titular
// em `col:time:<idx>` e cada time reserva em `col:res:<idx>`. O state interno
// usa as mesmas chaves.
const POOL_ID = 'col:pool';
const teamId = (idx: number): string => `col:time:${idx}`;
const reservaId = (idx: number): string => `col:res:${idx}`;
const isContainerId = (s: string): boolean => s.startsWith('col:');
const isTeamContainer = (s: string): boolean => s.startsWith('col:time:');

function normalizeMeta(cols: Record<string, string[]>, meta: TimeMeta[], numTimes: number): TimeMeta[] {
  return meta.map((m, i) => {
    const tit = cols[teamId(i)] ?? [];
    const res = cols[reservaId(i)] ?? [];
    if (m.capitaoConviteId && !tit.includes(m.capitaoConviteId) && !res.includes(m.capitaoConviteId)) {
      return { ...m, capitaoConviteId: null };
    }
    return m;
  });
}

function buildInitial(
  elegiveis: EscalacaoElegivel[],
  times: EscalacaoTimeRow[],
  numTimes: number,
): { columns: Record<string, string[]>; timeMeta: TimeMeta[] } {
  const columns: Record<string, string[]> = { [POOL_ID]: [] };
  for (let i = 0; i < numTimes; i++) {
    columns[teamId(i)] = [];
    columns[reservaId(i)] = [];
  }

  const inTeam = new Set<string>();
  times.forEach((t, idx) => {
    if (idx >= numTimes) return;
    for (const cid of t.conviteIds) {
      columns[teamId(idx)]!.push(cid);
      inTeam.add(cid);
    }
    for (const cid of t.conviteIdsReservas ?? []) {
      columns[reservaId(idx)]!.push(cid);
      inTeam.add(cid);
    }
  });

  for (const e of elegiveis) {
    if (!inTeam.has(e.conviteId)) (columns[POOL_ID] ??= []).push(e.conviteId);
  }

  const timeMeta: TimeMeta[] = Array.from({ length: numTimes }, (_, i) => {
    const t = times[i];
    return {
      nome: t?.nome?.trim() ? t.nome : ['Time A', 'Time B', 'Time C', 'Time D'][i] ?? `Time ${i + 1}`,
      cor: (t?.cor as CorTime) ?? CORES_TIME[i % CORES_TIME.length]!,
      capitaoConviteId: t?.capitaoConviteId ?? null,
    };
  });

  return { columns, timeMeta };
}

function SortablePlayer({
  id,
  nome,
  apelido,
  posicao,
  presencaStrip,
  capitao,
  onCapitao,
  onRemove,
  variant = 'team',
}: {
  id: string;
  nome: string;
  apelido: string | null;
  posicao?: string | null;
  presencaStrip?: PresencaStripEstado[] | null;
  capitao: boolean;
  onCapitao: () => void;
  onRemove: () => void;
  variant?: 'pool' | 'team';
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Arrastar"
      >
        ⋮⋮
      </button>
      <Avatar name={nome} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium">{nome}</p>
          {posicao ? (
            <span className="rounded bg-surface-2 px-1 py-0.5 text-[10px] font-semibold text-muted">
              {posicao}
            </span>
          ) : null}
          {presencaStrip ? <PresencaStrip estados={presencaStrip} /> : null}
        </div>
        {apelido ? <p className="truncate text-xs text-muted">{apelido}</p> : null}
      </div>
      {variant === 'team' ? (
        <>
          <Button
            type="button"
            variant={capitao ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={capitao ? 'Capitão' : 'Marcar capitão'}
            onClick={onCapitao}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Crown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 px-2 text-xs text-destructive"
            onClick={onRemove}
            onPointerDown={(e) => e.stopPropagation()}
          >
            Remover
          </Button>
        </>
      ) : null}
    </div>
  );
}

interface Props {
  partidaId: string;
  numTimes: number;
  boleirosPorTime: number;
  reservasPorTime: number;
  readOnly: boolean;
  initialTimes: EscalacaoTimeRow[];
  elegiveis: EscalacaoElegivel[];
  presencaPorBoleiro?: Record<string, PresencaStripEstado[]>;
  onSaved: () => void;
}

export function ManualMode({
  partidaId,
  numTimes,
  boleirosPorTime,
  reservasPorTime,
  readOnly,
  initialTimes,
  elegiveis,
  presencaPorBoleiro = {},
  onSaved,
}: Props) {
  const blockedSet = useMemo(
    () => new Set(elegiveis.filter((e) => e.bloqueado).map((e) => e.conviteId)),
    [elegiveis],
  );

  const elegMap = useMemo(() => new Map(elegiveis.map((e) => [e.conviteId, e])), [elegiveis]);

  const stripPorConvite = useCallback(
    (conviteId: string): PresencaStripEstado[] | null => {
      const e = elegMap.get(conviteId);
      if (!e?.boleiroGrupoId) return null;
      return presencaPorBoleiro[e.boleiroGrupoId] ?? null;
    },
    [elegMap, presencaPorBoleiro],
  );

  const syncKey = useMemo(
    () =>
      `${partidaId}:${initialTimes.map((t) => t.conviteIds.join(',')).join('|')}:${elegiveis.map((e) => e.conviteId).join(',')}`,
    [partidaId, initialTimes, elegiveis],
  );

  const [{ columns, timeMeta }, setState] = useState(() =>
    buildInitial(elegiveis, initialTimes, numTimes),
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 280, tolerance: 8 } }),
  );

  useEffect(() => {
    setState(buildInitial(elegiveis, initialTimes, numTimes));
  }, [syncKey, numTimes, elegiveis, initialTimes]);

  // Resolve em qual container (col:*) um id do dnd-kit "vive". Para containers,
  // retorna o proprio id; para items (convite), busca em `columns`.
  const findContainer = useCallback(
    (id: UniqueIdentifier): string | null => {
      const s = String(id);
      if (isContainerId(s)) return s;
      for (const key of Object.keys(columns)) {
        if (columns[key]?.includes(s)) return key;
      }
      return null;
    },
    [columns],
  );

  const overContainerId = useCallback(
    (overId: UniqueIdentifier | undefined): string | null => {
      if (!overId) return null;
      const s = String(overId);
      if (isContainerId(s)) return s;
      return findContainer(s);
    },
    [findContainer],
  );

  // Estrategia de colisao: `pointerWithin` primeiro; se houver mais de um alvo
  // (ex.: overlap), prioriza `col:res:*` sobre titulares/pool para o drop ir à reserva.
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointer = pointerWithin(args);
    if (pointer.length > 0) {
      const res = pointer.filter((c) => String(c.id).startsWith('col:res:'));
      if (res.length > 0) return res;
      return pointer;
    }
    const rect = rectIntersection(args);
    if (rect.length > 0) {
      const res = rect.filter((c) => String(c.id).startsWith('col:res:'));
      if (res.length > 0) return res;
      return rect;
    }
    return rect;
  }, []);

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (blockedSet.has(id)) return;
    setActiveId(id);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const aId = String(active.id);
    if (blockedSet.has(aId)) return;

    const activeContainer = findContainer(aId);
    const overCont = overContainerId(over.id);
    if (!activeContainer || !overCont) return;

    if (activeContainer === overCont) {
      const items = columns[activeContainer] ?? [];
      const oldIndex = items.indexOf(aId);
      const overStr = String(over.id);
      const newIndex =
        overStr === activeContainer ? items.length - 1 : items.indexOf(overStr);
      if (oldIndex < 0 || newIndex < 0) return;
      if (oldIndex === newIndex) return;
      setState((prev) => {
        const list = prev.columns[activeContainer] ?? [];
        const nextCols = {
          ...prev.columns,
          [activeContainer]: arrayMove(list, oldIndex, newIndex),
        };
        return {
          columns: nextCols,
          timeMeta: normalizeMeta(nextCols, prev.timeMeta, numTimes),
        };
      });
      return;
    }

    if (overCont !== POOL_ID) {
      const dest = columns[overCont] ?? [];
      const limit = isTeamContainer(overCont) ? boleirosPorTime : reservasPorTime;
      if (dest.length >= limit && !dest.includes(aId)) {
        toast.error(isTeamContainer(overCont) ? 'Time completo' : 'Reservas completas');
        return;
      }
    }

    setState((prev) => {
      const src = [...(prev.columns[activeContainer] ?? [])];
      const dst = [...(prev.columns[overCont] ?? [])];
      const from = src.indexOf(aId);
      if (from < 0) return prev;
      src.splice(from, 1);
      const overStr = String(over.id);
      let insertAt = dst.length;
      if (overStr !== overCont) {
        const idx = dst.indexOf(overStr);
        if (idx >= 0) insertAt = idx;
      }
      if (!dst.includes(aId)) dst.splice(insertAt, 0, aId);
      const nextCols = {
        ...prev.columns,
        [activeContainer]: src,
        [overCont]: dst,
      };
      return {
        columns: nextCols,
        timeMeta: normalizeMeta(nextCols, prev.timeMeta, numTimes),
      };
    });
  }

  const assignedCount = useMemo(() => {
    let n = 0;
    for (let i = 0; i < numTimes; i++) {
      n += (columns[teamId(i)]?.length ?? 0) + (columns[reservaId(i)]?.length ?? 0);
    }
    return n;
  }, [columns, numTimes]);

  const capacity = numTimes * (boleirosPorTime + reservasPorTime);

  const poolFree = (columns[POOL_ID] ?? []).filter((id) => !blockedSet.has(id));
  const poolBlocked = (columns[POOL_ID] ?? []).filter((id) => blockedSet.has(id));

  function removeToPool(containerId: string, conviteId: string) {
    setState((s) => {
      const next = { ...s.columns };
      next[containerId] = (next[containerId] ?? []).filter((x) => x !== conviteId);
      next[POOL_ID] = [...(next[POOL_ID] ?? []), conviteId];
      return { columns: next, timeMeta: normalizeMeta(next, s.timeMeta, numTimes) };
    });
  }

  async function confirmar() {
    const timesPayload = Array.from({ length: numTimes }, (_, i) => {
      const tit = columns[teamId(i)] ?? [];
      const res = columns[reservaId(i)] ?? [];
      const meta = timeMeta[i]!;
      return {
        nome: meta.nome.trim() || `Time ${i + 1}`,
        cor: meta.cor,
        conviteIds: tit,
        conviteIdsReservas: res,
        capitaoConviteId: meta.capitaoConviteId,
      };
    });

    for (const t of timesPayload) {
      if (t.conviteIds.length < 1) {
        toast.error('Cada time precisa de ao menos um titular.');
        return;
      }
      if (t.conviteIds.length > boleirosPorTime) {
        toast.error(`Limite de ${boleirosPorTime} titulares por time.`);
        return;
      }
      if (t.conviteIdsReservas.length > reservasPorTime) {
        toast.error(`Limite de ${reservasPorTime} reservas por time.`);
        return;
      }
    }

    setLoading(true);
    try {
      await saveEscalacao(partidaId, { times: timesPayload });
      toast.success('Escalação salva.');
      onSaved();
    } catch {
      toast.error('Não foi possível salvar.');
    } finally {
      setLoading(false);
    }
  }

  const activeEleg = activeId ? elegMap.get(activeId) : null;

  const ro = useMemo(
    () => buildInitial(elegiveis, initialTimes, numTimes),
    [elegiveis, initialTimes, numTimes],
  );

  if (readOnly) {
    return (
      <div className={`grid gap-3 sm:grid-cols-2`}>
        {Array.from({ length: numTimes }, (_, i) => {
          const ids = ro.columns[teamId(i)] ?? [];
          const idsRes = ro.columns[reservaId(i)] ?? [];
          const meta = ro.timeMeta[i]!;
          return (
            <ReadOnlyTeam
              key={i}
              nome={meta.nome}
              cor={meta.cor}
              ids={ids}
              reservasIds={idsRes}
              elegMap={elegMap}
              capitao={meta.capitaoConviteId}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <DroppableCol id={POOL_ID} label="Disponíveis">
          <div className="space-y-2">
            {poolBlocked.map((id) => {
              const e = elegMap.get(id)!;
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-error-highlight/40 px-2 py-1.5 opacity-90"
                >
                  <Lock className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
                  <Avatar name={e.nome} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.nome}</p>
                    <p className="text-xs text-muted">Bloqueado</p>
                  </div>
                </div>
              );
            })}
            <SortableContext items={poolFree} strategy={verticalListSortingStrategy}>
              {poolFree.map((id) => {
                const e = elegMap.get(id)!;
                return (
                  <div key={id} className="mb-2">
                    <SortablePlayer
                      id={id}
                      nome={e.nome}
                      apelido={e.apelido}
                      posicao={e.posicao}
                      presencaStrip={stripPorConvite(id)}
                      capitao={false}
                      onCapitao={() => {}}
                      onRemove={() => {}}
                      variant="pool"
                    />
                  </div>
                );
              })}
            </SortableContext>
          </div>
        </DroppableCol>

        <div className={`grid gap-3 sm:grid-cols-2`}>
          {Array.from({ length: numTimes }, (_, i) => {
            const cid = teamId(i);
            const rid = reservaId(i);
            const titIds = columns[cid] ?? [];
            const resIds = columns[rid] ?? [];
            const meta = timeMeta[i]!;
            const toggleCapitao = (id: string) =>
              setState((s) => ({
                ...s,
                timeMeta: s.timeMeta.map((m, j) =>
                  j === i
                    ? { ...m, capitaoConviteId: m.capitaoConviteId === id ? null : id }
                    : m,
                ),
              }));
            return (
              <div
                key={cid}
                className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-2"
                style={{ borderTopWidth: 4, borderTopColor: COR_HEX[meta.cor] }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={meta.nome}
                    onChange={(ev) =>
                      setState((s) => ({
                        ...s,
                        timeMeta: s.timeMeta.map((m, j) =>
                          j === i ? { ...m, nome: ev.target.value } : m,
                        ),
                      }))
                    }
                    className="h-9 max-w-[160px] font-display text-sm font-semibold"
                    maxLength={20}
                    aria-label="Nome do time"
                  />
                  <div className="flex flex-wrap gap-1">
                    {CORES_TIME.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`h-6 w-6 rounded-full border-2 ${
                          meta.cor === c ? 'scale-110 border-foreground' : 'border-transparent opacity-80'
                        }`}
                        style={{ backgroundColor: COR_HEX[c] }}
                        onClick={() =>
                          setState((s) => ({
                            ...s,
                            timeMeta: s.timeMeta.map((m, j) => (j === i ? { ...m, cor: c } : m)),
                          }))
                        }
                        aria-label={`Cor ${c}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Titulares: {titIds.length}/{boleirosPorTime}</span>
                  {reservasPorTime > 0 ? (
                    <span>Reservas: {resIds.length}/{reservasPorTime}</span>
                  ) : null}
                </div>
                <TitularesDroppable id={cid}>
                  <SortableContext items={titIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {titIds.length === 0 ? (
                        <p className="select-none text-center text-xs text-muted">
                          Arraste titulares aqui
                        </p>
                      ) : null}
                      {titIds.map((id) => {
                        const e = elegMap.get(id)!;
                        return (
                          <SortablePlayer
                            key={id}
                            id={id}
                            nome={e.nome}
                            apelido={e.apelido}
                            posicao={e.posicao}
                            presencaStrip={stripPorConvite(id)}
                            capitao={meta.capitaoConviteId === id}
                            onCapitao={() => toggleCapitao(id)}
                            onRemove={() => removeToPool(cid, id)}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </TitularesDroppable>

                {reservasPorTime > 0 ? (
                  <div className="mt-1 border-t border-dashed border-border pt-2">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Reservas
                    </p>
                    <ReservasDroppable id={rid}>
                      <SortableContext items={resIds} strategy={verticalListSortingStrategy}>
                        <div className="min-h-[48px] space-y-2 rounded-md p-1">
                          {resIds.length === 0 ? (
                            <p className="select-none text-center text-xs text-muted">
                              Arraste reservas aqui
                            </p>
                          ) : null}
                          {resIds.map((id) => {
                            const e = elegMap.get(id)!;
                            return (
                              <SortablePlayer
                                key={id}
                                id={id}
                                nome={e.nome}
                                apelido={e.apelido}
                                posicao={e.posicao}
                                presencaStrip={stripPorConvite(id)}
                                capitao={meta.capitaoConviteId === id}
                                onCapitao={() => toggleCapitao(id)}
                                onRemove={() => removeToPool(rid, id)}
                              />
                            );
                          })}
                        </div>
                      </SortableContext>
                    </ReservasDroppable>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeEleg ? (
            <div className="flex items-center gap-2 rounded-lg border border-primary bg-surface px-2 py-1.5 shadow-lg">
              <Avatar name={activeEleg.nome} size="sm" />
              <span className="text-sm font-medium">{activeEleg.nome}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="rounded-lg border border-border bg-surface p-3">
        <p className="text-sm text-muted">
          <span className="font-semibold text-foreground">{assignedCount}</span> / {capacity}{' '}
          boleiros escalados
        </p>
        <Button type="button" className="mt-3" disabled={loading} onClick={confirmar}>
          Confirmar escalação
        </Button>
      </div>
    </div>
  );
}

function DroppableCol({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[72px] rounded-lg border border-dashed p-2 transition-colors ${
        isOver ? 'border-primary bg-primary/5' : 'border-border bg-surface/40'
      }`}
    >
      {label ? <p className="mb-2 text-xs font-medium text-muted">{label}</p> : null}
      {children}
    </div>
  );
}

/** Zona de titulares: droppable só desta área (não cobre reservas), para o drop cair na reserva quando o ponteiro está lá. */
function TitularesDroppable({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[64px] rounded-md p-1 transition-colors ${
        isOver ? 'bg-primary/5 ring-2 ring-primary/25' : ''
      }`}
    >
      {children}
    </div>
  );
}

/** Sub-zona "Reservas" como droppable independente dentro do card de time. */
function ReservasDroppable({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[48px] rounded-md p-1 transition-colors ${
        isOver ? 'bg-primary/5 ring-2 ring-primary/25' : ''
      }`}
    >
      {children}
    </div>
  );
}

function ReadOnlyTeam({
  nome,
  cor,
  ids,
  reservasIds,
  elegMap,
  capitao,
}: {
  nome: string;
  cor: CorTime;
  ids: string[];
  reservasIds: string[];
  elegMap: Map<string, EscalacaoElegivel>;
  capitao: string | null;
}) {
  const renderRow = (id: string) => {
    const e = elegMap.get(id);
    if (!e) return null;
    return (
      <li
        key={id}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5"
      >
        <Avatar name={e.nome} size="sm" />
        <span className="flex-1 truncate text-sm font-medium">
          {e.nome}
          {e.posicao ? (
            <span className="ml-1.5 rounded bg-surface-2 px-1 py-0.5 text-[10px] font-semibold text-muted">
              {e.posicao}
            </span>
          ) : null}
        </span>
        {capitao === id ? (
          <Crown className="h-4 w-4 text-primary" aria-label="Capitão" />
        ) : null}
      </li>
    );
  };
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3"
      style={{ borderTopWidth: 4, borderTopColor: COR_HEX[cor] }}
    >
      <p className="font-display text-base font-semibold">{nome}</p>
      <ul className="space-y-1.5">{ids.map(renderRow)}</ul>
      {reservasIds.length > 0 ? (
        <div className="border-t border-dashed border-border pt-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Reservas
          </p>
          <ul className="space-y-1.5">{reservasIds.map(renderRow)}</ul>
        </div>
      ) : null}
    </div>
  );
}
