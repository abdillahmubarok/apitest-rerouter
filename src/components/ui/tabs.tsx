'use client';

import * as React from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = RadixTabs.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn(
        'inline-flex h-7 items-center gap-0.5 rounded-md border border-border bg-muted p-0.5 text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        'inline-flex items-center justify-center rounded px-2.5 py-0.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof RadixTabs.Content>) {
  return (
    <RadixTabs.Content
      className={cn('outline-none', className)}
      {...props}
    />
  );
}
