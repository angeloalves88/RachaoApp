import Link from 'next/link';
import type { ResumoApi } from '@/lib/public-resumo';
import { COR_HEX } from '@/lib/escalacao-ui';
import type { CorTime } from '@rachao/shared/zod';
import { Avatar } from '@/components/ui/avatar';
import { formatDataPartida } from '@/lib/format';

interface Props {
  data: ResumoApi;
  /** Pública (true) ou autenticada (false). Esconde botão "voltar para o detalhe" no público. */
  isPublic?: boolean;
}

const TIPO_LABEL: Record<string, { icon: string; label: string; color?: string }> = {
  gol: { icon: '⚽', label: 'Gol' },
  amarelo: { icon: '🟨', label: 'Cartão amarelo', color: 'text-warning' },
  vermelho: { icon: '🟥', label: 'Cartão vermelho', color: 'text-destructive' },
  azul: { icon: '🟦', label: 'Cartão azul', color: 'text-info' },
  substituicao: { icon: '🔄', label: 'Substituição' },
};

export function ResumoView({ data, isPublic = false }: Props) {
  const ordemTimes = [...data.times].sort((a, b) => b.golsFinal - a.golsFinal);
  const placar = data.times.map((t) => t.golsFinal);
  const isEmpate = placar.every((g) => g === placar[0]);
  const vencedor = isEmpate ? null : ordemTimes[0];

  return (
    <div className="container space-y-6 py-4">
      <header className="space-y-1">
        <p className="text-xs uppercase text-muted">Resumo da partida</p>
        <h1 className="font-display text-2xl font-bold">{data.partida.grupo.nome}</h1>
        <p className="text-sm text-muted">
          {formatDataPartida(data.partida.dataHora)}
          {data.partida.estadio ? ` · ${data.partida.estadio}` : ''}
          {!data.partida.estadio && data.partida.localLivre ? ` · ${data.partida.localLivre}` : ''}
        </p>
      </header>

      {/* Placar final */}
      <section
        className="overflow-hidden rounded-2xl border border-border bg-surface"
        aria-label="Placar final"
      >
        <div className="flex items-center justify-between bg-surface-2 px-4 py-2 text-xs">
          <span className="font-semibold uppercase tracking-wide text-muted">Placar final</span>
          {vencedor ? (
            <span className="font-semibold text-primary">🏆 {vencedor.nome}</span>
          ) : (
            <span className="text-muted">Empate</span>
          )}
        </div>
        <div
          className={`grid gap-3 p-4 ${
            data.times.length === 2
              ? 'grid-cols-2'
              : data.times.length === 3
                ? 'grid-cols-3'
                : 'grid-cols-4'
          }`}
        >
          {data.times.map((t) => {
            const cor = COR_HEX[(t.cor as CorTime) ?? 'blue'] ?? '#3b82f6';
            return (
              <div
                key={t.id}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-2 p-3"
                style={{ borderTopWidth: 4, borderTopColor: cor }}
              >
                <span className="truncate text-xs uppercase tracking-wide text-muted">
                  {t.nome}
                </span>
                <span className="font-display text-5xl font-bold tabular-nums sm:text-6xl">
                  {t.golsFinal}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Artilharia */}
      {data.artilharia.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Artilharia</h2>
          <ul className="space-y-1.5">
            {data.artilharia.map((a, i) => {
              const cor = a.timeCor
                ? COR_HEX[(a.timeCor as CorTime) ?? 'blue'] ?? a.timeCor
                : '#888';
              return (
                <li
                  key={a.boleiroId}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2"
                >
                  <span className="w-5 text-center text-sm font-bold text-muted">{i + 1}</span>
                  <Avatar name={a.nome} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <span className="font-semibold">{a.nome}</span>
                    {a.apelido ? <span className="text-muted"> · {a.apelido}</span> : null}
                  </span>
                  {a.timeNome ? (
                    <span className="hidden items-center gap-1 text-xs text-muted sm:inline-flex">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: cor }}
                        aria-hidden
                      />
                      {a.timeNome}
                    </span>
                  ) : null}
                  <span className="font-display text-xl font-bold tabular-nums">{a.gols}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Timeline */}
      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold">Linha do tempo</h2>
        {data.timeline.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-surface px-3 py-3 text-sm text-muted">
            Nenhum evento registrado durante a partida.
          </p>
        ) : (
          <ol className="space-y-1">
            {data.timeline.map((ev) => {
              const meta = TIPO_LABEL[ev.tipo] ?? { icon: '•', label: ev.tipo };
              const cor = ev.timeCor
                ? COR_HEX[(ev.timeCor as CorTime) ?? 'blue'] ?? ev.timeCor
                : '#888';
              return (
                <li
                  key={ev.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2"
                >
                  <span className="w-10 text-center text-xs font-mono tabular-nums text-muted">
                    {ev.minuto != null ? `${ev.minuto}'` : '—'}
                  </span>
                  <span aria-hidden className="text-lg">
                    {meta.icon}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {ev.boleiroNome ? (
                      <span className="font-semibold">{ev.boleiroNome}</span>
                    ) : (
                      <span className={`font-medium ${meta.color ?? ''}`}>{meta.label}</span>
                    )}
                    {ev.timeNome ? (
                      <span className="text-muted"> · {ev.timeNome}</span>
                    ) : null}
                  </span>
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: cor }}
                    aria-hidden
                  />
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Estatísticas individuais */}
      {data.estatisticas.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Estatísticas individuais</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted">
                  <th className="py-2 pr-3 font-medium">Boleiro</th>
                  <th className="py-2 pr-2 text-right font-medium">⚽</th>
                  <th className="py-2 pr-2 text-right font-medium">🟨</th>
                  <th className="py-2 pr-2 text-right font-medium">🟥</th>
                  <th className="py-2 pr-2 text-right font-medium">🟦</th>
                </tr>
              </thead>
              <tbody>
                {data.estatisticas.map((s) => (
                  <tr key={s.boleiroId} className="border-b border-border last:border-0">
                    <td className="py-1.5 pr-3">
                      <span className="font-medium">{s.nome}</span>
                      {s.timeNome ? (
                        <span className="ml-1 text-xs text-muted">· {s.timeNome}</span>
                      ) : null}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{s.gols}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{s.amarelos}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{s.vermelhos}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{s.azuis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {isPublic ? (
        <footer className="pt-4 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-offset"
          >
            Voltar para o RachãoApp
          </Link>
        </footer>
      ) : null}
    </div>
  );
}
