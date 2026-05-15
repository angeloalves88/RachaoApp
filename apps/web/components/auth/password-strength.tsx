import { cn } from '@/lib/utils';
import { passwordStrength } from '@/lib/utils';

interface PasswordStrengthProps {
  value: string;
}

const labels = ['Muito fraca', 'Fraca', 'Média', 'Forte', 'Forte'] as const;

export function PasswordStrengthMeter({ value }: PasswordStrengthProps) {
  const score = passwordStrength(value);

  // 3 segmentos visuais (Fraca / Média / Forte) baseados no score 0-4.
  const segments = [
    score >= 1,
    score >= 3,
    score >= 4,
  ];

  const colorClass =
    score <= 1
      ? 'bg-destructive'
      : score === 2
        ? 'bg-warning'
        : score === 3
          ? 'bg-info'
          : 'bg-success';

  if (!value) return null;

  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1">
        {segments.map((on, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              on ? colorClass : 'bg-surface-offset',
            )}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted">
        {value.length < 8
          ? 'Use ao menos 8 caracteres com letras e números'
          : `Senha ${labels[score]?.toLowerCase()}`}
      </p>
    </div>
  );
}
