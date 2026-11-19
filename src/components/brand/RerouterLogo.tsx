'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { SEO_CONFIG } from '@/config/seo';
import { cn } from '@/lib/utils';

export const OFFICIAL_REROUTER_LOGO_URL = SEO_CONFIG.branding.logoSvgPath;

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
  const [useInlineFallback, setUseInlineFallback] = useState(false);
  const spec = LOGO_DIMENSIONS[size];

  return (
    <div className={cn('inline-flex items-center gap-2 shrink-0', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center shrink-0',
          spec.container
        )}
      >
        {!useInlineFallback ? (
          <Image
            src={OFFICIAL_REROUTER_LOGO_URL}
            alt={SEO_CONFIG.branding.logoAlt}
            width={spec.px}
            height={spec.px}
            priority
            unoptimized
            onError={() => setUseInlineFallback(true)}
            className="h-full w-full object-contain"
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            role="img"
            aria-label={SEO_CONFIG.branding.logoAlt}
            className="h-full w-full"
          >
            <rect width="64" height="64" rx="18" fill="#F0EEFF" />
            <path
              d="M18 49V15H34C43 15 48 20 48 29C48 38 43 43 34 43H18M33 43L49 53"
              fill="none"
              stroke="#5B4CE6"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="18" cy="15" r="4" fill="#087B76" />
            <circle cx="49" cy="53" r="4" fill="#087B76" />
          </svg>
        )}
      </div>

      {showWordmark && (
        <div className="flex flex-col leading-tight">
          <span
            className={cn(
              'font-semibold tracking-tight text-foreground',
              spec.title,
              wordmarkClassName
            )}
          >
            {SEO_CONFIG.branding.brandName}
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
