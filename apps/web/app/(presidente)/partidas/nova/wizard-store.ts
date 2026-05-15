'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TipoChavePix } from '@rachao/shared/zod';
import type { TipoCobranca } from '@rachao/shared/enums';

export type RegrasState = {
  cartao_azul: { ativo: boolean; duracao_minutos: number };
  bloqueio_vermelho: { ativo: boolean };
  bloqueio_inadimplente: { ativo: boolean };
  gol_olimpico_duplo: { ativo: boolean };
  impedimento_ativo: { ativo: boolean };
  penalti_max_por_tempo: { ativo: boolean; limite: number };
  time_menor_joga: { ativo: boolean };
  goleiro_obrigatorio: { ativo: boolean };
};

export const REGRAS_INICIAIS: RegrasState = {
  cartao_azul: { ativo: false, duracao_minutos: 5 },
  bloqueio_vermelho: { ativo: false },
  bloqueio_inadimplente: { ativo: false },
  gol_olimpico_duplo: { ativo: false },
  impedimento_ativo: { ativo: false },
  penalti_max_por_tempo: { ativo: false, limite: 2 },
  time_menor_joga: { ativo: false },
  goleiro_obrigatorio: { ativo: false },
};

export interface ConvidadoAvulsoDraft {
  /** ID local apenas para diff/UI; nao vai pra API. */
  uid: string;
  /** Reutiliza ConvidadoAvulso existente (lookup por celular). */
  convidadoAvulsoId?: string;
  nome: string;
  apelido?: string;
  celular?: string;
  email?: string;
  posicao?: 'GOL' | 'ZAG' | 'MEI' | 'ATA';
}

export interface VaquinhaDraft {
  ativa: boolean;
  tipoChavePix: TipoChavePix | '';
  chavePix: string;
  valorBoleiroFixo: number;
  valorConvidadoAvulso: number;
  mesmoValor: boolean;
  tipoCobranca: TipoCobranca;
  dataLimitePagamento?: string;
  /** Mensalidade: prazo especifico para convidados (opcional). */
  dataLimitePagamentoConvidados?: string;
}

export interface WizardState {
  /** Indice 0-based do step atual. */
  currentStep: number;

  /** Tipo de cobranca da partida (passo Dados) — independente da vaquinha estar ativa. */
  tipoCobrancaPartida: TipoCobranca;

  // Passo Dados básicos (índice 1)
  grupoId: string;
  data: string;
  hora: string;
  numTimes: number;
  boleirosPorTime: number;
  reservasPorTime: number;
  tempoPartida: number;
  tempoTotal: number;

  /** Repete a mesma pelada toda semana (mesmo dia da semana + horario). */
  recorrenteAtivo: boolean;
  /** Quantidade de peladas a criar (2–24), incluindo a primeira data. */
  semanasOcorrencias: number;

  // Passo Local (índice 0)
  usarEstadioCadastrado: boolean;
  localLivre: string;
  cidade: string;
  estadioId: string | null;
  /** Cache do estadio selecionado para exibir na revisao sem nova busca. */
  estadioNome: string | null;
  estadioCidade: string | null;
  estadioEstado: string | null;

  // Passo Boleiros (índice 2)
  boleirosIds: string[];
  convidados: ConvidadoAvulsoDraft[];

  // Passo Regras (índice 3)
  regras: RegrasState;

  // Passo Vaquinha (índice 4)
  vaquinha: VaquinhaDraft;

  // Acoes
  setCurrentStep: (i: number) => void;
  next: () => void;
  prev: () => void;
  patch: (
    next: Partial<Omit<WizardState, 'setCurrentStep' | 'next' | 'prev' | 'patch' | 'reset'>>,
  ) => void;
  toggleBoleiro: (id: string) => void;
  setBoleiros: (ids: string[]) => void;
  addConvidado: (c: Omit<ConvidadoAvulsoDraft, 'uid'>) => void;
  removeConvidado: (uid: string) => void;
  setRegra: <K extends keyof RegrasState>(k: K, v: Partial<RegrasState[K]>) => void;
  setVaquinha: (v: Partial<VaquinhaDraft>) => void;
  reset: () => void;
}

const INITIAL: Omit<WizardState, 'setCurrentStep' | 'next' | 'prev' | 'patch' | 'toggleBoleiro' | 'setBoleiros' | 'addConvidado' | 'removeConvidado' | 'setRegra' | 'setVaquinha' | 'reset'> = {
  currentStep: 0,
  grupoId: '',
  tipoCobrancaPartida: 'por_partida',
  data: '',
  hora: '19:00',
  numTimes: 2,
  boleirosPorTime: 5,
  reservasPorTime: 0,
  tempoPartida: 15,
  tempoTotal: 90,
  recorrenteAtivo: false,
  semanasOcorrencias: 4,
  usarEstadioCadastrado: false,
  localLivre: '',
  cidade: '',
  estadioId: null,
  estadioNome: null,
  estadioCidade: null,
  estadioEstado: null,
  boleirosIds: [],
  convidados: [],
  regras: REGRAS_INICIAIS,
  vaquinha: {
    ativa: false,
    tipoChavePix: '',
    chavePix: '',
    valorBoleiroFixo: 0,
    valorConvidadoAvulso: 0,
    mesmoValor: true,
    tipoCobranca: 'por_partida',
    dataLimitePagamento: undefined,
  },
};

let _uidCounter = 1;
function nextUid() {
  return `c-${Date.now()}-${_uidCounter++}`;
}

export const useWizardStore = create<WizardState>()(
  persist(
    (set, get) => ({
      ...INITIAL,
      setCurrentStep: (i) => set({ currentStep: Math.max(0, Math.min(5, i)) }),
      next: () => set({ currentStep: Math.min(5, get().currentStep + 1) }),
      prev: () => set({ currentStep: Math.max(0, get().currentStep - 1) }),
      patch: (next) => set(next),
      toggleBoleiro: (id) => {
        const has = get().boleirosIds.includes(id);
        set({
          boleirosIds: has
            ? get().boleirosIds.filter((x) => x !== id)
            : [...get().boleirosIds, id],
        });
      },
      setBoleiros: (ids) => set({ boleirosIds: ids }),
      addConvidado: (c) =>
        set({ convidados: [...get().convidados, { ...c, uid: nextUid() }] }),
      removeConvidado: (uid) =>
        set({ convidados: get().convidados.filter((x) => x.uid !== uid) }),
      setRegra: (k, v) =>
        set({ regras: { ...get().regras, [k]: { ...get().regras[k], ...v } } }),
      setVaquinha: (v) => set({ vaquinha: { ...get().vaquinha, ...v } }),
      reset: () => set(INITIAL),
    }),
    {
      name: 'rachao-partida-wizard',
      version: 5,
      /**
       * Migracao 1 -> 2: adicionou recorrenteAtivo e semanasOcorrencias.
       * Migracao 2 -> 3: tipoCobrancaPartida + dataLimitePagamentoConvidados na vaquinha.
       * Migracao 3 -> 4: cache de estadio (nome, cidade, estado) para revisao.
       * Migracao 4 -> 5: ordem dos passos (Local primeiro, depois Dados); reseta passo atual.
       */
      migrate: (persisted, from) => {
        const old = (persisted ?? {}) as Partial<WizardState>;
        const mergedVaquinha = { ...INITIAL.vaquinha, ...(old.vaquinha ?? {}) };
        const tipoPartida =
          old.tipoCobrancaPartida ??
          mergedVaquinha.tipoCobranca ??
          INITIAL.tipoCobrancaPartida;
        const base = {
          ...INITIAL,
          ...old,
          tipoCobrancaPartida: tipoPartida,
          recorrenteAtivo: old.recorrenteAtivo ?? false,
          semanasOcorrencias: old.semanasOcorrencias ?? 4,
          estadioNome: old.estadioNome ?? null,
          estadioCidade: old.estadioCidade ?? null,
          estadioEstado: old.estadioEstado ?? null,
          regras: { ...REGRAS_INICIAIS, ...(old.regras ?? {}) },
          vaquinha: { ...mergedVaquinha, tipoCobranca: tipoPartida },
        } as WizardState;
        if (from < 5) {
          return { ...base, currentStep: 0 };
        }
        return base;
      },
    },
  ),
);

/**
 * Helpers de validacao por step. Retornam string com erro ou null se ok.
 */
export function validateStep(state: WizardState, step: number): string | null {
  switch (step) {
    case 0: {
      if (state.usarEstadioCadastrado) {
        if (!state.estadioId) return 'Selecione um estádio cadastrado';
      } else if (!state.localLivre.trim()) {
        return 'Informe o local da partida';
      }
      return null;
    }
    case 1: {
      if (!state.grupoId) return 'Escolha o grupo';
      if (!state.data) return 'Informe a data';
      if (!state.hora) return 'Informe o horário';
      if (state.numTimes < 2 || state.numTimes > 4) return 'Times inválido';
      if (state.boleirosPorTime < 3 || state.boleirosPorTime > 11) return 'Boleiros por time inválido';
      if (state.reservasPorTime < 0 || state.reservasPorTime > 8) return 'Reservas por time inválido';
      if (state.tempoPartida <= 0 || state.tempoTotal <= 0) return 'Tempos inválidos';
      const dt = combinarDataHora(state.data, state.hora);
      if (!dt || dt.getTime() < Date.now() - 60_000) return 'A data/horário não pode estar no passado';
      if (state.recorrenteAtivo) {
        if (state.semanasOcorrencias < 2 || state.semanasOcorrencias > 24) {
          return 'Escolha entre 2 e 24 ocorrências para a série semanal';
        }
      }
      return null;
    }
    case 2: {
      const total = state.boleirosIds.length + state.convidados.length;
      if (total === 0) return 'Selecione ao menos um boleiro ou convidado';
      return null;
    }
    case 3:
      return null; // todas regras opcionais
    case 4: {
      if (!state.vaquinha.ativa) return null;
      if (!state.vaquinha.tipoChavePix) return 'Escolha o tipo da chave Pix';
      if (!state.vaquinha.chavePix.trim()) return 'Informe a chave Pix';
      if (state.vaquinha.valorBoleiroFixo < 0) return 'Valor inválido';
      const nConv = state.convidados.length;
      const valorConv =
        state.vaquinha.mesmoValor ? state.vaquinha.valorBoleiroFixo : state.vaquinha.valorConvidadoAvulso;
      if (state.tipoCobrancaPartida === 'mensalidade' && nConv > 0 && valorConv <= 0) {
        return 'Na mensalidade, defina a taxa do convidado avulso (ou marque "mesmo valor")';
      }
      return null;
    }
    case 5:
      return null;
    default:
      return null;
  }
}

export function combinarDataHora(data: string, hora: string): Date | null {
  if (!data || !hora) return null;
  const [y, m, d] = data.split('-').map(Number);
  const [hh, mm] = hora.split(':').map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return null;
  return new Date(y!, (m ?? 1) - 1, d!, hh!, mm!);
}
