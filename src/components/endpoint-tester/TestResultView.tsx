'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
  Radio,
} from 'lucide-react';
import { JsonViewer } from '@/components/json-viewer/JsonViewer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  CategoryBadge,
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

interface TestResultViewProps {
  result: TestExecutionResult;
}

export function TestResultView({ result }: TestResultViewProps) {
  const [showRequestDetails, setShowRequestDetails] = useState(true);
  const [showResponseHeaders, setShowResponseHeaders] = useState(true);
  const [showSseEvents, setShowSseEvents] = useState(true);

  return (
    <div className="rounded-md border border-border bg-card text-card-foreground overflow-hidden">
      {/* Top Request / Response Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-muted/40 border-b border-border">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <HttpMethodBadge method={result.method} />
          <code className="font-mono text-xs text-foreground bg-background px-2 py-0.5 rounded border border-border break-all">
            {result.exactUrl}
          </code>
          <CategoryBadge category={result.category} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <HttpStatusBadge
            status={result.httpStatus}
            statusText={result.statusText}
          />
          <Badge variant="outline" className="gap-1 font-mono text-[11px]">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span>{result.durationMs} ms</span>
          </Badge>
          <span className="font-mono text-[11px] text-muted-foreground">
            {new Date(result.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Execution Notes if present */}
      {result.notes && result.notes.length > 0 && (
        <div className="px-3.5 py-2 bg-muted/20 border-b border-border text-xs text-muted-foreground space-y-1">
          {result.notes.map((n, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-foreground font-mono">•</span>
              <span>{n}</span>
            </div>
          ))}
        </div>
      )}

      {/* Divided Telemetry Metrics Strip (No nested cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-border border-b border-border bg-background/40">
        <div className="px-3 py-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Auth Header
          </div>
          <div className="font-mono text-xs font-medium text-foreground mt-0.5">
            {result.authFormatUsed}
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Input Tokens
          </div>
          <div className="font-mono text-xs font-medium text-foreground mt-0.5">
            {result.usageAndCost.inputTokens !== null
              ? result.usageAndCost.inputTokens
              : 'Not returned'}
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Output Tokens
          </div>
          <div className="font-mono text-xs font-medium text-foreground mt-0.5">
            {result.usageAndCost.outputTokens !== null
              ? result.usageAndCost.outputTokens
              : 'Not returned'}
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Total Tokens
          </div>
          <div className="font-mono text-xs font-medium text-foreground mt-0.5">
            {result.usageAndCost.totalTokens !== null
              ? result.usageAndCost.totalTokens
              : 'Not returned'}
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Usage Cost (USD)
          </div>
          <div className="font-mono text-xs font-medium text-emerald-700 dark:text-emerald-400 mt-0.5 truncate">
            {result.usageAndCost.costValue !== null
              ? `${result.usageAndCost.costValue} (${result.usageAndCost.costPath})`
              : 'Not returned'}
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Finish / Stop Reason
          </div>
          <div className="font-mono text-xs font-medium text-sky-700 dark:text-sky-400 mt-0.5 truncate">
            {result.finishReason
              ? `${result.finishReason} (${result.finishReasonPath})`
              : 'N/A'}
          </div>
        </div>
      </div>

      {/* Error Schema Analysis Section */}
      {result.errorAnalysis && (
        <div className="border-b border-border bg-red-500/5 p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Live Error Response Schema Analysis</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="warning">
                Category: {result.errorAnalysis.errorCategoryLabel}
              </Badge>
              <Badge variant="destructive">
                Format: {result.errorAnalysis.detectedFormat}
              </Badge>
            </div>
          </div>

          <div className="rounded-md border border-red-500/25 bg-background px-3 py-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Readable Error Message
            </div>
            <div className="font-mono text-xs text-red-700 dark:text-red-300 mt-0.5">
              {result.errorAnalysis.readableMessage}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border rounded-md border border-border bg-background font-mono text-xs">
            <div className="px-3 py-2">
              <span className="text-muted-foreground">error.code: </span>
              <span className="text-foreground font-medium">
                {result.errorAnalysis.hasErrorCode
                  ? `Yes (${JSON.stringify(
                      result.errorAnalysis.errorCodeValue
                    )}, type: ${result.errorAnalysis.errorCodeType})`
                  : 'No (Not present)'}
              </span>
            </div>
            <div className="px-3 py-2">
              <span className="text-muted-foreground">error.type: </span>
              <span className="text-foreground font-medium">
                {result.errorAnalysis.errorTypeValue !== null
                  ? `${JSON.stringify(
                      result.errorAnalysis.errorTypeValue
                    )} (${result.errorAnalysis.errorTypeDataType})`
                  : 'Not present'}
              </span>
            </div>
            <div className="px-3 py-2">
              <span className="text-muted-foreground">Exact Fields: </span>
              <span className="text-sky-700 dark:text-sky-400">
                {result.errorAnalysis.exactFieldNames.join(', ') ||
                  'Non-JSON body'}
              </span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <div>
              <strong className="text-foreground">
                OpenAI Schema Hypothesis:
              </strong>{' '}
              {result.errorAnalysis.openAIHypothesisNote}
            </div>
            <div>
              <strong className="text-foreground">
                Anthropic Schema Hypothesis:
              </strong>{' '}
              {result.errorAnalysis.anthropicHypothesisNote}
            </div>
          </div>
        </div>
      )}

      {/* Embedding Dimension Verification Section */}
      {result.embeddingVerification && (
        <div className="border-b border-border bg-muted/20 p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              Embedding Vector Dimension Verification (Calculated via{' '}
              <code className="font-mono text-emerald-700 dark:text-emerald-400">
                embedding.length
              </code>
              )
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border rounded-md border border-border bg-background font-mono text-xs">
            <div className="px-3 py-2">
              <div className="text-[10px] text-muted-foreground uppercase">
                Model ID
              </div>
              <div className="text-foreground mt-0.5 break-all">
                {result.embeddingVerification.modelId}
              </div>
            </div>
            <div className="px-3 py-2">
              <div className="text-[10px] text-muted-foreground uppercase">
                Actual Vector Length
              </div>
              <div className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm mt-0.5">
                {result.embeddingVerification.actualVectorDimension ??
                  'No vector returned'}
              </div>
            </div>
            <div className="px-3 py-2">
              <div className="text-[10px] text-muted-foreground uppercase">
                Catalog-Declared Dim
              </div>
              <div className="text-amber-700 dark:text-amber-400 mt-0.5">
                {result.embeddingVerification.catalogDeclaredStatus}
              </div>
            </div>
            <div className="px-3 py-2">
              <div className="text-[10px] text-muted-foreground uppercase">
                Dimension Match
              </div>
              <div className="text-sky-700 dark:text-sky-400 mt-0.5">
                {result.embeddingVerification.dimensionsMatch}
              </div>
            </div>
            <div className="px-3 py-2">
              <div className="text-[10px] text-muted-foreground uppercase">
                Vector Preview
              </div>
              <div className="text-muted-foreground mt-0.5 truncate">
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

      {/* SSE Stream Inspection Section */}
      {result.streamInspection && (
        <div className="border-b border-border bg-sky-500/5 p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-400">
              <Radio className="h-3.5 w-3.5" />
              <span>
                SSE Stream Capture ({result.streamInspection.totalEvents} Frames
                / {result.streamInspection.dataChunkCount} Data Chunks)
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSseEvents(!showSseEvents)}
              className="h-7 text-xs"
            >
              {showSseEvents ? 'Hide SSE Event Log' : 'Show SSE Event Log'}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border rounded-md border border-border bg-background font-mono text-xs">
            <div className="px-3 py-2">
              <span className="text-muted-foreground">[DONE] Marker: </span>
              <span
                className={
                  result.streamInspection.hasDoneMarker
                    ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                    : 'text-foreground'
                }
              >
                {result.streamInspection.hasDoneMarker ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="px-3 py-2">
              <span className="text-muted-foreground">Finish Reason: </span>
              <span className="text-sky-700 dark:text-sky-400 font-medium">
                {result.streamInspection.finishReason ?? 'Not present'}
              </span>
            </div>
            <div className="px-3 py-2">
              <span className="text-muted-foreground">
                response.completed:{' '}
              </span>
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                {result.streamInspection.responseCompletedEvent
                  ? 'Captured'
                  : 'Not observed'}
              </span>
            </div>
            <div className="px-3 py-2">
              <span className="text-muted-foreground">Event Types: </span>
              <span className="text-foreground">
                {result.streamInspection.observedEventTypes.join(', ') ||
                  'Standard data frames'}
              </span>
            </div>
          </div>

          <div className="rounded-md border border-border bg-background px-3 py-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Assembled Streamed Output Content
            </div>
            <div className="font-mono text-xs text-emerald-700 dark:text-emerald-400 mt-1 whitespace-pre-wrap">
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
            <div className="max-h-64 overflow-auto rounded-md border border-border bg-background">
              <Table className="font-mono">
                <TableHeader className="sticky top-0 bg-muted">
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-44">Event Type</TableHead>
                    <TableHead>Raw Data Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.streamInspection.events.map((ev) => (
                    <TableRow key={ev.index}>
                      <TableCell className="text-muted-foreground">
                        {ev.index}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            ev.isDoneMarker
                              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                              : 'text-sky-700 dark:text-sky-400'
                          }
                        >
                          {ev.eventType ?? (ev.isDoneMarker ? '[DONE]' : 'data')}
                        </span>
                      </TableCell>
                      <TableCell className="text-foreground break-all">
                        {ev.rawData}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Request & Response Headers Divided Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border border-b border-border">
        <Collapsible
          open={showRequestDetails}
          onOpenChange={setShowRequestDetails}
        >
          <div className="flex items-center justify-between px-3.5 py-2 bg-muted/30 border-b border-border">
            <span className="text-xs font-medium text-foreground">
              Request Headers (Secrets Redacted) & Payload
            </span>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
              >
                {showRequestDetails ? (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span>Show</span>
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="p-3.5 space-y-2.5 font-mono text-xs bg-background/30">
              <div className="space-y-1">
                {Object.entries(result.redactedRequestHeaders).map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2">
                    <span className="text-sky-700 dark:text-sky-400 shrink-0">
                      {k}:
                    </span>
                    <span className="text-foreground break-all">{v}</span>
                  </div>
                ))}
              </div>
              {result.requestBodyRaw && (
                <div className="pt-2.5 border-t border-border">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Sent Request Payload
                  </div>
                  <pre className="p-2.5 rounded-md border border-border bg-muted/40 text-emerald-700 dark:text-emerald-400 overflow-auto max-h-48 whitespace-pre-wrap">
                    {result.requestBodyRaw}
                  </pre>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible
          open={showResponseHeaders}
          onOpenChange={setShowResponseHeaders}
        >
          <div className="flex items-center justify-between px-3.5 py-2 bg-muted/30 border-b border-border">
            <span className="text-xs font-medium text-foreground">
              Response Headers ({Object.keys(result.responseHeaders).length})
            </span>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
              >
                {showResponseHeaders ? (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span>Show</span>
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="p-3.5 space-y-1.5 font-mono text-xs max-h-64 overflow-auto bg-background/30">
              {Object.entries(result.responseHeaders).map(([k, v]) => {
                const isRateHeader =
                  /ratelimit|rate-limit|retry-after|quota/i.test(k);
                return (
                  <div
                    key={k}
                    className={`flex items-start gap-2 ${
                      isRateHeader
                        ? 'rounded border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5'
                        : ''
                    }`}
                  >
                    <span className="text-purple-700 dark:text-purple-400 shrink-0">
                      {k}:
                    </span>
                    <span className="text-foreground break-all">{v}</span>
                  </div>
                );
              })}
              <div className="pt-2 mt-2 border-t border-border text-[11px] text-muted-foreground">
                Rate-Limit Header Status:{' '}
                <span className="text-amber-700 dark:text-amber-400">
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
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Main Response Body Viewer */}
      <div className="p-3.5 bg-background/20">
        <JsonViewer
          title="Response Body & Recursive JSON Field Inspector"
          data={result.parsedResponseBody}
          rawText={result.rawResponseBody}
          recursiveFields={result.responseRecursiveFields}
        />
      </div>
    </div>
  );
}
