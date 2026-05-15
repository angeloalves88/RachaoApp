'use client';

import { Field } from '@/components/ui/field';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { NumberStepper } from '@/components/ui/number-stepper';
import { Segmented } from '@/components/ui/segmented';
import { useWizardStore } from './wizard-store';
import { Repeat } from 'lucide-react';
import type { TipoCobranca } from '@rachao/shared/enums';

const TIMES_OPTIONS = [
  { value: '2', label: '2 times' },
  { value: '3', label: '3 times' },
  { value: '4', label: '4 times' },
];

export function Step1Dados() {
  const state = useWizardStore();
  const totalTitulares = state.numTimes * state.boleirosPorTime;
  const totalReservas = state.numTimes * state.reservasPorTime;
  const totalVagas = totalTitulares + totalReservas;
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

      <Field
        label="Boleiros por time"
        hint={`Total de vagas: ${totalVagas} (${totalTitulares} titulares + ${totalReservas} reservas)`}
      >
        <NumberStepper
          value={state.boleirosPorTime}
          min={3}
          max={11}
          onChange={(v) => state.patch({ boleirosPorTime: v })}
          suffix="por time"
          ariaLabel="Boleiros por time"
        />
      </Field>

      <Field
        label="Reservas por time"
        hint="Boleiros extras escalados como reservas. Use 0 para sem reservas."
      >
        <NumberStepper
          value={state.reservasPorTime}
          min={0}
          max={5}
          onChange={(v) => state.patch({ reservasPorTime: v })}
          suffix="por time"
          ariaLabel="Reservas por time"
        />
      </Field>

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
        <Field label="Tempo total">
          <NumberStepper
            value={state.tempoTotal}
            min={30}
            max={240}
            step={15}
            onChange={(v) => state.patch({ tempoTotal: v })}
            suffix="min"
            ariaLabel="Tempo total do evento"
          />
        </Field>
      </div>

      {state.tempoTotal < state.tempoPartida * 2 ? (
        <p className="rounded-md border border-warning/40 bg-warning-highlight px-3 py-2 text-xs text-warning">
          Atenção: o tempo total parece curto pra esse formato. Confirma se está certo.
        </p>
      ) : null}

      <div className="rounded-lg border border-border bg-surface p-4">
        <button
          type="button"
          onClick={() => state.patch({ recorrenteAtivo: !state.recorrenteAtivo })}
          aria-pressed={state.recorrenteAtivo}
          className={
            'flex w-full items-start gap-3 text-left ' +
            (state.recorrenteAtivo ? 'text-foreground' : 'text-muted')
          }
        >
          <Repeat
            size={20}
            className={state.recorrenteAtivo ? 'mt-0.5 text-primary' : 'mt-0.5'}
            aria-hidden
          />
          <div className="flex-1">
            <p className="font-medium">Repetir toda semana</p>
            <p className="text-xs text-muted">
              Cria várias peladas no mesmo dia da semana e horário (ex.: toda quinta às 20h), espaçadas de 7 em 7 dias a partir da data acima.
            </p>
          </div>
          <div
            role="switch"
            aria-checked={state.recorrenteAtivo}
            className={
              'relative mt-0.5 h-6 w-10 shrink-0 rounded-full border transition-colors ' +
              (state.recorrenteAtivo ? 'border-primary bg-primary' : 'border-border bg-surface-offset')
            }
          >
            <span
              className={
                'absolute top-[1px] h-5 w-5 rounded-full bg-white shadow transition-transform ' +
                (state.recorrenteAtivo ? 'translate-x-4' : 'translate-x-0.5')
              }
            />
          </div>
        </button>

        {state.recorrenteAtivo ? (
          <div className="mt-4 border-t border-border pt-4">
            <Field
              label="Quantas peladas criar?"
              hint="Inclui a primeira data. Máximo 24 semanas."
            >
              <NumberStepper
                value={state.semanasOcorrencias}
                min={2}
                max={24}
                onChange={(v) => state.patch({ semanasOcorrencias: v })}
                suffix="semanas"
                ariaLabel="Número de ocorrências semanais"
              />
            </Field>
          </div>
        ) : null}
      </div>
    </div>
  );
}
