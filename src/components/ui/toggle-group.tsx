'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ToggleGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(
  null
);

export interface ToggleGroupProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  type?: 'single';
  value: string;
  onValueChange: (value: string) => void;
}

export function ToggleGroup({
  className,
  value,
  onValueChange,
  children,
  ...props
}: ToggleGroupProps) {
  const ctx = React.useMemo(
    () => ({ value, onValueChange }),
    [value, onValueChange]
  );

  return (
    <ToggleGroupContext.Provider value={ctx}>
      <div
        role="group"
        className={cn(
          'inline-flex h-7 items-center gap-0.5 rounded-md border border-border bg-muted p-0.5 text-muted-foreground',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </ToggleGroupContext.Provider>
  );
}

export interface ToggleGroupItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function ToggleGroupItem({
  className,
  value,
  onClick,
  children,
  ...props
}: ToggleGroupItemProps) {
  const ctx = React.useContext(ToggleGroupContext);
  const isSelected = ctx ? ctx.value === value : false;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      data-state={isSelected ? 'on' : 'off'}
      onClick={(e) => {
        if (ctx && value !== ctx.value) {
          ctx.onValueChange(value);
        }
        onClick?.(e);
      }}
      className={cn(
        'inline-flex items-center justify-center rounded px-2.5 py-0.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-2xs hover:text-foreground disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
