import * as React from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn('w-full border-collapse text-left text-xs', className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.ComponentProps<'thead'>) {
  return (
    <thead
      className={cn('border-b border-border bg-muted/50', className)}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      className={cn('divide-y divide-border/70', className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      className={cn('transition-colors hover:bg-muted/35', className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'h-8 px-3 align-middle font-mono text-[11px] font-medium text-muted-foreground whitespace-nowrap',
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      className={cn('px-3 py-2 align-middle text-xs', className)}
      {...props}
    />
  );
}
