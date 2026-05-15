export const PERFIS = ['presidente', 'dono_estadio'] as const;
export type Perfil = (typeof PERFIS)[number];

export const NIVEIS_GRUPO = ['casual', 'intermediario', 'competitivo'] as const;
export type NivelGrupo = (typeof NIVEIS_GRUPO)[number];

export const POSICOES = ['GOL', 'ZAG', 'MEI', 'ATA'] as const;
export type Posicao = (typeof POSICOES)[number];

export const TIPOS_COBRANCA = ['por_partida', 'mensalidade'] as const;
export type TipoCobranca = (typeof TIPOS_COBRANCA)[number];

export const STATUS_PARTIDA = ['agendada', 'em_andamento', 'encerrada', 'cancelada'] as const;
export type StatusPartida = (typeof STATUS_PARTIDA)[number];

export const STATUS_ESTADIO = ['sem_estadio', 'pendente', 'aprovado', 'recusado'] as const;
export type StatusEstadio = (typeof STATUS_ESTADIO)[number];

export const STATUS_BOLEIRO = ['ativo', 'arquivado'] as const;
export type StatusBoleiro = (typeof STATUS_BOLEIRO)[number];

export const TIPOS_CONVITE = ['fixo', 'convidado_avulso'] as const;
export type TipoConvite = (typeof TIPOS_CONVITE)[number];

export const STATUS_CONVITE = [
  'pendente',
  'confirmado',
  'recusado',
  'lista_espera',
  'departamento_medico',
] as const;
export type StatusConvite = (typeof STATUS_CONVITE)[number];

export const STATUS_PAGAMENTO = ['pago', 'pendente', 'inadimplente'] as const;
export type StatusPagamento = (typeof STATUS_PAGAMENTO)[number];

export const TIPO_PAGADOR = ['fixo', 'convidado_avulso'] as const;
export type TipoPagador = (typeof TIPO_PAGADOR)[number];

export const TIPOS_EVENTO = ['gol', 'amarelo', 'vermelho', 'azul', 'substituicao'] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export const REGRAS_PARTIDA = [
  'cartao_azul',
  'bloqueio_vermelho',
  'bloqueio_inadimplente',
  'gol_olimpico_duplo',
  'impedimento_ativo',
  'penalti_max_por_tempo',
  'time_menor_joga',
  'goleiro_obrigatorio',
] as const;
export type RegraPartida = (typeof REGRAS_PARTIDA)[number];

export type RegrasPartida = Partial<{
  cartao_azul: { ativo: boolean; duracao_minutos?: number };
  bloqueio_vermelho: { ativo: boolean };
  bloqueio_inadimplente: { ativo: boolean };
  gol_olimpico_duplo: { ativo: boolean };
  impedimento_ativo: { ativo: boolean };
  penalti_max_por_tempo: { ativo: boolean; limite?: number };
  time_menor_joga: { ativo: boolean };
  goleiro_obrigatorio: { ativo: boolean };
}>;
