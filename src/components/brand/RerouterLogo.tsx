'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export const OFFICIAL_REROUTER_LOGO_URL =
  'https://storage-mubarokah.s3.ap-southeast-3.amazonaws.com/rerouter/rerouter_mark.svg';

interface RerouterLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  subtitle?: string;
  className?: string;
  wordmarkClassName?: string;
}

const LOGO_DIMENSIONS = {
  sm: { px: 20, container: 'h-5 w-5', title: 'text-sm' },
  md: { px: 24, container: 'h-6 w-6', title: 'text-sm' },
  lg: { px: 28, container: 'h-7 w-7', title: 'text-base' },
} as const;

export function RerouterLogo({
  size = 'md',
  showWordmark = true,
  subtitle,
  className,
  wordmarkClassName,
}: RerouterLogoProps) {
  const [failedToLoad, setFailedToLoad] = useState(false);
  const spec = LOGO_DIMENSIONS[size];

  return (
    <div className={cn('inline-flex items-center gap-2 shrink-0', className)}>
      {!failedToLoad ? (
        <div
          className={cn(
            'relative flex items-center justify-center shrink-0',
            spec.container
          )}
        >
          <Image
            src={OFFICIAL_REROUTER_LOGO_URL}
            alt="ReRouter Official Brand Logo"
            width={spec.px}
            height={spec.px}
            unoptimized
            onError={() => setFailedToLoad(true)}
            className="h-full w-full object-contain"
            style={{ objectFit: 'contain' }}
          />
        </div>
      ) : (
        <span className="inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground shrink-0">
          ReRouter
        </span>
      )}

      {showWordmark && (
        <div className="flex flex-col leading-tight">
          <span
            className={cn(
              'font-semibold tracking-tight text-foreground',
              spec.title,
              wordmarkClassName
            )}
          >
            ReRouter
          </span>
          {subtitle && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
