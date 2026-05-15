/**
 * Helpers para consultar as preferencias de notificacao (T33) ao decidir
 * se um job deve enviar email/WhatsApp.
 *
 * Politica: default-on. Se nao houver registro de preferencia para o evento,
 * assumimos que o usuario quer receber pelos dois canais. O usuario pode
 * desligar canais globalmente em Usuario.{notifEmail|notifWhatsapp} ou por
 * evento na tabela PreferenciaNotificacao.
 */
import type { PrismaClient } from '@rachao/db';

export interface CanaisPermitidos {
  email: boolean;
  whatsapp: boolean;
}

export async function canaisPermitidos(
  prisma: PrismaClient,
  usuarioId: string,
  evento: string,
): Promise<CanaisPermitidos> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { notifEmail: true, notifWhatsapp: true },
  });
  if (!usuario) return { email: false, whatsapp: false };
  const pref = await prisma.preferenciaNotificacao.findUnique({
    where: { usuarioId_evento: { usuarioId, evento } },
  });
  const eventoEmail = pref?.canalEmail ?? true;
  const eventoWa = pref?.canalWhatsapp ?? true;
  return {
    email: usuario.notifEmail && eventoEmail,
    whatsapp: usuario.notifWhatsapp && eventoWa,
  };
}
