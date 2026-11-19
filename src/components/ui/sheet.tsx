'use client';

import * as React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sheet = RadixDialog.Root;
export const SheetTrigger = RadixDialog.Trigger;
export const SheetClose = RadixDialog.Close;
export const SheetPortal = RadixDialog.Portal;

export function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof RadixDialog.Overlay>) {
  return (
    <RadixDialog.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px]',
        className
      )}
      {...props}
    />
  );
}

export function SheetContent({
  className,
  children,
  side = 'left',
  ...props
}: React.ComponentProps<typeof RadixDialog.Content> & {
  side?: 'left' | 'right';
}) {
  const positionClass =
    side === 'left'
      ? 'inset-y-0 left-0 border-r'
      : 'inset-y-0 right-0 border-l';

  return (
    <SheetPortal>
      <SheetOverlay />
      <RadixDialog.Content
        className={cn(
          'fixed z-50 flex h-full w-72 flex-col border-border bg-sidebar text-sidebar-foreground shadow-lg focus:outline-none',
          positionClass,
          className
        )}
        {...props}
      >
        {children}
        <RadixDialog.Close
          aria-label="Close navigation drawer"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none"
        >
          <X className="h-4 w-4" />
        </RadixDialog.Close>
      </RadixDialog.Content>
    </SheetPortal>
  );
}

export function SheetHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-1 border-b border-border px-4 py-3', className)}
      {...props}
    />
  );
}

export function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof RadixDialog.Title>) {
  return (
    <RadixDialog.Title
      className={cn('text-sm font-semibold text-foreground', className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof RadixDialog.Description>) {
  return (
    <RadixDialog.Description
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}
