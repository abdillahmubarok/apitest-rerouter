import * as React from 'react';
import { cn } from '@/lib/utils';
import type { TestCategory } from '@/lib/rerouter/types';

export type HttpMethodType = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | string;

const METHOD_COLOR_MAP: Record<string, string> = {
  GET: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  POST: 'border-blue-500/35 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  PUT: 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  PATCH: 'border-purple-500/35 bg-purple-500/10 text-purple-700 dark:text-purple-400',
  DELETE: 'border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-400',
};

export function HttpMethodBadge({
  method,
  className,
}: {
  method: HttpMethodType;
  className?: string;
}) {
  const normalized = method.toUpperCase();
  const colorStyle =
    METHOD_COLOR_MAP[normalized] ??
    'border-border bg-muted text-muted-foreground';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-tight leading-none shrink-0',
        colorStyle,
        className
      )}
    >
      {normalized}
    </span>
  );
}

export function HttpStatusBadge({
  status,
  statusText,
  showPrefix = true,
  className,
}: {
  status: number;
  statusText?: string;
  showPrefix?: boolean;
  className?: string;
}) {
  let colorStyle = 'border-border bg-muted text-muted-foreground';

  if (status >= 200 && status < 300) {
    colorStyle =
      'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
  } else if (status >= 300 && status < 400) {
    colorStyle =
      'border-border bg-secondary text-secondary-foreground';
  } else if (status === 401 || status === 402 || status === 403 || status === 429) {
    colorStyle =
      'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-400';
  } else if (status >= 400 && status < 500) {
    colorStyle =
      'border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-400';
  } else if (status >= 500 || status === 0) {
    colorStyle =
      'border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-400';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold leading-none shrink-0',
        colorStyle,
        className
      )}
    >
      <span>
        {showPrefix ? 'HTTP ' : ''}
        {status}
      </span>
      {statusText && <span className="font-normal opacity-90">{statusText}</span>}
    </span>
  );
}

export function CategoryBadge({
  category,
  label,
  className,
}: {
  category: TestCategory;
  label?: string;
  className?: string;
}) {
  const styles =
    category === 'A'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
      : category === 'B'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
        : 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400';

  const defaultText =
    category === 'A'
      ? 'Cat A · Safe'
      : category === 'B'
        ? 'Cat B · Billable'
        : 'Cat C · Restricted';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none shrink-0',
        styles,
        className
      )}
    >
      {label ?? defaultText}
    </span>
  );
}
