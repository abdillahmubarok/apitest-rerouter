'use client';

import React from 'react';
import {
  OFFICIAL_BILLING_URL,
  OFFICIAL_DOCS_URL,
  useRerouterSession,
} from '@/context/RerouterSessionContext';
import type {
  AuthFormat,
  CatalogAnalysis,
  ServerConfigStatus,
  SidebarSectionId,
  TestExecutionResult,
} from '@/lib/rerouter/types';

interface OverviewPanelProps {
  configStatus: ServerConfigStatus | null;
  catalogAnalysis: CatalogAnalysis | null;
  testResults: TestExecutionResult[];
  activeAuthFormat: AuthFormat;
  onChangeAuthFormat: (format: AuthFormat) => void;
  onRunSafeSuite: () => void;
  onRefreshModels: () => void;
  onNavigateSection: (section: SidebarSectionId) => void;
  isLoading: boolean;
}

export function OverviewPanel({
  configStatus,
  catalogAnalysis,
  testResults,
  activeAuthFormat,
  onChangeAuthFormat,
  onRunSafeSuite,
  onRefreshModels,
  onNavigateSection,
  isLoading,
}: OverviewPanelProps) {
  const {
    isConnected,
    connectionState,
    balanceState,
    balanceNote,
    lastVerifiedAt,
    disconnect,
  } = useRerouterSession();

  const totalTests = testResults.length;
  const successfulTests = testResults.filter((r) => r.ok).length;
  const failedTests = totalTests - successfulTests;

  const latestResult = testResults[0] ?? null;
  const lastSuccessfulRequest =
    testResults.find(
      (r) => r.ok && r.httpStatus >= 200 && r.httpStatus < 300
    ) ?? null;

  const latestWithCost =
    testResults.find((r) => r.usageAndCost.costValue !== null) ?? null;

  // Derive connection status strictly from live API responses
  let connectionStatusLabel = `STATE: ${connectionState}`;
  let connectionStatusColor = 'text-slate-400';
  if (isConnected && lastSuccessfulRequest) {
    connectionStatusLabel = `CONNECTED (${lastSuccessfulRequest.method} ${lastSuccessfulRequest.exactUrl.replace(
      'https://rerouter.mubarokah.com',
      ''
    )} → HTTP ${lastSuccessfulRequest.httpStatus})`;
    connectionStatusColor = 'text-emerald-400';
  } else if (isConnected) {
    connectionStatusLabel =
      'CONNECTED (Verified via POST /v1/messages/count_tokens)';
    connectionStatusColor = 'text-emerald-400';
  } else if (latestResult && latestResult.httpStatus > 0) {
    connectionStatusLabel = `REACHABLE (HTTP ${latestResult.httpStatus})`;
    connectionStatusColor = 'text-amber-300';
  } else if (latestResult && latestResult.httpStatus === 0) {
    connectionStatusLabel = `CONNECTION ERROR (${
      latestResult.networkError || 'Network unreachable'
    })`;
    connectionStatusColor = 'text-rose-400';
  }

  // Derive authentication status strictly from authenticated endpoint responses
  const authenticatedEndpointResults = testResults.filter(
    (r) =>
      r.endpointId !== 'models' &&
      r.authFormatUsed !== 'none' &&
      r.authFormatUsed !== 'invalid-dummy'
  );
  const verifiedAuthSuccess = authenticatedEndpointResults.find((r) => r.ok);
  const authRejected = authenticatedEndpointResults.find(
    (r) => r.httpStatus === 401 || r.httpStatus === 403
  );

  let authStatusLabel = isConnected
    ? 'VERIFIED (Non-billable POST /v1/messages/count_tokens)'
    : 'NOT CONNECTED (Enter your ReRouter API key)';
  let authStatusColor = isConnected ? 'text-emerald-400' : 'text-amber-400';
  if (verifiedAuthSuccess) {
    authStatusLabel = `VERIFIED (HTTP ${verifiedAuthSuccess.httpStatus} on ${verifiedAuthSuccess.label})`;
    authStatusColor = 'text-emerald-400';
  } else if (authRejected) {
    authStatusLabel = `REJECTED (HTTP ${authRejected.httpStatus}: ${
      authRejected.errorAnalysis?.readableMessage || 'Authentication failed'
    })`;
    authStatusColor = 'text-rose-400';
  }

  return (
    <div className="space-y-6">
      {/* BYOK Session & Balance Transparency Banner */}
      <div className="rounded-xl border border-indigo-800/70 bg-indigo-950/25 p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold">
              {isConnected ? '● BYOK SESSION ACTIVE' : '○ NOT CONNECTED'}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 text-sky-300 border border-slate-800">
              Storage: React In-Memory Only (No DB / No Persistent Browser Storage)
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-800">
              Balance:{' '}
              {balanceState === 'BALANCE_EMPTY'
                ? 'EMPTY (HTTP 402)'
                : 'UNKNOWN / NOT AVAILABLE'}
            </span>
            {lastVerifiedAt && (
              <span className="text-slate-400">
                Verified at {new Date(lastVerifiedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed pt-0.5">
            {balanceNote}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={OFFICIAL_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-700 transition-colors"
          >
            📖 Official Docs ↗
          </a>
          <a
            href={OFFICIAL_BILLING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-700 transition-colors"
          >
            💳 ReRouter Billing ↗
          </a>
          {isConnected && (
            <button
              type="button"
              onClick={() => disconnect()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 transition-colors"
            >
              Disconnect Session
            </button>
          )}
        </div>
      </div>

      {/* Top Controls Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-100">
            ReRouter API Playground — Live Verification & Telemetry Overview
          </h2>
          <p className="text-xs text-slate-400">
            All metrics below are populated strictly from live HTTP responses
            executed during your current in-memory session via same-origin
            Next.js Route Handlers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <span className="text-xs text-slate-400">Default Auth:</span>
            <button
              type="button"
              onClick={() => onChangeAuthFormat('bearer')}
              className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                activeAuthFormat === 'bearer'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Authorization: Bearer
            </button>
            <button
              type="button"
              onClick={() => onChangeAuthFormat('x-api-key')}
              className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                activeAuthFormat === 'x-api-key'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              x-api-key
            </button>
          </div>

          <button
            type="button"
            onClick={onRefreshModels}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Running...' : 'Refresh GET /v1/models'}
          </button>

          <button
            type="button"
            onClick={onRunSafeSuite}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
          >
            {isLoading
              ? 'Executing Safe Tests...'
              : '▶ Run All Category A Safe Tests'}
          </button>
        </div>
      </div>

      {/* 10 Mandatory Dashboard Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            1. Connection Status
          </div>
          <div
            className={`text-xs font-mono font-semibold mt-1.5 leading-snug ${connectionStatusColor}`}
          >
            {connectionStatusLabel}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            2. API Authentication Status
          </div>
          <div
            className={`text-xs font-mono font-semibold mt-1.5 leading-snug ${authStatusColor}`}
          >
            {authStatusLabel}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            3. Base URL
          </div>
          <div className="text-xs font-mono text-sky-400 mt-1.5 break-all">
            {configStatus?.baseUrl ?? 'https://rerouter.mubarokah.com/v1'}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            4. BYOK In-Memory Session Key
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className={`px-2 py-0.5 text-xs font-mono font-bold rounded ${
                isConnected
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : 'bg-amber-950 text-amber-300 border border-amber-700'
              }`}
            >
              {isConnected ? 'Active' : 'Disconnected'}
            </span>
            <span className="text-[11px] text-slate-400 truncate">
              (in-memory only)
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            5. Last Successful Request
          </div>
          <div className="text-xs font-mono text-slate-200 mt-1.5">
            {lastSuccessfulRequest ? (
              <div>
                <div className="text-emerald-400 truncate">
                  {lastSuccessfulRequest.method}{' '}
                  {lastSuccessfulRequest.exactUrl.replace(
                    'https://rerouter.mubarokah.com',
                    ''
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  {new Date(
                    lastSuccessfulRequest.timestamp
                  ).toLocaleTimeString()}{' '}
                  ({lastSuccessfulRequest.durationMs} ms)
                </div>
              </div>
            ) : (
              'None observed yet'
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            6. Total Tests Executed
          </div>
          <div className="text-2xl font-mono font-bold text-slate-100 mt-1">
            {totalTests}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            7. Successful Tests (2xx)
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">
            {successfulTests}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            8. Failed / Error Tests
          </div>
          <div className="text-2xl font-mono font-bold text-rose-400 mt-1">
            {failedTests}
            <span className="text-xs font-normal text-slate-400 ml-2">
              (includes negative 4xx tests)
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            9. Latest HTTP Status
          </div>
          <div className="text-lg font-mono font-bold text-sky-400 mt-1">
            {latestResult
              ? `HTTP ${latestResult.httpStatus} (${latestResult.statusText})`
              : 'N/A'}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            10. Latest Usage Cost
          </div>
          <div className="text-sm font-mono font-bold text-emerald-400 mt-1.5">
            {latestWithCost
              ? `$${latestWithCost.usageAndCost.costValue} (${latestWithCost.usageAndCost.costPath})`
              : 'Not returned in executed tests'}
          </div>
        </div>
      </div>

      {/* Discovered Live Model Catalog Summary */}
      {catalogAnalysis && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Live Model Catalog Snapshot Summary (
                <code className="text-sky-400">GET /v1/models</code>)
              </h3>
              <p className="text-xs text-slate-400">
                Discovered {catalogAnalysis.totalModels} models across{' '}
                {catalogAnalysis.modesFound.length} modes and{' '}
                {catalogAnalysis.providersFound.length} provider groups.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('model-catalog')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-700/60 hover:bg-indigo-600/30"
            >
              Open Full Model Catalog Inspector →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400">Chat Models</div>
              <div className="text-lg font-bold text-slate-100 mt-0.5">
                {catalogAnalysis.chatModels.length}
              </div>
              <div className="text-[11px] text-slate-500">
                mode = &quot;chat&quot;
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400">Embedding Models</div>
              <div className="text-lg font-bold text-indigo-400 mt-0.5">
                {catalogAnalysis.embeddingModels.length}
              </div>
              <div className="text-[11px] text-amber-400">
                Catalog dimensions: NOT PROVIDED
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400">Decision Models</div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">
                {catalogAnalysis.decisionModels.length}
              </div>
              <div className="text-[11px] text-slate-500">
                {catalogAnalysis.decisionModels.map((m) => m.modelId).join(', ')}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400">Discovered Capability Keys</div>
              <div className="text-xs font-bold text-sky-400 mt-1">
                supports_vision, supports_reasoning
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Pricing: pricing.prompt / completion
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Execution Log Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200">
            Executed API Requests in Current In-Memory Session (
            {testResults.length})
          </h3>
          <button
            type="button"
            onClick={() => onNavigateSection('test-reports')}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
          >
            View & Download Session Test Report →
          </button>
        </div>

        {testResults.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 space-y-2">
            <div>
              No API tests executed yet in this session. Click &quot;Run All
              Category A Safe Tests&quot; above or select an endpoint from the
              sidebar.
            </div>
            <div>
              Need reference examples? Visit{' '}
              <a
                href={OFFICIAL_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 underline hover:text-sky-300"
              >
                ReRouter Official Documentation ↗
              </a>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3 border-b border-slate-800">Time</th>
                  <th className="py-2.5 px-3 border-b border-slate-800">Cat</th>
                  <th className="py-2.5 px-3 border-b border-slate-800">
                    Test Label
                  </th>
                  <th className="py-2.5 px-3 border-b border-slate-800">
                    Method & URL
                  </th>
                  <th className="py-2.5 px-3 border-b border-slate-800">
                    HTTP Status
                  </th>
                  <th className="py-2.5 px-3 border-b border-slate-800">
                    Duration
                  </th>
                  <th className="py-2.5 px-3 border-b border-slate-800">
                    Summary / Error Classification
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {testResults.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-950/60">
                    <td className="py-2 px-3 text-slate-400">
                      {new Date(r.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {r.category}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-200 font-sans font-medium">
                      {r.label}
                    </td>
                    <td className="py-2 px-3 text-sky-400">
                      {r.method} {r.exactUrl}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          r.httpStatus >= 200 && r.httpStatus < 300
                            ? 'bg-emerald-950 text-emerald-300'
                            : r.httpStatus === 401
                              ? 'bg-amber-950 text-amber-300'
                              : 'bg-rose-950 text-rose-300'
                        }`}
                      >
                        {r.httpStatus}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-300">
                      {r.durationMs} ms
                    </td>
                    <td className="py-2 px-3 text-slate-300 max-w-xs truncate">
                      {r.errorAnalysis
                        ? `${r.errorAnalysis.errorCategoryLabel}: ${r.errorAnalysis.readableMessage}`
                        : r.endpointId === 'models'
                          ? 'Model catalog fetched'
                          : r.finishReason
                            ? `finish_reason: ${r.finishReason}`
                            : 'Completed'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
