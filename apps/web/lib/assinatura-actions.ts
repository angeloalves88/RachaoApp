'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api';

async function token(): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sessão expirada');
  return data.session.access_token;
}

export type BillingType = 'PIX' | 'CREDIT_CARD';
export type AssinaturaStatus = 'ativa' | 'pendente' | 'cancelada' | 'inadimplente';
export type PlanoPago = 'presidente_mensal' | 'estadio_mensal' | 'combo_mensal';

export interface Assinatura {
  id: string;
  usuarioId: string;
  gateway: string;
  externalId: string;
  plano: string;
  status: AssinaturaStatus;
  valor: string;
  ciclo: 'monthly' | 'yearly';
  billingType: BillingType | null;
  proximoVencimento: string | null;
  ultimoPagamentoEm: string | null;
  cancelaEmFimCiclo: boolean;
  linkPagamento: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface AssinaturaResponse {
  assinatura: Assinatura | null;
  plano: string;
  expiraEm: string | null;
  simulado: boolean;
}

export async function getAssinatura() {
  return apiFetch<AssinaturaResponse>('/api/me/assinatura', { token: await token() });
}

export async function criarAssinatura(plano: PlanoPago, billingType: BillingType) {
  return apiFetch<{
    assinatura: Assinatura;
    linkPagamento: string | null;
    simulado: boolean;
  }>('/api/me/assinatura', {
    method: 'POST',
    body: { plano, billingType },
    token: await token(),
  });
}

export async function cancelarAssinatura() {
  return apiFetch<{ assinatura: Assinatura }>('/api/me/assinatura', {
    method: 'DELETE',
    token: await token(),
  });
}
