import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number;
}

export function Spinner({ className, size = 16, ...props }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label="Carregando"
      className={cn('animate-spin', className)}
      width={size}
      height={size}
      {...props}
    />
  );
}
