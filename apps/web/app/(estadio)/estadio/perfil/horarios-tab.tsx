'use client';

import { useState } from 'react';
import { CalendarX2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { TimePicker } from '@/components/ui/time-picker';
import {
  addMeuBloqueio,
  putMeusHorarios,
  removerMeuBloqueio,
  type BloqueioRow,
  type HorarioRow,
} from '@/lib/estadios-actions';

const DIAS = [
  { idx: 1, label: 'Segunda' },
  { idx: 2, label: 'Terça' },
  { idx: 3, label: 'Quarta' },
  { idx: 4, label: 'Quinta' },
  { idx: 5, label: 'Sexta' },
  { idx: 6, label: 'Sábado' },
  { idx: 0, label: 'Domingo' },
] as const;

interface DiaForm {
  ativo: boolean;
  horaInicio: string;
  horaFim: string;
  intervaloMinutos: number;
}

interface Props {
  estadioId: string;
  initialHorarios: HorarioRow[];
  initialBloqueios: BloqueioRow[];
  onHorariosChange: (h: HorarioRow[]) => void;
  onBloqueiosChange: (b: BloqueioRow[]) => void;
}

function buildDias(horarios: HorarioRow[]): Record<number, DiaForm> {
  const result: Record<number, DiaForm> = {};
  for (const dia of [0, 1, 2, 3, 4, 5, 6]) {
    const h = horarios.find((x) => x.diaSemana === dia);
    result[dia] = h
      ? {
          ativo: h.ativo,
          horaInicio: h.horaInicio,
          horaFim: h.horaFim,
          intervaloMinutos: h.intervaloMinutos,
        }
      : { ativo: false, horaInicio: '18:00', horaFim: '22:00', intervaloMinutos: 60 };
  }
  return result;
}

export function HorariosTab({
  initialHorarios,
  initialBloqueios,
  onHorariosChange,
  onBloqueiosChange,
}: Props) {
  const [dias, setDias] = useState<Record<number, DiaForm>>(() => buildDias(initialHorarios));
  const [bloqueios, setBloqueios] = useState<BloqueioRow[]>(initialBloqueios);
  const [novaData, setNovaData] = useState('');
  const [novoMotivo, setNovoMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingBloqueio, setAddingBloqueio] = useState(false);

  function patchDia(idx: number, patch: Partial<DiaForm>) {
    setDias((s) => ({ ...s, [idx]: { ...s[idx]!, ...patch } }));
  }

  async function salvarHorarios() {
    const lista = Object.entries(dias)
      .filter(([, d]) => d.ativo)
      .map(([idx, d]) => ({
        diaSemana: Number(idx),
        horaInicio: d.horaInicio,
        horaFim: d.horaFim,
        intervaloMinutos: d.intervaloMinutos,
        ativo: true,
      }));

    for (const h of lista) {
      if (h.horaInicio >= h.horaFim) {
        toast.error(`Horário inválido em ${nomeDia(h.diaSemana)}`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await putMeusHorarios({ horarios: lista });
      onHorariosChange(res.horarios);
      toast.success('Horários salvos');
    } catch {
      toast.error('Falha ao salvar horários');
    } finally {
      setSaving(false);
    }
  }

  async function adicionarBloqueio() {
    if (!novaData) {
      toast.error('Informe uma data');
      return;
    }
    setAddingBloqueio(true);
    try {
      const res = await addMeuBloqueio({
        data: new Date(novaData),
        motivo: novoMotivo.trim() || null,
      });
      const novos = [...bloqueios, res.bloqueio].sort((a, b) => a.data.localeCompare(b.data));
      setBloqueios(novos);
      onBloqueiosChange(novos);
      setNovaData('');
      setNovoMotivo('');
      toast.success('Data bloqueada');
    } catch {
      toast.error('Falha ao bloquear data');
    } finally {
      setAddingBloqueio(false);
    }
  }

  async function removerBloqueio(id: string) {
    if (!window.confirm('Remover este bloqueio?')) return;
    try {
      await removerMeuBloqueio(id);
      const novos = bloqueios.filter((b) => b.id !== id);
      setBloqueios(novos);
      onBloqueiosChange(novos);
      toast.success('Bloqueio removido');
    } catch {
      toast.error('Falha ao remover bloqueio');
    }
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="font-display text-base font-semibold">Grade semanal</h3>
        <p className="text-xs text-muted">
          Marque os dias em que o estádio aceita partidas e defina os horários disponíveis.
        </p>
        <div className="space-y-2">
          {DIAS.map((d) => {
            const f = dias[d.idx]!;
            return (
              <div
                key={d.idx}
                className={
                  'rounded-lg border p-3 ' +
                  (f.ativo ? 'border-primary/50 bg-primary-highlight/20' : 'border-border bg-surface')
                }
              >
                <label className="flex items-center justify-between gap-2">
                  <span className="font-medium">{d.label}</span>
                  <input
                    type="checkbox"
                    checked={f.ativo}
                    onChange={(e) => patchDia(d.idx, { ativo: e.target.checked })}
                    className="h-5 w-5 rounded border-border bg-surface-2 text-primary focus:ring-primary"
                  />
                </label>
                {f.ativo ? (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div>
                      <p className="mb-0.5 text-xs text-muted">Início</p>
                      <TimePicker
                        value={f.horaInicio}
                        onChange={(v) => patchDia(d.idx, { horaInicio: v })}
                      />
                    </div>
                    <div>
                      <p className="mb-0.5 text-xs text-muted">Fim</p>
                      <TimePicker
                        value={f.horaFim}
                        onChange={(v) => patchDia(d.idx, { horaFim: v })}
                      />
                    </div>
                    <div>
                      <p className="mb-0.5 text-xs text-muted">Intervalo (min)</p>
                      <Input
                        type="number"
                        min={0}
                        max={240}
                        value={f.intervaloMinutos}
                        onChange={(e) =>
                          patchDia(d.idx, { intervaloMinutos: Number(e.target.value || 0) })
                        }
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <Button type="button" onClick={salvarHorarios} disabled={saving} className="w-full">
          {saving ? 'Salvando...' : 'Salvar horários'}
        </Button>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-base font-semibold">Bloquear datas específicas</h3>
        <p className="text-xs text-muted">
          Feriados, manutenções ou eventos especiais que impedem o uso do estádio.
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <Field label="Data">
            <DatePicker
              value={novaData}
              onChange={setNovaData}
              ariaLabel="Data do bloqueio"
            />
          </Field>
          <Field label="Motivo (opcional)">
            <Input
              value={novoMotivo}
              onChange={(e) => setNovoMotivo(e.target.value)}
              placeholder="Ex: Manutenção do gramado"
              maxLength={200}
            />
          </Field>
          <Button type="button" onClick={adicionarBloqueio} disabled={addingBloqueio || !novaData}>
            <Plus size={14} /> Bloquear
          </Button>
        </div>

        {bloqueios.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-surface px-3 py-2 text-sm text-muted">
            Nenhuma data bloqueada.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {bloqueios.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <CalendarX2 size={14} className="text-warning" />
                  <span>{new Date(b.data).toLocaleDateString('pt-BR')}</span>
                  {b.motivo ? <span className="text-muted">· {b.motivo}</span> : null}
                </div>
                <button
                  type="button"
                  onClick={() => removerBloqueio(b.id)}
                  className="text-muted hover:text-destructive"
                  aria-label="Remover bloqueio"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function nomeDia(idx: number): string {
  return DIAS.find((d) => d.idx === idx)?.label ?? '?';
}
