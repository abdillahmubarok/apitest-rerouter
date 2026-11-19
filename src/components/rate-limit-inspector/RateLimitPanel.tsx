'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { TestResultView } from '@/components/endpoint-tester/TestResultView';
import { Badge } from '@/components/ui/badge';
import {
  HttpMethodBadge,
  HttpStatusBadge,
} from '@/components/ui/http-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TestExecutionResult } from '@/lib/rerouter/types';

interface RateLimitPanelProps {
  testResults: TestExecutionResult[];
}

export function RateLimitPanel({ testResults }: RateLimitPanelProps) {
  const results429 = testResults.filter((r) => r.httpStatus === 429);
  const has429 = results429.length > 0;

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">
                Passive Rate Limit & Header Inspector
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Passively inspects every HTTP response in this session for{' '}
              <code className="font-mono">Retry-After</code>,{' '}
              <code className="font-mono">RateLimit-*</code>,{' '}
              <code className="font-mono">X-RateLimit-*</code>, and quota
              headers without generating high-volume traffic.
            </p>
          </div>
          <Badge variant="success">
            Passive Observation Mode (No Stress/Flood Traffic)
          </Badge>
        </div>

        {/* Divided Primary Verification Status Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="p-4 space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              HTTP 429 & Retry-After Status
            </div>
            <div
              className={`font-mono text-xs font-semibold ${
                has429
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {has429
                ? `HTTP 429 OBSERVED (${results429.length} response(s))`
                : 'NOT VERIFIED — NO HTTP 429 RESPONSE OBSERVED'}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {has429
                ? `Retry-After present: ${
                    results429[0].rateLimitInspection.retryAfterExists
                      ? `Yes (${results429[0].rateLimitInspection.retryAfterValue}, format: ${results429[0].rateLimitInspection.retryAfterFormat})`
                      : 'No'
                  }`
                : 'No rate-limit rejection occurred during normal test execution.'}
            </p>
          </div>

          <div className="p-4 space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Numerical Per-Key Rate Limit
            </div>
            <div className="font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
              REQUIRES PROVIDER CONFIRMATION
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Exact per-key request/token rate limit is undocumented and not
              exposed in standard response headers.
            </p>
          </div>

          <div className="p-4 space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Numerical Per-Account Rate Limit
            </div>
            <div className="font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
              REQUIRES PROVIDER CONFIRMATION
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Exact account-wide concurrency/RPM limit across all API keys is
              undocumented and requires provider confirmation.
            </p>
          </div>
        </div>
      </div>

      {/* Monitored Target Headers Audit Table */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <h3 className="text-xs font-semibold text-foreground">
            Target Rate-Limit Headers Audit Across {testResults.length} Executed
            Requests
          </h3>
        </div>
        <Table className="font-mono">
          <TableHeader>
            <TableRow>
              <TableHead>Target Header Name</TableHead>
              <TableHead>Observed in Any Response?</TableHead>
              <TableHead>Latest Observed Value</TableHead>
              <TableHead>Verification Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              { key: 'Retry-After', prop: 'retryAfter' as const },
              { key: 'RateLimit-Limit', prop: 'rateLimitLimit' as const },
              {
                key: 'RateLimit-Remaining',
                prop: 'rateLimitRemaining' as const,
              },
              { key: 'RateLimit-Reset', prop: 'rateLimitReset' as const },
              { key: 'X-RateLimit-Limit', prop: 'xRateLimitLimit' as const },
              {
                key: 'X-RateLimit-Remaining',
                prop: 'xRateLimitRemaining' as const,
              },
              { key: 'X-RateLimit-Reset', prop: 'xRateLimitReset' as const },
            ].map((h) => {
              const foundResult = testResults.find(
                (r) => r.rateLimitInspection.standardHeaders[h.prop] !== null
              );
              const val = foundResult
                ? foundResult.rateLimitInspection.standardHeaders[h.prop]
                : null;
              return (
                <TableRow key={h.key}>
                  <TableCell className="text-sky-700 dark:text-sky-400 font-semibold">
                    {h.key}
                  </TableCell>
                  <TableCell>
                    {val !== null ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        Yes
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        No (Absent in {testResults.length} responses)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {val ?? 'Not present'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={val !== null ? 'success' : 'warning'}>
                      {val !== null
                        ? 'OBSERVED'
                        : 'NOT OBSERVED IN NORMAL RESPONSES'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Per-Request Complete Response Headers Log */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <h3 className="text-xs font-semibold text-foreground">
            Complete Response Headers Captured Per Request (Original Names &
            Values Preserved)
          </h3>
        </div>
        {testResults.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No requests executed yet. Run any test to inspect its raw HTTP
            response headers.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {testResults.map((r) => (
              <div key={r.id} className="p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                  <span className="text-foreground font-semibold font-sans">
                    {r.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <HttpMethodBadge method={r.method} />
                    <span className="text-sky-700 dark:text-sky-400">
                      {r.exactUrl}
                    </span>
                    <HttpStatusBadge status={r.httpStatus} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs pt-2 border-t border-border/60">
                  {Object.entries(r.responseHeaders).map(([k, v]) => (
                    <div key={k} className="flex items-start gap-2">
                      <span className="text-purple-700 dark:text-purple-400 shrink-0">
                        {k}:
                      </span>
                      <span className="text-foreground break-all">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* If HTTP 429 Observed, show full details */}
      {has429 && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-red-700 dark:text-red-400">
            Observed HTTP 429 Response Details
          </h3>
          {results429.map((res) => (
            <TestResultView key={res.id} result={res} />
          ))}
        </div>
      )}
    </div>
  );
}
