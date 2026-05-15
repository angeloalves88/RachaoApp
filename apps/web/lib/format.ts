/**
 * Formatadores de data/numero para a UI.
 * Centralizamos aqui para manter consistencia (e facilitar i18n no futuro).
 */
import {
  format,
  formatDistanceToNowStrict,
  isThisYear,
  isToday,
  isTomorrow,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function toDate(input: Date | string | null | undefined): Date | null {
  if (!input) return null;
  return typeof input === 'string' ? parseISO(input) : input;
}

/** Ex.: "23/05" ou "23/05/2025" se de outro ano. */
export function formatDataCurta(input: Date | string | null): string {
  const d = toDate(input);
  if (!d) return '';
  return isThisYear(d) ? format(d, 'dd/MM', { locale: ptBR }) : format(d, 'dd/MM/yyyy', { locale: ptBR });
}

/** Ex.: "Sáb. 23/05 · 20:00" (ou "Hoje · 20:00", "Amanhã · 20:00"). */
export function formatDataPartida(input: Date | string | null): string {
  const d = toDate(input);
  if (!d) return '';
  if (isToday(d)) return `Hoje · ${format(d, 'HH:mm')}`;
  if (isTomorrow(d)) return `Amanhã · ${format(d, 'HH:mm')}`;
  const dia = format(d, "EEEEEE dd/MM", { locale: ptBR });
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} · ${format(d, 'HH:mm')}`;
}

/** Ex.: "criado em mai/2025". */
export function formatMesAno(input: Date | string | null): string {
  const d = toDate(input);
  if (!d) return '';
  return format(d, 'MMM/yyyy', { locale: ptBR });
}

/** Contagem regressiva legivel. Ex.: "Faltam 2 dias e 4 horas". */
export function formatContagemRegressiva(input: Date | string | null): string {
  const d = toDate(input);
  if (!d) return '';
  const now = new Date();
  if (d.getTime() <= now.getTime()) return 'Acontecendo agora';
  return `Faltam ${formatDistanceToNowStrict(d, { locale: ptBR })}`;
}
