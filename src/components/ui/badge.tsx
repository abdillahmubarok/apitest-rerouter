import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-mono font-medium transition-colors focus:outline-none',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground',
        secondary:
          'border-border bg-secondary text-secondary-foreground',
        outline:
          'border-border text-foreground bg-transparent',
        destructive:
          'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
        success:
          'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        warning:
          'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
        info:
          'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
        purple:
          'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400',
      },
    },
    defaultVariants: {
      variant: 'secondary',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
