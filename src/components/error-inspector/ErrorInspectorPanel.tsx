'use client';

import React from 'react';
import { TestResultView } from '@/components/endpoint-tester/TestResultView';
import { ENDPOINT_DEFINITIONS } from '@/lib/rerouter/endpoints';
import type { EndpointId, TestExecutionResult } from '@/lib/rerouter/types';

interface ErrorInspectorPanelProps {
  testResults: TestExecutionResult[];
  onExecuteErrorTest: (endpointId: EndpointId) => Promise<void>;
  onRunAllSafeErrorTests: () => Promise<void>;
  isLoading: boolean;
}

const ERROR_TEST_CARDS: Array<{
  id: EndpointId;
  group: 'OpenAI-Compatible (/v1/chat/completions)' | 'Anthropic-Compatible (/v1/messages)';
  expectedStatus: string;
}> = [
  {
    id: 'error-missing-key',
    group: 'OpenAI-Compatible (/v1/chat/completions)',
    expectedStatus: '401 Unauthorized',
  },
  {
    id: 'error-invalid-key',
    group: 'OpenAI-Compatible (/v1/chat/completions)',
    expectedStatus: '401 Unauthorized',
  },
  {
    id: 'error-invalid-request',
    group: 'OpenAI-Compatible (/v1/chat/completions)',
    expectedStatus: '400 Bad Request (or 401 if key missing)',
  },
  {
    id: 'error-unknown-model',
    group: 'OpenAI-Compatible (/v1/chat/completions)',
    expectedStatus: '404 Not Found (or 401 if key missing)',
  },
  {
    id: 'error-forbidden-model',
    group: 'OpenAI-Compatible (/v1/chat/completions)',
    expectedStatus: '403 Forbidden (Requires restricted key)',
  },
  {
    id: 'error-anthropic-missing-key',
    group: 'Anthropic-Compatible (/v1/messages)',
    expectedStatus: '401 Unauthorized',
  },
  {
    id: 'error-anthropic-invalid-key',
    group: 'Anthropic-Compatible (/v1/messages)',
    expectedStatus: '401 Unauthorized',
  },
  {
    id: 'error-anthropic-invalid-request',
    group: 'Anthropic-Compatible (/v1/messages)',
    expectedStatus: '400 Bad Request (or 401 if key missing)',
  },
  {
    id: 'error-anthropic-unknown-model',
    group: 'Anthropic-Compatible (/v1/messages)',
    expectedStatus: '404 Not Found (or 401 if key missing)',
  },
];

export function ErrorInspectorPanel({
  testResults,
  onExecuteErrorTest,
  onRunAllSafeErrorTests,
  isLoading,
}: ErrorInspectorPanelProps) {
  const errorResults = testResults.filter(
    (r) =>
      r.errorAnalysis !== null ||
      r.httpStatus >= 400 ||
      r.endpointId.startsWith('error-')
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100">
            OpenAI-Style & Anthropic-Style Error Schema Inspector
          </h2>
          <p className="text-xs text-slate-400">
            Safe negative tests to verify exact error JSON structures, field
            names, data types, <code className="font-mono">error.code</code>{' '}
            presence, and endpoint differences.
          </p>
        </div>
        <button
          type="button"
          onClick={onRunAllSafeErrorTests}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
        >
          {isLoading
            ? 'Running Error Suite...'
            : '▶ Run All Safe Negative Error Tests'}
        </button>
      </div>

      {/* Hypothesis vs Empirical Findings Reference Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
            Hypothesis 1: OpenAI-Style Error Envelope
          </div>
          <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
            {`{
  "error": {
    "message": "...",
    "type": "...",
    "code": "..."
  }
}`}
          </pre>
          <p className="text-xs text-slate-300 leading-relaxed">
            <strong>Verified Live Observation:</strong> On{' '}
            <code className="font-mono text-sky-300">
              /v1/chat/completions
            </code>
            , <code className="font-mono text-sky-300">/v1/responses</code>,{' '}
            <code className="font-mono text-sky-300">/v1/embeddings</code>,{' '}
            <code className="font-mono text-sky-300">/v1/decisions</code>, and{' '}
            <code className="font-mono text-sky-300">/v1/systemone</code>,
            ReRouter returns{' '}
            <code className="font-mono text-emerald-300">
              {`{"error":{"code":401,"message":"...","type":"authentication_error"}}`}
            </code>
            . Crucially, <code className="font-mono text-amber-300">error.code</code>{' '}
            is a <strong>number</strong> (e.g. <code className="font-mono">401</code>
            ), not a string.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-400">
            Hypothesis 2: Anthropic-Style Error Envelope
          </div>
          <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
            {`{
  "type": "error",
  "error": {
    "type": "...",
    "message": "..."
  }
}`}
          </pre>
          <p className="text-xs text-slate-300 leading-relaxed">
            <strong>Verified Live Observation:</strong> On{' '}
            <code className="font-mono text-purple-300">/v1/messages</code> and{' '}
            <code className="font-mono text-purple-300">
              /v1/messages/count_tokens
            </code>
            , ReRouter returns{' '}
            <code className="font-mono text-emerald-300">
              {`{"error":{"message":"...","type":"authentication_error"},"type":"error"}`}
            </code>
            . Top-level <code className="font-mono">type: &quot;error&quot;</code>{' '}
            is present and <code className="font-mono text-amber-300">error.code</code>{' '}
            is omitted.
          </p>
        </div>
      </div>

      {/* Negative Test Triggers Grid */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
        <h3 className="text-sm font-bold text-slate-100">
          Individual Negative Error Triggers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ERROR_TEST_CARDS.map((card) => {
            const def = ENDPOINT_DEFINITIONS[card.id];
            const latest = testResults.find((r) => r.endpointId === card.id);
            return (
              <div
                key={card.id}
                className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {card.group}
                    </span>
                    <span className="text-[10px] font-mono text-amber-300">
                      Expected: {card.expectedStatus}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-100 pt-1">
                    {def.label}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {def.description}
                  </p>
                </div>

                <div className="space-y-2">
                  {latest && (
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Observed Status:</span>
                        <span className="text-rose-300 font-bold">
                          HTTP {latest.httpStatus}
                        </span>
                      </div>
                      <div className="text-slate-200 truncate">
                        Msg: {latest.errorAnalysis?.readableMessage}
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onExecuteErrorTest(card.id)}
                    disabled={isLoading}
                    className="w-full py-1.5 px-3 rounded text-xs font-semibold bg-slate-800 hover:bg-indigo-600 text-slate-100 transition-colors disabled:opacity-50"
                  >
                    ▶ Run Test
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Captured Error Schema Comparison Matrix */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
        <h3 className="text-sm font-bold text-slate-100">
          Captured Error Schema Inspection Table ({errorResults.length} Error
          Responses Observed)
        </h3>
        {errorResults.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Click &quot;Run All Safe Negative Error Tests&quot; above to capture
            and inspect live error schemas.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead className="bg-slate-950 text-slate-300">
                <tr>
                  <th className="py-2 px-3 border-b border-slate-800">Test</th>
                  <th className="py-2 px-3 border-b border-slate-800">URL</th>
                  <th className="py-2 px-3 border-b border-slate-800">
                    HTTP Status
                  </th>
                  <th className="py-2 px-3 border-b border-slate-800">
                    Detected Format
                  </th>
                  <th className="py-2 px-3 border-b border-slate-800">
                    Exact JSON Field Paths
                  </th>
                  <th className="py-2 px-3 border-b border-slate-800">
                    error.code (Value & Type)
                  </th>
                  <th className="py-2 px-3 border-b border-slate-800">
                    Readable Error Message
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {errorResults.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-950/60">
                    <td className="py-2 px-3 font-sans font-medium text-slate-200">
                      {r.label}
                    </td>
                    <td className="py-2 px-3 text-sky-400">
                      {r.exactUrl.replace('https://rerouter.mubarokah.com', '')}
                    </td>
                    <td className="py-2 px-3 text-rose-300 font-bold">
                      {r.httpStatus}
                    </td>
                    <td className="py-2 px-3 text-indigo-300">
                      {r.errorAnalysis?.detectedFormat ?? 'unknown'}
                    </td>
                    <td className="py-2 px-3 text-slate-300">
                      {r.errorAnalysis?.exactFieldNames.join(', ') ||
                        'Non-JSON (HTML)'}
                    </td>
                    <td className="py-2 px-3 text-amber-300">
                      {r.errorAnalysis?.hasErrorCode
                        ? `${JSON.stringify(
                            r.errorAnalysis.errorCodeValue
                          )} (${r.errorAnalysis.errorCodeType})`
                        : 'Not present'}
                    </td>
                    <td className="py-2 px-3 text-rose-200">
                      {r.errorAnalysis?.readableMessage ?? r.statusText}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Error Test Results */}
      <div className="space-y-4">
        {errorResults.map((res) => (
          <TestResultView key={res.id} result={res} />
        ))}
      </div>
    </div>
  );
}
