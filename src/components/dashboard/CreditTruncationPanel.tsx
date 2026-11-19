'use client';

import React, { useState } from 'react';
import { AlertTriangle, Loader2, Play, Scissors } from 'lucide-react';
import { TestResultView } from '@/components/endpoint-tester/TestResultView';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/components/ui/http-badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatRequestCost } from '@/lib/format/pricing';
import type {
  CatalogAnalysis,
  TestExecutionResult,
} from '@/lib/rerouter/types';

interface CreditTruncationPanelProps {
  catalogAnalysis: CatalogAnalysis | null;
  testResults: TestExecutionResult[];
  onExecuteTokenLimitTest: (modelId: string) => Promise<void>;
  onExecuteCreditLimitTest: (params: {
    modelId: string;
    maxTokens: number;
    stream: boolean;
    dedicatedLowCreditKey?: string;
  }) => Promise<void>;
  isLoading: boolean;
}

export function CreditTruncationPanel({
  catalogAnalysis,
  testResults,
  onExecuteTokenLimitTest,
  onExecuteCreditLimitTest,
  isLoading,
}: CreditTruncationPanelProps) {
  const defaultModel =
    catalogAnalysis?.chatModels.find((m) => m.modelId === 'gpt-5-mini')
      ?.modelId ??
    catalogAnalysis?.chatModels[0]?.modelId ??
    'gpt-5-mini';

  const [selectedModelId, setSelectedModelId] = useState<string>(defaultModel);
  const [creditTestEnabled, setCreditTestEnabled] = useState<boolean>(false);
  const [requestedMaxTokens, setRequestedMaxTokens] = useState<number>(512);
  const [useStreaming, setUseStreaming] = useState<boolean>(false);
  const [dedicatedKeyInput, setDedicatedKeyInput] = useState<string>('');

  const normalChatResult = testResults.find(
    (r) => r.endpointId === 'chat-completions' && r.ok
  );
  const streamChatResult = testResults.find(
    (r) => r.endpointId === 'chat-completions-stream' && r.ok
  );
  const tokenLimitResult = testResults.find(
    (r) => r.endpointId === 'token-limit-test'
  );
  const creditLimitResults = testResults.filter(
    (r) => r.endpointId === 'credit-limit-test'
  );
  const latestCreditResult = creditLimitResults[0] ?? null;

  const extractReturnedOutputLength = (
    res: TestExecutionResult | null
  ): string => {
    if (!res) return 'N/A';
    if (res.streamInspection) {
      return `${res.streamInspection.assembledText.length} chars (${
        res.usageAndCost.outputTokens ?? '?'
      } output tokens)`;
    }
    if (
      res.parsedResponseBody &&
      typeof res.parsedResponseBody === 'object' &&
      Array.isArray(
        (res.parsedResponseBody as Record<string, unknown>).choices
      )
    ) {
      const choices = (res.parsedResponseBody as Record<string, unknown>)
        .choices as Array<Record<string, unknown>>;
      const msg = choices[0]?.message as Record<string, unknown> | undefined;
      const content = typeof msg?.content === 'string' ? msg.content : '';
      return `${content.length} chars (${
        res.usageAndCost.outputTokens ?? '?'
      } output tokens)`;
    }
    return 'No completion content returned';
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="rounded-md border border-border bg-card p-4 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Credit Exhaustion & Output Truncation Investigation
            </h2>
          </div>
          <Badge variant="warning">
            {latestCreditResult && latestCreditResult.ok
              ? 'EXECUTED WITH LOW-CREDIT KEY'
              : 'NOT VERIFIED — REQUIRES A DEDICATED LOW-CREDIT TEST KEY'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The documentation states that output length may be automatically
          reduced when remaining credit is insufficient. This section
          investigates actual truncation fields and compares ordinary{' '}
          <code className="font-mono">max_tokens</code> truncation against
          credit-limited truncation.
        </p>
      </div>

      {/* 7-Point Verification Matrix */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <h3 className="text-xs font-semibold text-foreground">
            7-Point Truncation Behavior Investigation Matrix
          </h3>
        </div>
        <Table className="font-mono">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Investigation Question</TableHead>
              <TableHead>Verification Status</TableHead>
              <TableHead>Observed Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-muted-foreground">1</TableCell>
              <TableCell className="font-sans text-foreground">
                Does a normal completion return{' '}
                <code className="font-mono">
                  finish_reason: &quot;stop&quot;
                </code>
                ?
              </TableCell>
              <TableCell>
                {normalChatResult ? (
                  <Badge variant="success">OBSERVED</Badge>
                ) : (
                  <Badge variant="warning">AWAITING TEST 2</Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {normalChatResult
                  ? `finish_reason = ${JSON.stringify(
                      normalChatResult.finishReason
                    )} at ${normalChatResult.finishReasonPath}`
                  : 'Run TEST 2 (Chat Completions) with a valid key to observe.'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-muted-foreground">2</TableCell>
              <TableCell className="font-sans text-foreground">
                Does a token-limited completion (
                <code className="font-mono">max_tokens: 4</code>) return{' '}
                <code className="font-mono">
                  finish_reason: &quot;length&quot;
                </code>
                ?
              </TableCell>
              <TableCell>
                {tokenLimitResult?.ok ? (
                  <Badge variant="success">OBSERVED</Badge>
                ) : (
                  <Badge variant="warning">NOT VERIFIED</Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tokenLimitResult?.ok
                  ? `finish_reason = ${JSON.stringify(
                      tokenLimitResult.finishReason
                    )}`
                  : 'Run Ordinary Max-Token Truncation Test below to observe.'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-muted-foreground">3</TableCell>
              <TableCell className="font-sans text-foreground">
                Does a credit-limited completion return{' '}
                <code className="font-mono">
                  finish_reason: &quot;length&quot;
                </code>
                ?
              </TableCell>
              <TableCell>
                <Badge variant="warning">
                  {latestCreditResult?.ok
                    ? `OBSERVED (${latestCreditResult.finishReason})`
                    : 'NOT VERIFIED — REQUIRES LOW-CREDIT KEY'}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {latestCreditResult?.ok
                  ? `finish_reason = ${JSON.stringify(
                      latestCreditResult.finishReason
                    )}`
                  : 'Cannot be assumed without reproducing mid-generation credit limit.'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-muted-foreground">4</TableCell>
              <TableCell className="font-sans text-foreground">
                Does streaming return an identifiable terminal chunk?
              </TableCell>
              <TableCell>
                {streamChatResult ? (
                  <Badge variant="success">OBSERVED</Badge>
                ) : (
                  <Badge variant="warning">AWAITING TEST 3</Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {streamChatResult?.streamInspection
                  ? `[DONE] marker: ${streamChatResult.streamInspection.hasDoneMarker}, finish_reason: ${streamChatResult.streamInspection.finishReason}`
                  : 'Run TEST 3 (Streaming Chat Completions) to observe.'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-muted-foreground">5</TableCell>
              <TableCell className="font-sans text-foreground">
                Are final usage and cost included?
              </TableCell>
              <TableCell>
                {normalChatResult || latestCreditResult?.ok ? (
                  <Badge variant="success">OBSERVED</Badge>
                ) : (
                  <Badge variant="warning">AWAITING LIVE TEST</Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {normalChatResult
                  ? `Usage path: ${normalChatResult.usageAndCost.usagePath}, Cost path: ${normalChatResult.usageAndCost.costPath ?? 'Not present'}`
                  : 'Awaiting authenticated completion response.'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-muted-foreground">6</TableCell>
              <TableCell className="font-sans text-foreground">
                Does any additional field identify credit-related truncation?
              </TableCell>
              <TableCell>
                <Badge variant="warning">
                  NOT VERIFIED — REQUIRES LOW-CREDIT KEY
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                Must inspect recursive JSON fields of a genuine credit-limited
                response.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-muted-foreground">7</TableCell>
              <TableCell className="font-sans text-foreground">
                Can credit-related truncation be distinguished from ordinary
                max-token truncation?
              </TableCell>
              <TableCell>
                <Badge variant="warning">
                  NOT VERIFIED — REQUIRES LOW-CREDIT KEY
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                Requires side-by-side comparison of ordinary max_tokens=4
                response vs low-credit response.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Divided 2-Column Test Workbench: Ordinary Max-Token Truncation vs Dedicated CREDIT-LIMIT TEST */}
      <div className="rounded-md border border-border bg-card overflow-hidden grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* Ordinary Max-Token Truncation Test */}
        <div className="p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-foreground">
                Baseline: Ordinary Max-Token Truncation Test
              </h3>
              <CategoryBadge category="B" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sends a request with{' '}
              <code className="font-mono">max_tokens: 4</code> to verify the
              baseline <code className="font-mono">finish_reason</code> and
              response metadata when output is truncated by token limit.
            </p>
            <Alert variant="warning" className="py-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <AlertDescription className="text-xs">
                This request may consume API credits.
              </AlertDescription>
            </Alert>
          </div>

          <div className="space-y-2.5 pt-2">
            <div className="space-y-1">
              <Label htmlFor="truncation-baseline-model">Target Model ID</Label>
              <NativeSelect
                id="truncation-baseline-model"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
              >
                {(catalogAnalysis?.chatModels ?? []).map((m) => (
                  <option key={m.modelId} value={m.modelId}>
                    {m.modelId}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Button
              type="button"
              onClick={() => onExecuteTokenLimitTest(selectedModelId)}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>
                    Run Ordinary Max-Token Truncation Test (max_tokens: 4)
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Dedicated CREDIT-LIMIT TEST (Disabled by Default) */}
        <div className="p-4 space-y-3 bg-muted/10">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-foreground">
              CREDIT-LIMIT TEST (Restricted — Category C)
            </h3>
            <Badge variant={creditTestEnabled ? 'purple' : 'secondary'}>
              {creditTestEnabled ? 'Unlocked by User' : 'Disabled by Default'}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Only enable and run this test when a dedicated test API key with an
            intentionally low remaining credit balance is configured. Never use
            a production key or customer data.
          </p>

          <label className="flex items-start gap-2.5 rounded-md border border-border bg-background p-2.5 cursor-pointer text-xs text-foreground">
            <input
              type="checkbox"
              checked={creditTestEnabled}
              onChange={(e) => setCreditTestEnabled(e.target.checked)}
              className="mt-0.5 accent-primary"
            />
            <span className="leading-relaxed">
              I confirm that I am using a dedicated low-credit test API key (not
              a production key) and explicitly authorize triggering{' '}
              <code className="font-mono text-purple-700 dark:text-purple-400">
                CREDIT-LIMIT TEST
              </code>
              .
            </span>
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label>Requested max_tokens</Label>
              <Input
                type="number"
                min={16}
                max={4096}
                disabled={!creditTestEnabled}
                value={requestedMaxTokens}
                onChange={(e) =>
                  setRequestedMaxTokens(Number(e.target.value) || 512)
                }
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label>Execution Mode</Label>
              <NativeSelect
                disabled={!creditTestEnabled}
                value={useStreaming ? 'stream' : 'sync'}
                onChange={(e) => setUseStreaming(e.target.value === 'stream')}
              >
                <option value="sync">stream: false (JSON)</option>
                <option value="stream">stream: true (SSE)</option>
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-1">
            <Label>
              Optional One-Time Low-Credit Test API Key (Leave blank to use
              active in-memory session key; never stored)
            </Label>
            <Input
              type="password"
              disabled={!creditTestEnabled}
              value={dedicatedKeyInput}
              onChange={(e) => setDedicatedKeyInput(e.target.value)}
              placeholder="Optional low-credit test key override..."
              className="font-mono text-xs"
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            disabled={!creditTestEnabled || isLoading}
            onClick={() =>
              onExecuteCreditLimitTest({
                modelId: selectedModelId,
                maxTokens: requestedMaxTokens,
                stream: useStreaming,
                dedicatedLowCreditKey: dedicatedKeyInput || undefined,
              })
            }
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Executing...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                <span>Execute CREDIT-LIMIT TEST</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Recorded Metrics Summary if Credit-Limit or Token-Limit Test Executed */}
      {(latestCreditResult || tokenLimitResult) && (
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/20">
            <h3 className="text-xs font-semibold text-foreground">
              Recorded Truncation Telemetry Comparison
            </h3>
          </div>
          <Table className="font-mono">
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Ordinary Max-Token Test (max_tokens: 4)</TableHead>
                <TableHead>CREDIT-LIMIT TEST</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-muted-foreground">
                  HTTP Status
                </TableCell>
                <TableCell className="text-foreground">
                  {tokenLimitResult ? tokenLimitResult.httpStatus : 'Not run'}
                </TableCell>
                <TableCell className="text-foreground">
                  {latestCreditResult
                    ? latestCreditResult.httpStatus
                    : 'NOT VERIFIED'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">
                  Requested max_tokens
                </TableCell>
                <TableCell className="text-foreground">4</TableCell>
                <TableCell className="text-foreground">
                  {latestCreditResult
                    ? String(
                        (
                          latestCreditResult.parsedRequestBody as Record<
                            string,
                            unknown
                          >
                        )?.max_tokens ?? requestedMaxTokens
                      )
                    : 'N/A'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">
                  Returned Output Length
                </TableCell>
                <TableCell className="text-foreground">
                  {extractReturnedOutputLength(tokenLimitResult ?? null)}
                </TableCell>
                <TableCell className="text-foreground">
                  {extractReturnedOutputLength(latestCreditResult)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">
                  Finish Reason
                </TableCell>
                <TableCell className="text-sky-700 dark:text-sky-400">
                  {tokenLimitResult?.finishReason ?? 'N/A'}
                </TableCell>
                <TableCell className="text-sky-700 dark:text-sky-400">
                  {latestCreditResult?.finishReason ?? 'N/A'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">
                  Final Usage & Cost
                </TableCell>
                <TableCell className="text-emerald-700 dark:text-emerald-400">
                  {tokenLimitResult?.usageAndCost.rawUsageObject
                    ? `${JSON.stringify(
                        tokenLimitResult.usageAndCost.rawUsageObject
                      )} (Cost: ${formatRequestCost(
                        tokenLimitResult.usageAndCost.costValue
                      )})`
                    : 'N/A'}
                </TableCell>
                <TableCell className="text-emerald-700 dark:text-emerald-400">
                  {latestCreditResult?.usageAndCost.rawUsageObject
                    ? `${JSON.stringify(
                        latestCreditResult.usageAndCost.rawUsageObject
                      )} (Cost: ${formatRequestCost(
                        latestCreditResult.usageAndCost.costValue
                      )})`
                    : 'N/A'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {tokenLimitResult && <TestResultView result={tokenLimitResult} />}
      {creditLimitResults.map((res) => (
        <TestResultView key={res.id} result={res} />
      ))}
    </div>
  );
}
