'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, X } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { StepperBar } from '@/components/ui/stepper-bar';
import { createPartida } from '@/lib/partidas-actions';
import type { ConvidadoAvulsoCreateInput, PartidaCreateInput } from '@rachao/shared/zod';
import type { TipoCobranca } from '@rachao/shared/enums';
import { Step1Dados } from './step-1-dados';
import { Step2Local } from './step-2-local';
import { Step3Boleiros } from './step-3-boleiros';
import { Step4Regras } from './step-4-regras';
import { Step5Vaquinha } from './step-5-vaquinha';
import { Step6Revisao } from './step-6-revisao';
import {
  REGRAS_INICIAIS,
  combinarDataHora,
  useWizardStore,
  validateStep,
  type RegrasState,
} from './wizard-store';
import { getPrefsGerais } from '@/lib/perfil-actions';

function mergeRegrasFromPrefKeys(keys: string[] | null | undefined): RegrasState {
  let next: RegrasState = { ...REGRAS_INICIAIS };
  if (!keys?.length) return next;
  for (const raw of keys) {
    const k = raw as keyof RegrasState;
    if (k in next) {
      next = {
        ...next,
        [k]: { ...next[k], ativo: true } as RegrasState[typeof k],
      };
    }
  }
  return next;
}

const STEP_LABELS = [
  'Local',
  'Dados básicos',
  'Boleiros',
  'Regras',
  'Vaquinha',
  'Revisão',
];

interface Props {
  gruposDisponiveis: Array<{
    id: string;
    nome: string;
    totalBoleiros: number;
    tipoCobrancaPadrao: string | null;
  }>;
  initialGrupoId: string;
  initialEstadioId?: string | null;
}

export function WizardPartidaClient({
  gruposDisponiveis,
  initialGrupoId,
  initialEstadioId,
}: Props) {
  const router = useRouter();
  const state = useWizardStore();
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Garante que o grupo escolhido pertence ao usuario; se grupoId no estado
  // estiver vazio ou for invalido, usa o initial.
  useEffect(() => {
    const valido = gruposDisponiveis.some((g) => g.id === state.grupoId);
    if (!valido && initialGrupoId) {
      const g0 = gruposDisponiveis.find((g) => g.id === initialGrupoId);
      const tPadrao: TipoCobranca =
        g0?.tipoCobrancaPadrao === 'mensalidade' ? 'mensalidade' : 'por_partida';
      const cur = useWizardStore.getState();
      state.patch({
        grupoId: initialGrupoId,
        currentStep: 0,
        tipoCobrancaPartida: tPadrao,
        vaquinha: { ...cur.vaquinha, tipoCobranca: tPadrao },
      });
    }
    if (initialEstadioId) {
      state.patch({
        usarEstadioCadastrado: true,
        estadioId: initialEstadioId,
        localLivre: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGrupoId, initialEstadioId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { preferencias } = await getPrefsGerais();
        if (cancelled) return;
        const patch: {
          numTimes?: number;
          boleirosPorTime?: number;
          tempoPartida?: number;
          tempoTotal?: number;
          regras?: RegrasState;
        } = {};
        if (preferencias.prefNumTimes != null) patch.numTimes = preferencias.prefNumTimes;
        if (preferencias.prefBoleirosPorTime != null) {
          patch.boleirosPorTime = preferencias.prefBoleirosPorTime;
        }
        if (preferencias.prefTempoPartida != null) patch.tempoPartida = preferencias.prefTempoPartida;
        if (preferencias.prefTempoTotal != null) patch.tempoTotal = preferencias.prefTempoTotal;
        const regrasKeys = preferencias.prefRegrasPadrao as string[] | null;
        if (regrasKeys?.length) patch.regras = mergeRegrasFromPrefKeys(regrasKeys);
        if (Object.keys(patch).length > 0) {
          useWizardStore.getState().patch(patch);
        }
      } catch {
        /* prefs opcionais */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grupo = gruposDisponiveis.find((g) => g.id === state.grupoId);

  function tryNext() {
    const err = validateStep(state, state.currentStep);
    if (err) {
      setErro(err);
      toast.error(err);
      return;
    }
    setErro(null);
    state.next();
  }

  function tryPrev() {
    setErro(null);
    state.prev();
  }

  function tryExit() {
    if (window.confirm('Deseja sair? As informações não serão salvas.')) {
      state.reset();
      router.push('/dashboard');
    }
  }

  async function handleSubmit() {
    for (let i = 0; i <= 5; i++) {
      const err = validateStep(state, i);
      if (err) {
        toast.error(`Step ${i + 1}: ${err}`);
        state.setCurrentStep(i);
        return;
      }
    }

    const dt = combinarDataHora(state.data, state.hora);
    if (!dt) return;

    const convidadosPayload: ConvidadoAvulsoCreateInput[] = state.convidados.map((c) => {
      if (c.convidadoAvulsoId) {
        return {
          convidadoAvulsoId: c.convidadoAvulsoId,
          nome: c.nome,
          apelido: c.apelido ?? null,
          celular: c.celular ?? '',
          email: c.email ?? null,
          posicao: c.posicao ?? null,
        };
      }
      return {
        nome: c.nome,
        apelido: c.apelido ?? null,
        celular: c.celular ?? '',
        email: c.email ?? null,
        posicao: c.posicao ?? null,
      };
    });

    const payload: PartidaCreateInput = {
      grupoId: state.grupoId,
      dataHora: dt,
      numTimes: state.numTimes,
      boleirosPorTime: state.boleirosPorTime,
      reservasPorTime: state.reservasPorTime,
      tempoPartida: state.tempoPartida,
      tempoTotal: state.tempoTotal,
      tipoCobranca: state.tipoCobrancaPartida,
      regras: filterRegras(state.regras),
      localLivre: state.usarEstadioCadastrado ? null : (state.localLivre || null),
      estadioId: state.usarEstadioCadastrado ? state.estadioId : null,
      observacoes: null,
      boleirosIds: state.boleirosIds,
      convidadosAvulsos: convidadosPayload,
      vaquinha: state.vaquinha.ativa
        ? {
            tipoCobranca: state.tipoCobrancaPartida,
            tipoChavePix: state.vaquinha.tipoChavePix as Exclude<typeof state.vaquinha.tipoChavePix, ''>,
            chavePix: state.vaquinha.chavePix.trim(),
            valorBoleiroFixo: state.vaquinha.valorBoleiroFixo,
            valorConvidadoAvulso: state.vaquinha.mesmoValor
              ? state.vaquinha.valorBoleiroFixo
              : state.vaquinha.valorConvidadoAvulso,
            dataLimitePagamento: state.vaquinha.dataLimitePagamento
              ? new Date(state.vaquinha.dataLimitePagamento)
              : null,
            dataLimitePagamentoConvidados:
              state.tipoCobrancaPartida === 'mensalidade' &&
              state.vaquinha.dataLimitePagamentoConvidados
                ? new Date(state.vaquinha.dataLimitePagamentoConvidados)
                : null,
            mesReferencia: null,
          }
        : null,
      serieSemanal: state.recorrenteAtivo
        ? { ocorrencias: state.semanasOcorrencias }
        : undefined,
    };

    setSubmitting(true);
    try {
      const res = await createPartida(payload);
      const n = res.serie?.total;
      const comEstadio = Boolean(payload.estadioId);
      if (n && n > 1) {
        toast.success(
          comEstadio
            ? `${n} partidas registradas. Convites preparados. O local cadastrado aguarda confirmação do dono do estádio em cada data.`
            : `${n} partidas criadas (toda semana). Convites preparados.`,
        );
      } else {
        toast.success(
          comEstadio
            ? 'Partida registrada e convites preparados. O local cadastrado aguarda confirmação do dono do estádio.'
            : 'Partida criada! Convites preparados.',
        );
      }
      state.reset();
      router.push(`/partidas/${res.partida.id}`);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `Erro ao criar partida: ${err.message}`
          : 'Não foi possível criar a partida.';
      toast.error(msg);
      setErro(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const isLast = state.currentStep === 5;

  return (
    <div className="container space-y-5 py-5 pb-32">
      {/* Header com X */}
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={tryExit}
          aria-label="Sair do wizard"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-offset hover:text-foreground"
        >
          <X size={18} />
        </button>
        <p className="font-display text-lg font-bold">Nova partida</p>
        <span className="w-9" aria-hidden />
      </header>

      <StepperBar
        current={state.currentStep}
        total={6}
        label={STEP_LABELS[state.currentStep]}
      />

      {gruposDisponiveis.length > 1 && state.currentStep === 1 ? (
        <Field label="Grupo">
          <select
            value={state.grupoId}
            onChange={(e) => {
              const id = e.target.value;
              const g = gruposDisponiveis.find((x) => x.id === id);
              const tPadrao: TipoCobranca =
                g?.tipoCobrancaPadrao === 'mensalidade' ? 'mensalidade' : 'por_partida';
              const cur = useWizardStore.getState();
              useWizardStore.getState().patch({
                grupoId: id,
                tipoCobrancaPartida: tPadrao,
                vaquinha: { ...cur.vaquinha, tipoCobranca: tPadrao },
              });
            }}
            className="flex h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-foreground"
          >
            {gruposDisponiveis.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome} ({g.totalBoleiros} boleiros)
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <main>
        {state.currentStep === 0 ? <Step2Local /> : null}
        {state.currentStep === 1 ? <Step1Dados /> : null}
        {state.currentStep === 2 ? <Step3Boleiros /> : null}
        {state.currentStep === 3 ? <Step4Regras /> : null}
        {state.currentStep === 4 ? <Step5Vaquinha /> : null}
        {state.currentStep === 5 ? (
          <Step6Revisao
            nomeGrupo={grupo?.nome ?? ''}
            totalBoleirosAvailable={grupo?.totalBoleiros ?? 0}
          />
        ) : null}
      </main>

      {erro ? (
        <p className="rounded-md border border-destructive/40 bg-error-highlight px-3 py-2 text-sm text-destructive">
          {erro}
        </p>
      ) : null}

      {/* Footer fixo com acoes */}
      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-surface/95 backdrop-blur md:left-auto">
        <div className="container flex items-center gap-2 py-3">
          {state.currentStep > 0 ? (
            <Button type="button" variant="outline" onClick={tryPrev} disabled={submitting}>
              <ChevronLeft size={16} /> Voltar
            </Button>
          ) : null}
          {!isLast ? (
            <Button type="button" onClick={tryNext} className="ml-auto">
              Continuar
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              className="ml-auto flex-1"
              disabled={submitting}
            >
              {submitting ? <Spinner size={14} /> : null}
              {submitting ? 'Criando...' : 'Criar partida e enviar convites'}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

/**
 * Apenas as regras com `ativo: true` sao enviadas para a API.
 */
function filterRegras(
  r: ReturnType<typeof useWizardStore.getState>['regras'],
): PartidaCreateInput['regras'] {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(r) as Array<keyof typeof r>) {
    if (r[k].ativo) out[k] = r[k];
  }
  return out as PartidaCreateInput['regras'];
}
