'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Binary,
  BookOpen,
  Clock,
  Cpu,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  FileText,
  GitBranch,
  GitCompare,
  Hash,
  Layers,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  RotateCcw,
  Scissors,
  ShieldCheck,
  Sun,
  Terminal,
  X,
} from 'lucide-react';
import { CreditTruncationPanel } from './CreditTruncationPanel';
import { OverviewPanel } from './OverviewPanel';
import { RerouterLogo } from '@/components/brand/RerouterLogo';
import { BillingRedirectModal } from '@/components/connection/BillingRedirectModal';
import { ConnectionModal } from '@/components/connection/ConnectionModal';
import { EndpointTestPanel } from '@/components/endpoint-tester/EndpointTestPanel';
import { ErrorInspectorPanel } from '@/components/error-inspector/ErrorInspectorPanel';
import { ModelCatalogPanel } from '@/components/model-catalog/ModelCatalogPanel';
import { ModelChangesPanel } from '@/components/model-catalog/ModelChangesPanel';
import { RateLimitPanel } from '@/components/rate-limit-inspector/RateLimitPanel';
import { PrivacyPanel } from '@/components/report-viewer/PrivacyPanel';
import { TestReportsPanel } from '@/components/report-viewer/TestReportsPanel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HttpMethodBadge } from '@/components/ui/http-badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  group: 'Workspace' | 'Core Endpoints' | 'Diagnostics & Governance';
  icon: React.ComponentType<{ className?: string }>;
  methodBadge?: 'GET' | 'POST';
  tagBadge?: string;
}

const SIDEBAR_ITEMS: SidebarNavItem[] = [
  {
    id: 'overview',
    number: 1,
    label: 'Overview',
    group: 'Workspace',
    icon: LayoutDashboard,
  },
  {
    id: 'model-catalog',
    number: 2,
    label: 'Model Catalog',
    group: 'Workspace',
    icon: Database,
    methodBadge: 'GET',
  },
  {
    id: 'chat-completions',
    number: 3,
    label: 'Chat Completions',
    group: 'Core Endpoints',
    icon: MessageSquare,
    methodBadge: 'POST',
  },
  {
    id: 'streaming',
    number: 4,
    label: 'Streaming',
    group: 'Core Endpoints',
    icon: Activity,
    methodBadge: 'POST',
    tagBadge: 'SSE',
  },
  {
    id: 'responses',
    number: 5,
    label: 'Responses API',
    group: 'Core Endpoints',
    icon: Layers,
    methodBadge: 'POST',
  },
  {
    id: 'anthropic-messages',
    number: 6,
    label: 'Anthropic Messages',
    group: 'Core Endpoints',
    icon: Terminal,
    methodBadge: 'POST',
  },
  {
    id: 'count-tokens',
    number: 7,
    label: 'Count Tokens',
    group: 'Core Endpoints',
    icon: Hash,
    methodBadge: 'POST',
  },
  {
    id: 'embeddings',
    number: 8,
    label: 'Embeddings',
    group: 'Core Endpoints',
    icon: Binary,
    methodBadge: 'POST',
  },
  {
    id: 'decisions',
    number: 9,
    label: 'Decisions',
    group: 'Core Endpoints',
    icon: GitBranch,
    methodBadge: 'POST',
  },
  {
    id: 'systemone',
    number: 10,
    label: 'System One',
    group: 'Core Endpoints',
    icon: Cpu,
    methodBadge: 'POST',
  },
  {
    id: 'error-inspector',
    number: 11,
    label: 'Error Inspector',
    group: 'Diagnostics & Governance',
    icon: AlertTriangle,
    tagBadge: '400-404',
  },
  {
    id: 'rate-limits',
    number: 12,
    label: 'Rate Limits',
    group: 'Diagnostics & Governance',
    icon: Clock,
    tagBadge: 'Headers',
  },
  {
    id: 'credit-truncation',
    number: 13,
    label: 'Credit & Truncation',
    group: 'Diagnostics & Governance',
    icon: Scissors,
    tagBadge: 'Cat C',
  },
  {
    id: 'model-changes',
    number: 14,
    label: 'Model Changes',
    group: 'Diagnostics & Governance',
    icon: GitCompare,
    tagBadge: 'Diffs',
  },
  {
    id: 'privacy',
    number: 15,
    label: 'Privacy',
    group: 'Diagnostics & Governance',
    icon: ShieldCheck,
    tagBadge: '15 Qs',
  },
  {
    id: 'test-reports',
    number: 16,
    label: 'Test Reports',
    group: 'Diagnostics & Governance',
    icon: FileText,
    tagBadge: 'Export',
  },
];

const NAV_GROUPS: Array<SidebarNavItem['group']> = [
  'Workspace',
  'Core Endpoints',
  'Diagnostics & Governance',
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
  const [isDarkTheme, setIsDarkTheme] = useState(true);

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

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDarkTheme);
    }
  }, [isDarkTheme]);

  const toggleTheme = useCallback(() => {
    setIsDarkTheme((prev) => !prev);
  }, []);

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
          message: `${result.errorAnalysis?.errorCategoryLabel ||
            `Service temporarily unavailable (HTTP ${result.httpStatus})`
            }: ${result.errorAnalysis?.readableMessage ||
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
          message: `GET /v1/models completed with HTTP ${data.testResult?.httpStatus ?? res.status
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
  const currentNavItem =
    SIDEBAR_ITEMS.find((item) => item.id === activeSection) ?? SIDEBAR_ITEMS[0];

  const renderSidebarNavigationContent = (onItemSelect?: () => void) => (
    <div className="flex h-full flex-col justify-between">
      {/* Top Sidebar Branding */}
      <div>
        <div className="flex items-center justify-between px-3.5 py-3 border-b border-sidebar-border">
          <RerouterLogo size="md" subtitle="API Playground" />
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            BYOK
          </Badge>
        </div>

        {/* Grouped Navigation Items */}
        <div className="p-2 space-y-3">
          {NAV_GROUPS.map((groupName) => {
            const items = SIDEBAR_ITEMS.filter((i) => i.group === groupName);
            return (
              <div key={groupName} className="space-y-0.5">
                <div className="px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {groupName}
                </div>
                {items.map((item) => {
                  const isActive = activeSection === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveSection(item.id);
                        onItemSelect?.();
                      }}
                      className={`w-full flex items-center justify-between gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors text-left cursor-pointer ${isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                        }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-mono text-[10px] opacity-60 shrink-0">
                          {String(item.number).padStart(2, '0')}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </span>

                      <span className="flex items-center gap-1 shrink-0">
                        {item.methodBadge && (
                          <HttpMethodBadge
                            method={item.methodBadge}
                            className="text-[9px] px-1 py-0"
                          />
                        )}
                        {item.tagBadge && (
                          <span className="rounded border border-border bg-muted px-1 py-0 font-mono text-[9px] text-muted-foreground">
                            {item.tagBadge}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom External Links & Connection Footer */}
      <div className="border-t border-sidebar-border p-2.5 space-y-2 bg-muted/20">
        <div className="space-y-0.5">
          <a
            href={OFFICIAL_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Documentation</span>
            </span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
          <a
            href={OFFICIAL_BILLING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <span className="flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5" />
              <span>Billing & Credits</span>
            </span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span
              className={`h-2 w-2 rounded-full ${isConnected
                ? 'bg-emerald-500'
                : 'bg-amber-500'
                }`}
            />
            <span className="text-[11px] text-foreground font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {isConnected && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => disconnect()}
              className="h-7 px-2 text-[11px]"
            >
              <LogOut className="h-3 w-3" />
              <span>Disconnect</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* BYOK Connection Modal */}
        <ConnectionModal key={`modal-${sessionEpoch}`} />

        {/* Authoritative HTTP 402 Insufficient Credit Redirect Modal */}
        <BillingRedirectModal />

        <div className="flex-1 flex min-h-screen">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground sticky top-0 h-screen">
            <ScrollArea className="h-full">
              {renderSidebarNavigationContent()}
            </ScrollArea>
          </aside>

          {/* Main Column: Top Header + Workspace Viewport */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Compact Developer Workstation Header */}
            <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-xs px-4 py-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Mobile Navigation Sheet */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Open navigation menu"
                      className="lg:hidden h-8 w-8 shrink-0"
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-64">
                    <SheetHeader className="sr-only">
                      <SheetTitle>ReRouter Navigation</SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-full">
                      {renderSidebarNavigationContent(() =>
                        setMobileMenuOpen(false)
                      )}
                    </ScrollArea>
                  </SheetContent>
                </Sheet>

                <div className="lg:hidden">
                  <RerouterLogo size="sm" showWordmark={false} />
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(currentNavItem.number).padStart(2, '0')} /
                  </span>
                  <h1 className="text-sm font-semibold tracking-tight text-foreground truncate">
                    {currentNavItem.label}
                  </h1>
                  <Separator
                    orientation="vertical"
                    className="hidden md:block h-4 mx-1"
                  />
                  <span className="hidden md:inline-block font-mono text-[11px] text-muted-foreground truncate">
                    {configStatus?.baseUrl ??
                      'https://rerouter.mubarokah.com/v1'}
                  </span>
                </div>
              </div>

              {/* Session Telemetry & Header Actions */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant={isConnected ? 'success' : 'warning'}
                  className="gap-1.5"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                  />
                  <span>{isConnected ? 'Connected' : 'Not Connected'}</span>
                </Badge>

                {isConnected && (
                  <Badge variant="secondary">
                    Auth:{' '}
                    {activeAuthFormat === 'x-api-key' ? 'x-api-key' : 'Bearer'}
                  </Badge>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={
                        balanceState === 'BALANCE_EMPTY'
                          ? 'destructive'
                          : 'outline'
                      }
                      className="hidden sm:inline-flex cursor-help"
                    >
                      Balance:{' '}
                      {balanceState === 'BALANCE_EMPTY'
                        ? 'Empty (402)'
                        : 'Unknown'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    ReRouter does not expose a balance inquiry endpoint; balance
                    is monitored passively via authoritative HTTP 402 responses.
                  </TooltipContent>
                </Tooltip>

                <Badge variant="outline">
                  Requests: {testResults.length}
                </Badge>

                <Separator
                  orientation="vertical"
                  className="hidden sm:block h-4 mx-0.5"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label={
                    isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'
                  }
                  className="h-7 w-7"
                >
                  {isDarkTheme ? (
                    <Sun className="h-3.5 w-3.5" />
                  ) : (
                    <Moon className="h-3.5 w-3.5" />
                  )}
                </Button>

                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex h-7 px-2 text-xs"
                >
                  <a
                    href={OFFICIAL_DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Docs</span>
                  </a>
                </Button>

                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex h-7 px-2 text-xs"
                >
                  <a
                    href={OFFICIAL_BILLING_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Billing</span>
                  </a>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleQuickDownloadReport}
                  className="h-7 px-2.5 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Session Report</span>
                </Button>

                {isConnected && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => disconnect()}
                    className="h-7 px-2.5 text-xs hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Disconnect</span>
                  </Button>
                )}
              </div>
            </header>

            {/* Main Viewport */}
            <main className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
              {/* Status / Error Notification Banner */}
              {notification && (
                <Alert
                  variant={
                    notification.type === 'error'
                      ? 'destructive'
                      : notification.type === 'warning'
                        ? 'warning'
                        : notification.type === 'success'
                          ? 'success'
                          : 'default'
                  }
                  className="py-2 flex items-center justify-between gap-3"
                >
                  <AlertDescription className="flex items-center gap-2 font-mono text-xs">
                    {isLoading && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    )}
                    <span>{notification.message}</span>
                  </AlertDescription>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {notification.allowManualRetry && lastRetryParams && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isLoading}
                        onClick={() => void executeEndpointTest(lastRetryParams)}
                        className="h-6 px-2 text-xs"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Retry Request</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Dismiss notification"
                      onClick={() => setNotification(null)}
                      className="h-6 w-6"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Alert>
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
      </div>
    </TooltipProvider>
  );
}
