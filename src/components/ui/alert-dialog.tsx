'use client';

import * as React from 'react';
import * as RadixAlertDialog from '@radix-ui/react-alert-dialog';
import { cn } from '@/lib/utils';

export const AlertDialog = RadixAlertDialog.Root;
export const AlertDialogTrigger = RadixAlertDialog.Trigger;
export const AlertDialogPortal = RadixAlertDialog.Portal;

export function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof RadixAlertDialog.Overlay>) {
  return (
    <RadixAlertDialog.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]',
        className
      )}
      {...props}
    />
  );
}

export function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof RadixAlertDialog.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <RadixAlertDialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg focus:outline-none space-y-4',
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

export function AlertDialogHeader({
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

export function AlertDialogFooter({
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

export function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof RadixAlertDialog.Title>) {
  return (
    <RadixAlertDialog.Title
      className={cn('text-sm font-semibold text-foreground', className)}
      {...props}
    />
  );
}

export function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof RadixAlertDialog.Description>) {
  return (
    <RadixAlertDialog.Description
      className={cn('text-xs text-muted-foreground leading-relaxed', className)}
      {...props}
    />
  );
}

export const AlertDialogAction = RadixAlertDialog.Action;
export const AlertDialogCancel = RadixAlertDialog.Cancel;
