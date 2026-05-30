import { env } from '../env.js';
import { buildWhatsAppLink, enviarConviteEmail } from './email.js';
import { formatarDataPartidaBr } from './presencas.js';
import type { FastifyBaseLogger } from 'fastify';

export interface ContextoMensagemConvite {
  nomeDestinatario: string;
  nomeGrupo: string;
  dataHora: Date;
  local?: string | null;
  token: string;
  celular?: string | null;
  email?: string | null;
  valorConvidado?: number | null;
  chavePix?: string | null;
}

export function linkConfirmacaoPartida(token: string): string {
  return `${env.WEB_URL}/confirmar/${token}`;
}

export function montarTextoConvitePartida(ctx: ContextoMensagemConvite): string {
  const dataFmt = formatarDataPartidaBr(ctx.dataHora);
  const link = linkConfirmacaoPartida(ctx.token);
  const linhas = [
    `Ola, ${ctx.nomeDestinatario}!`,
    ``,
    `Voce foi convocado para o rachao do ${ctx.nomeGrupo}.`,
    `Data: ${dataFmt}`,
  ];
  if (ctx.local) linhas.push(`Local: ${ctx.local}`);
  if (ctx.valorConvidado != null && ctx.valorConvidado > 0) {
    linhas.push(`Valor: R$ ${ctx.valorConvidado.toFixed(2)}`);
  }
  if (ctx.chavePix) linhas.push(`PIX: ${ctx.chavePix}`);
  linhas.push(``, `Confirme sua presenca: ${link}`);
  return linhas.join('\n');
}

export async function enviarMensagemConvitePartida(
  ctx: ContextoMensagemConvite,
  log?: FastifyBaseLogger,
): Promise<{ whatsappLink: string | null; emailEnviado?: Awaited<ReturnType<typeof enviarConviteEmail>> }> {
  const texto = montarTextoConvitePartida(ctx);
  const link = linkConfirmacaoPartida(ctx.token);
  const dataFmt = formatarDataPartidaBr(ctx.dataHora);

  let whatsappLink: string | null = null;
  const cel = ctx.celular?.replace(/\D/g, '') ?? '';
  if (cel.length === 11) {
    whatsappLink = buildWhatsAppLink(cel, texto);
  }

  let emailEnviado;
  if (ctx.email && ctx.email.includes('@')) {
    emailEnviado = await enviarConviteEmail(
      {
        to: ctx.email,
        nomeBoleiro: ctx.nomeDestinatario,
        nomeGrupo: ctx.nomeGrupo,
        dataPartidaFormatada: dataFmt,
        localPartida: ctx.local,
        linkConfirmacao: link,
        mensagemPersonalizada: texto,
      },
      log,
    );
  }

  return { whatsappLink, emailEnviado };
}
