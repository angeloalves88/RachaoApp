'use client';

import { NumberStepper } from '@/components/ui/number-stepper';
import { RuleCard } from '@/components/ui/rule-card';
import { useWizardStore } from './wizard-store';

interface RuleDef {
  key: keyof ReturnType<typeof useWizardStore.getState>['regras'];
  icon: string;
  title: string;
  description: string;
}

const RULES: RuleDef[] = [
  { key: 'cartao_azul', icon: '🟦', title: 'Cartão Azul', description: 'Suspensão temporária em vez de expulsão' },
  { key: 'bloqueio_vermelho', icon: '🟥', title: 'Bloquear após vermelho', description: 'Quem levou vermelho na última partida não joga' },
  { key: 'bloqueio_inadimplente', icon: '💸', title: 'Bloquear inadimplente', description: 'Boleiro com vaquinha em aberto não é escalado' },
  { key: 'gol_olimpico_duplo', icon: '⭐', title: 'Gol olímpico vale 2', description: 'Gol direto de escanteio conta como dois' },
  { key: 'impedimento_ativo', icon: '🚩', title: 'Impedimento ativo', description: 'Regra de offside aplicada' },
  { key: 'goleiro_obrigatorio', icon: '🧤', title: 'Goleiro obrigatório', description: 'Todo time precisa de um goleiro escalado' },
  { key: 'time_menor_joga', icon: '⚽', title: 'Time incompleto joga', description: 'Partida não cancela com um time menor' },
  { key: 'penalti_max_por_tempo', icon: '🥅', title: 'Limite de pênaltis', description: 'Máximo de cobranças de pênalti por tempo' },
];

export function Step4Regras() {
  const regras = useWizardStore((s) => s.regras);
  const setRegra = useWizardStore((s) => s.setRegra);

  return (
    <div className="space-y-5">
      <header>
        <h2 className="font-display text-2xl font-bold leading-tight">Como vai ser o jogo?</h2>
        <p className="text-sm text-muted">Ative as regras especiais que valem para esta partida.</p>
      </header>

      <div className="grid gap-2.5 md:grid-cols-2">
        {RULES.map((r) => {
          const value = regras[r.key];
          let expanded: React.ReactNode = null;

          if (r.key === 'cartao_azul' && regras.cartao_azul.ativo) {
            expanded = (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted">Duração da suspensão</span>
                <div className="w-32">
                  <NumberStepper
                    value={regras.cartao_azul.duracao_minutos}
                    min={1}
                    max={20}
                    onChange={(v) => setRegra('cartao_azul', { duracao_minutos: v })}
                    suffix="min"
                    ariaLabel="Duração do cartão azul"
                  />
                </div>
              </div>
            );
          }
          if (r.key === 'penalti_max_por_tempo' && regras.penalti_max_por_tempo.ativo) {
            expanded = (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted">Máximo por tempo</span>
                <div className="w-32">
                  <NumberStepper
                    value={regras.penalti_max_por_tempo.limite}
                    min={1}
                    max={5}
                    onChange={(v) => setRegra('penalti_max_por_tempo', { limite: v })}
                    suffix="pen"
                    ariaLabel="Limite de pênaltis"
                  />
                </div>
              </div>
            );
          }

          return (
            <RuleCard
              key={r.key}
              icon={<span>{r.icon}</span>}
              title={r.title}
              description={r.description}
              active={value.ativo}
              onToggle={(next) => setRegra(r.key, { ativo: next } as Record<string, unknown>)}
              expandedContent={expanded}
            />
          );
        })}
      </div>

      <p className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted">
        💡 Estas regras podem ser editadas até o início da partida.
      </p>
    </div>
  );
}
