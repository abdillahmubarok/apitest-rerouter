import type { RateLimitInspection } from './types';

function findHeaderCaseInsensitive(
  headers: Record<string, string>,
  targetName: string
): string | null {
  const lowerTarget = targetName.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lowerTarget) {
      return v;
    }
  }
  return null;
}

export function inspectResponseHeaders(
  headers: Record<string, string>,
  httpStatus: number
): RateLimitInspection {
  const retryAfter = findHeaderCaseInsensitive(headers, 'Retry-After');
  const rateLimitLimit = findHeaderCaseInsensitive(headers, 'RateLimit-Limit');
  const rateLimitRemaining = findHeaderCaseInsensitive(
    headers,
    'RateLimit-Remaining'
  );
  const rateLimitReset = findHeaderCaseInsensitive(headers, 'RateLimit-Reset');
  const xRateLimitLimit = findHeaderCaseInsensitive(
    headers,
    'X-RateLimit-Limit'
  );
  const xRateLimitRemaining = findHeaderCaseInsensitive(
    headers,
    'X-RateLimit-Remaining'
  );
  const xRateLimitReset = findHeaderCaseInsensitive(
    headers,
    'X-RateLimit-Reset'
  );

  const observedRateLimitHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (
      /ratelimit|rate-limit|retry-after|x-ratelimit|quota|throttle/i.test(k)
    ) {
      observedRateLimitHeaders[k] = v;
    }
  }

  const hasAnyRateLimitHeader = Object.keys(observedRateLimitHeaders).length > 0;
  const is429 = httpStatus === 429;
  const retryAfterExists = retryAfter !== null;

  let retryAfterFormat: RateLimitInspection['retryAfterFormat'] = 'none';
  if (retryAfter !== null) {
    const trimmed = retryAfter.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      retryAfterFormat = 'seconds';
    } else if (!Number.isNaN(Date.parse(trimmed))) {
      retryAfterFormat = 'http-date';
    } else {
      retryAfterFormat = 'other';
    }
  }

  const statusSummary = is429
    ? `HTTP 429 OBSERVED — Retry-After: ${
        retryAfterExists ? `${retryAfter} (${retryAfterFormat})` : 'NOT PRESENT'
      }`
    : 'NOT VERIFIED — NO HTTP 429 RESPONSE OBSERVED';

  const observedLimitVal = rateLimitLimit || xRateLimitLimit;

  return {
    observedRateLimitHeaders,
    standardHeaders: {
      retryAfter,
      rateLimitLimit,
      rateLimitRemaining,
      rateLimitReset,
      xRateLimitLimit,
      xRateLimitRemaining,
      xRateLimitReset,
    },
    hasAnyRateLimitHeader,
    is429,
    retryAfterExists,
    retryAfterValue: retryAfter,
    retryAfterFormat,
    statusSummary,
    perKeyLimitStatus: observedLimitVal
      ? `Observed header value: ${observedLimitVal} (Scope requires provider confirmation)`
      : 'REQUIRES PROVIDER CONFIRMATION',
    perAccountLimitStatus: 'REQUIRES PROVIDER CONFIRMATION',
  };
}
