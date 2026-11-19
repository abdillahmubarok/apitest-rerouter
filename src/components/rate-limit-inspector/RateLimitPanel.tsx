'use client';

import React from 'react';
import { TestResultView } from '@/components/endpoint-tester/TestResultView';
import type { TestExecutionResult } from '@/lib/rerouter/types';

interface RateLimitPanelProps {
  testResults: TestExecutionResult[];
}

export function RateLimitPanel({ testResults }: RateLimitPanelProps) {
  const results429 = testResults.filter((r) => r.httpStatus === 429);
  const has429 = results429.length > 0;

  const aggregatedRateHeaders: Array<{
    testLabel: string;
    url: string;
    httpStatus: number;
    headerName: string;
    headerValue: string;
  }> = [];

  for (const r of testResults) {
    for (const [k, v] of Object.entries(
      r.rateLimitInspection.observedRateLimitHeaders
    )) {
      aggregatedRateHeaders.push({
        testLabel: r.label,
        url: r.exactUrl,
        httpStatus: r.httpStatus,
        headerName: k,
        headerValue: v,
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-100">
            Passive Rate Limit & Header Inspector
          </h2>
          <span className="px-2.5 py-1 text-xs font-mono rounded bg-teal-950 text-teal-300 border border-teal-800">
            Passive Observation Mode (No Stress/Flood Traffic)
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Passively inspects every HTTP response in this session for{' '}
          <code className="font-mono">Retry-After</code>,{' '}
          <code className="font-mono">RateLimit-*</code>,{' '}
          <code className="font-mono">X-RateLimit-*</code>, and quota headers
          without generating high-volume traffic.
        </p>
      </div>

      {/* Primary Verification Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1.5">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            HTTP 429 & Retry-After Status
          </div>
          <div
            className={`text-xs font-mono font-bold ${
              has429 ? 'text-rose-400' : 'text-amber-300'
            }`}
          >
            {has429
              ? `HTTP 429 OBSERVED (${results429.length} response(s))`
              : 'NOT VERIFIED — NO HTTP 429 RESPONSE OBSERVED'}
          </div>
          <p className="text-[11px] text-slate-400">
            {has429
              ? `Retry-After present: ${
                  results429[0].rateLimitInspection.retryAfterExists
                    ? `Yes (${results429[0].rateLimitInspection.retryAfterValue}, format: ${results429[0].rateLimitInspection.retryAfterFormat})`
                    : 'No'
                }`
              : 'No rate-limit rejection occurred during normal test execution.'}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1.5">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            Numerical Per-Key Rate Limit
          </div>
          <div className="text-xs font-mono font-bold text-amber-300">
            REQUIRES PROVIDER CONFIRMATION
          </div>
          <p className="text-[11px] text-slate-400">
            Exact per-key request/token rate limit is undocumented and not
            exposed in standard response headers.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1.5">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            Numerical Per-Account Rate Limit
          </div>
          <div className="text-xs font-mono font-bold text-amber-300">
            REQUIRES PROVIDER CONFIRMATION
          </div>
          <p className="text-[11px] text-slate-400">
            Exact account-wide concurrency/RPM limit across all API keys is
            undocumented and requires provider confirmation.
          </p>
        </div>
      </div>

      {/* Monitored Target Headers Audit Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
        <h3 className="text-sm font-bold text-slate-100">
          Target Rate-Limit Headers Audit Across {testResults.length} Executed
          Requests
        </h3>
        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead className="bg-slate-950 text-slate-300">
              <tr>
                <th className="py-2 px-3 border-b border-slate-800">
                  Target Header Name
                </th>
                <th className="py-2 px-3 border-b border-slate-800">
                  Observed in Any Response?
                </th>
                <th className="py-2 px-3 border-b border-slate-800">
                  Latest Observed Value
                </th>
                <th className="py-2 px-3 border-b border-slate-800">
                  Verification Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
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
                  <tr key={h.key} className="hover:bg-slate-950/60">
                    <td className="py-2 px-3 text-sky-400 font-bold">
                      {h.key}
                    </td>
                    <td className="py-2 px-3">
                      {val !== null ? (
                        <span className="text-emerald-400 font-bold">Yes</span>
                      ) : (
                        <span className="text-slate-400">
                          No (Absent in {testResults.length} responses)
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-200">
                      {val ?? 'Not present'}
                    </td>
                    <td className="py-2 px-3 text-amber-300">
                      {val !== null
                        ? 'OBSERVED'
                        : 'NOT OBSERVED IN NORMAL RESPONSES'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-Request Complete Response Headers Log */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
        <h3 className="text-sm font-bold text-slate-100">
          Complete Response Headers Captured Per Request (Original Names &
          Values Preserved)
        </h3>
        {testResults.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No requests executed yet. Run any test to inspect its raw HTTP
            response headers.
          </div>
        ) : (
          <div className="space-y-3">
            {testResults.map((r) => (
              <div
                key={r.id}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <span className="text-slate-200 font-bold">{r.label}</span>
                  <span className="text-sky-400">
                    {r.method} {r.exactUrl} → HTTP {r.httpStatus}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono pt-1 border-t border-slate-800/80">
                  {Object.entries(r.responseHeaders).map(([k, v]) => (
                    <div key={k} className="flex items-start gap-2">
                      <span className="text-indigo-400 shrink-0">{k}:</span>
                      <span className="text-slate-300 break-all">{v}</span>
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
          <h3 className="text-sm font-bold text-rose-300">
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
