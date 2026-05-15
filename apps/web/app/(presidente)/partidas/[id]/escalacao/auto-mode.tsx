'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { CorTime } from '@rachao/shared/zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type {
  EscalacaoElegivel,
  EscalacaoTimeRow,
  PresencaStripEstado,
} from '@/lib/escalacao-actions';
import { saveEscalacao, sortearEscalacao } from '@/lib/escalacao-actions';
import { TimeColumn } from './time-column';

export type AutoDraftTime = {
  nome: string;
  cor: CorTime;
  conviteIds: string[];
  conviteIdsReservas: string[];
  capitaoConviteId: string | null;
};

function rowsFromServer(times: EscalacaoTimeRow[]): AutoDraftTime[] {
  return times.map((t) => ({
    nome: t.nome,
    cor: t.cor as CorTime,
    conviteIds: [...t.conviteIds],
    conviteIdsReservas: [...(t.conviteIdsReservas ?? [])],
    capitaoConviteId: t.capitaoConviteId,
  }));
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

export function AutoMode({
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
  const [balancearPorPosicao, setBalancear] = useState(false);
  const [incluirConvidadosAvulsos, setIncluirAvulsos] = useState(true);
  const [draft, setDraft] = useState<AutoDraftTime[] | null>(() =>
    initialTimes.length >= numTimes ? rowsFromServer(initialTimes) : null,
  );
  const [excedentes, setExcedentes] = useState(0);
  const [loading, setLoading] = useState(false);

  const nomePorConvite = useCallback(
    (id: string) => {
      const e = elegiveis.find((x) => x.conviteId === id);
      const strip = e?.boleiroGrupoId ? presencaPorBoleiro[e.boleiroGrupoId] ?? null : null;
      return {
        nome: e?.nome ?? '?',
        apelido: e?.apelido ?? null,
        posicao: e?.posicao ?? null,
        presencaStrip: strip,
      };
    },
    [elegiveis, presencaPorBoleiro],
  );

  async function runSortear(novoSeed?: string) {
    setLoading(true);
    try {
      const body = {
        balancearPorPosicao,
        incluirConvidadosAvulsos,
        seed: novoSeed ?? null,
      };
      const res = await sortearEscalacao(partidaId, body);
      setDraft(
        res.times.map((t) => ({
          nome: t.nome,
          cor: t.cor,
          conviteIds: [...t.conviteIds],
          conviteIdsReservas: [...(t.conviteIdsReservas ?? [])],
          capitaoConviteId: t.capitaoConviteId,
        })),
      );
      setExcedentes(res.excedentes ?? 0);
      toast.success('Sorteio pronto — revise e confirme.');
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível sortear. Verifique confirmados e bloqueios.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmar() {
    if (!draft || draft.length !== numTimes) {
      toast.error('Sorteie os times antes de confirmar.');
      return;
    }
    for (const t of draft) {
      if (t.conviteIds.length > boleirosPorTime) {
        toast.error(`O time "${t.nome}" passou do limite de ${boleirosPorTime} titulares.`);
        return;
      }
      if (t.conviteIdsReservas.length > reservasPorTime) {
        toast.error(`O time "${t.nome}" passou do limite de ${reservasPorTime} reservas.`);
        return;
      }
      if (t.conviteIds.length < 1) {
        toast.error('Cada time precisa de ao menos um titular.');
        return;
      }
    }
    setLoading(true);
    try {
      await saveEscalacao(partidaId, {
        times: draft.map((t) => ({
          nome: t.nome.trim() || 'Time',
          cor: t.cor,
          conviteIds: t.conviteIds,
          conviteIdsReservas: t.conviteIdsReservas,
          capitaoConviteId: t.capitaoConviteId,
        })),
      });
      toast.success('Escalação salva.');
      onSaved();
    } catch {
      toast.error('Não foi possível salvar a escalação.');
    } finally {
      setLoading(false);
    }
  }

  const showGrid = draft && draft.length === numTimes;

  function handleRemove(teamIdx: number, conviteId: string) {
    setDraft((d) =>
      d
        ? d.map((t, i) =>
            i === teamIdx
              ? {
                  ...t,
                  conviteIds: t.conviteIds.filter((id) => id !== conviteId),
                  conviteIdsReservas: t.conviteIdsReservas.filter((id) => id !== conviteId),
                  capitaoConviteId:
                    t.capitaoConviteId === conviteId ? null : t.capitaoConviteId,
                }
              : t,
          )
        : d,
    );
  }

  function handleMoverReserva(teamIdx: number, conviteId: string, paraReserva: boolean) {
    setDraft((d) => {
      if (!d) return d;
      return d.map((t, i) => {
        if (i !== teamIdx) return t;
        if (paraReserva) {
          if (t.conviteIdsReservas.length >= reservasPorTime) {
            toast.error(`Limite de ${reservasPorTime} reservas atingido.`);
            return t;
          }
          return {
            ...t,
            conviteIds: t.conviteIds.filter((id) => id !== conviteId),
            conviteIdsReservas: [...t.conviteIdsReservas, conviteId],
          };
        }
        if (t.conviteIds.length >= boleirosPorTime) {
          toast.error(`Limite de ${boleirosPorTime} titulares atingido.`);
          return t;
        }
        return {
          ...t,
          conviteIdsReservas: t.conviteIdsReservas.filter((id) => id !== conviteId),
          conviteIds: [...t.conviteIds, conviteId],
        };
      });
    });
  }

  return (
    <div className="space-y-4">
      {!readOnly ? (
        <div className="space-y-3 rounded-lg border border-border bg-surface p-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="bal-pos"
              checked={balancearPorPosicao}
              onCheckedChange={(v) => setBalancear(!!v)}
            />
            <Label htmlFor="bal-pos" className="text-sm font-normal">
              Balancear por posição (GOL → ATA)
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="inc-av"
              checked={incluirConvidadosAvulsos}
              onCheckedChange={(v) => setIncluirAvulsos(!!v)}
            />
            <Label htmlFor="inc-av" className="text-sm font-normal">
              Incluir convidados avulsos no sorteio
            </Label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => runSortear()} disabled={loading}>
              Sortear
            </Button>
            <Button type="button" variant="secondary" disabled={loading} onClick={() => runSortear()}>
              Novo sorteio
            </Button>
            <Button type="button" variant="default" disabled={loading || !showGrid} onClick={confirmar}>
              Confirmar escalação
            </Button>
          </div>
          {excedentes > 0 ? (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              {excedentes} boleiro(s) confirmado(s) ficaram fora do sorteio porque a capacidade
              do dia foi excedida. Aumente o número de reservas ou ajuste o time manualmente.
            </p>
          ) : null}
        </div>
      ) : null}

      {showGrid ? (
        <div
          className={`grid gap-3 ${numTimes <= 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-2'}`}
        >
          {draft.map((team, idx) => (
            <TimeColumn
              key={idx}
              nome={team.nome}
              onNomeChange={(nome) =>
                setDraft((d) =>
                  d ? d.map((t, i) => (i === idx ? { ...t, nome } : t)) : d,
                )
              }
              cor={team.cor}
              onCorChange={(cor) =>
                setDraft((d) =>
                  d ? d.map((t, i) => (i === idx ? { ...t, cor } : t)) : d,
                )
              }
              capitaoConviteId={team.capitaoConviteId}
              onCapitaoChange={(capitaoConviteId) =>
                setDraft((d) =>
                  d ? d.map((t, i) => (i === idx ? { ...t, capitaoConviteId } : t)) : d,
                )
              }
              members={team.conviteIds.map((id) => ({ conviteId: id, ...nomePorConvite(id) }))}
              reservasMembers={team.conviteIdsReservas.map((id) => ({
                conviteId: id,
                ...nomePorConvite(id),
              }))}
              reservasPorTime={reservasPorTime}
              onRemove={(conviteId) => handleRemove(idx, conviteId)}
              onMoverReserva={(conviteId, paraReserva) =>
                handleMoverReserva(idx, conviteId, paraReserva)
              }
              readOnly={readOnly}
              boleirosPorTime={boleirosPorTime}
              showRemove={!readOnly}
            />
          ))}
        </div>
      ) : readOnly && initialTimes.length > 0 ? (
        <div className={`grid gap-3 sm:grid-cols-2`}>
          {rowsFromServer(initialTimes).map((team, idx) => (
            <TimeColumn
              key={idx}
              nome={team.nome}
              onNomeChange={() => {}}
              cor={team.cor}
              onCorChange={() => {}}
              capitaoConviteId={team.capitaoConviteId}
              onCapitaoChange={() => {}}
              members={team.conviteIds.map((id) => ({ conviteId: id, ...nomePorConvite(id) }))}
              reservasMembers={team.conviteIdsReservas.map((id) => ({
                conviteId: id,
                ...nomePorConvite(id),
              }))}
              reservasPorTime={reservasPorTime}
              onRemove={() => {}}
              readOnly
              boleirosPorTime={boleirosPorTime}
              showRemove={false}
            />
          ))}
        </div>
      ) : !readOnly ? (
        <p className="text-sm text-muted">Use &quot;Sortear&quot; para gerar os times automaticamente.</p>
      ) : (
        <p className="text-sm text-muted">Nenhuma escalação registrada.</p>
      )}
    </div>
  );
}
