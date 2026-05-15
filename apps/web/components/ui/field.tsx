import * as React from 'react';
import { Label } from './label';

interface FieldProps {
  /** Texto do label. Use `htmlFor` no children manualmente se precisar. */
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** Conteudo do campo (input/textarea/segmented/etc). */
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper de form-field generico: aceita qualquer children como controle.
 * Para inputs simples, prefira `FormField` (que cria o `<Input>` por voce).
 */
export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      {label ? <Label className="text-foreground">{label}</Label> : null}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
