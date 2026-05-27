export interface EstatisticasTime {
  amarelos: number;
  vermelhos: number;
  azuis: number;
}

export interface EstatisticasBoleiro {
  boleiroId: string;
  boleiroNome: string;
  timeId: string;
  amarelos: number;
  vermelhos: number;
  azuis: number;
}

export interface AoVivoResultado {
  jogo: number;
  timeAId: string;
  timeBId: string;
  golsA: number;
  golsB: number;
}

export interface ClassificacaoResumoRow {
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

export interface AoVivoParsedState {
  jogoAtual?: number;
  confronto?: { timeAId: string; timeBId: string } | null;
  jogoFinalizado?: boolean;
  resultados?: AoVivoResultado[];
  estatisticasTimes?: Record<string, EstatisticasTime>;
  artilharia?: Array<{
    boleiroId: string;
    boleiroNome: string;
    timeId: string;
    gols: number;
  }>;
  estatisticasBoleiros?: EstatisticasBoleiro[];
}

export function calcularClassificacaoResumo(
  times: Array<{ id: string; nome: string; cor: string }>,
  resultados: AoVivoResultado[] | undefined,
  estatisticasTimes: Record<string, EstatisticasTime> | undefined,
): ClassificacaoResumoRow[] {
  const map = new Map<string, ClassificacaoResumoRow>();
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

  return [...map.values()]
    .map((r) => ({ ...r, sg: r.gp - r.gc }))
    .sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gp - a.gp || a.nome.localeCompare(b.nome));
}

/** Soma gols marcados em cada sub-jogo (resultados persistidos no ao-vivo). */
export function golsTotaisFromResultados(
  resultados: AoVivoResultado[] | undefined,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of resultados ?? []) {
    map.set(r.timeAId, (map.get(r.timeAId) ?? 0) + r.golsA);
    map.set(r.timeBId, (map.get(r.timeBId) ?? 0) + r.golsB);
  }
  return map;
}

export function cartoesPorTimeFromEventos(
  eventos: Array<{ tipo: string; timeId: string | null }>,
): Record<string, EstatisticasTime> {
  const out: Record<string, EstatisticasTime> = {};
  for (const ev of eventos) {
    if (!ev.timeId) continue;
    if (!out[ev.timeId]) out[ev.timeId] = { amarelos: 0, vermelhos: 0, azuis: 0 };
    const ct = out[ev.timeId]!;
    if (ev.tipo === 'amarelo') ct.amarelos++;
    else if (ev.tipo === 'vermelho') ct.vermelhos++;
    else if (ev.tipo === 'azul') ct.azuis++;
  }
  return out;
}

export function cartoesPorBoleiroFromEventos(
  eventos: Array<{
    tipo: string;
    timeId: string | null;
    boleiroId: string | null;
    boleiroNome?: string | null;
  }>,
): EstatisticasBoleiro[] {
  const out = new Map<string, EstatisticasBoleiro>();
  for (const ev of eventos) {
    if (
      !ev.timeId ||
      !ev.boleiroId ||
      (ev.tipo !== 'amarelo' && ev.tipo !== 'vermelho' && ev.tipo !== 'azul')
    ) {
      continue;
    }
    const cur = out.get(ev.boleiroId) ?? {
      boleiroId: ev.boleiroId,
      boleiroNome: ev.boleiroNome ?? '',
      timeId: ev.timeId,
      amarelos: 0,
      vermelhos: 0,
      azuis: 0,
    };
    if (ev.tipo === 'amarelo') cur.amarelos++;
    else if (ev.tipo === 'vermelho') cur.vermelhos++;
    else cur.azuis++;
    out.set(ev.boleiroId, cur);
  }
  return [...out.values()];
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

export function mergeEstatisticasBoleiros(
  base: EstatisticasBoleiro[] | undefined,
  add: EstatisticasBoleiro[],
): EstatisticasBoleiro[] {
  const map = new Map<string, EstatisticasBoleiro>();
  for (const s of base ?? []) {
    map.set(s.boleiroId, { ...s });
  }
  for (const s of add) {
    const prev = map.get(s.boleiroId);
    if (prev) {
      prev.amarelos += s.amarelos;
      prev.vermelhos += s.vermelhos;
      prev.azuis += s.azuis;
      if (s.boleiroNome) prev.boleiroNome = s.boleiroNome;
      if (s.timeId) prev.timeId = s.timeId;
    } else {
      map.set(s.boleiroId, { ...s });
    }
  }
  return [...map.values()];
}

export function jogoDoEvento(dadosExtras: unknown): number {
  if (!dadosExtras || typeof dadosExtras !== 'object' || Array.isArray(dadosExtras)) return 1;
  const j = (dadosExtras as Record<string, unknown>).jogo;
  return typeof j === 'number' && Number.isInteger(j) && j >= 1 ? j : 1;
}

export function eventosNaoConsolidados<T extends { dadosExtras: unknown }>(
  eventos: T[],
  aoVivo: AoVivoParsedState,
): T[] {
  if (!aoVivo.jogoFinalizado || typeof aoVivo.jogoAtual !== 'number') return eventos;
  const jogoAtual = aoVivo.jogoAtual;
  const resultadoPersistido = (aoVivo.resultados ?? []).some((r) => r.jogo === jogoAtual);
  if (!resultadoPersistido) return eventos;
  return eventos.filter((ev) => jogoDoEvento(ev.dadosExtras) !== jogoAtual);
}

export function parseAoVivoEstado(raw: unknown): AoVivoParsedState {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  return {
    jogoAtual: typeof o.jogoAtual === 'number' ? o.jogoAtual : undefined,
    confronto:
      o.confronto && typeof o.confronto === 'object'
        ? (o.confronto as { timeAId: string; timeBId: string })
        : undefined,
    jogoFinalizado: o.jogoFinalizado === true,
    resultados: Array.isArray(o.resultados) ? (o.resultados as AoVivoResultado[]) : undefined,
    estatisticasTimes:
      o.estatisticasTimes && typeof o.estatisticasTimes === 'object'
        ? (o.estatisticasTimes as Record<string, EstatisticasTime>)
        : undefined,
    artilharia: Array.isArray(o.artilharia)
      ? (o.artilharia as Array<{
          boleiroId: string;
          boleiroNome: string;
          timeId: string;
          gols: number;
        }>)
      : undefined,
    estatisticasBoleiros: Array.isArray(o.estatisticasBoleiros)
      ? (o.estatisticasBoleiros as EstatisticasBoleiro[])
      : undefined,
  };
}
