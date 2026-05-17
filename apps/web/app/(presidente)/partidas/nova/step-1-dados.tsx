'use client';

import { Field } from '@/components/ui/field';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { NumberStepper } from '@/components/ui/number-stepper';
import { Segmented } from '@/components/ui/segmented';
import { Input } from '@/components/ui/input';
import { useWizardStore } from './wizard-store';
import { Repeat } from 'lucide-react';
import type { TipoCobranca } from '@rachao/shared/enums';
import { CORES_TIME, type CorTime } from '@rachao/shared/zod';

const TIMES_OPTIONS = [
  { value: '2', label: '2 times' },
  { value: '3', label: '3 times' },
  { value: '4', label: '4 times' },
];

const COR_LABELS: Record<CorTime, string> = {
  orange: 'Laranja',
  blue: 'Azul',
  green: 'Verde',
  yellow: 'Amarelo',
  red: 'Vermelho',
  purple: 'Roxo',
};

export function Step1Dados() {
  const state = useWizardStore();
  const totalTitulares = state.numTimes * state.boleirosPorTime;
  const reservasIlimitadas = state.boleirosPorTime === 0;
  const totalReservas = reservasIlimitadas ? 0 : state.numTimes * state.reservasPorTime;
  const totalVagas = reservasIlimitadas ? null : totalTitulares + totalReservas;
  const hint =
    state.numTimes >= 3
      ? 'Com 3+ times, o que perder sai e o próximo entra.'
      : null;

  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <header>
        <h2 className="font-display text-2xl font-bold leading-tight">Quando e como vai ser?</h2>
        <p className="text-sm text-muted">Defina data, horário, formato da partida e o modelo de cobrança.</p>
      </header>

      <Field
        label="Tipo de cobrança da partida"
        hint="Define se os pagamentos são por pelada ou mensalidade do mês (vaquinha no passo 5 usa este mesmo tipo)."
      >
        <Segmented<TipoCobranca>
          value={state.tipoCobrancaPartida}
          onChange={(v) => {
            state.patch({
              tipoCobrancaPartida: v,
              vaquinha: { ...state.vaquinha, tipoCobranca: v },
            });
          }}
          options={[
            { value: 'por_partida', label: 'Por partida' },
            { value: 'mensalidade', label: 'Mensalidade' },
          ]}
        />
      </Field>
      {state.tipoCobrancaPartida === 'mensalidade' ? (
        <p className="rounded-md border border-info/30 bg-info-highlight px-3 py-2 text-xs text-info">
          Na mensalidade, todos os fixos ativos do grupo entram na cobrança do mês (com deduplicação se
          houver mais de uma pelada no mesmo mês). Convidados avulsos pagam só se confirmarem presença.
        </p>
      ) : (
        <p className="rounded-md border border-border bg-surface-offset/60 px-3 py-2 text-xs text-muted">
          Por partida: apenas quem confirmar presença nesta pelada entra na lista de pagamento da vaquinha.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Data">
          <DatePicker
            id="data"
            value={state.data}
            min={minDate}
            onChange={(v) => state.patch({ data: v })}
            ariaLabel="Data da partida"
          />
        </Field>
        <Field label="Horário">
          <TimePicker
            id="hora"
            value={state.hora}
            onChange={(v) => state.patch({ hora: v })}
            ariaLabel="Horário da partida"
          />
        </Field>
      </div>

      <Field label="Número de times" hint={hint ?? undefined}>
        <Segmented<string>
          value={String(state.numTimes)}
          onChange={(v) => state.patch({ numTimes: Number(v) })}
          options={TIMES_OPTIONS}
        />
      </Field>

      <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
        <p className="text-sm font-medium">Times — nome e cor</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {state.timesMeta.map((t, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-3">
              <Input
                value={t.nome}
                onChange={(e) => {
                  const timesMeta = [...state.timesMeta];
                  timesMeta[i] = { ...timesMeta[i]!, nome: e.target.value };
                  state.patch({ timesMeta });
                }}
                placeholder={`Time ${i + 1}`}
                aria-label={`Nome do time ${i + 1}`}
              />
              <select
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={t.cor}
                onChange={(e) => {
                  const timesMeta = [...state.timesMeta];
                  timesMeta[i] = { ...timesMeta[i]!, cor: e.target.value as CorTime };
                  state.patch({ timesMeta });
                }}
                aria-label={`Cor do time ${i + 1}`}
              >
                {CORES_TIME.map((c) => (
                  <option key={c} value={c}>
                    {COR_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <Field
        label="Boleiros por time (titulares)"
        hint={
          reservasIlimitadas
            ? '0 titulares = todos entram como reserva (ilimitado por time).'
            : totalVagas != null
              ? `Total de vagas: ${totalVagas} (${totalTitulares} titulares + ${totalReservas} reservas)`
              : undefined
        }
      >
        <NumberStepper
          value={state.boleirosPorTime}
          min={0}
          max={11}
          onChange={(v) => state.patch({ boleirosPorTime: v })}
          suffix="por time"
          ariaLabel="Boleiros por time"
        />
      </Field>

      {!reservasIlimitadas ? (
        <Field label="Reservas por time" hint="Boleiros extras escalados como reservas. Use 0 para sem reservas.">
          <NumberStepper
            value={state.reservasPorTime}
            min={0}
            max={5}
            onChange={(v) => state.patch({ reservasPorTime: v })}
            suffix="por time"
            ariaLabel="Reservas por time"
          />
        </Field>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tempo por partida">
          <NumberStepper
            value={state.tempoPartida}
            min={5}
            max={60}
            step={5}
            onChange={(v) => state.patch({ tempoPartida: v })}
            suffix="min"
            ariaLabel="Tempo por partida"
          />
        </Field>
        <Field label="Quantidade de partidas">
          <NumberStepper
            value={state.numPartidas}
            min={1}
            max={12}
            onChange={(v) => state.patch({ numPartidas: v })}
            suffix="jogos"
            ariaLabel="Quantidade de partidas"
          />
        </Field>
      </div>

      <p className="rounded-md border border-border bg-surface-offset/80 px-3 py-2 text-sm text-muted">
        Tempo total do evento:{' '}
        <strong className="text-foreground">{state.tempoTotal} min</strong>
        {' '}
        ({state.numPartidas} × {state.tempoPartida} min — cada partida com a mesma duração)
      </p>

      <div className="rounded-lg border border-border bg-surface p-4">
        <button
          type="button"
          onClick={() => state.patch({ recorrenteAtivo: !state.recorrenteAtivo })}
          aria-pressed={state.recorrenteAtivo}
          className={
            'flex w-full items-start gap-3 text-left ' +
            (state.recorrenteAtivo ? 'text-primary' : 'text-foreground')
          }
        >
          <Repeat className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <span>
            <span className="block font-medium">Repetir semanalmente</span>
            <span className="text-xs text-muted">Mesmo dia da semana e horário nas próximas semanas.</span>
          </span>
        </button>
        {state.recorrenteAtivo ? (
          <div className="mt-3 border-t border-border pt-3">
            <Field label="Quantas ocorrências (incluindo esta data)?">
              <NumberStepper
                value={state.semanasOcorrencias}
                min={2}
                max={24}
                onChange={(v) => state.patch({ semanasOcorrencias: v })}
                suffix="semanas"
                ariaLabel="Ocorrências da série"
              />
            </Field>
          </div>
        ) : null}
      </div>
    </div>
  );
}
