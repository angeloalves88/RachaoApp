/**
 * Cliente HTTP minimalista para o gateway Asaas (T32 / Fase 2).
 *
 * - Lazy + modo simulado: sem `ASAAS_API_KEY`, retorna respostas mock para
 *   permitir dev/CI sem credenciais (mesmo padrao do wrapper `email.ts`).
 * - Cobre apenas as operacoes que a V1 do app precisa: criar customer,
 *   criar/cancelar assinatura e listar (ou recuperar) o link de pagamento.
 *
 * Refs: https://docs.asaas.com/reference
 */
import type { FastifyBaseLogger } from 'fastify';
import { env } from '../env.js';

export type AsaasBillingType = 'PIX' | 'CREDIT_CARD' | 'BOLETO';
export type AsaasCycle = 'MONTHLY' | 'YEARLY';

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
  mobilePhone?: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  status: string;
  cycle: AsaasCycle;
  nextDueDate: string;
  description?: string;
  externalReference?: string;
}

export interface AsaasPayment {
  id: string;
  subscription?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  status: string;
  dueDate: string;
  paymentDate?: string;
  value: number;
}

interface ClientCtx {
  log?: FastifyBaseLogger;
}

/**
 * Indica se a lib esta operando em modo simulado (sem credenciais).
 */
export function isAsaasSimulated(): boolean {
  return !env.ASAAS_API_KEY;
}

async function request<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
  ctx?: ClientCtx,
): Promise<T> {
  const url = `${env.ASAAS_BASE_URL.replace(/\/+$/, '')}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    accept: 'application/json',
    access_token: env.ASAAS_API_KEY ?? '',
  };
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }
  if (!res.ok) {
    ctx?.log?.warn(
      { status: res.status, path, body: json },
      'Asaas: resposta nao-OK',
    );
    const msg =
      (json && typeof json === 'object' && 'errors' in json)
        ? JSON.stringify((json as { errors: unknown }).errors)
        : `Asaas ${method} ${path} -> ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

export interface CreateCustomerInput {
  name: string;
  email: string;
  /** CPF ou CNPJ apenas dígitos (opcional na criacao Asaas, mas recomendado). */
  cpfCnpj?: string;
  mobilePhone?: string;
  /** Identificador no nosso lado (usuarioId). Asaas armazena como reference. */
  externalReference?: string;
}

export async function criarCliente(
  input: CreateCustomerInput,
  ctx?: ClientCtx,
): Promise<AsaasCustomer> {
  if (isAsaasSimulated()) {
    const fake: AsaasCustomer = {
      id: `cus_sim_${Date.now()}`,
      name: input.name,
      email: input.email,
      cpfCnpj: input.cpfCnpj,
      mobilePhone: input.mobilePhone,
    };
    ctx?.log?.info({ fake }, '[asaas/simulado] customer criado');
    return fake;
  }
  return request<AsaasCustomer>('POST', '/customers', input, ctx);
}

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

export interface CreateSubscriptionInput {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  cycle: AsaasCycle;
  description?: string;
  /** YYYY-MM-DD (default: hoje + 1 dia). */
  nextDueDate?: string;
  externalReference?: string;
}

function isoToYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export async function criarAssinatura(
  input: CreateSubscriptionInput,
  ctx?: ClientCtx,
): Promise<AsaasSubscription> {
  const next =
    input.nextDueDate ??
    isoToYmd(new Date(Date.now() + 24 * 60 * 60 * 1000));

  if (isAsaasSimulated()) {
    const fake: AsaasSubscription = {
      id: `sub_sim_${Date.now()}`,
      customer: input.customer,
      billingType: input.billingType,
      value: input.value,
      status: 'ACTIVE',
      cycle: input.cycle,
      nextDueDate: next,
      description: input.description,
      externalReference: input.externalReference,
    };
    ctx?.log?.info({ fake }, '[asaas/simulado] assinatura criada');
    return fake;
  }
  return request<AsaasSubscription>(
    'POST',
    '/subscriptions',
    { ...input, nextDueDate: next },
    ctx,
  );
}

export async function cancelarAssinatura(
  externalId: string,
  ctx?: ClientCtx,
): Promise<{ id: string; deleted: boolean }> {
  if (isAsaasSimulated()) {
    ctx?.log?.info({ externalId }, '[asaas/simulado] assinatura cancelada');
    return { id: externalId, deleted: true };
  }
  return request<{ id: string; deleted: boolean }>(
    'DELETE',
    `/subscriptions/${externalId}`,
    undefined,
    ctx,
  );
}

/**
 * Retorna a primeira cobranca (pagamento) emitida para a assinatura, util
 * para mostrar o link de pagamento (Pix QR / boleto / link cartao) imediato.
 */
export async function obterPrimeiraCobranca(
  subscriptionId: string,
  ctx?: ClientCtx,
): Promise<AsaasPayment | null> {
  if (isAsaasSimulated()) {
    return {
      id: `pay_sim_${Date.now()}`,
      subscription: subscriptionId,
      invoiceUrl: `https://sandbox.asaas.com/i/sim/${subscriptionId}`,
      status: 'PENDING',
      dueDate: isoToYmd(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      value: 0,
    };
  }
  const res = await request<{ data: AsaasPayment[] }>(
    'GET',
    `/subscriptions/${subscriptionId}/payments?limit=1`,
    undefined,
    ctx,
  );
  return res.data?.[0] ?? null;
}

// ---------------------------------------------------------------------------
// Webhook auth
// ---------------------------------------------------------------------------

/**
 * Asaas envia um header `asaas-access-token` igual ao valor configurado no
 * painel (configuracao do webhook). Verificacao simples por igualdade.
 */
export function verifyWebhookToken(headerToken: string | undefined | null): boolean {
  if (!env.ASAAS_WEBHOOK_TOKEN) {
    // Sem token configurado: em dev/sim, deixar passar; em prod, bloqueia.
    return env.NODE_ENV !== 'production';
  }
  if (!headerToken) return false;
  return headerToken === env.ASAAS_WEBHOOK_TOKEN;
}
