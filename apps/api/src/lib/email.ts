/**
 * Wrapper fino sobre o Resend para envio de e-mails transacionais.
 *
 * Comportamento:
 * - Se RESEND_API_KEY nao estiver setada, opera em modo "simulado" (apenas
 *   loga o conteudo). Isso permite rodar dev/CI sem credenciais.
 * - Sempre retorna um objeto { simulated, id?, error? } para que a chamada
 *   nao quebre o fluxo principal mesmo em caso de falha do provider.
 */
import { Resend } from 'resend';
import type { FastifyBaseLogger } from 'fastify';
import { env } from '../env.js';

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(env.RESEND_API_KEY);
  return _resend;
}

const FROM_DEFAULT =
  process.env.RESEND_FROM ?? 'RachãoApp <convites@rachao.local>';

export interface ConviteEmailContext {
  to: string;
  nomeBoleiro: string;
  nomeGrupo: string;
  dataPartidaFormatada: string;
  localPartida?: string | null;
  linkConfirmacao: string;
  /** 'convite' = primeiro envio; 'lembrete' = reenvio T16. */
  variant?: 'convite' | 'lembrete';
  /** Quando preenchida, substitui o texto principal do template. */
  mensagemPersonalizada?: string | null;
}

export interface SendResult {
  simulated: boolean;
  id?: string;
  error?: string;
}

/**
 * Envia (ou simula) um convite de partida por email.
 */
export async function enviarConviteEmail(
  ctx: ConviteEmailContext,
  log?: FastifyBaseLogger,
): Promise<SendResult> {
  const variant = ctx.variant ?? 'convite';
  const subject =
    variant === 'lembrete'
      ? `Lembrete: ${ctx.nomeGrupo} — ${ctx.dataPartidaFormatada}`
      : `Confirme presença: ${ctx.nomeGrupo} — ${ctx.dataPartidaFormatada}`;
  const html = renderConviteHtml(ctx);
  const text = renderConviteText(ctx);

  const client = getResend();
  if (!client) {
    log?.info(
      { to: ctx.to, subject, link: ctx.linkConfirmacao },
      '[email/simulado] convite nao enviado (RESEND_API_KEY ausente)',
    );
    return { simulated: true };
  }

  try {
    const res = await client.emails.send({
      from: FROM_DEFAULT,
      to: ctx.to,
      subject,
      html,
      text,
    });
    if (res.error) {
      log?.warn({ err: res.error, to: ctx.to }, 'Resend retornou erro');
      return { simulated: false, error: res.error.message };
    }
    return { simulated: false, id: res.data?.id };
  } catch (err) {
    log?.warn({ err, to: ctx.to }, 'Falha ao enviar convite via Resend');
    return { simulated: false, error: (err as Error).message };
  }
}

function renderConviteHtml(ctx: ConviteEmailContext): string {
  const variant = ctx.variant ?? 'convite';
  const local = ctx.localPartida ? `<p><strong>📍 Local:</strong> ${escapeHtml(ctx.localPartida)}</p>` : '';
  const heading =
    variant === 'lembrete'
      ? `Já confirmou, ${escapeHtml(ctx.nomeBoleiro)}?`
      : `Vai jogar, ${escapeHtml(ctx.nomeBoleiro)}?`;
  const intro = ctx.mensagemPersonalizada
    ? `<p>${escapeHtml(ctx.mensagemPersonalizada)}</p>`
    : variant === 'lembrete'
      ? `<p>Estamos finalizando a lista para o rachão do <strong>${escapeHtml(ctx.nomeGrupo)}</strong>. Bate o joinha pra gente saber se você vai!</p>`
      : `<p>O grupo <strong>${escapeHtml(ctx.nomeGrupo)}</strong> agendou um rachão.</p>`;
  return `<!doctype html>
<html lang="pt-BR">
  <body style="font-family: system-ui, -apple-system, sans-serif; background:#0f1b2d; color:#e8edf3; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#162236; border-radius:12px; padding:24px;">
      <h1 style="margin:0 0 16px; color:#e8530a; font-size:22px;">${heading}</h1>
      ${intro}
      <p><strong>📅 Quando:</strong> ${escapeHtml(ctx.dataPartidaFormatada)}</p>
      ${local}
      <p style="margin:24px 0 16px; text-align:center;">
        <a href="${escapeAttr(ctx.linkConfirmacao)}"
           style="display:inline-block; background:#e8530a; color:white; padding:12px 24px;
                  border-radius:8px; text-decoration:none; font-weight:600;">
          Confirmar presença
        </a>
      </p>
      <p style="font-size:12px; color:#7a8fa6;">Este link é único. Se não conseguir clicar, copie e cole no navegador:<br>${escapeHtml(ctx.linkConfirmacao)}</p>
    </div>
  </body>
</html>`;
}

function renderConviteText(ctx: ConviteEmailContext): string {
  const variant = ctx.variant ?? 'convite';
  const intro = ctx.mensagemPersonalizada
    ? ctx.mensagemPersonalizada
    : variant === 'lembrete'
      ? `Lembrete do ${ctx.nomeGrupo}: confirma se você vai no rachão de ${ctx.dataPartidaFormatada}.`
      : `O ${ctx.nomeGrupo} agendou um rachão para ${ctx.dataPartidaFormatada}.`;
  return [
    `E aí, ${ctx.nomeBoleiro}!`,
    ``,
    intro,
    ctx.localPartida ? `Local: ${ctx.localPartida}` : null,
    ``,
    `Confirme aqui: ${ctx.linkConfirmacao}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Constroi um deep-link wa.me com texto pre-preenchido para o presidente
 * disparar manualmente o convite por WhatsApp. Aceita celular brasileiro com
 * 11 digitos (ja sem mascaras).
 */
export function buildWhatsAppLink(celularBr: string, mensagem: string): string | null {
  const digits = celularBr.replace(/\D/g, '');
  if (digits.length !== 11) return null;
  const intl = `55${digits}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(mensagem)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}
