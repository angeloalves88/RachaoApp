'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { listBoleiros } from '@/lib/grupos-actions';
import type { BoleiroListItem } from '@/lib/types';
import { formatCelular } from '@/lib/utils';
import { useWizardStore } from './wizard-store';
import { ConvidadoForm } from './step-3-convidado-form';

export function Step3Boleiros() {
  const state = useWizardStore();
  const [boleiros, setBoleiros] = useState<BoleiroListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!state.grupoId) return;
    let cancel = false;
    setLoading(true);
    listBoleiros(state.grupoId, { status: 'ativo' })
      .then((res) => {
        if (!cancel) setBoleiros(res.boleiros);
      })
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [state.grupoId]);

  const totalVagas = state.numTimes * (state.boleirosPorTime + state.reservasPorTime);
  const totalSelecionados = state.boleirosIds.length + state.convidados.length;
  const excedente = Math.max(0, totalSelecionados - totalVagas);

  const filtered = useMemo(() => {
    if (!query.trim()) return boleiros;
    const q = query.trim().toLowerCase();
    return boleiros.filter(
      (b) => b.nome.toLowerCase().includes(q) || b.apelido?.toLowerCase().includes(q),
    );
  }, [boleiros, query]);

  function selectAll() {
    state.setBoleiros(boleiros.map((b) => b.id));
  }
  function clearAll() {
    state.setBoleiros([]);
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="font-display text-2xl font-bold leading-tight">Quem vai jogar?</h2>
        <p className="text-sm text-muted">
          {totalSelecionados} selecionados de {totalVagas} {totalVagas === 1 ? 'vaga' : 'vagas'}
          {excedente > 0 ? ` · ${excedente} na lista de espera` : ''}
        </p>
      </header>

      <div className="space-y-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-offset">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(100, (totalSelecionados / Math.max(1, totalVagas)) * 100)}%` }}
          />
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Boleiros do grupo</h3>
          <div className="flex gap-2 text-xs">
            <button type="button" className="text-primary hover:underline" onClick={selectAll}>
              Selecionar todos
            </button>
            <span className="text-faint">|</span>
            <button type="button" className="text-muted hover:underline" onClick={clearAll}>
              Limpar
            </button>
          </div>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Buscar por nome ou apelido"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted">
            <Spinner size={14} /> Carregando boleiros...
          </div>
        ) : boleiros.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-surface px-3 py-6 text-center text-sm text-muted">
            Este grupo ainda não tem boleiros. Adicione na tela do grupo antes de criar uma partida.
          </p>
        ) : (
          <ul className="divide-y divide-divider rounded-md border border-border bg-surface">
            {filtered.map((b) => {
              const checked = state.boleirosIds.includes(b.id);
              return (
                <li key={b.id}>
                  <label className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => state.toggleBoleiro(b.id)}
                      className="h-4 w-4 rounded border-border bg-surface-2 text-primary focus:ring-primary"
                    />
                    <Avatar name={b.nome} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{b.nome}</p>
                      {b.apelido ? (
                        <p className="truncate text-xs italic text-muted">&ldquo;{b.apelido}&rdquo;</p>
                      ) : null}
                    </div>
                    {b.posicao ? <Badge variant="primarySoft">{b.posicao}</Badge> : null}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Convidados avulsos</h3>
          <p className="text-xs text-muted">
            Convidados não fazem parte do grupo fixo — apenas desta partida.
          </p>
        </div>
        <ConvidadoForm />
        {state.convidados.length > 0 ? (
          <ul className="space-y-2">
            {state.convidados.map((c) => (
              <li
                key={c.uid}
                className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2"
              >
                <Avatar name={c.nome} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.nome}</p>
                  <p className="truncate text-xs text-muted">
                    {c.celular ? formatCelular(c.celular) : c.email ?? '—'}
                  </p>
                </div>
                {c.posicao ? <Badge variant="primarySoft">{c.posicao}</Badge> : null}
                <button
                  type="button"
                  onClick={() => state.removeConvidado(c.uid)}
                  aria-label="Remover convidado"
                  className="text-muted hover:text-destructive"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {excedente > 0 ? (
        <p className="rounded-md border border-info/30 bg-info-highlight px-3 py-2 text-xs text-info">
          {excedente} {excedente === 1 ? 'boleiro entrará' : 'boleiros entrarão'} na lista de espera —
          serão notificados se uma vaga abrir.
        </p>
      ) : null}
    </div>
  );
}
