'use client';

import * as React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogPortal = RadixDialog.Portal;
export const DialogClose = RadixDialog.Close;

export function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof RadixDialog.Overlay>) {
  return (
    <RadixDialog.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]',
        className
      )}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof RadixDialog.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <RadixDialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg focus:outline-none max-h-[92vh] overflow-y-auto',
          className
        )}
        {...props}
      >
        {children}
      </RadixDialog.Content>
    </DialogPortal>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-1.5 text-left', className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-wrap items-center justify-end gap-2', className)}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof RadixDialog.Title>) {
  return (
    <RadixDialog.Title
      className={cn('text-base font-semibold tracking-tight text-foreground', className)}
      {...props}
    />
  );
}

export function DialogDescription({
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
