'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CreditTruncationPanel } from './CreditTruncationPanel';
import { OverviewPanel } from './OverviewPanel';
import { EndpointTestPanel } from '@/components/endpoint-tester/EndpointTestPanel';
import { ErrorInspectorPanel } from '@/components/error-inspector/ErrorInspectorPanel';
import { ModelCatalogPanel } from '@/components/model-catalog/ModelCatalogPanel';
import { ModelChangesPanel } from '@/components/model-catalog/ModelChangesPanel';
import { RateLimitPanel } from '@/components/rate-limit-inspector/RateLimitPanel';
import { PrivacyPanel } from '@/components/report-viewer/PrivacyPanel';
import { TestReportsPanel } from '@/components/report-viewer/TestReportsPanel';
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
    badge: '15 Qs',
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

export function RerouterInspectorConsole() {
  const [activeSection, setActiveSection] =
    useState<SidebarSectionId>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [configStatus, setConfigStatus] = useState<ServerConfigStatus | null>(
    null
  );
  const [activeAuthFormat, setActiveAuthFormat] =
    useState<AuthFormat>('bearer');
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
  const [notification, setNotification] = useState<{
    type: 'info' | 'error' | 'success';
    message: string;
  } | null>(null);

  const appendResult = useCallback((result: TestExecutionResult) => {
    setTestResults((prev) => [result, ...prev]);
  }, []);

  const fetchModelsCatalog = useCallback(
    async (authFormat: AuthFormat = activeAuthFormat) => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/rerouter/models?authFormat=${encodeURIComponent(authFormat)}`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (data.configStatus) {
          setConfigStatus(data.configStatus);
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
    [activeAuthFormat, appendResult]
  );

  // Automatically request GET /v1/models on load (Section 3.B & TEST 1)
  useEffect(() => {
    void fetchModelsCatalog('bearer');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const executeEndpointTest = useCallback(
    async (params: {
      endpointId: EndpointId;
      authFormat?: AuthFormat;
      customBodyRaw?: string;
      selectedModelId?: string;
      dedicatedLowCreditKey?: string;
      confirmLowCreditTest?: boolean;
    }): Promise<TestExecutionResult | null> => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/rerouter/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpointId: params.endpointId,
            authFormat: params.authFormat ?? activeAuthFormat,
            customBodyRaw: params.customBodyRaw,
            selectedModelId: params.selectedModelId,
            dedicatedLowCreditKey: params.dedicatedLowCreditKey,
            confirmLowCreditTest: params.confirmLowCreditTest,
          }),
        });
        const data = await res.json();
        if (data.configStatus) {
          setConfigStatus(data.configStatus);
        }
        if (data.testResult) {
          const result: TestExecutionResult = data.testResult;
          appendResult(result);
          setNotification({
            type: result.ok ? 'success' : 'info',
            message: `${result.label} → HTTP ${result.httpStatus} (${result.durationMs} ms)`,
          });
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
    [activeAuthFormat, appendResult]
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
      apiKeyConfigured: false,
      keySource: 'missing',
      maskedStatus: 'Not Configured',
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
    a.download = 'REROUTER_TEST_REPORT.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
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
                  ReRouter API Inspector
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono rounded bg-slate-900 text-sky-400 border border-slate-800">
                  Next.js 16.4.6
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Target:{' '}
                <span className="text-slate-300">
                  {configStatus?.baseUrl ??
                    'https://rerouter.mubarokah.com/v1'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Live Key Configuration Status Pill */}
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-mono border flex items-center gap-1.5 ${
              configStatus?.apiKeyConfigured
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                : 'bg-amber-950/80 text-amber-300 border-amber-700'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                configStatus?.apiKeyConfigured
                  ? 'bg-emerald-400'
                  : 'bg-amber-400'
              }`}
            />
            <span>
              API Key: {configStatus?.apiKeyConfigured ? 'Configured' : 'Missing'}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-full text-xs font-mono bg-slate-900 text-slate-300 border border-slate-800">
            Tests Run: <strong>{testResults.length}</strong>
          </div>

          <button
            type="button"
            onClick={handleQuickDownloadReport}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            ⬇ Download Test Report
          </button>
        </div>
      </header>

      {/* Main Content Layout with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside
          className={`${
            mobileMenuOpen ? 'block' : 'hidden'
          } lg:block w-64 shrink-0 border-r border-slate-800 bg-slate-950/90 overflow-y-auto p-3 space-y-1`}
        >
          <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Verification Sections (16)
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
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {/* Status / Error Notification Toast */}
          {notification && (
            <div
              className={`rounded-lg px-4 py-2.5 text-xs font-mono flex items-center justify-between gap-3 border ${
                notification.type === 'error'
                  ? 'bg-rose-950/70 text-rose-200 border-rose-800'
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
              <button
                type="button"
                onClick={() => setNotification(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {/* Section 1: Overview */}
          {activeSection === 'overview' && (
            <OverviewPanel
              configStatus={configStatus}
              catalogAnalysis={catalogAnalysis}
              testResults={testResults}
              activeAuthFormat={activeAuthFormat}
              onChangeAuthFormat={setActiveAuthFormat}
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
