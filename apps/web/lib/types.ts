/**
 * Tipos compartilhados entre frontend e backend, para tipagem das respostas
 * da API Fastify. Mantemos aqui (e nao em @rachao/shared) porque sao apenas
 * shapes de retorno HTTP — domain types do banco vivem em @rachao/db.
 */

export type Papel = 'criador' | 'copresidente';

export interface GrupoListItem {
  id: string;
  nome: string;
  esporte: string;
  nivel: string;
  fotoUrl: string | null;
  descricao: string | null;
  status: 'ativo' | 'arquivado';
  criadoEm: string;
  atualizadoEm: string;
  papel: Papel;
  totalBoleiros: number;
  totalPartidas: number;
  proximaPartida: { id: string; dataHora: string; status: string } | null;
  ultimaPartida: string | null;
  tipoCobrancaPadrao: string | null;
}

export interface GrupoDetalhe {
  id: string;
  nome: string;
  esporte: string;
  nivel: string;
  fotoUrl: string | null;
  descricao: string | null;
  status: 'ativo' | 'arquivado';
  tipoCobrancaPadrao: string | null;
  criadoEm: string;
  atualizadoEm: string;
  papel: Papel;
  totalBoleirosAtivos: number;
  totalPartidas: number;
  presidentes: Array<{
    grupoId: string;
    usuarioId: string;
    papel: Papel;
    criadoEm: string;
    usuario: {
      id: string;
      nome: string;
      email: string;
      avatarUrl: string | null;
    };
  }>;
}

export interface BoleiroListItem {
  id: string;
  grupoId: string;
  nome: string;
  apelido: string | null;
  posicao: 'GOL' | 'ZAG' | 'MEI' | 'ATA' | null;
  celular: string;
  email: string | null;
  status: 'ativo' | 'arquivado';
  criadoEm: string;
  atualizadoEm: string;
}

export interface BoleiroFicha {
  boleiro: BoleiroListItem;
  stats: {
    partidasJogadas: number;
    gols: number;
    cartoesAmarelos: number;
    cartoesVermelhos: number;
    pagamentosAbertos: number;
  };
}

export interface BoleiroFinanceiroLinha {
  id: string;
  status: string;
  valorCobrado: number;
  dataPagamento: string | null;
  vaquinhaTipo: string;
  mesReferencia: string | null;
  partida: {
    id: string;
    dataHora: string;
    tipoCobranca: string;
    status: string;
  };
}

export type EstatisticasPeriodo = '30d' | '90d' | 'all';

export interface EstatisticasGrupoTotais {
  partidas: number;
  partidasEncerradas: number;
  gols: number;
  amarelos: number;
  vermelhos: number;
  azuis: number;
  substituicoes: number;
}

export interface EstatisticasGrupoArtilheiro {
  boleiroId: string;
  nome: string;
  apelido: string | null;
  tipo: 'fixo' | 'convidado_avulso';
  gols: number;
}

export interface EstatisticasGrupoCartoes {
  boleiroId: string;
  nome: string;
  apelido: string | null;
  tipo: 'fixo' | 'convidado_avulso';
  amarelos: number;
  vermelhos: number;
  total: number;
}

export interface EstatisticasGrupoPresenca {
  boleiroId: string;
  nome: string;
  apelido: string | null;
  tipo: 'fixo' | 'convidado_avulso';
  convidado: number;
  confirmado: number;
  taxa: number;
}

export interface EstatisticasGrupoData {
  periodo: EstatisticasPeriodo;
  desde: string | null;
  totais: EstatisticasGrupoTotais;
  artilheiros: EstatisticasGrupoArtilheiro[];
  cartoes: EstatisticasGrupoCartoes[];
  presenca: EstatisticasGrupoPresenca[];
}

export type StatusPartida = 'agendada' | 'em_andamento' | 'encerrada' | 'cancelada';
export type StatusEstadioVinc = 'sem_estadio' | 'pendente' | 'aprovado' | 'recusado';
export type StatusConvite =
  | 'pendente'
  | 'confirmado'
  | 'recusado'
  | 'lista_espera'
  | 'departamento_medico';
export type TipoConvite = 'fixo' | 'convidado_avulso';

export interface PartidaListItem {
  id: string;
  dataHora: string;
  status: StatusPartida;
  local: string | null;
  grupo: { id: string; nome: string; fotoUrl: string | null };
  numTimes: number;
  boleirosPorTime: number;
  reservasPorTime?: number;
  tempoPartida: number;
  tempoTotal: number;
  confirmados: number;
  totalConvites: number;
  vagasTotais: number;
  serieId: string | null;
}

export interface PartidaConvite {
  id: string;
  tipo: TipoConvite;
  status: StatusConvite;
  posicaoEspera: number | null;
  recado: string | null;
  confirmadoEm: string | null;
  token: string;
  boleiro:
    | ({
        id: string;
        nome: string;
        apelido: string | null;
        posicao: 'GOL' | 'ZAG' | 'MEI' | 'ATA' | null;
        celular: string | null;
        email: string | null;
        kind: 'fixo';
      })
    | ({
        id: string;
        nome: string;
        apelido: string | null;
        posicao: 'GOL' | 'ZAG' | 'MEI' | 'ATA' | null;
        celular: string | null;
        email: null;
        kind: 'convidado_avulso';
      })
    | null;
}

export interface PartidaDetalhe {
  id: string;
  dataHora: string;
  status: StatusPartida;
  statusEstadio: StatusEstadioVinc;
  numTimes: number;
  boleirosPorTime: number;
  reservasPorTime?: number;
  tempoPartida: number;
  tempoTotal: number;
  tipoCobranca: 'por_partida' | 'mensalidade';
  localLivre: string | null;
  observacoes: string | null;
  regras: Record<string, { ativo: boolean; [k: string]: unknown }>;
  grupo: { id: string; nome: string; fotoUrl: string | null };
  estadio: { id: string; slug: string; nome: string; endereco: string; cidade: string } | null;
  presidentes: Array<{ id: string; nome: string; email: string; avatarUrl: string | null }>;
  convites: PartidaConvite[];
  resumo: {
    confirmados: number;
    recusados: number;
    pendentes: number;
    listaEspera: number;
    departamentoMedico?: number;
    vagasTotais: number;
  };
  vaquinha: {
    id: string;
    tipo: 'por_partida' | 'mensalidade';
    chavePix: string;
    tipoChavePix: string | null;
    valorBoleiroFixo: number;
    valorConvidadoAvulso: number;
    dataLimitePagamento: string | null;
    arrecadado: number;
    totalEsperado: number;
  } | null;
  serieId: string | null;
  /** Quantidade de outras partidas da mesma serie ainda pendentes (com dataHora >= a desta). */
  serieRestantes: number;
  /** True quando ja existem >=2 times salvos com boleiros — habilita "Iniciar partida". */
  temEscalacao?: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface DashboardSummary {
  proximasPartidas: Array<{
    id: string;
    dataHora: string;
    status: StatusPartida;
    serieId: string | null;
    local: string | null;
    grupo: { id: string; nome: string; fotoUrl: string | null };
    totalConvites: number;
    confirmados: number;
    vagasTotais: number;
  }>;
  grupos: Array<{
    id: string;
    nome: string;
    fotoUrl: string | null;
    nivel: string;
    esporte: string;
    papel: Papel;
    totalBoleiros: number;
    ultimaPartida: string | null;
  }>;
  ultimasPartidas: Array<{
    id: string;
    dataHora: string;
    grupo: { id: string; nome: string };
    times: Array<{ nome: string; gols: number; cor: string }>;
  }>;
  alertas: {
    vaquinhasAbertas: number;
    bloqueadosVermelho: number;
  };
}
