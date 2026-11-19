'use client';

import * as React from 'react';
import * as RadixScrollArea from '@radix-ui/react-scroll-area';
import { cn } from '@/lib/utils';

export function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof RadixScrollArea.Root>) {
  return (
    <RadixScrollArea.Root
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      <RadixScrollArea.Viewport className="h-full w-full rounded-[inherit]">
        {children}
      </RadixScrollArea.Viewport>
      <ScrollBar />
      <RadixScrollArea.Corner />
    </RadixScrollArea.Root>
  );
}

export function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof RadixScrollArea.ScrollAreaScrollbar>) {
  return (
    <RadixScrollArea.ScrollAreaScrollbar
      orientation={orientation}
      className={cn(
        'flex touch-none select-none p-0.5 transition-colors',
        orientation === 'vertical' && 'h-full w-2 border-l border-l-transparent',
        orientation === 'horizontal' && 'h-2 flex-col border-t border-t-transparent',
        className
      )}
      {...props}
    >
      <RadixScrollArea.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
    </RadixScrollArea.ScrollAreaScrollbar>
  );
}
