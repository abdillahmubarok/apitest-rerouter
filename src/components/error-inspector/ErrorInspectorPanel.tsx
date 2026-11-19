'use client';

import React from 'react';
import { Loader2, Play } from 'lucide-react';
import { TestResultView } from '@/components/endpoint-tester/TestResultView';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  group:
    | 'OpenAI-Compatible (/v1/chat/completions)'
    | 'Anthropic-Compatible (/v1/messages)';
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
    expectedStatus: '400 Bad Request',
  },
  {
    id: 'error-unknown-model',
    group: 'OpenAI-Compatible (/v1/chat/completions)',
    expectedStatus: '404 Not Found',
  },
  {
    id: 'error-forbidden-model',
    group: 'OpenAI-Compatible (/v1/chat/completions)',
    expectedStatus: '403 Forbidden (Restricted Key)',
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
    expectedStatus: '400 Bad Request',
  },
  {
    id: 'error-anthropic-unknown-model',
    group: 'Anthropic-Compatible (/v1/messages)',
    expectedStatus: '404 Not Found',
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
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="rounded-md border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            OpenAI-Style & Anthropic-Style Error Schema Inspector
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Safe negative tests to verify exact error JSON structures, field
            names, data types, <code className="font-mono">error.code</code>{' '}
            presence, and endpoint differences.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onRunAllSafeErrorTests}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Running Error Suite...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              <span>Run All Safe Negative Error Tests</span>
            </>
          )}
        </Button>
      </div>

      {/* Hypothesis vs Empirical Findings Reference Box */}
      <div className="rounded-md border border-border bg-card overflow-hidden grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
        <div className="p-4 space-y-2.5">
          <div className="font-mono text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
            Hypothesis 1: OpenAI-Style Error Envelope
          </div>
          <pre className="p-2.5 rounded-md border border-border bg-muted/40 text-xs font-mono text-foreground">
            {`{
  "error": {
    "message": "...",
    "type": "...",
    "code": "..."
  }
}`}
          </pre>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">
              Verified Live Observation:
            </strong>{' '}
            On{' '}
            <code className="font-mono text-sky-700 dark:text-sky-400">
              /v1/chat/completions
            </code>
            ,{' '}
            <code className="font-mono text-sky-700 dark:text-sky-400">
              /v1/responses
            </code>
            ,{' '}
            <code className="font-mono text-sky-700 dark:text-sky-400">
              /v1/embeddings
            </code>
            ,{' '}
            <code className="font-mono text-sky-700 dark:text-sky-400">
              /v1/decisions
            </code>
            , and{' '}
            <code className="font-mono text-sky-700 dark:text-sky-400">
              /v1/systemone
            </code>
            , ReRouter returns{' '}
            <code className="font-mono text-emerald-700 dark:text-emerald-400">
              {`{"error":{"code":401,"message":"...","type":"authentication_error"}}`}
            </code>
            . Crucially,{' '}
            <code className="font-mono text-amber-700 dark:text-amber-400">
              error.code
            </code>{' '}
            is a <strong className="text-foreground">number</strong> (e.g.{' '}
            <code className="font-mono">401</code>), not a string.
          </p>
        </div>

        <div className="p-4 space-y-2.5">
          <div className="font-mono text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400">
            Hypothesis 2: Anthropic-Style Error Envelope
          </div>
          <pre className="p-2.5 rounded-md border border-border bg-muted/40 text-xs font-mono text-foreground">
            {`{
  "type": "error",
  "error": {
    "type": "...",
    "message": "..."
  }
}`}
          </pre>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">
              Verified Live Observation:
            </strong>{' '}
            On{' '}
            <code className="font-mono text-purple-700 dark:text-purple-400">
              /v1/messages
            </code>{' '}
            and{' '}
            <code className="font-mono text-purple-700 dark:text-purple-400">
              /v1/messages/count_tokens
            </code>
            , ReRouter returns{' '}
            <code className="font-mono text-emerald-700 dark:text-emerald-400">
              {`{"error":{"message":"...","type":"authentication_error"},"type":"error"}`}
            </code>
            . Top-level <code className="font-mono">type: &quot;error&quot;</code>{' '}
            is present and{' '}
            <code className="font-mono text-amber-700 dark:text-amber-400">
              error.code
            </code>{' '}
            is omitted.
          </p>
        </div>
      </div>

      {/* Negative Test Triggers Grid */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <h3 className="text-xs font-semibold text-foreground">
            Individual Negative Error Triggers
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-x divide-border">
          {ERROR_TEST_CARDS.map((card) => {
            const def = ENDPOINT_DEFINITIONS[card.id];
            const latest = testResults.find((r) => r.endpointId === card.id);
            return (
              <div
                key={card.id}
                className="p-3.5 flex flex-col justify-between gap-3 bg-card"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {card.group}
                    </Badge>
                    <span className="font-mono text-[10px] text-amber-700 dark:text-amber-400">
                      Expected: {card.expectedStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <HttpMethodBadge method={def.method} />
                    <span className="text-xs font-semibold text-foreground">
                      {def.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {def.description}
                  </p>
                </div>

                <div className="space-y-2">
                  {latest && (
                    <div className="rounded-md border border-border bg-muted/30 p-2 font-mono text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Observed Status:
                        </span>
                        <HttpStatusBadge status={latest.httpStatus} />
                      </div>
                      <div className="text-foreground truncate">
                        Msg: {latest.errorAnalysis?.readableMessage}
                      </div>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onExecuteErrorTest(card.id)}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Play className="h-3 w-3" />
                    <span>Run Test</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Captured Error Schema Comparison Matrix */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <h3 className="text-xs font-semibold text-foreground">
            Captured Error Schema Inspection Table ({errorResults.length} Error
            Responses Observed)
          </h3>
        </div>
        {errorResults.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Click <strong>Run All Safe Negative Error Tests</strong> above to
            capture and inspect live error schemas.
          </div>
        ) : (
          <Table className="font-mono">
            <TableHeader>
              <TableRow>
                <TableHead>Test</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>HTTP Status</TableHead>
                <TableHead>Detected Format</TableHead>
                <TableHead>Exact JSON Field Paths</TableHead>
                <TableHead>error.code (Value & Type)</TableHead>
                <TableHead>Readable Error Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errorResults.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-sans font-medium text-foreground">
                    {r.label}
                  </TableCell>
                  <TableCell className="text-sky-700 dark:text-sky-400">
                    {r.exactUrl.replace('https://rerouter.mubarokah.com', '')}
                  </TableCell>
                  <TableCell>
                    <HttpStatusBadge status={r.httpStatus} showPrefix={false} />
                  </TableCell>
                  <TableCell className="text-purple-700 dark:text-purple-400">
                    {r.errorAnalysis?.detectedFormat ?? 'unknown'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.errorAnalysis?.exactFieldNames.join(', ') ||
                      'Non-JSON (HTML)'}
                  </TableCell>
                  <TableCell className="text-amber-700 dark:text-amber-400">
                    {r.errorAnalysis?.hasErrorCode
                      ? `${JSON.stringify(
                          r.errorAnalysis.errorCodeValue
                        )} (${r.errorAnalysis.errorCodeType})`
                      : 'Not present'}
                  </TableCell>
                  <TableCell className="text-red-700 dark:text-red-400">
                    {r.errorAnalysis?.readableMessage ?? r.statusText}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
