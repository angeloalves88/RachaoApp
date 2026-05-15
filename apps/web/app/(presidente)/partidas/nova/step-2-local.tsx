'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, MapPin, Search } from 'lucide-react';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  buscarEstadios,
  getEstadioPublico,
  type EstadioBuscaItem,
  type HorarioRow,
} from '@/lib/estadios-actions';
import { useWizardStore } from './wizard-store';

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function sugerirBoleirosPorTime(capacidade: number): number | null {
  if (!Number.isFinite(capacidade) || capacidade <= 0) return null;
  return Math.min(11, Math.max(3, capacidade));
}

function formatarHorarioLinha(h: HorarioRow) {
  const ini = (h.horaInicio ?? '').slice(0, 5);
  const fim = (h.horaFim ?? '').slice(0, 5);
  const dia = DIAS_SEMANA[h.diaSemana] ?? `Dia ${h.diaSemana}`;
  const slot =
    h.intervaloMinutos && h.intervaloMinutos > 0
      ? ` · intervalos de ${h.intervaloMinutos} min`
      : '';
  return `${dia}: ${ini}–${fim}${slot}`;
}

export function Step2Local() {
  const state = useWizardStore();
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<EstadioBuscaItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [gradeHorarios, setGradeHorarios] = useState<HorarioRow[] | null>(null);
  const [carregandoGrade, setCarregandoGrade] = useState(false);
  const [gradeFetchFalhou, setGradeFetchFalhou] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!state.usarEstadioCadastrado) return;
    const t = setTimeout(async () => {
      setCarregando(true);
      try {
        const res = await buscarEstadios({
          q: busca || undefined,
          cidade: state.cidade || undefined,
        });
        setResultados(res.estadios);
      } catch {
        setResultados([]);
      } finally {
        setCarregando(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [busca, state.cidade, state.usarEstadioCadastrado]);

  const selecionado = useMemo(
    () => resultados.find((e) => e.id === state.estadioId) ?? null,
    [resultados, state.estadioId],
  );

  return (
    <div className="space-y-5">
      <header>
        <h2 className="font-display text-2xl font-bold leading-tight">Onde vai ser?</h2>
        <p className="text-sm text-muted">Informe o local da partida ou escolha um estádio cadastrado.</p>
      </header>

      <div className="grid gap-2">
        <button
          type="button"
          onClick={() => {
            setGradeHorarios(null);
            setGradeFetchFalhou(false);
            state.patch({
              usarEstadioCadastrado: false,
              estadioId: null,
              estadioNome: null,
              estadioCidade: null,
              estadioEstado: null,
            });
          }}
          aria-pressed={!state.usarEstadioCadastrado}
          className={
            'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ' +
            (!state.usarEstadioCadastrado
              ? 'border-primary/60 bg-primary-highlight/30'
              : 'border-border bg-surface hover:bg-surface-2')
          }
        >
          <MapPin
            size={18}
            className={!state.usarEstadioCadastrado ? 'text-primary' : 'text-muted'}
          />
          <div className="flex-1">
            <p className="font-medium">Campo livre</p>
            <p className="text-xs text-muted">Digite o nome ou endereço do local manualmente.</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setGradeHorarios(null);
            setGradeFetchFalhou(false);
            state.patch({ usarEstadioCadastrado: true, localLivre: '' });
          }}
          aria-pressed={state.usarEstadioCadastrado}
          className={
            'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ' +
            (state.usarEstadioCadastrado
              ? 'border-primary/60 bg-primary-highlight/30'
              : 'border-border bg-surface hover:bg-surface-2')
          }
        >
          <Building2
            size={18}
            className={state.usarEstadioCadastrado ? 'text-primary' : 'text-muted'}
          />
          <div className="flex-1">
            <p className="font-medium">Estádio cadastrado</p>
            <p className="text-xs text-muted">Buscar estádio na plataforma e enviar para aprovação.</p>
          </div>
        </button>
      </div>

      {!state.usarEstadioCadastrado ? (
        <div className="space-y-3">
          <Field label="Nome ou endereço do local">
            <Input
              placeholder="Ex.: Quadra do Boa Esperança"
              value={state.localLivre}
              maxLength={200}
              onChange={(e) => state.patch({ localLivre: e.target.value })}
            />
          </Field>
          <Field label="Cidade (opcional)">
            <Input
              placeholder="Ex.: São Paulo"
              value={state.cidade}
              maxLength={80}
              onChange={(e) => state.patch({ cidade: e.target.value })}
            />
          </Field>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="Cidade (opcional, ajuda na busca)">
            <Input
              placeholder="Ex.: São Paulo"
              value={state.cidade}
              maxLength={80}
              onChange={(e) => state.patch({ cidade: e.target.value })}
            />
          </Field>
          <Field label="Buscar estádio por nome">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <Input
                placeholder="Digite ao menos 2 letras"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
          </Field>

          {selecionado ? (
            <div className="rounded-lg border border-primary/60 bg-primary-highlight/30 p-3">
              <p className="text-sm font-medium">{selecionado.nome}</p>
              <p className="text-xs text-muted">
                {selecionado.cidade}/{selecionado.estado} · {selecionado.tipoEspaco} · até{' '}
                {selecionado.capacidade} por time
              </p>
              <button
                type="button"
                onClick={() => {
                  setGradeHorarios(null);
                  setGradeFetchFalhou(false);
                  state.patch({
                    estadioId: null,
                    estadioNome: null,
                    estadioCidade: null,
                    estadioEstado: null,
                  });
                }}
                className="mt-2 text-xs font-medium text-primary"
              >
                Trocar estádio
              </button>
            </div>
          ) : carregando ? (
            <p className="text-xs text-muted">Buscando...</p>
          ) : resultados.length > 0 ? (
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border bg-surface-2 p-1">
              {resultados.map((e) => (
                <button
                  type="button"
                  key={e.id}
                  onClick={async () => {
                    setGradeHorarios(null);
                    setGradeFetchFalhou(false);
                    setCarregandoGrade(true);
                    state.patch({
                      estadioId: e.id,
                      estadioNome: e.nome,
                      estadioCidade: e.cidade,
                      estadioEstado: e.estado,
                      localLivre: '',
                    });
                    try {
                      const { estadio, horarios } = await getEstadioPublico(e.slug);
                      setGradeHorarios(horarios);
                      setGradeFetchFalhou(false);
                      const sugerido = sugerirBoleirosPorTime(estadio.capacidade);
                      if (sugerido != null) {
                        state.patch({ boleirosPorTime: sugerido });
                      }
                    } catch {
                      setGradeHorarios(null);
                      setGradeFetchFalhou(true);
                    } finally {
                      setCarregandoGrade(false);
                    }
                  }}
                  className="flex w-full items-start gap-2 rounded p-2 text-left hover:bg-surface"
                >
                  <Building2 size={16} className="mt-0.5 text-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.nome}</p>
                    <p className="truncate text-xs text-muted">
                      {e.cidade}/{e.estado} · {e.tipoEspaco}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border bg-surface px-3 py-4 text-center text-xs text-muted">
              Nenhum estádio encontrado. Tente outro nome ou cidade.
            </p>
          )}

          <p className="text-xs text-muted">
            Ao escolher um estádio cadastrado, a partida ficará aguardando aprovação do dono.
          </p>

          {selecionado ? (
            <div className="rounded-md border border-border bg-surface-2 p-3 text-xs text-muted">
              <p className="mb-1.5 font-medium text-foreground">Orientação para data e horário</p>
              {carregandoGrade ? (
                <p>Carregando grade do estádio…</p>
              ) : gradeFetchFalhou ? (
                <p>Não foi possível carregar a grade deste estádio. Você ainda pode seguir e escolher data e horário no próximo passo.</p>
              ) : gradeHorarios && gradeHorarios.length > 0 ? (
                <ul className="list-inside list-disc space-y-0.5">
                  {gradeHorarios.map((h) => (
                    <li key={h.id}>{formatarHorarioLinha(h)}</li>
                  ))}
                </ul>
              ) : gradeHorarios && gradeHorarios.length === 0 ? (
                <p>Este estádio não publicou intervalos semanais. Escolha data e horário no próximo passo.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
