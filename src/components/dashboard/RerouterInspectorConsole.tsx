'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CreditTruncationPanel } from './CreditTruncationPanel';
import { OverviewPanel } from './OverviewPanel';
import { BillingRedirectModal } from '@/components/connection/BillingRedirectModal';
import { ConnectionModal } from '@/components/connection/ConnectionModal';
import { EndpointTestPanel } from '@/components/endpoint-tester/EndpointTestPanel';
import { ErrorInspectorPanel } from '@/components/error-inspector/ErrorInspectorPanel';
import { ModelCatalogPanel } from '@/components/model-catalog/ModelCatalogPanel';
import { ModelChangesPanel } from '@/components/model-catalog/ModelChangesPanel';
import { RateLimitPanel } from '@/components/rate-limit-inspector/RateLimitPanel';
import { PrivacyPanel } from '@/components/report-viewer/PrivacyPanel';
import { TestReportsPanel } from '@/components/report-viewer/TestReportsPanel';
import {
  OFFICIAL_BILLING_URL,
  OFFICIAL_DOCS_URL,
  useRerouterSession,
} from '@/context/RerouterSessionContext';
import {
  DEFAULT_PRIVACY_QUESTIONS,
  generateTestReportMarkdown,
} from '@/lib/rerouter/report';
import type {
  AuthFormat,
  CatalogAnalysis,
  CatalogSnapshot,
  EndpointId,
  ServerConfigStatus,
  SidebarSectionId,
  TestExecutionResult,
} from '@/lib/rerouter/types';

interface SidebarNavItem {
  id: SidebarSectionId;
  number: number;
  label: string;
  badge?: string;
  category?: 'A' | 'B' | 'C' | 'Info';
}

const SIDEBAR_ITEMS: SidebarNavItem[] = [
  { id: 'overview', number: 1, label: 'Overview', category: 'Info' },
  {
    id: 'model-catalog',
    number: 2,
    label: 'Model Catalog',
    badge: 'GET /v1/models',
    category: 'A',
  },
  {
    id: 'chat-completions',
    number: 3,
    label: 'Chat Completions',
    badge: 'POST',
    category: 'B',
  },
  {
    id: 'streaming',
    number: 4,
    label: 'Streaming',
    badge: 'SSE',
    category: 'B',
  },
  {
    id: 'responses',
    number: 5,
    label: 'Responses API',
    badge: '/v1/responses',
    category: 'B',
  },
  {
    id: 'anthropic-messages',
    number: 6,
    label: 'Anthropic Messages',
    badge: '/v1/messages',
    category: 'B',
  },
  {
    id: 'count-tokens',
    number: 7,
    label: 'Count Tokens',
    badge: '2 Paths',
    category: 'A',
  },
  {
    id: 'embeddings',
    number: 8,
    label: 'Embeddings',
    badge: 'Vectors',
    category: 'B',
  },
  {
    id: 'decisions',
    number: 9,
    label: 'Decisions',
    badge: '/v1/decisions',
    category: 'B',
  },
  {
    id: 'systemone',
    number: 10,
    label: 'System One',
    badge: '/v1/systemone',
    category: 'B',
  },
  {
    id: 'error-inspector',
    number: 11,
    label: 'Error Inspector',
    badge: '400-404',
    category: 'A',
  },
  {
    id: 'rate-limits',
    number: 12,
    label: 'Rate Limits',
    badge: 'Headers',
    category: 'A',
  },
  {
    id: 'credit-truncation',
    number: 13,
    label: 'Credit & Truncation',
    badge: 'Restricted',
    category: 'C',
  },
  {
    id: 'model-changes',
    number: 14,
    label: 'Model Changes',
    badge: 'Diffs',
    category: 'Info',
  },
  {
    id: 'privacy',
    number: 15,
    label: 'Privacy',
    badge: 'BYOK & 15 Qs',
    category: 'Info',
  },
  {
    id: 'test-reports',
    number: 16,
    label: 'Test Reports',
    badge: 'Export',
    category: 'Info',
  },
];

interface ExecuteTestParams {
  endpointId: EndpointId;
  authFormat?: AuthFormat;
  customBodyRaw?: string;
  selectedModelId?: string;
  dedicatedLowCreditKey?: string;
  confirmLowCreditTest?: boolean;
}

export function RerouterInspectorConsole() {
  const { sessionEpoch } = useRerouterSession();
  // Keying by sessionEpoch automatically clears all in-memory test state on Disconnect
  return <RerouterInspectorWorkspace key={sessionEpoch} />;
}

function RerouterInspectorWorkspace() {
  const {
    isConnected,
    authFormat: sessionAuthFormat,
    balanceState,
    lastVerificationResult,
    sessionEpoch,
    setAuthFormat: setSessionAuthFormat,
    disconnect,
    handleUnauthorized401,
    handleAuthoritativeInsufficientBalance,
    buildProxyAuthHeaders,
  } = useRerouterSession();

  const [activeSection, setActiveSection] =
    useState<SidebarSectionId>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [configStatus, setConfigStatus] = useState<ServerConfigStatus | null>(
    null
  );
  const activeAuthFormat: AuthFormat = sessionAuthFormat;

  const [catalogAnalysis, setCatalogAnalysis] =
    useState<CatalogAnalysis | null>(null);
  const [rawCatalogObject, setRawCatalogObject] = useState<unknown | null>(
    null
  );
  const [modelsTestResult, setModelsTestResult] =
    useState<TestExecutionResult | null>(null);
  const [testResults, setTestResults] = useState<TestExecutionResult[]>([]);
  const [snapshots, setSnapshots] = useState<CatalogSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastRetryParams, setLastRetryParams] =
    useState<ExecuteTestParams | null>(null);
  const [notification, setNotification] = useState<{
    type: 'info' | 'error' | 'success' | 'warning';
    message: string;
    allowManualRetry?: boolean;
  } | null>(null);

  const initializedRef = useRef<boolean>(false);

  const handleAuthFormatChange = useCallback(
    (fmt: AuthFormat) => {
      if (fmt === 'bearer' || fmt === 'x-api-key') {
        setSessionAuthFormat(fmt);
      }
    },
    [setSessionAuthFormat]
  );

  const appendResult = useCallback((result: TestExecutionResult) => {
    setTestResults((prev) => {
      if (prev.some((existing) => existing.id === result.id)) {
        return prev;
      }
      return [result, ...prev];
    });
  }, []);

  const inspectResultForSessionEvents = useCallback(
    (
      result: TestExecutionResult,
      retryParams?: ExecuteTestParams
    ): boolean => {
      // 1. Authoritative insufficient credit balance check (HTTP 402)
      if (
        result.httpStatus === 402 ||
        result.errorAnalysis?.isAuthoritativeInsufficientBalance
      ) {
        handleAuthoritativeInsufficientBalance(
          result.httpStatus || 402,
          result.exactUrl,
          result.errorAnalysis?.readableMessage ||
            'Account has no available credit balance or key credit limit reached.'
        );
        return true;
      }

      // 2. Authentication failure (HTTP 401) on a request that used the visitor's active key
      const usedUserKey =
        result.authFormatUsed === 'bearer' ||
        result.authFormatUsed === 'x-api-key';
      if (
        result.httpStatus === 401 &&
        usedUserKey &&
        !result.endpointId.startsWith('error-')
      ) {
        handleUnauthorized401(
          result.label,
          result.errorAnalysis?.readableMessage ||
            'Invalid, expired, or revoked API key.'
        );
        return true;
      }

      // 3. Rate Limit (HTTP 429) — respect Retry-After and do not auto-retry
      if (result.httpStatus === 429) {
        const retryHint = result.rateLimitInspection.retryAfterExists
          ? ` Retry-After: ${result.rateLimitInspection.retryAfterValue} (${result.rateLimitInspection.retryAfterFormat}).`
          : '';
        setNotification({
          type: 'warning',
          message: `Rate limit reached (HTTP 429) on ${result.label}.${retryHint} Billable requests are never automatically repeated.`,
        });
        return true;
      }

      // 4. Temporary service/provider unavailability (502, 503, 504) — offer manual retry
      if (
        result.httpStatus === 502 ||
        result.httpStatus === 503 ||
        result.httpStatus === 504
      ) {
        if (retryParams) {
          setLastRetryParams(retryParams);
        }
        setNotification({
          type: 'warning',
          allowManualRetry: Boolean(retryParams),
          message: `${
            result.errorAnalysis?.errorCategoryLabel ||
            `Service temporarily unavailable (HTTP ${result.httpStatus})`
          }: ${
            result.errorAnalysis?.readableMessage ||
            'Upstream provider or gateway is temporarily unavailable.'
          }`,
        });
        return true;
      }

      return false;
    },
    [handleAuthoritativeInsufficientBalance, handleUnauthorized401]
  );

  const fetchModelsCatalog = useCallback(
    async (
      authFormat: AuthFormat = activeAuthFormat,
      initialVerificationToPrepend?: TestExecutionResult | null
    ) => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/rerouter/models?authFormat=${encodeURIComponent(authFormat)}`,
          {
            headers: buildProxyAuthHeaders(
              authFormat === 'x-api-key' ? 'x-api-key' : 'bearer'
            ),
            cache: 'no-store',
          }
        );
        const data = await res.json();
        if (data.configStatus) {
          setConfigStatus(data.configStatus);
        }
        if (initialVerificationToPrepend) {
          appendResult(initialVerificationToPrepend);
        }
        if (data.testResult) {
          setModelsTestResult(data.testResult);
          appendResult(data.testResult);
          if (data.testResult.parsedResponseBody) {
            setRawCatalogObject(data.testResult.parsedResponseBody);
          }
        }
        if (data.catalogAnalysis) {
          setCatalogAnalysis(data.catalogAnalysis);
          const snapTime = data.catalogAnalysis.fetchedAt;
          const newSnap: CatalogSnapshot = {
            id: `snap-${snapTime}`,
            label: `Live Catalog Snapshot #${Date.now().toString().slice(-4)}`,
            timestamp: snapTime,
            totalModels: data.catalogAnalysis.totalModels,
            rawCatalog: data.testResult?.parsedResponseBody,
          };
          setSnapshots((prev) =>
            prev.length === 0 ? [newSnap] : [...prev, newSnap]
          );
        }
        setNotification({
          type: data.testResult?.ok ? 'success' : 'info',
          message: `GET /v1/models completed with HTTP ${
            data.testResult?.httpStatus ?? res.status
          } (${data.catalogAnalysis?.totalModels ?? 0} models discovered).`,
        });
      } catch (err) {
        setNotification({
          type: 'error',
          message:
            err instanceof Error
              ? `Failed to fetch /v1/models: ${err.message}`
              : 'Failed to fetch /v1/models',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [activeAuthFormat, appendResult, buildProxyAuthHeaders]
  );

  // Upon successful connection, load GET /v1/models and include verification telemetry
  useEffect(() => {
    if (isConnected && !initializedRef.current) {
      initializedRef.current = true;
      void fetchModelsCatalog(sessionAuthFormat, lastVerificationResult);
    }
  }, [
    isConnected,
    sessionAuthFormat,
    lastVerificationResult,
    fetchModelsCatalog,
  ]);

  const executeEndpointTest = useCallback(
    async (params: ExecuteTestParams): Promise<TestExecutionResult | null> => {
      setIsLoading(true);
      setLastRetryParams(null);
      try {
        const effectiveAuth = params.authFormat ?? activeAuthFormat;
        const proxyHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...buildProxyAuthHeaders(
            effectiveAuth === 'x-api-key' ? 'x-api-key' : 'bearer'
          ),
        };
        if (params.dedicatedLowCreditKey) {
          proxyHeaders['x-rerouter-low-credit-key'] =
            params.dedicatedLowCreditKey;
        }

        const res = await fetch('/api/rerouter/test', {
          method: 'POST',
          headers: proxyHeaders,
          body: JSON.stringify({
            endpointId: params.endpointId,
            authFormat: effectiveAuth,
            customBodyRaw: params.customBodyRaw,
            selectedModelId: params.selectedModelId,
            confirmLowCreditTest: params.confirmLowCreditTest,
          }),
          cache: 'no-store',
        });
        const data = await res.json();
        if (data.configStatus) {
          setConfigStatus(data.configStatus);
        }
        if (data.testResult) {
          const result: TestExecutionResult = data.testResult;
          appendResult(result);

          const handledSpecial = inspectResultForSessionEvents(result, params);

          if (!handledSpecial) {
            setNotification({
              type: result.ok ? 'success' : 'info',
              message: `${result.label} → HTTP ${result.httpStatus} (${result.durationMs} ms)`,
            });
          }
          return result;
        }
        if (data.error) {
          setNotification({
            type: 'error',
            message: data.error,
          });
        }
        return null;
      } catch (err) {
        setNotification({
          type: 'error',
          message:
            err instanceof Error
              ? `Request execution error: ${err.message}`
              : 'Request execution error',
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [
      activeAuthFormat,
      appendResult,
      buildProxyAuthHeaders,
      inspectResultForSessionEvents,
    ]
  );

  const handleRunSafeSuite = async () => {
    await fetchModelsCatalog(activeAuthFormat);
    await executeEndpointTest({
      endpointId: 'count-tokens-v1',
      authFormat: 'x-api-key',
    });
    await executeEndpointTest({
      endpointId: 'count-tokens-root',
      authFormat: 'x-api-key',
    });
    await executeEndpointTest({
      endpointId: 'error-missing-key',
      authFormat: 'none',
    });
    await executeEndpointTest({
      endpointId: 'error-invalid-key',
      authFormat: 'invalid-dummy',
    });
    await executeEndpointTest({
      endpointId: 'error-invalid-request',
      authFormat: 'bearer',
    });
    await executeEndpointTest({
      endpointId: 'error-unknown-model',
      authFormat: 'bearer',
    });
    await executeEndpointTest({
      endpointId: 'error-anthropic-missing-key',
      authFormat: 'none',
    });
    await executeEndpointTest({
      endpointId: 'error-anthropic-invalid-key',
      authFormat: 'invalid-dummy',
    });
    await executeEndpointTest({
      endpointId: 'error-anthropic-invalid-request',
      authFormat: 'x-api-key',
    });
    await executeEndpointTest({
      endpointId: 'error-anthropic-unknown-model',
      authFormat: 'x-api-key',
    });
    setNotification({
      type: 'success',
      message:
        'Completed all 11 Category A Safe Tests (GET /v1/models, Count Tokens dual candidate comparison, and OpenAI + Anthropic 400/401/404 Error Schema verification).',
    });
  };

  const handleRunAllSafeErrorTests = async () => {
    const safeErrorIds: EndpointId[] = [
      'error-missing-key',
      'error-invalid-key',
      'error-invalid-request',
      'error-unknown-model',
      'error-anthropic-missing-key',
      'error-anthropic-invalid-key',
      'error-anthropic-invalid-request',
      'error-anthropic-unknown-model',
    ];
    for (const id of safeErrorIds) {
      await executeEndpointTest({ endpointId: id });
    }
  };

  const handleQuickDownloadReport = () => {
    const effectiveConfig: ServerConfigStatus = configStatus ?? {
      baseUrl: 'https://rerouter.mubarokah.com/v1',
      docsUrl: OFFICIAL_DOCS_URL,
      billingUrl: OFFICIAL_BILLING_URL,
      productionDomain: 'https://apitest-rerouter.mubarokah.com',
      byokMode: true,
      apiKeyConfigured: isConnected,
      keySource: isConnected ? 'byok-memory' : 'none',
      maskedStatus: isConnected
        ? 'Connected via per-request BYOK in-memory session'
        : 'Not connected',
      nextVersion: '16.4.6',
      timestamp: new Date().toISOString(),
    };
    const md = generateTestReportMarkdown({
      configStatus: effectiveConfig,
      activeAuthFormat,
      catalogAnalysis,
      testResults,
      privacyQuestions: DEFAULT_PRIVACY_QUESTIONS,
    });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'REROUTER_SESSION_TEST_REPORT.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const endpointPanelKeyPrefix = `${catalogAnalysis?.fetchedAt ?? 'init'}-${activeAuthFormat}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* BYOK Connection Modal (Shown immediately when not connected) */}
      <ConnectionModal key={`modal-${sessionEpoch}`} />

      {/* Authoritative HTTP 402 Insufficient Credit Redirect Modal */}
      <BillingRedirectModal />

      {/* Top Application Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono"
          >
            {mobileMenuOpen ? '✕ Close Menu' : '☰ Sections'}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-mono font-bold text-sm text-white shadow">
              RR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-base font-bold tracking-tight text-white">
                  ReRouter API Playground
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono rounded bg-slate-900 text-sky-400 border border-slate-800">
                  BYOK · Next.js 16.4.6
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Upstream:{' '}
                <span className="text-slate-300">
                  {configStatus?.baseUrl ??
                    'https://rerouter.mubarokah.com/v1'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Persistent Connection Status Indicator */}
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-mono border flex items-center gap-1.5 ${
              isConnected
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                : 'bg-amber-950/80 text-amber-300 border-amber-700'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span>{isConnected ? 'Connected' : 'Not Connected'}</span>
          </div>

          {/* Active Authentication Format Indicator */}
          {isConnected && (
            <div className="px-2.5 py-1 rounded-full text-xs font-mono bg-slate-900 text-indigo-300 border border-slate-800">
              Auth:{' '}
              <strong>
                {activeAuthFormat === 'x-api-key' ? 'x-api-key' : 'Bearer'}
              </strong>
            </div>
          )}

          {/* Balance Verification Status Indicator */}
          <div
            title="ReRouter does not expose a balance inquiry endpoint; balance is monitored passively for authoritative HTTP 402 responses."
            className={`hidden md:flex px-2.5 py-1 rounded-full text-xs font-mono border items-center gap-1.5 ${
              balanceState === 'BALANCE_EMPTY'
                ? 'bg-rose-950/80 text-rose-300 border-rose-700'
                : 'bg-slate-900 text-slate-300 border border-slate-800'
            }`}
          >
            <span>
              Balance:{' '}
              <strong>
                {balanceState === 'BALANCE_EMPTY'
                  ? 'Empty (HTTP 402)'
                  : 'Unknown'}
              </strong>
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-full text-xs font-mono bg-slate-900 text-slate-300 border border-slate-800">
            Session Requests: <strong>{testResults.length}</strong>
          </div>

          {/* Official Documentation Link */}
          <a
            href={OFFICIAL_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-800 transition-colors"
          >
            Docs ↗
          </a>

          {/* Official Billing Link */}
          <a
            href={OFFICIAL_BILLING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 transition-colors"
          >
            Billing ↗
          </a>

          <button
            type="button"
            onClick={handleQuickDownloadReport}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            ⬇ Session Report
          </button>

          {/* Disconnect Action */}
          {isConnected && (
            <button
              type="button"
              onClick={() => disconnect()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/90 hover:bg-rose-900 text-rose-200 border border-rose-800 transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>
      </header>

      {/* Main Content Layout with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside
          className={`${
            mobileMenuOpen ? 'block' : 'hidden'
          } lg:block w-64 shrink-0 border-r border-slate-800 bg-slate-950/90 overflow-y-auto p-3 flex flex-col justify-between gap-4`}
        >
          <div className="space-y-1">
            <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Playground Sections (16)
            </div>
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className={`font-mono text-[11px] ${
                        isActive ? 'text-indigo-200' : 'text-slate-500'
                      }`}
                    >
                      {String(item.number).padStart(2, '0')}.
                    </span>
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-mono rounded shrink-0 ${
                        isActive
                          ? 'bg-indigo-700 text-indigo-100'
                          : item.category === 'A'
                            ? 'bg-teal-950 text-teal-300 border border-teal-800/60'
                            : item.category === 'B'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                              : item.category === 'C'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Official ReRouter External Resources & Session Box */}
          <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
            <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Official ReRouter Links
            </div>
            <a
              href={OFFICIAL_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-sky-400 hover:bg-slate-900 transition-colors"
            >
              <span>📖 Documentation</span>
              <span className="font-mono text-[10px] text-slate-500">
                /docs ↗
              </span>
            </a>
            <a
              href={OFFICIAL_BILLING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-emerald-400 hover:bg-slate-900 transition-colors"
            >
              <span>💳 Billing & Credits</span>
              <span className="font-mono text-[10px] text-slate-500">
                /billing ↗
              </span>
            </a>
            {isConnected && (
              <button
                type="button"
                onClick={() => disconnect()}
                className="w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 border border-rose-800/70 transition-colors"
              >
                <span>⏻ Disconnect API Key</span>
              </button>
            )}
          </div>
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {/* Status / Error Notification Toast */}
          {notification && (
            <div
              className={`rounded-lg px-4 py-2.5 text-xs font-mono flex flex-wrap items-center justify-between gap-3 border ${
                notification.type === 'error'
                  ? 'bg-rose-950/70 text-rose-200 border-rose-800'
                  : notification.type === 'warning'
                    ? 'bg-amber-950/70 text-amber-200 border-amber-700'
                    : notification.type === 'success'
                      ? 'bg-emerald-950/60 text-emerald-200 border-emerald-800'
                      : 'bg-slate-900 text-slate-200 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {isLoading && (
                  <span className="inline-block h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
                )}
                <span>{notification.message}</span>
              </div>
              <div className="flex items-center gap-2">
                {notification.allowManualRetry && lastRetryParams && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => void executeEndpointTest(lastRetryParams)}
                    className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-sans font-semibold text-xs"
                  >
                    ↻ Retry Request
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setNotification(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Section 1: Overview */}
          {activeSection === 'overview' && (
            <OverviewPanel
              configStatus={configStatus}
              catalogAnalysis={catalogAnalysis}
              testResults={testResults}
              activeAuthFormat={activeAuthFormat}
              onChangeAuthFormat={handleAuthFormatChange}
              onRunSafeSuite={handleRunSafeSuite}
              onRefreshModels={() => fetchModelsCatalog(activeAuthFormat)}
              onNavigateSection={setActiveSection}
              isLoading={isLoading}
            />
          )}

          {/* Section 2: Model Catalog */}
          {activeSection === 'model-catalog' && (
            <ModelCatalogPanel
              catalogAnalysis={catalogAnalysis}
              modelsTestResult={modelsTestResult}
              embeddingTestResults={testResults.filter(
                (r) => r.endpointId === 'embeddings'
              )}
              onRefreshModels={() => fetchModelsCatalog(activeAuthFormat)}
              onExecuteEmbeddingDimensionTest={async (modelId) => {
                await executeEndpointTest({
                  endpointId: 'embeddings',
                  selectedModelId: modelId,
                  customBodyRaw: JSON.stringify(
                    {
                      model: modelId,
                      input: ['ReRouter embedding dimension verification'],
                    },
                    null,
                    2
                  ),
                });
              }}
              isLoading={isLoading}
            />
          )}

          {/* Section 3: Chat Completions (TEST 2) */}
          {activeSection === 'chat-completions' && (
            <EndpointTestPanel
              key={`chat-completions-${endpointPanelKeyPrefix}`}
              primaryEndpointId="chat-completions"
              catalogAnalysis={catalogAnalysis}
              testResults={testResults}
              defaultAuthFormat={activeAuthFormat}
              onExecuteTest={async (p) => {
                await executeEndpointTest(p);
              }}
              isLoading={isLoading}
            />
          )}

          {/* Section 4: Streaming Chat Completions (TEST 3) */}
          {activeSection === 'streaming' && (
            <EndpointTestPanel
              key={`chat-completions-stream-${endpointPanelKeyPrefix}`}
              primaryEndpointId="chat-completions-stream"
              catalogAnalysis={catalogAnalysis}
              testResults={testResults}
              defaultAuthFormat={activeAuthFormat}
              onExecuteTest={async (p) => {
                await executeEndpointTest(p);
              }}
              isLoading={isLoading}
            />
          )}

          {/* Section 5: Responses API (TEST 4: Non-Streaming + Streaming) */}
          {activeSection === 'responses' && (
            <EndpointTestPanel
              key={`responses-${endpointPanelKeyPrefix}`}
              primaryEndpointId="responses"
              secondaryEndpointId="responses-stream"
              catalogAnalysis={catalogAnalysis}
              testResults={testResults}
              defaultAuthFormat={activeAuthFormat}
              onExecuteTest={async (p) => {
                await executeEndpointTest(p);
              }}
              isLoading={isLoading}
            />
          )}

          {/* Section 6: Anthropic Messages (TEST 5) */}
          {activeSection === 'anthropic-messages' && (
            <EndpointTestPanel
              key={`anthropic-messages-${endpointPanelKeyPrefix}`}
              primaryEndpointId="anthropic-messages"
              catalogAnalysis={catalogAnalysis}
              testResults={testResults}
              defaultAuthFormat="x-api-key"
              onExecuteTest={async (p) => {
                await executeEndpointTest(p);
              }}
              isLoading={isLoading}
            />
          )}

          {/* Section 7: Anthropic Count Tokens (TEST 6: Both Candidates) */}
          {activeSection === 'count-tokens' && (
            <EndpointTestPanel
              key={`count-tokens-${endpointPanelKeyPrefix}`}
              primaryEndpointId="count-tokens-v1"
              secondaryEndpointId="count-tokens-root"
              catalogAnalysis={catalogAnalysis}
              testResults={testResults}
              defaultAuthFormat="x-api-key"
              onExecuteTest={async (p) => {
                await executeEndpointTest(p);
              }}
              isLoading={isLoading}
            />
          )}

          {/* Section 8: Embeddings (TEST 7) */}
          {activeSection === 'embeddings' && (
            <EndpointTestPanel
              key={`embeddings-${endpointPanelKeyPrefix}`}
              primaryEndpointId="embeddings"
              catalogAnalysis={catalogAnalysis}
              testResults={testResults}
              defaultAuthFormat={activeAuthFormat}
              onExecuteTest={async (p) => {
                await executeEndpointTest(p);
              }}
              isLoading={isLoading}
            />
          )}

          {/* Section 9: Decisions API (TEST 8) */}
          {activeSection === 'decisions' && (
            <EndpointTestPanel
              key={`decisions-${endpointPanelKeyPrefix}`}
              primaryEndpointId="decisions"
              catalogAnalysis={catalogAnalysis}
              testResults={testResults}
              defaultAuthFormat={activeAuthFormat}
              onExecuteTest={async (p) => {
                await executeEndpointTest(p);
              }}
              isLoading={isLoading}
            />
          )}

          {/* Section 10: System One API (TEST 9) */}
          {activeSection === 'systemone' && (
            <EndpointTestPanel
              key={`systemone-${endpointPanelKeyPrefix}`}
              primaryEndpointId="systemone"
              catalogAnalysis={catalogAnalysis}
              testResults={testResults}
              defaultAuthFormat={activeAuthFormat}
              onExecuteTest={async (p) => {
                await executeEndpointTest(p);
              }}
              isLoading={isLoading}
            />
          )}

          {/* Section 11: Error Inspector */}
          {activeSection === 'error-inspector' && (
            <ErrorInspectorPanel
              testResults={testResults}
              onExecuteErrorTest={async (endpointId) => {
                await executeEndpointTest({ endpointId });
              }}
              onRunAllSafeErrorTests={handleRunAllSafeErrorTests}
              isLoading={isLoading}
            />
          )}

          {/* Section 12: Rate Limits */}
          {activeSection === 'rate-limits' && (
            <RateLimitPanel testResults={testResults} />
          )}

          {/* Section 13: Credit & Truncation */}
          {activeSection === 'credit-truncation' && (
            <CreditTruncationPanel
              catalogAnalysis={catalogAnalysis}
              testResults={testResults}
              onExecuteTokenLimitTest={async (modelId) => {
                await executeEndpointTest({
                  endpointId: 'token-limit-test',
                  selectedModelId: modelId,
                });
              }}
              onExecuteCreditLimitTest={async (p) => {
                const payload = {
                  model: p.modelId,
                  messages: [
                    {
                      role: 'user',
                      content:
                        'Write a detailed explanation of distributed consensus algorithms.',
                    },
                  ],
                  max_tokens: p.maxTokens,
                  stream: p.stream,
                };
                await executeEndpointTest({
                  endpointId: 'credit-limit-test',
                  selectedModelId: p.modelId,
                  customBodyRaw: JSON.stringify(payload, null, 2),
                  dedicatedLowCreditKey: p.dedicatedLowCreditKey,
                  confirmLowCreditTest: true,
                });
              }}
              isLoading={isLoading}
            />
          )}

          {/* Section 14: Model Changes */}
          {activeSection === 'model-changes' && (
            <ModelChangesPanel
              catalogAnalysis={catalogAnalysis}
              rawCatalogObject={rawCatalogObject}
              snapshots={snapshots}
              testResults={testResults}
              onCaptureSnapshot={(customLabel) => {
                if (!rawCatalogObject || !catalogAnalysis) return;
                const now = new Date().toISOString();
                const newSnap: CatalogSnapshot = {
                  id: `snap-${now}-${snapshots.length + 1}`,
                  label:
                    customLabel ||
                    `Snapshot #${snapshots.length + 1} (${new Date(
                      now
                    ).toLocaleTimeString()})`,
                  timestamp: now,
                  totalModels: catalogAnalysis.totalModels,
                  rawCatalog: rawCatalogObject,
                };
                setSnapshots((prev) => [...prev, newSnap]);
                setNotification({
                  type: 'success',
                  message: `Captured catalog snapshot: ${newSnap.label}`,
                });
              }}
              onImportSnapshot={(snap) => {
                setSnapshots((prev) => [...prev, snap]);
                setNotification({
                  type: 'success',
                  message: `Imported snapshot: ${snap.label}`,
                });
              }}
              onExecuteClaudeAliasTest={async (aliasModelId) => {
                await executeEndpointTest({
                  endpointId: 'claude-alias-test',
                  authFormat: 'x-api-key',
                  selectedModelId: aliasModelId,
                  customBodyRaw: JSON.stringify(
                    {
                      model: aliasModelId,
                      max_tokens: 16,
                      messages: [
                        {
                          role: 'user',
                          content: 'Reply with: Alias test.',
                        },
                      ],
                    },
                    null,
                    2
                  ),
                });
              }}
              isLoading={isLoading}
            />
          )}

          {/* Section 15: Privacy */}
          {activeSection === 'privacy' && <PrivacyPanel />}

          {/* Section 16: Test Reports */}
          {activeSection === 'test-reports' && (
            <TestReportsPanel
              configStatus={configStatus}
              activeAuthFormat={activeAuthFormat}
              catalogAnalysis={catalogAnalysis}
              testResults={testResults}
            />
          )}
        </main>
      </div>
    </div>
  );
}
