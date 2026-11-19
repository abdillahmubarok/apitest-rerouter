import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-md border border-border bg-card text-card-foreground',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-1 border-b border-border/60 px-4 py-3', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      className={cn(
        'text-sm font-semibold tracking-tight text-foreground',
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn('text-xs text-muted-foreground leading-relaxed', className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return <div className={cn('p-4', className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex items-center border-t border-border/60 px-4 py-3', className)}
      {...props}
    />
  );
}
