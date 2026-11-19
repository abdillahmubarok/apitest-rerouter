'use client';

import * as React from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Select = RadixSelect.Root;
export const SelectGroup = RadixSelect.Group;
export const SelectValue = RadixSelect.Value;

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof RadixSelect.Trigger>) {
  return (
    <RadixSelect.Trigger
      className={cn(
        'flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
        className
      )}
      {...props}
    >
      {children}
      <RadixSelect.Icon asChild>
        <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: React.ComponentProps<typeof RadixSelect.Content>) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        position={position}
        className={cn(
          'relative z-50 max-h-72 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md',
          className
        )}
        {...props}
      >
        <RadixSelect.Viewport className="p-1">
          {children}
        </RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof RadixSelect.Item>) {
  return (
    <RadixSelect.Item
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-7 text-xs outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <RadixSelect.ItemIndicator>
          <Check className="h-3.5 w-3.5" />
        </RadixSelect.ItemIndicator>
      </span>
    </RadixSelect.Item>
  );
}

export function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs font-mono text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
