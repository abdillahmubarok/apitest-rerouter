'use client';

import * as React from 'react';
import * as RadixSeparator from '@radix-ui/react-separator';
import { cn } from '@/lib/utils';

export function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: React.ComponentProps<typeof RadixSeparator.Root>) {
  const sizeClass =
    orientation === 'vertical' ? 'h-full w-px' : 'h-px w-full';
  return (
    <RadixSeparator.Root
      decorative={decorative}
      orientation={orientation}
      className={cn('shrink-0 bg-border', sizeClass, className)}
      {...props}
    />
  );
}
