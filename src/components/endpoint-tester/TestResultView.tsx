'use client';

import React, { useState } from 'react';
import { JsonViewer } from '@/components/json-viewer/JsonViewer';
import type { TestExecutionResult } from '@/lib/rerouter/types';

interface TestResultViewProps {
  result: TestExecutionResult;
}

export function TestResultView({ result }: TestResultViewProps) {
  const [showRequestDetails, setShowRequestDetails] = useState(true);
  const [showResponseHeaders, setShowResponseHeaders] = useState(true);
  const [showSseEvents, setShowSseEvents] = useState(true);

  const statusBadgeColor =
    result.httpStatus >= 200 && result.httpStatus < 300
      ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
      : result.httpStatus === 401 || result.httpStatus === 403
        ? 'bg-amber-950/90 text-amber-300 border-amber-700'
        : 'bg-rose-950/90 text-rose-300 border-rose-700';

  const categoryBadgeColor =
    result.category === 'A'
      ? 'bg-teal-950 text-teal-300 border-teal-800'
      : result.category === 'B'
        ? 'bg-amber-950 text-amber-300 border-amber-800'
        : 'bg-purple-950 text-purple-300 border-purple-800';

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-4">
      {/* Header Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-2 py-0.5 text-xs font-mono font-bold rounded ${
              result.method === 'GET'
                ? 'bg-sky-950 text-sky-300 border border-sky-700'
                : 'bg-indigo-950 text-indigo-300 border border-indigo-700'
            }`}
          >
            {result.method}
          </span>
          <code className="text-xs md:text-sm font-mono text-slate-100 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 break-all">
            {result.exactUrl}
          </code>
          <span
            className={`px-2 py-0.5 text-[11px] font-medium rounded border ${categoryBadgeColor}`}
          >
            Category {result.category}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-2.5 py-1 text-xs font-mono font-bold rounded border ${statusBadgeColor}`}
          >
            HTTP {result.httpStatus} {result.statusText}
          </span>
          <span className="px-2.5 py-1 text-xs font-mono rounded bg-slate-950 text-slate-300 border border-slate-800">
            {result.durationMs} ms
          </span>
          <span className="text-xs font-mono text-slate-400">
            {new Date(result.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Notes if any */}
      {result.notes && result.notes.length > 0 && (
        <div className="rounded-lg bg-slate-950/80 border border-slate-800 px-3.5 py-2 text-xs text-slate-300 space-y-1">
          {result.notes.map((n, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">•</span>
              <span>{n}</span>
            </div>
          ))}
        </div>
      )}

      {/* Usage, Cost & Finish Reason Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <div className="text-[11px] text-slate-400 uppercase">Auth Mode</div>
          <div className="text-xs font-mono text-slate-200 mt-0.5">
            {result.authFormatUsed}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <div className="text-[11px] text-slate-400 uppercase">
            Input Tokens
          </div>
          <div className="text-xs font-mono text-slate-200 mt-0.5">
            {result.usageAndCost.inputTokens !== null
              ? result.usageAndCost.inputTokens
              : 'Not returned'}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <div className="text-[11px] text-slate-400 uppercase">
            Output Tokens
          </div>
          <div className="text-xs font-mono text-slate-200 mt-0.5">
            {result.usageAndCost.outputTokens !== null
              ? result.usageAndCost.outputTokens
              : 'Not returned'}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <div className="text-[11px] text-slate-400 uppercase">
            Total Tokens
          </div>
          <div className="text-xs font-mono text-slate-200 mt-0.5">
            {result.usageAndCost.totalTokens !== null
              ? result.usageAndCost.totalTokens
              : 'Not returned'}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <div className="text-[11px] text-slate-400 uppercase">
            Usage Cost (USD)
          </div>
          <div className="text-xs font-mono text-emerald-400 mt-0.5">
            {result.usageAndCost.costValue !== null
              ? `${result.usageAndCost.costValue} (${result.usageAndCost.costPath})`
              : 'Not returned'}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <div className="text-[11px] text-slate-400 uppercase">
            Finish / Stop Reason
          </div>
          <div className="text-xs font-mono text-sky-400 mt-0.5">
            {result.finishReason
              ? `${result.finishReason} (${result.finishReasonPath})`
              : 'N/A'}
          </div>
        </div>
      </div>

      {/* Error Schema Analysis Box */}
      {result.errorAnalysis && (
        <div className="rounded-lg border border-rose-800/80 bg-rose-950/30 p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-300">
              Live Error Response Schema Analysis
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-slate-950 text-amber-300 border border-amber-700/70">
                Category: {result.errorAnalysis.errorCategoryLabel}
              </span>
              <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-rose-900/70 text-rose-200 border border-rose-700">
                Format: {result.errorAnalysis.detectedFormat}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-950/90 border border-rose-900/60">
            <div className="text-[11px] text-slate-400 uppercase">
              Readable Error Message (Workspace Owner View)
            </div>
            <div className="text-sm font-mono text-rose-200 mt-0.5">
              {result.errorAnalysis.readableMessage}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-mono">
            <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400">error.code Present: </span>
              <span className="text-slate-100">
                {result.errorAnalysis.hasErrorCode
                  ? `Yes (${JSON.stringify(
                      result.errorAnalysis.errorCodeValue
                    )}, type: ${result.errorAnalysis.errorCodeType})`
                  : 'No (Not present)'}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400">error.type: </span>
              <span className="text-slate-100">
                {result.errorAnalysis.errorTypeValue !== null
                  ? `${JSON.stringify(
                      result.errorAnalysis.errorTypeValue
                    )} (${result.errorAnalysis.errorTypeDataType})`
                  : 'Not present'}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400">Exact Fields: </span>
              <span className="text-sky-300">
                {result.errorAnalysis.exactFieldNames.join(', ') ||
                  'Non-JSON body'}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-300 space-y-1">
            <div>
              <strong className="text-slate-200">
                OpenAI Schema Hypothesis:
              </strong>{' '}
              {result.errorAnalysis.openAIHypothesisNote}
            </div>
            <div>
              <strong className="text-slate-200">
                Anthropic Schema Hypothesis:
              </strong>{' '}
              {result.errorAnalysis.anthropicHypothesisNote}
            </div>
          </div>
        </div>
      )}

      {/* Embedding Dimension Verification Box */}
      {result.embeddingVerification && (
        <div className="rounded-lg border border-indigo-800/80 bg-indigo-950/25 p-3.5 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-300">
            Embedding Vector Dimension Verification (Calculated via{' '}
            <code>embedding.length</code>)
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 text-xs font-mono">
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">Model ID</div>
              <div className="text-slate-100 mt-0.5 break-all">
                {result.embeddingVerification.modelId}
              </div>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">
                Actual Vector Length
              </div>
              <div className="text-emerald-400 font-bold text-sm mt-0.5">
                {result.embeddingVerification.actualVectorDimension ??
                  'No vector returned'}
              </div>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">
                Catalog-Declared Dim
              </div>
              <div className="text-amber-300 mt-0.5">
                {result.embeddingVerification.catalogDeclaredStatus}
              </div>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">Dimension Match</div>
              <div className="text-sky-300 mt-0.5">
                {result.embeddingVerification.dimensionsMatch}
              </div>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">Vector Preview</div>
              <div className="text-slate-300 mt-0.5 truncate">
                {result.embeddingVerification.vectorSampleFirst5.length > 0
                  ? `[${result.embeddingVerification.vectorSampleFirst5
                      .map((n) => n.toFixed(5))
                      .join(', ')}, ...]`
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SSE Stream Inspection Box */}
      {result.streamInspection && (
        <div className="rounded-lg border border-sky-800/80 bg-sky-950/20 p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold uppercase tracking-wider text-sky-300">
              SSE Stream Capture ({result.streamInspection.totalEvents} Frames /{' '}
              {result.streamInspection.dataChunkCount} Data Chunks)
            </div>
            <button
              type="button"
              onClick={() => setShowSseEvents(!showSseEvents)}
              className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              {showSseEvents ? 'Hide SSE Event Log' : 'Show SSE Event Log'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">[DONE] Marker: </span>
              <span className="text-slate-100">
                {result.streamInspection.hasDoneMarker ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Finish Reason: </span>
              <span className="text-sky-300">
                {result.streamInspection.finishReason ?? 'Not present'}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">response.completed: </span>
              <span className="text-emerald-300">
                {result.streamInspection.responseCompletedEvent
                  ? 'Captured'
                  : 'Not observed'}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Event Types: </span>
              <span className="text-slate-200">
                {result.streamInspection.observedEventTypes.join(', ') ||
                  'Standard data frames'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase">
              Assembled Streamed Output Content
            </div>
            <div className="text-xs font-mono text-emerald-300 mt-1 whitespace-pre-wrap">
              {result.streamInspection.assembledText ||
                '(No delta text assembled)'}
            </div>
          </div>

          {result.streamInspection.finalChunk !== null && (
            <JsonViewer
              title="Final SSE Data Chunk"
              data={result.streamInspection.finalChunk}
              maxHeightClass="max-h-56"
            />
          )}

          {showSseEvents && (
            <div className="max-h-64 overflow-auto border border-slate-800 rounded bg-slate-950">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead className="bg-slate-900 text-slate-300 sticky top-0">
                  <tr>
                    <th className="py-1.5 px-2.5 border-b border-slate-800">
                      #
                    </th>
                    <th className="py-1.5 px-2.5 border-b border-slate-800">
                      Event Type
                    </th>
                    <th className="py-1.5 px-2.5 border-b border-slate-800">
                      Raw Data Payload
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {result.streamInspection.events.map((ev) => (
                    <tr key={ev.index} className="hover:bg-slate-900/50">
                      <td className="py-1.5 px-2.5 text-slate-400">
                        {ev.index}
                      </td>
                      <td className="py-1.5 px-2.5 text-sky-400">
                        {ev.eventType ?? (ev.isDoneMarker ? '[DONE]' : 'data')}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-200 break-all">
                        {ev.rawData}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Request & Response Headers Collapsible Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Request Headers (Secrets Redacted) & Payload
            </span>
            <button
              type="button"
              onClick={() => setShowRequestDetails(!showRequestDetails)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              {showRequestDetails ? 'Hide' : 'Show'}
            </button>
          </div>
          {showRequestDetails && (
            <div className="p-3 space-y-2.5 text-xs font-mono">
              <div className="space-y-1">
                {Object.entries(result.redactedRequestHeaders).map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2">
                    <span className="text-sky-400 shrink-0">{k}:</span>
                    <span className="text-slate-200 break-all">{v}</span>
                  </div>
                ))}
              </div>
              {result.requestBodyRaw && (
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase mb-1">
                    Request Body
                  </div>
                  <pre className="p-2.5 rounded bg-slate-900 text-emerald-300 overflow-auto max-h-48 whitespace-pre-wrap">
                    {result.requestBodyRaw}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/80 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Response Headers ({Object.keys(result.responseHeaders).length})
            </span>
            <button
              type="button"
              onClick={() => setShowResponseHeaders(!showResponseHeaders)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              {showResponseHeaders ? 'Hide' : 'Show'}
            </button>
          </div>
          {showResponseHeaders && (
            <div className="p-3 space-y-1.5 text-xs font-mono max-h-64 overflow-auto">
              {Object.entries(result.responseHeaders).map(([k, v]) => {
                const isRateHeader =
                  /ratelimit|rate-limit|retry-after|quota/i.test(k);
                return (
                  <div
                    key={k}
                    className={`flex items-start gap-2 ${
                      isRateHeader
                        ? 'bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-800/60'
                        : ''
                    }`}
                  >
                    <span className="text-indigo-400 shrink-0">{k}:</span>
                    <span className="text-slate-200 break-all">{v}</span>
                  </div>
                );
              })}
              <div className="pt-2 mt-2 border-t border-slate-800 text-[11px] text-slate-400">
                Rate-Limit Header Status:{' '}
                <span className="text-amber-300">
                  {result.rateLimitInspection.hasAnyRateLimitHeader
                    ? `${
                        Object.keys(
                          result.rateLimitInspection.observedRateLimitHeaders
                        ).length
                      } rate-limit header(s) found`
                    : 'No RateLimit-* / X-RateLimit-* / Retry-After headers present'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Response Body Viewer */}
      <JsonViewer
        title="Response Body & Recursive JSON Field Inspector"
        data={result.parsedResponseBody}
        rawText={result.rawResponseBody}
        recursiveFields={result.responseRecursiveFields}
      />
    </div>
  );
}
