import * as React from 'react';
import { cn } from '@/lib/utils';

type AlertTone = 'default' | 'destructive' | 'warning' | 'success' | 'info';

const ALERT_TONE_STYLES: Record<AlertTone, string> = {
  default: 'border-border bg-muted/40 text-foreground',
  destructive:
    'border-red-500/35 bg-red-500/10 text-red-800 dark:text-red-300',
  warning:
    'border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  success:
    'border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  info: 'border-blue-500/35 bg-blue-500/10 text-blue-800 dark:text-blue-300',
};

export function Alert({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & { variant?: AlertTone }) {
  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-md border px-3.5 py-2.5 text-xs flex items-start gap-2.5',
        ALERT_TONE_STYLES[variant],
        className
      )}
      {...props}
    />
  );
}

export function AlertTitle({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('font-semibold leading-tight tracking-tight', className)}
      {...props}
    />
  );
}

export function AlertDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('text-xs leading-relaxed opacity-95', className)}
      {...props}
    />
  );
}
