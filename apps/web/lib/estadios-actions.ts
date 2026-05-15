'use client';

/**
 * Helpers client-side para o Dono do Estadio (Bloco 8 - T26..T30).
 */
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api';
import type {
  DataBloqueadaInput,
  EstadioUpdateInput,
  HorariosDisponiveisBatchInput,
  SolicitacaoResponderInput,
} from '@rachao/shared/zod';

async function token(): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sessão expirada');
  return data.session.access_token;
}

export interface EstadioCompleto {
  id: string;
  donoId: string;
  nome: string;
  slug: string;
  endereco: string;
  cidade: string;
  estado: string;
  tipoEspaco: string;
  tipoPiso: string[];
  capacidade: number;
  comodidades: string[];
  descricao: string | null;
  fotoCapaUrl: string | null;
  fotos: string[];
  ativo: boolean;
  publico: boolean;
  publicoBuscas: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface HorarioRow {
  id: string;
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  intervaloMinutos: number;
  ativo: boolean;
}

export interface BloqueioRow {
  id: string;
  data: string;
  motivo: string | null;
}

export async function getMeuEstadio() {
  return apiFetch<{
    estadio: EstadioCompleto;
    horarios: HorarioRow[];
    bloqueios: BloqueioRow[];
  }>('/api/me/estadio', { token: await token() });
}

export async function patchMeuEstadio(input: EstadioUpdateInput) {
  return apiFetch<{ estadio: EstadioCompleto }>('/api/me/estadio', {
    method: 'PATCH',
    body: input,
    token: await token(),
  });
}

export async function putMeusHorarios(input: HorariosDisponiveisBatchInput) {
  return apiFetch<{ horarios: HorarioRow[] }>('/api/me/estadio/horarios', {
    method: 'PUT',
    body: input,
    token: await token(),
  });
}

export async function addMeuBloqueio(input: DataBloqueadaInput) {
  return apiFetch<{ bloqueio: BloqueioRow }>('/api/me/estadio/bloqueios', {
    method: 'POST',
    body: input,
    token: await token(),
  });
}

export async function removerMeuBloqueio(id: string) {
  return apiFetch<{ ok: true }>(`/api/me/estadio/bloqueios/${id}`, {
    method: 'DELETE',
    token: await token(),
  });
}

export interface AgendaResponse {
  partidas: Array<{
    id: string;
    dataHora: string;
    numTimes: number;
    boleirosPorTime: number;
    reservasPorTime: number;
    tempoTotal: number;
    statusEstadio: string;
    status: string;
    grupo: { id: string; nome: string };
    solicitacaoStatus: string | null;
  }>;
  bloqueios: BloqueioRow[];
}

export async function getAgenda(inicio: string, fim: string) {
  const qs = new URLSearchParams({ inicio, fim }).toString();
  return apiFetch<AgendaResponse>(`/api/me/estadio/agenda?${qs}`, {
    token: await token(),
  });
}

export interface SolicitacaoRow {
  id: string;
  status: 'pendente' | 'aprovada' | 'recusada' | 'cancelada';
  motivoResposta: string | null;
  respondidaEm: string | null;
  observacoesPres: string | null;
  criadoEm: string;
  partida: {
    id: string;
    dataHora: string;
    numTimes: number;
    boleirosPorTime: number;
    reservasPorTime: number;
    tempoTotal: number;
    status: string;
    observacoes: string | null;
    grupo: {
      id: string;
      nome: string;
      presidente: { id: string; nome: string; email: string; celular: string | null } | null;
    };
  };
  conflito: boolean;
}

export async function listSolicitacoes(status: 'todas' | 'pendente' | 'aprovada' | 'recusada' | 'cancelada' = 'todas') {
  return apiFetch<{ solicitacoes: SolicitacaoRow[] }>(
    `/api/me/estadio/solicitacoes?status=${status}`,
    { token: await token() },
  );
}

export async function responderSolicitacao(id: string, input: SolicitacaoResponderInput) {
  return apiFetch<{ ok: true; status: string }>(`/api/solicitacoes/${id}/responder`, {
    method: 'POST',
    body: input,
    token: await token(),
  });
}

export interface EstadioBuscaItem {
  id: string;
  nome: string;
  slug: string;
  cidade: string;
  estado: string;
  fotoCapaUrl: string | null;
  tipoEspaco: string;
  capacidade: number;
}

export async function buscarEstadios(params: { q?: string; cidade?: string }) {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.cidade) search.set('cidade', params.cidade);
  const qs = search.toString();
  return apiFetch<{ estadios: EstadioBuscaItem[] }>(
    `/api/estadios/buscar${qs ? `?${qs}` : ''}`,
    { token: await token() },
  );
}

/** GET /api/estadios/publico/:slug — sem auth; horários ativos + capacidade. */
export async function getEstadioPublico(slug: string) {
  return apiFetch<{
    estadio: {
      id: string;
      slug: string;
      nome: string;
      capacidade: number;
    };
    horarios: HorarioRow[];
  }>(`/api/estadios/publico/${encodeURIComponent(slug)}`);
}

export interface DashboardEstadioResponse {
  estadio: {
    id: string;
    nome: string;
    slug: string;
    ativo: boolean;
    publicoBuscas: boolean;
  };
  proximas: Array<{
    id: string;
    dataHora: string;
    numTimes: number;
    boleirosPorTime: number;
    reservasPorTime: number;
    grupo: { id: string; nome: string };
  }>;
  pendentes: {
    total: number;
    itens: Array<{
      id: string;
      partida: {
        id: string;
        dataHora: string;
        tempoTotal: number;
        grupo: { id: string; nome: string };
      };
      criadoEm: string;
    }>;
  };
  stats: {
    partidasMes: number;
    gruposFrequentadores: number;
    ocupadosSemana: number;
    slotsSemana: number;
    taxaOcupacaoMensal: number;
  };
}

export async function getDashboardEstadio() {
  return apiFetch<DashboardEstadioResponse>('/api/dashboard/estadio', {
    token: await token(),
  });
}
