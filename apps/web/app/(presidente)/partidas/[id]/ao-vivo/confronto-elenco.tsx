'use client';

import { useMemo } from 'react';
import { COR_HEX } from '@/lib/escalacao-ui';
import type { CorTime } from '@rachao/shared/zod';
import type { EventoApi } from '@/lib/aovivo-actions';
import type { TimeAovivo } from './modais';

interface JogadorAcaoPayload {
  timeId: string;
  boleiroId: string;
  boleiroNome: string;
}

interface Props {
  /** Exatamente 2 times do confronto atual. */
  times: TimeAovivo[];
  eventos: EventoApi[];
  jogoAtual: number;
  jogoFinalizado: boolean;
  onAcaoJogador: (payload: JogadorAcaoPayload) => void;
}

export function ConfrontoElenco({ times, eventos, jogoAtual, jogoFinalizado, onAcaoJogador }: Props) {
  const eventsByBoleiro = useMemo(() => {
    const map = new Map<string, EventoApi[]>();
    for (const ev of eventos) {
      if (!ev.boleiroId) continue;
      const evJogo = (ev.dadosExtras as { jogo?: number } | null)?.jogo ?? 1;
      if (evJogo !== jogoAtual) continue;
      const list = map.get(ev.boleiroId) ?? [];
      list.push(ev);
      map.set(ev.boleiroId, list);
    }
    return map;
  }, [eventos, jogoAtual]);

  if (times.length < 2) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {times.slice(0, 2).map((time) => {
        const cor = COR_HEX[(time.cor as CorTime) ?? 'blue'] ?? '#3b82f6';
        const titulares = time.boleiros.filter((b) => !b.reserva);

        return (
          <div key={time.id} className="rounded-xl border border-border bg-surface-2 p-2">
            <div className="mb-2 flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/30"
                style={{ backgroundColor: cor }}
              />
              <span className="truncate font-display text-xs font-bold uppercase tracking-wide">
                {time.nome}
              </span>
            </div>

            {titulares.length === 0 ? (
              <p className="text-xs text-muted">Sem titulares</p>
            ) : (
              <ul className="space-y-0.5">
                {titulares.map((b) => {
                  const evs = b.boleiroId ? (eventsByBoleiro.get(b.boleiroId) ?? []) : [];
                  const gols = evs.filter((e) => e.tipo === 'gol').length;
                  const cartoes = evs.filter((e) =>
                    ['amarelo', 'vermelho', 'azul'].includes(e.tipo),
                  );
                  const temVermelho = cartoes.some((e) => e.tipo === 'vermelho');
                  const nome = b.apelido ?? b.nome;

                  return (
                    <li key={b.boleiroId ?? b.nome}>
                      <button
                        type="button"
                        disabled={!b.boleiroId || jogoFinalizado}
                        onClick={() =>
                          b.boleiroId &&
                          onAcaoJogador({
                            timeId: time.id,
                            boleiroId: b.boleiroId,
                            boleiroNome: nome,
                          })
                        }
                        className={[
                          'flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-left text-xs transition-colors',
                          !jogoFinalizado && b.boleiroId
                            ? 'hover:bg-surface-offset active:bg-surface-offset'
                            : 'cursor-default',
                          temVermelho ? 'opacity-40' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <span
                          className={`min-w-0 flex-1 truncate font-medium ${temVermelho ? 'line-through' : ''}`}
                        >
                          {nome}
                        </span>
                        {gols > 0 && (
                          <span className="shrink-0 text-xs">
                            ⚽{gols > 1 ? `×${gols}` : ''}
                          </span>
                        )}
                        {cartoes.map((c, i) => (
                          <span key={i} className="shrink-0 text-xs">
                            {c.tipo === 'amarelo' ? '🟨' : c.tipo === 'vermelho' ? '🟥' : '🟦'}
                          </span>
                        ))}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
