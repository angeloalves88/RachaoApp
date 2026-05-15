'use client';

/**
 * Helpers client-side para a vaquinha (T23/T24/T25).
 */
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api';
import type {
  CobrancaLoteInput,
  PagamentoUpdateInput,
  VaquinhaCreateInput,
  VaquinhaUpdateInput,
} from '@rachao/shared/zod';
import type { StatusPagamento } from '@rachao/shared/enums';

async function token(): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sessão expirada');
  return data.session.access_token;
}

export interface VaquinhaPagador {
  id: string;
  tipoPagador: 'fixo' | 'convidado_avulso';
  status: StatusPagamento;
  valorCobrado: number;
  dataPagamento: string | null;
  observacao: string | null;
  boleiro:
    | {
        id: string;
        nome: string;
        apelido: string | null;
        celular: string | null;
        posicao: 'GOL' | 'ZAG' | 'MEI' | 'ATA' | null;
        kind: 'fixo';
      }
    | {
        id: string;
        nome: string;
        apelido: string | null;
        celular: string | null;
        posicao: 'GOL' | 'ZAG' | 'MEI' | 'ATA' | null;
        kind: 'convidado_avulso';
      }
    | null;
}

export interface VaquinhaResponse {
  partida: {
    id: string;
    dataHora: string;
    status: string;
    tipoCobranca: 'por_partida' | 'mensalidade';
    outraVaquinhaMensalidadeMesmoMesNoGrupo?: boolean;
    grupo: { id: string; nome: string };
  };
  vaquinha: {
    id: string;
    tipo: 'por_partida' | 'mensalidade';
    mesReferencia: string | null;
    chavePix: string;
    tipoChavePix: string | null;
    valorBoleiroFixo: number;
    valorConvidadoAvulso: number;
    dataLimitePagamento: string | null;
    dataLimitePagamentoConvidados?: string | null;
    criadoEm: string;
    atualizadoEm: string;
  } | null;
  pagadores: VaquinhaPagador[];
  totais: {
    arrecadado: number;
    esperado: number;
    pagos: number;
    pendentes: number;
    inadimplentes: number;
  };
}

export async function getVaquinha(partidaId: string) {
  return apiFetch<VaquinhaResponse>(`/api/partidas/${partidaId}/vaquinha`, {
    token: await token(),
  });
}

export async function createVaquinha(partidaId: string, input: VaquinhaCreateInput) {
  return apiFetch<{ vaquinha: { id: string } }>(`/api/partidas/${partidaId}/vaquinha`, {
    method: 'POST',
    body: input,
    token: await token(),
  });
}

export async function updateVaquinha(id: string, input: VaquinhaUpdateInput) {
  return apiFetch<{ vaquinha: { id: string } }>(`/api/vaquinhas/${id}`, {
    method: 'PATCH',
    body: input,
    token: await token(),
  });
}

export async function deleteVaquinha(id: string) {
  return apiFetch<{ ok: true }>(`/api/vaquinhas/${id}`, {
    method: 'DELETE',
    token: await token(),
  });
}

export async function updatePagamento(id: string, input: PagamentoUpdateInput) {
  return apiFetch<{
    ok: true;
    pagamento: { id: string; status: StatusPagamento; dataPagamento: string | null };
  }>(`/api/pagamentos/${id}`, {
    method: 'PATCH',
    body: input,
    token: await token(),
  });
}

export async function cobrarLote(vaquinhaId: string, input: CobrancaLoteInput) {
  return apiFetch<{
    ok: true;
    links: Array<{ pagamentoId: string; nome: string; url: string }>;
    semWhatsapp: number;
  }>(`/api/vaquinhas/${vaquinhaId}/cobrar`, {
    method: 'POST',
    body: input,
    token: await token(),
  });
}

export async function sincronizarPagamentosVaquinha(vaquinhaId: string) {
  return apiFetch<{ ok: true; criados: number; marcadosInadimplente: number }>(
    `/api/vaquinhas/${vaquinhaId}/sincronizar-pagamentos`,
    {
      method: 'POST',
      token: await token(),
    },
  );
}
