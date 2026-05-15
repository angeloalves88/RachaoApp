'use client';

import { VaquinhaForm, type VaquinhaFormValue } from '@/components/vaquinha/vaquinha-form';
import { useWizardStore } from './wizard-store';

export function Step5Vaquinha() {
  const vaquinha = useWizardStore((s) => s.vaquinha);
  const tipoCobrancaPartida = useWizardStore((s) => s.tipoCobrancaPartida);
  const setVaquinha = useWizardStore((s) => s.setVaquinha);
  const nFixos = useWizardStore((s) => s.boleirosIds.length);
  const nConv = useWizardStore((s) => s.convidados.length);

  const value: VaquinhaFormValue = {
    tipoChavePix: vaquinha.tipoChavePix,
    chavePix: vaquinha.chavePix,
    tipoCobranca: tipoCobrancaPartida,
    valorBoleiroFixo: vaquinha.valorBoleiroFixo,
    valorConvidadoAvulso: vaquinha.valorConvidadoAvulso,
    mesmoValor: vaquinha.mesmoValor,
    dataLimitePagamento: vaquinha.dataLimitePagamento,
    dataLimitePagamentoConvidados: vaquinha.dataLimitePagamentoConvidados,
  };

  return (
    <div className="space-y-5">
      <header>
        <h2 className="font-display text-2xl font-bold leading-tight">Vai ter vaquinha?</h2>
        <p className="text-sm text-muted">Escolha se a cobrança é só desta pelada ou mensalidade do mês.</p>
      </header>

      <button
        type="button"
        onClick={() => setVaquinha({ ativa: !vaquinha.ativa })}
        aria-pressed={vaquinha.ativa}
        className={
          'flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors ' +
          (vaquinha.ativa
            ? 'border-primary/60 bg-primary-highlight/30'
            : 'border-border bg-surface')
        }
      >
        <div>
          <p className="font-medium">Configurar cobrança (Pix)</p>
          <p className="text-xs text-muted">Vaquinha por partida ou mensalidade com chave Pix.</p>
        </div>
        <div
          role="switch"
          aria-checked={vaquinha.ativa}
          className={
            'relative h-6 w-10 rounded-full border transition-colors ' +
            (vaquinha.ativa ? 'border-primary bg-primary' : 'border-border bg-surface-offset')
          }
        >
          <span
            className={
              'absolute top-[1px] h-5 w-5 rounded-full bg-white shadow transition-transform ' +
              (vaquinha.ativa ? 'translate-x-4' : 'translate-x-0.5')
            }
          />
        </div>
      </button>

      {vaquinha.ativa ? (
        <>
          <VaquinhaForm
            tipoCobrancaLocked
            value={value}
            onChange={(patch) => {
              const { tipoCobranca: _t, ...rest } = patch;
              setVaquinha(rest);
            }}
            numFixos={nFixos}
            numConvidados={nConv}
          />

          <p className="text-xs text-muted">
            O controle de pagamentos é manual — você marca quem pagou depois da partida.
          </p>
        </>
      ) : null}
    </div>
  );
}
