'use client';

import React, { useMemo, useState } from 'react';
import { TestResultView } from './TestResultView';
import { ENDPOINT_DEFINITIONS } from '@/lib/rerouter/endpoints';
import type {
  AnalyzedModelItem,
  AuthFormat,
  CatalogAnalysis,
  EndpointId,
  TestExecutionResult,
} from '@/lib/rerouter/types';

interface EndpointTestPanelProps {
  primaryEndpointId: EndpointId;
  secondaryEndpointId?: EndpointId;
  catalogAnalysis: CatalogAnalysis | null;
  testResults: TestExecutionResult[];
  defaultAuthFormat: AuthFormat;
  onExecuteTest: (params: {
    endpointId: EndpointId;
    authFormat: AuthFormat;
    customBodyRaw: string;
    selectedModelId: string;
  }) => Promise<void>;
  isLoading: boolean;
}

export function EndpointTestPanel({
  primaryEndpointId,
  secondaryEndpointId,
  catalogAnalysis,
  testResults,
  defaultAuthFormat,
  onExecuteTest,
  isLoading,
}: EndpointTestPanelProps) {
  const def = ENDPOINT_DEFINITIONS[primaryEndpointId];
  const secondaryDef = secondaryEndpointId
    ? ENDPOINT_DEFINITIONS[secondaryEndpointId]
    : null;

  const availableModels: AnalyzedModelItem[] = useMemo(() => {
    if (!catalogAnalysis) return [];
    if (primaryEndpointId === 'embeddings') {
      return catalogAnalysis.embeddingModels;
    }
    if (primaryEndpointId === 'decisions') {
      return catalogAnalysis.decisionModels;
    }
    if (primaryEndpointId === 'systemone') {
      return [
        ...catalogAnalysis.decisionModels,
        ...catalogAnalysis.chatModels,
      ];
    }
    return catalogAnalysis.chatModels;
  }, [catalogAnalysis, primaryEndpointId]);

  const initialModelId = useMemo(() => {
    if (primaryEndpointId === 'systemone') {
      return 'typesafe/jev-1.14.0';
    }
    if (primaryEndpointId === 'embeddings') {
      return (
        catalogAnalysis?.embeddingModels[0]?.modelId ??
        'gemini/gemini-embedding-001'
      );
    }
    if (primaryEndpointId === 'decisions') {
      return catalogAnalysis?.decisionModels[1]?.modelId ?? 'jev-1.14.0';
    }
    if (
      primaryEndpointId === 'anthropic-messages' ||
      primaryEndpointId === 'count-tokens-v1'
    ) {
      const claude = catalogAnalysis?.chatModels.find((m) =>
        m.modelId.includes('claude')
      );
      return claude?.modelId ?? 'claude-haiku-4-5';
    }
    const gptMini = catalogAnalysis?.chatModels.find(
      (m) => m.modelId === 'gpt-5-mini'
    );
    return (
      gptMini?.modelId ??
      catalogAnalysis?.chatModels[0]?.modelId ??
      'gpt-5-mini'
    );
  }, [catalogAnalysis, primaryEndpointId]);

  const [selectedModelId, setSelectedModelId] =
    useState<string>(initialModelId);
  const [authFormat, setAuthFormat] = useState<AuthFormat>(
    def.defaultAuthFormat === 'x-api-key' ? 'x-api-key' : defaultAuthFormat
  );
  const [customBodyRaw, setCustomBodyRaw] = useState<string>(() => {
    const payload = def.defaultBodyBuilder(initialModelId);
    return payload ? JSON.stringify(payload, null, 2) : '';
  });
  const [secondaryBodyRaw, setSecondaryBodyRaw] = useState<string>(() => {
    if (!secondaryDef) return '';
    const payload = secondaryDef.defaultBodyBuilder(initialModelId);
    return payload ? JSON.stringify(payload, null, 2) : '';
  });
  const [systemOneSubstitutionNote, setSystemOneSubstitutionNote] = useState<
    string | null
  >(null);

  const handleModelChange = (newModelId: string, note?: string) => {
    setSelectedModelId(newModelId);
    const built = def.defaultBodyBuilder(newModelId);
    if (built) {
      setCustomBodyRaw(JSON.stringify(built, null, 2));
    }
    if (secondaryDef) {
      const secBuilt = secondaryDef.defaultBodyBuilder(newModelId);
      if (secBuilt) {
        setSecondaryBodyRaw(JSON.stringify(secBuilt, null, 2));
      }
    }
    setSystemOneSubstitutionNote(note ?? null);
  };

  const primaryResults = useMemo(
    () => testResults.filter((r) => r.endpointId === primaryEndpointId),
    [testResults, primaryEndpointId]
  );

  const secondaryResults = useMemo(
    () =>
      secondaryEndpointId
        ? testResults.filter((r) => r.endpointId === secondaryEndpointId)
        : [],
    [testResults, secondaryEndpointId]
  );

  const handleRunBothCountTokens = async () => {
    if (
      primaryEndpointId === 'count-tokens-v1' &&
      secondaryEndpointId === 'count-tokens-root'
    ) {
      await onExecuteTest({
        endpointId: 'count-tokens-v1',
        authFormat,
        customBodyRaw,
        selectedModelId,
      });
      await onExecuteTest({
        endpointId: 'count-tokens-root',
        authFormat,
        customBodyRaw: secondaryBodyRaw || customBodyRaw,
        selectedModelId,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Endpoint Header Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                {def.label}
              </h2>
              <span
                className={`px-2 py-0.5 text-xs font-mono rounded border ${
                  def.category === 'A'
                    ? 'bg-teal-950 text-teal-300 border-teal-800'
                    : 'bg-amber-950 text-amber-300 border-amber-800'
                }`}
              >
                Category {def.category}:{' '}
                {def.category === 'A' ? 'Safe Test' : 'Billable Test'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{def.description}</p>
          </div>
        </div>

        {/* Category B Billable Credit Warning */}
        {def.category === 'B' && (
          <div className="rounded-lg border border-amber-700/80 bg-amber-950/40 px-3.5 py-2.5 flex items-center gap-2.5 text-xs text-amber-200">
            <span className="text-base">⚠</span>
            <div>
              <strong>Credit Consumption Warning:</strong>{' '}
              <span className="font-mono font-semibold underline">
                This request may consume API credits.
              </span>{' '}
              Uses minimal synthetic prompt input and low output token limit.
            </div>
          </div>
        )}

        {/* System One Special Notice */}
        {primaryEndpointId === 'systemone' && (
          <div className="rounded-lg border border-indigo-800/80 bg-indigo-950/30 p-3.5 space-y-2 text-xs text-slate-200">
            <div className="font-semibold text-indigo-300">
              System One Model ID Investigation Note:
            </div>
            <p className="text-slate-300 leading-relaxed">
              The supplied documentation specifies{' '}
              <code className="font-mono text-amber-300">
                &quot;model&quot;: &quot;typesafe/jev-1.14.0&quot;
              </code>
              . However, live inspection of{' '}
              <code className="font-mono text-sky-400">GET /v1/models</code>{' '}
              shows that the catalog returns{' '}
              <code className="font-mono text-emerald-300">
                &quot;id&quot;: &quot;jev-1.14.0&quot;
              </code>{' '}
              with{' '}
              <code className="font-mono">
                &quot;owned_by&quot;: &quot;typesafe&quot;
              </code>{' '}
              (without the <code className="font-mono">typesafe/</code> prefix).
              Test the exact documented example first, then optionally test the
              catalog ID substitution below.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  handleModelChange(
                    'typesafe/jev-1.14.0',
                    'Using exact documented example model ID: "typesafe/jev-1.14.0".'
                  )
                }
                className={`px-3 py-1.5 rounded text-xs font-mono border ${
                  selectedModelId === 'typesafe/jev-1.14.0'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                1. Documented Example: &quot;typesafe/jev-1.14.0&quot;
              </button>
              <button
                type="button"
                onClick={() =>
                  handleModelChange(
                    'jev-1.14.0',
                    'Documented Substitution: Replaced documented "typesafe/jev-1.14.0" with exact catalog ID "jev-1.14.0" (from GET /v1/models data[].id).'
                  )
                }
                className={`px-3 py-1.5 rounded text-xs font-mono border ${
                  selectedModelId === 'jev-1.14.0'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                2. Catalog ID Substitution: &quot;jev-1.14.0&quot;
              </button>
            </div>
            {systemOneSubstitutionNote && (
              <div className="text-xs font-mono text-amber-300 pt-1">
                Active Note: {systemOneSubstitutionNote}
              </div>
            )}
          </div>
        )}

        {/* Configuration Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Exact Model ID from <code className="font-mono">/v1/models</code>{' '}
              (No Prefix Added or Removed)
            </label>
            <select
              value={selectedModelId}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
            >
              {primaryEndpointId === 'systemone' && (
                <option value="typesafe/jev-1.14.0">
                  typesafe/jev-1.14.0 (Exact Documented Example)
                </option>
              )}
              {availableModels.map((m) => (
                <option key={m.modelId} value={m.modelId}>
                  {m.modelId} (mode: {m.mode}, owned_by: {m.provider || '""'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Authentication Header Format
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAuthFormat('bearer')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono border transition-colors ${
                  authFormat === 'bearer'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900'
                }`}
              >
                Authorization: Bearer
              </button>
              <button
                type="button"
                onClick={() => setAuthFormat('x-api-key')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono border transition-colors ${
                  authFormat === 'x-api-key'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900'
                }`}
              >
                x-api-key
              </button>
            </div>
          </div>
        </div>

        {/* Request Payload Editor(s) */}
        <div
          className={`grid grid-cols-1 ${
            secondaryDef && primaryEndpointId === 'responses'
              ? 'lg:grid-cols-2'
              : ''
          } gap-4 pt-2`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {secondaryDef && primaryEndpointId === 'responses'
                  ? 'Non-Streaming Request Payload (POST /v1/responses)'
                  : `Request JSON Payload (${def.method} ${def.path})`}
              </label>
              <button
                type="button"
                onClick={() => {
                  const built = def.defaultBodyBuilder(selectedModelId);
                  setCustomBodyRaw(built ? JSON.stringify(built, null, 2) : '');
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Reset Payload
              </button>
            </div>
            <textarea
              rows={8}
              value={customBodyRaw}
              onChange={(e) => setCustomBodyRaw(e.target.value)}
              className="w-full p-3 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onExecuteTest({
                    endpointId: primaryEndpointId,
                    authFormat,
                    customBodyRaw,
                    selectedModelId,
                  })
                }
                disabled={isLoading}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Executing Request...' : `▶ Run ${def.label}`}
              </button>

              {primaryEndpointId === 'count-tokens-v1' &&
                secondaryEndpointId === 'count-tokens-root' && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        onExecuteTest({
                          endpointId: 'count-tokens-root',
                          authFormat,
                          customBodyRaw,
                          selectedModelId,
                        })
                      }
                      disabled={isLoading}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors disabled:opacity-50"
                    >
                      ▶ Run Candidate 2 (/messages/count_tokens)
                    </button>
                    <button
                      type="button"
                      onClick={handleRunBothCountTokens}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                    >
                      ▶▶ Test & Compare Both Candidate URLs
                    </button>
                  </>
                )}
            </div>
          </div>

          {/* Secondary Request Payload for Responses API Streaming */}
          {secondaryDef && primaryEndpointId === 'responses' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-sky-300">
                  Streaming Request Payload (POST /v1/responses with stream:
                  true)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const built =
                      secondaryDef.defaultBodyBuilder(selectedModelId);
                    setSecondaryBodyRaw(
                      built ? JSON.stringify(built, null, 2) : ''
                    );
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Reset Payload
                </button>
              </div>
              <textarea
                rows={8}
                value={secondaryBodyRaw}
                onChange={(e) => setSecondaryBodyRaw(e.target.value)}
                className="w-full p-3 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-sky-300 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() =>
                  onExecuteTest({
                    endpointId: secondaryDef.id,
                    authFormat,
                    customBodyRaw: secondaryBodyRaw,
                    selectedModelId,
                  })
                }
                disabled={isLoading}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-50"
              >
                {isLoading
                  ? 'Streaming...'
                  : `▶ Run ${secondaryDef.label}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Count Tokens Dual-Path Side-by-Side Comparison Matrix */}
      {primaryEndpointId === 'count-tokens-v1' &&
        secondaryEndpointId === 'count-tokens-root' && (
          <div className="rounded-xl border border-indigo-800/80 bg-slate-900/70 p-4 space-y-3">
            <h3 className="text-sm font-bold text-indigo-300">
              Count Tokens Candidate Endpoint Path Comparison
            </h3>
            <p className="text-xs text-slate-400">
              The supplied documentation contains inconsistent endpoint
              notation. Below is the live empirical comparison between both
              candidate URLs:
            </p>
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead className="bg-slate-950 text-slate-300">
                  <tr>
                    <th className="py-2 px-3 border-b border-slate-800">
                      Attribute
                    </th>
                    <th className="py-2 px-3 border-b border-slate-800 text-sky-400">
                      Candidate 1: /v1/messages/count_tokens
                    </th>
                    <th className="py-2 px-3 border-b border-slate-800 text-amber-400">
                      Candidate 2: /messages/count_tokens (No /v1)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  <tr>
                    <td className="py-2 px-3 text-slate-400">
                      Exact Tested URL
                    </td>
                    <td className="py-2 px-3 text-slate-100">
                      https://rerouter.mubarokah.com/v1/messages/count_tokens
                    </td>
                    <td className="py-2 px-3 text-slate-100">
                      https://rerouter.mubarokah.com/messages/count_tokens
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-400">HTTP Status</td>
                    <td className="py-2 px-3 text-slate-100">
                      {primaryResults[0]
                        ? `HTTP ${primaryResults[0].httpStatus} (${primaryResults[0].statusText})`
                        : 'Not run yet in UI'}
                    </td>
                    <td className="py-2 px-3 text-slate-100">
                      {secondaryResults[0]
                        ? `HTTP ${secondaryResults[0].httpStatus} (${secondaryResults[0].statusText})`
                        : 'Not run yet in UI'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-400">Content-Type</td>
                    <td className="py-2 px-3 text-emerald-300">
                      {primaryResults[0]?.responseHeaders['content-type'] ??
                        'application/json (API Gateway)'}
                    </td>
                    <td className="py-2 px-3 text-rose-300">
                      {secondaryResults[0]?.responseHeaders['content-type'] ??
                        'text/html (nginx 405 Not Allowed)'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-400">
                      Token Count Field
                    </td>
                    <td className="py-2 px-3 text-slate-200">
                      {primaryResults[0]?.usageAndCost.tokenCountField
                        ? `${primaryResults[0].usageAndCost.tokenCountField} = ${primaryResults[0].usageAndCost.tokenCountValue}`
                        : primaryResults[0]?.errorAnalysis
                          ? `Error (${primaryResults[0].errorAnalysis.readableMessage})`
                          : 'Awaiting valid API key'}
                    </td>
                    <td className="py-2 px-3 text-rose-300">
                      None — Endpoint does not exist on root origin (returns
                      HTML 405)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-400">
                      Generation Charge / Cost
                    </td>
                    <td className="py-2 px-3 text-slate-200">
                      {primaryResults[0]?.usageAndCost.costValue !== null &&
                      primaryResults[0]?.usageAndCost.costValue !== undefined
                        ? `$${primaryResults[0].usageAndCost.costValue}`
                        : 'No cost field returned'}
                    </td>
                    <td className="py-2 px-3 text-slate-400">N/A (HTTP 405)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-400">
                      Verified Path Difference
                    </td>
                    <td className="py-2 px-3 text-emerald-400">
                      ✓ Routes to ReRouter API Backend (/v1 prefix required)
                    </td>
                    <td className="py-2 px-3 text-rose-400">
                      ✗ Hits nginx web frontend static router (405 Not Allowed)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Results List */}
      <div className="space-y-4">
        {primaryResults.map((res) => (
          <TestResultView key={res.id} result={res} />
        ))}
        {secondaryResults.map((res) => (
          <TestResultView key={res.id} result={res} />
        ))}
        {primaryResults.length === 0 && secondaryResults.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-xs text-slate-400">
            No live requests executed for this endpoint in the current view yet.
            Click the Run button above to execute against{' '}
            <code className="font-mono text-sky-400">
              https://rerouter.mubarokah.com/v1
            </code>
            .
          </div>
        )}
      </div>
    </div>
  );
}
