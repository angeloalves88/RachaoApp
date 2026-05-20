import type { EventoApi } from '@/lib/aovivo-actions';
import type { AoVivoEstado, AoVivoEstadoResultado } from '@/lib/aovivo-actions';

export interface EstatisticasTime {
  amarelos: number;
  vermelhos: number;
  azuis: number;
}

export interface Artilheiro {
  boleiroId: string;
  boleiroNome: string;
  timeId: string;
  gols: number;
}

export interface ClassificacaoTimeRow {
  timeId: string;
  nome: string;
  cor: string;
  j: number;
  v: number;
  e: number;
  d: number;
  pts: number;
  gp: number;
  gc: number;
  sg: number;
  amarelos: number;
  vermelhos: number;
  azuis: number;
}

export function extrairStatsDeEventos(
  eventos: EventoApi[],
  resolverNome: (boleiroId: string, timeId: string) => string,
): {
  cartoesPorTime: Record<string, EstatisticasTime>;
  artilheiros: Artilheiro[];
} {
  const cartoesPorTime: Record<string, EstatisticasTime> = {};
  const golsPorBoleiro = new Map<string, Artilheiro>();

  for (const ev of eventos) {
    if (!ev.timeId) continue;
    if (!cartoesPorTime[ev.timeId]) {
      cartoesPorTime[ev.timeId] = { amarelos: 0, vermelhos: 0, azuis: 0 };
    }
    const ct = cartoesPorTime[ev.timeId]!;
    if (ev.tipo === 'amarelo') ct.amarelos++;
    else if (ev.tipo === 'vermelho') ct.vermelhos++;
    else if (ev.tipo === 'azul') ct.azuis++;

    if (ev.tipo === 'gol' && ev.boleiroId) {
      const cur = golsPorBoleiro.get(ev.boleiroId) ?? {
        boleiroId: ev.boleiroId,
        boleiroNome: ev.boleiroNome ?? resolverNome(ev.boleiroId, ev.timeId),
        timeId: ev.timeId,
        gols: 0,
      };
      cur.gols++;
      golsPorBoleiro.set(ev.boleiroId, cur);
    }
  }

  return { cartoesPorTime, artilheiros: [...golsPorBoleiro.values()] };
}

export function mergeEstatisticasTimes(
  base: Record<string, EstatisticasTime> | undefined,
  add: Record<string, EstatisticasTime>,
): Record<string, EstatisticasTime> {
  const out = { ...(base ?? {}) };
  for (const [timeId, s] of Object.entries(add)) {
    const prev = out[timeId] ?? { amarelos: 0, vermelhos: 0, azuis: 0 };
    out[timeId] = {
      amarelos: prev.amarelos + s.amarelos,
      vermelhos: prev.vermelhos + s.vermelhos,
      azuis: prev.azuis + s.azuis,
    };
  }
  return out;
}

export function mergeArtilharia(
  base: Artilheiro[] | undefined,
  add: Artilheiro[],
): Artilheiro[] {
  const map = new Map<string, Artilheiro>();
  for (const a of base ?? []) {
    map.set(a.boleiroId, { ...a });
  }
  for (const a of add) {
    const prev = map.get(a.boleiroId);
    if (prev) {
      prev.gols += a.gols;
      if (a.boleiroNome) prev.boleiroNome = a.boleiroNome;
    } else {
      map.set(a.boleiroId, { ...a });
    }
  }
  return [...map.values()].sort((a, b) => b.gols - a.gols || a.boleiroNome.localeCompare(b.boleiroNome));
}

export function calcularClassificacaoTimes(
  times: Array<{ id: string; nome: string; cor: string }>,
  resultados: AoVivoEstadoResultado[] | undefined,
  estatisticasTimes: Record<string, EstatisticasTime> | undefined,
  /** Gols do jogo em andamento (ainda não em resultados). */
  golsJogoAoVivo?: Map<string, number>,
): ClassificacaoTimeRow[] {
  const map = new Map<string, ClassificacaoTimeRow>();
  for (const t of times) {
    const est = estatisticasTimes?.[t.id];
    map.set(t.id, {
      timeId: t.id,
      nome: t.nome,
      cor: t.cor,
      j: 0,
      v: 0,
      e: 0,
      d: 0,
      pts: 0,
      gp: 0,
      gc: 0,
      sg: 0,
      amarelos: est?.amarelos ?? 0,
      vermelhos: est?.vermelhos ?? 0,
      azuis: est?.azuis ?? 0,
    });
  }

  for (const r of resultados ?? []) {
    const a = map.get(r.timeAId);
    const b = map.get(r.timeBId);
    if (!a || !b) continue;
    a.j++;
    b.j++;
    a.gp += r.golsA;
    a.gc += r.golsB;
    b.gp += r.golsB;
    b.gc += r.golsA;
    if (r.golsA > r.golsB) {
      a.v++;
      a.pts += 3;
      b.d++;
    } else if (r.golsA < r.golsB) {
      b.v++;
      b.pts += 3;
      a.d++;
    } else {
      a.e++;
      b.e++;
      a.pts += 1;
      b.pts += 1;
    }
  }

  if (golsJogoAoVivo && golsJogoAoVivo.size >= 2) {
    const ids = [...golsJogoAoVivo.keys()].filter((id) => map.has(id));
    if (ids.length === 2) {
      const idA = ids[0]!;
      const idB = ids[1]!;
      const gA = golsJogoAoVivo.get(idA) ?? 0;
      const gB = golsJogoAoVivo.get(idB) ?? 0;
      const rowA = map.get(idA);
      const rowB = map.get(idB);
      if (rowA && rowB) {
        rowA.gp += gA;
        rowA.gc += gB;
        rowB.gp += gB;
        rowB.gc += gA;
      }
    }
  }

  return [...map.values()]
    .map((r) => ({ ...r, sg: r.gp - r.gc }))
    .sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gp - a.gp || a.nome.localeCompare(b.nome));
}

export function artilhariaCompleta(
  persistida: Artilheiro[] | undefined,
  eventosJogoAtual: EventoApi[],
  resolverNome: (boleiroId: string, timeId: string) => string,
  incluirJogoAtual: boolean,
): Artilheiro[] {
  if (!incluirJogoAtual || eventosJogoAtual.length === 0) {
    return [...(persistida ?? [])].sort(
      (a, b) => b.gols - a.gols || a.boleiroNome.localeCompare(b.boleiroNome),
    );
  }
  const { artilheiros } = extrairStatsDeEventos(eventosJogoAtual, resolverNome);
  return mergeArtilharia(persistida, artilheiros);
}
