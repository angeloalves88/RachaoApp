'use client';

/**
 * Formulario reutilizavel de configuracao da Vaquinha.
 *
 * Usado tanto no Step 5 do wizard de criacao de partida quanto no modal T25
 * (editar config). Mantem comportamento controlado pelo caller — todos os
 * campos sao recebidos como `value` + `onChange`.
 */
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import type { TipoChavePix } from '@rachao/shared/zod';
import type { TipoCobranca } from '@rachao/shared/enums';

const TIPOS_CHAVE = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'email', label: 'E-mail' },
  { value: 'aleatoria', label: 'Aleatória' },
];

export interface VaquinhaFormValue {
  tipoChavePix: TipoChavePix | '';
  chavePix: string;
  tipoCobranca: TipoCobranca;
  valorBoleiroFixo: number;
  valorConvidadoAvulso: number;
  mesmoValor: boolean;
  dataLimitePagamento?: string;
  dataLimitePagamentoConvidados?: string;
}

export interface VaquinhaFormProps {
  value: VaquinhaFormValue;
  onChange: (patch: Partial<VaquinhaFormValue>) => void;
  /** Conta de boleiros fixos previstos (para preview de total). */
  numFixos: number;
  /** Conta de convidados avulsos previstos. */
  numConvidados: number;
  /** Esconde a opcao de mensalidade (T25 em partida unica). */
  hideMensalidade?: boolean;
  /** Tipo de cobranca definido na partida — esconde seletor e mostra badge. */
  tipoCobrancaLocked?: boolean;
}

export function VaquinhaForm({
  value,
  onChange,
  numFixos,
  numConvidados,
  hideMensalidade,
  tipoCobrancaLocked,
}: VaquinhaFormProps) {
  const isMensal = value.tipoCobranca === 'mensalidade';
  const valorFixo = value.valorBoleiroFixo || 0;
  const valorConv = value.mesmoValor ? valorFixo : value.valorConvidadoAvulso || 0;
  const totalEsperado = numFixos * valorFixo + numConvidados * valorConv;

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-sm font-medium">Tipo da chave Pix</p>
        <Segmented<string>
          value={value.tipoChavePix || 'cpf'}
          onChange={(v) => onChange({ tipoChavePix: v as TipoChavePix })}
          options={TIPOS_CHAVE}
          size="sm"
        />
      </div>

      <Field label="Chave Pix">
        <Input
          placeholder="Digite a chave Pix"
          value={value.chavePix}
          maxLength={120}
          onChange={(e) => onChange({ chavePix: e.target.value })}
        />
      </Field>

      {!hideMensalidade && !tipoCobrancaLocked ? (
        <div>
          <p className="mb-1.5 text-sm font-medium">Modelo de cobrança</p>
          <Segmented<string>
            value={value.tipoCobranca}
            onChange={(v) => onChange({ tipoCobranca: v as TipoCobranca })}
            options={[
              { value: 'por_partida', label: 'Vaquinha desta partida' },
              { value: 'mensalidade', label: 'Mensalidade (mês)' },
            ]}
            size="sm"
          />
        </div>
      ) : tipoCobrancaLocked ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Modelo de cobrança</span>
          <Badge variant="primarySoft">
            {value.tipoCobranca === 'mensalidade' ? 'Mensalidade' : 'Por partida'}
          </Badge>
          <span className="text-xs text-muted">Definido no passo 1 ao criar a partida.</span>
        </div>
      ) : null}

      {isMensal && !hideMensalidade && !tipoCobrancaLocked ? (
        <p className="rounded-md border border-info/30 bg-info-highlight px-3 py-2 text-xs text-info">
          Na mensalidade, o mês de referência é definido automaticamente pela data da pelada.
        </p>
      ) : null}

      <Field label={isMensal ? 'Valor (boleiros fixos)' : 'Valor por boleiro fixo'}>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
            R$
          </span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            className="pl-9"
            value={value.valorBoleiroFixo}
            onChange={(e) => onChange({ valorBoleiroFixo: Number(e.target.value || 0) })}
          />
        </div>
      </Field>

      {!isMensal ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.mesmoValor}
            onChange={(e) => onChange({ mesmoValor: e.target.checked })}
            className="h-4 w-4 rounded border-border bg-surface-2 text-primary focus:ring-primary"
          />
          Mesmo valor para convidados avulsos
        </label>
      ) : numConvidados > 0 ? (
        <Field label="Valor (convidados avulsos) — mensalidade">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
              R$
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              className="pl-9"
              value={value.valorConvidadoAvulso}
              onChange={(e) => onChange({ valorConvidadoAvulso: Number(e.target.value || 0) })}
            />
          </div>
        </Field>
      ) : null}

      {!isMensal && !value.mesmoValor ? (
        <Field label="Valor por convidado avulso">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
              R$
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              className="pl-9"
              value={value.valorConvidadoAvulso}
              onChange={(e) => onChange({ valorConvidadoAvulso: Number(e.target.value || 0) })}
            />
          </div>
        </Field>
      ) : null}

      <Field
        label={
          isMensal ? 'Prazo pagamento — boleiros fixos (mensalidade)' : 'Data limite de pagamento (opcional)'
        }
        hint={isMensal ? 'Padrão: último dia do mês de referência, se você não escolher outra data.' : undefined}
      >
        <DatePicker
          value={value.dataLimitePagamento ?? ''}
          onChange={(v) => onChange({ dataLimitePagamento: v || undefined })}
          ariaLabel="Data limite de pagamento fixos"
        />
      </Field>

      {isMensal ? (
        <Field
          label="Prazo pagamento — convidados avulsos (opcional)"
          hint="Padrão: dia da partida. Use este campo para outra data."
        >
          <DatePicker
            value={value.dataLimitePagamentoConvidados ?? ''}
            onChange={(v) => onChange({ dataLimitePagamentoConvidados: v || undefined })}
            ariaLabel="Data limite convidados"
          />
        </Field>
      ) : null}

      <div className="rounded-md border border-info/30 bg-info-highlight px-3 py-2 text-sm">
        <p className="font-medium text-info">Total esperado: R$ {totalEsperado.toFixed(2)}</p>
        <p className="text-xs text-info">
          {numFixos} fixo(s) × R$ {valorFixo.toFixed(2)}
          {numConvidados > 0 ? ` + ${numConvidados} convidado(s) × R$ ${valorConv.toFixed(2)}` : ''}
        </p>
      </div>
    </div>
  );
}
