'use client';

import React, { useState } from 'react';
import { TestResultView } from '@/components/endpoint-tester/TestResultView';
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-100">
            Credit Exhaustion & Output Truncation Investigation
          </h2>
          <span className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-amber-950 text-amber-300 border border-amber-700">
            {latestCreditResult && latestCreditResult.ok
              ? 'EXECUTED WITH LOW-CREDIT KEY'
              : 'NOT VERIFIED — REQUIRES A DEDICATED LOW-CREDIT TEST KEY'}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          The documentation states that output length may be automatically
          reduced when remaining credit is insufficient. This section
          investigates actual truncation fields and compares ordinary{' '}
          <code className="font-mono">max_tokens</code> truncation against
          credit-limited truncation.
        </p>
      </div>

      {/* 7-Point Verification Matrix */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
        <h3 className="text-sm font-bold text-slate-100">
          7-Point Truncation Behavior Investigation Matrix
        </h3>
        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead className="bg-slate-950 text-slate-300">
              <tr>
                <th className="py-2 px-3 border-b border-slate-800">#</th>
                <th className="py-2 px-3 border-b border-slate-800">
                  Investigation Question
                </th>
                <th className="py-2 px-3 border-b border-slate-800">
                  Verification Status
                </th>
                <th className="py-2 px-3 border-b border-slate-800">
                  Observed Evidence
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              <tr>
                <td className="py-2 px-3 text-slate-400">1</td>
                <td className="py-2 px-3 font-sans text-slate-200">
                  Does a normal completion return{' '}
                  <code className="font-mono">
                    finish_reason: &quot;stop&quot;
                  </code>
                  ?
                </td>
                <td className="py-2 px-3">
                  {normalChatResult ? (
                    <span className="text-emerald-400 font-bold">OBSERVED</span>
                  ) : (
                    <span className="text-amber-300">AWAITING TEST 2</span>
                  )}
                </td>
                <td className="py-2 px-3 text-slate-300">
                  {normalChatResult
                    ? `finish_reason = ${JSON.stringify(
                        normalChatResult.finishReason
                      )} at ${normalChatResult.finishReasonPath}`
                    : 'Run TEST 2 (Chat Completions) with a valid key to observe.'}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-400">2</td>
                <td className="py-2 px-3 font-sans text-slate-200">
                  Does a token-limited completion (
                  <code className="font-mono">max_tokens: 4</code>) return{' '}
                  <code className="font-mono">
                    finish_reason: &quot;length&quot;
                  </code>
                  ?
                </td>
                <td className="py-2 px-3">
                  {tokenLimitResult?.ok ? (
                    <span className="text-emerald-400 font-bold">OBSERVED</span>
                  ) : (
                    <span className="text-amber-300">NOT VERIFIED</span>
                  )}
                </td>
                <td className="py-2 px-3 text-slate-300">
                  {tokenLimitResult?.ok
                    ? `finish_reason = ${JSON.stringify(
                        tokenLimitResult.finishReason
                      )}`
                    : 'Run Ordinary Max-Token Truncation Test below to observe.'}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-400">3</td>
                <td className="py-2 px-3 font-sans text-slate-200">
                  Does a credit-limited completion return{' '}
                  <code className="font-mono">
                    finish_reason: &quot;length&quot;
                  </code>
                  ?
                </td>
                <td className="py-2 px-3 text-amber-300 font-bold">
                  {latestCreditResult?.ok
                    ? `OBSERVED (${latestCreditResult.finishReason})`
                    : 'NOT VERIFIED — REQUIRES A DEDICATED LOW-CREDIT TEST KEY'}
                </td>
                <td className="py-2 px-3 text-slate-300">
                  {latestCreditResult?.ok
                    ? `finish_reason = ${JSON.stringify(
                        latestCreditResult.finishReason
                      )}`
                    : 'Cannot be assumed without reproducing mid-generation credit limit.'}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-400">4</td>
                <td className="py-2 px-3 font-sans text-slate-200">
                  Does streaming return an identifiable terminal chunk?
                </td>
                <td className="py-2 px-3">
                  {streamChatResult ? (
                    <span className="text-emerald-400 font-bold">OBSERVED</span>
                  ) : (
                    <span className="text-amber-300">AWAITING TEST 3</span>
                  )}
                </td>
                <td className="py-2 px-3 text-slate-300">
                  {streamChatResult?.streamInspection
                    ? `[DONE] marker: ${streamChatResult.streamInspection.hasDoneMarker}, finish_reason: ${streamChatResult.streamInspection.finishReason}`
                    : 'Run TEST 3 (Streaming Chat Completions) to observe.'}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-400">5</td>
                <td className="py-2 px-3 font-sans text-slate-200">
                  Are final usage and cost included?
                </td>
                <td className="py-2 px-3">
                  {normalChatResult || latestCreditResult?.ok ? (
                    <span className="text-emerald-400 font-bold">OBSERVED</span>
                  ) : (
                    <span className="text-amber-300">AWAITING LIVE TEST</span>
                  )}
                </td>
                <td className="py-2 px-3 text-slate-300">
                  {normalChatResult
                    ? `Usage path: ${normalChatResult.usageAndCost.usagePath}, Cost path: ${normalChatResult.usageAndCost.costPath ?? 'Not present'}`
                    : 'Awaiting authenticated completion response.'}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-400">6</td>
                <td className="py-2 px-3 font-sans text-slate-200">
                  Does any additional field identify credit-related truncation?
                </td>
                <td className="py-2 px-3 text-amber-300 font-bold">
                  NOT VERIFIED — REQUIRES A DEDICATED LOW-CREDIT TEST KEY
                </td>
                <td className="py-2 px-3 text-slate-300">
                  Must inspect recursive JSON fields of a genuine credit-limited
                  response.
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-400">7</td>
                <td className="py-2 px-3 font-sans text-slate-200">
                  Can credit-related truncation be distinguished from ordinary
                  max-token truncation?
                </td>
                <td className="py-2 px-3 text-amber-300 font-bold">
                  NOT VERIFIED — REQUIRES A DEDICATED LOW-CREDIT TEST KEY
                </td>
                <td className="py-2 px-3 text-slate-300">
                  Requires side-by-side comparison of ordinary max_tokens=4
                  response vs low-credit response.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Test Panels: Ordinary Max-Token Truncation vs Dedicated CREDIT-LIMIT TEST */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ordinary Max-Token Truncation Test */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100">
                Baseline: Ordinary Max-Token Truncation Test
              </h3>
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-amber-950 text-amber-300 border border-amber-800">
                Category B: Billable
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Sends a request with <code className="font-mono">max_tokens: 4</code>{' '}
              to verify the baseline <code className="font-mono">finish_reason</code>{' '}
              and response metadata when output is truncated by token limit.
            </p>
            <div className="p-2.5 rounded bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200">
              ⚠ This request may consume API credits.
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded bg-slate-950 border border-slate-700 text-slate-100"
            >
              {(catalogAnalysis?.chatModels ?? []).map((m) => (
                <option key={m.modelId} value={m.modelId}>
                  {m.modelId}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onExecuteTokenLimitTest(selectedModelId)}
              disabled={isLoading}
              className="w-full py-2 px-4 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
            >
              {isLoading
                ? 'Running...'
                : '▶ Run Ordinary Max-Token Truncation Test (max_tokens: 4)'}
            </button>
          </div>
        </div>

        {/* Dedicated CREDIT-LIMIT TEST (Disabled by Default) */}
        <div className="rounded-xl border border-purple-800/80 bg-purple-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-purple-300">
              CREDIT-LIMIT TEST (Restricted — Category C)
            </h3>
            <span className="px-2 py-0.5 text-xs font-mono rounded bg-purple-950 text-purple-300 border border-purple-700">
              {creditTestEnabled ? 'Unlocked by User' : 'Disabled by Default'}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Only enable and run this test when a dedicated test API key with an
            intentionally low remaining credit balance is configured. Never use
            a production key or customer data.
          </p>

          <label className="flex items-start gap-2.5 p-2.5 rounded bg-slate-950 border border-purple-800/60 cursor-pointer text-xs text-slate-200">
            <input
              type="checkbox"
              checked={creditTestEnabled}
              onChange={(e) => setCreditTestEnabled(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I confirm that I am using a dedicated low-credit test API key (not
              a production key) and explicitly authorize triggering{' '}
              <code className="font-mono text-purple-300">
                CREDIT-LIMIT TEST
              </code>
              .
            </span>
          </label>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">
                Requested max_tokens
              </label>
              <input
                type="number"
                min={16}
                max={4096}
                disabled={!creditTestEnabled}
                value={requestedMaxTokens}
                onChange={(e) =>
                  setRequestedMaxTokens(Number(e.target.value) || 512)
                }
                className="w-full px-3 py-1.5 font-mono rounded bg-slate-950 border border-slate-700 text-slate-100 disabled:opacity-40"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">
                Execution Mode
              </label>
              <select
                disabled={!creditTestEnabled}
                value={useStreaming ? 'stream' : 'sync'}
                onChange={(e) => setUseStreaming(e.target.value === 'stream')}
                className="w-full px-3 py-1.5 font-mono rounded bg-slate-950 border border-slate-700 text-slate-100 disabled:opacity-40"
              >
                <option value="sync">stream: false (JSON)</option>
                <option value="stream">stream: true (SSE)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Optional One-Time Low-Credit Test API Key (Leave blank to use
              server .env.local key; never stored or logged)
            </label>
            <input
              type="password"
              disabled={!creditTestEnabled}
              value={dedicatedKeyInput}
              onChange={(e) => setDedicatedKeyInput(e.target.value)}
              placeholder="Optional low-credit test key override..."
              className="w-full px-3 py-1.5 text-xs font-mono rounded bg-slate-950 border border-slate-700 text-slate-100 disabled:opacity-40"
            />
          </div>

          <button
            type="button"
            disabled={!creditTestEnabled || isLoading}
            onClick={() =>
              onExecuteCreditLimitTest({
                modelId: selectedModelId,
                maxTokens: requestedMaxTokens,
                stream: useStreaming,
                dedicatedLowCreditKey: dedicatedKeyInput || undefined,
              })
            }
            className="w-full py-2 px-4 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Executing...' : '▶ Execute CREDIT-LIMIT TEST'}
          </button>
        </div>
      </div>

      {/* Recorded Metrics Summary if Credit-Limit or Token-Limit Test Executed */}
      {(latestCreditResult || tokenLimitResult) && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-100">
            Recorded Truncation Telemetry Comparison
          </h3>
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead className="bg-slate-950 text-slate-300">
                <tr>
                  <th className="py-2 px-3 border-b border-slate-800">
                    Metric
                  </th>
                  <th className="py-2 px-3 border-b border-slate-800">
                    Ordinary Max-Token Test (max_tokens: 4)
                  </th>
                  <th className="py-2 px-3 border-b border-slate-800">
                    CREDIT-LIMIT TEST
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                <tr>
                  <td className="py-2 px-3 text-slate-400">HTTP Status</td>
                  <td className="py-2 px-3 text-slate-200">
                    {tokenLimitResult ? tokenLimitResult.httpStatus : 'Not run'}
                  </td>
                  <td className="py-2 px-3 text-slate-200">
                    {latestCreditResult
                      ? latestCreditResult.httpStatus
                      : 'NOT VERIFIED'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-400">
                    Requested max_tokens
                  </td>
                  <td className="py-2 px-3 text-slate-200">4</td>
                  <td className="py-2 px-3 text-slate-200">
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
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-400">
                    Returned Output Length
                  </td>
                  <td className="py-2 px-3 text-slate-200">
                    {extractReturnedOutputLength(tokenLimitResult ?? null)}
                  </td>
                  <td className="py-2 px-3 text-slate-200">
                    {extractReturnedOutputLength(latestCreditResult)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-400">Finish Reason</td>
                  <td className="py-2 px-3 text-sky-400">
                    {tokenLimitResult?.finishReason ?? 'N/A'}
                  </td>
                  <td className="py-2 px-3 text-sky-400">
                    {latestCreditResult?.finishReason ?? 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-400">
                    Final Usage & Cost
                  </td>
                  <td className="py-2 px-3 text-emerald-300">
                    {tokenLimitResult?.usageAndCost.rawUsageObject
                      ? `${JSON.stringify(
                          tokenLimitResult.usageAndCost.rawUsageObject
                        )} (Cost: ${
                          tokenLimitResult.usageAndCost.costValue ?? 'none'
                        })`
                      : 'N/A'}
                  </td>
                  <td className="py-2 px-3 text-emerald-300">
                    {latestCreditResult?.usageAndCost.rawUsageObject
                      ? `${JSON.stringify(
                          latestCreditResult.usageAndCost.rawUsageObject
                        )} (Cost: ${
                          latestCreditResult.usageAndCost.costValue ?? 'none'
                        })`
                      : 'N/A'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tokenLimitResult && <TestResultView result={tokenLimitResult} />}
      {creditLimitResults.map((res) => (
        <TestResultView key={res.id} result={res} />
      ))}
    </div>
  );
}
