export interface EstatisticasTime {
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

export function parseAoVivoEstado(raw: unknown): {
  resultados?: AoVivoResultado[];
  estatisticasTimes?: Record<string, EstatisticasTime>;
  artilharia?: Array<{
    boleiroId: string;
    boleiroNome: string;
    timeId: string;
    gols: number;
  }>;
} {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  return {
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
  };
}
