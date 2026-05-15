import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from './label';
import { Input, type InputProps } from './input';

interface FormFieldProps extends Omit<InputProps, 'id'> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  rightSlot?: React.ReactNode;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ id, label, hint, error, rightSlot, className, ...props }, ref) => {
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-foreground">
          {label}
        </Label>
        <div className="relative">
          <Input
            id={id}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(error && 'border-destructive focus-visible:border-destructive', rightSlot && 'pr-11', className)}
            {...props}
          />
          {rightSlot ? (
            <div className="absolute inset-y-0 right-0 flex items-center pr-2">{rightSlot}</div>
          ) : null}
        </div>
        {error ? (
          <p id={`${id}-error`} className="text-xs text-destructive">
            {error}
          </p>
        ) : hint ? (
          <p id={`${id}-hint`} className="text-xs text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
FormField.displayName = 'FormField';
