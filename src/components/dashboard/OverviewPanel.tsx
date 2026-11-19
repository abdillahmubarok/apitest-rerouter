'use client';

import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CreditCard,
  ExternalLink,
  Loader2,
  LogOut,
  Play,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { RerouterLogo } from '@/components/brand/RerouterLogo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  OFFICIAL_BILLING_URL,
  OFFICIAL_DOCS_URL,
  useRerouterSession,
} from '@/context/RerouterSessionContext';
import { formatRequestCost } from '@/lib/format/pricing';
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

  let connectionStatusLabel = `STATE: ${connectionState}`;
  let connectionStatusColor = 'text-muted-foreground';
  if (isConnected && lastSuccessfulRequest) {
    connectionStatusLabel = `CONNECTED (${lastSuccessfulRequest.method} ${lastSuccessfulRequest.exactUrl.replace(
      'https://rerouter.mubarokah.com',
      ''
    )} → HTTP ${lastSuccessfulRequest.httpStatus})`;
    connectionStatusColor = 'text-emerald-700 dark:text-emerald-400';
  } else if (isConnected) {
    connectionStatusLabel =
      'CONNECTED (Verified via POST /v1/messages/count_tokens)';
    connectionStatusColor = 'text-emerald-700 dark:text-emerald-400';
  } else if (latestResult && latestResult.httpStatus > 0) {
    connectionStatusLabel = `REACHABLE (HTTP ${latestResult.httpStatus})`;
    connectionStatusColor = 'text-amber-700 dark:text-amber-400';
  } else if (latestResult && latestResult.httpStatus === 0) {
    connectionStatusLabel = `CONNECTION ERROR (${
      latestResult.networkError || 'Network unreachable'
    })`;
    connectionStatusColor = 'text-red-700 dark:text-red-400';
  }

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
  let authStatusColor = isConnected
    ? 'text-emerald-700 dark:text-emerald-400'
    : 'text-amber-700 dark:text-amber-400';
  if (verifiedAuthSuccess) {
    authStatusLabel = `VERIFIED (HTTP ${verifiedAuthSuccess.httpStatus} on ${verifiedAuthSuccess.label})`;
    authStatusColor = 'text-emerald-700 dark:text-emerald-400';
  } else if (authRejected) {
    authStatusLabel = `REJECTED (HTTP ${authRejected.httpStatus}: ${
      authRejected.errorAnalysis?.readableMessage || 'Authentication failed'
    })`;
    authStatusColor = 'text-red-700 dark:text-red-400';
  }

  return (
    <div className="space-y-4">
      {/* BYOK Session & Balance Transparency Bar */}
      <div className="rounded-md border border-border bg-card p-3.5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <Badge variant={isConnected ? 'success' : 'warning'}>
              <ShieldCheck className="h-3 w-3" />
              <span>
                {isConnected ? 'BYOK SESSION ACTIVE' : 'NOT CONNECTED'}
              </span>
            </Badge>
            <Badge variant="secondary">
              Storage: React In-Memory Only (No DB / No Browser Storage)
            </Badge>
            <Badge
              variant={
                balanceState === 'BALANCE_EMPTY' ? 'destructive' : 'outline'
              }
            >
              Balance:{' '}
              {balanceState === 'BALANCE_EMPTY'
                ? 'EMPTY (HTTP 402)'
                : 'UNKNOWN / NOT AVAILABLE'}
            </Badge>
            {lastVerifiedAt && (
              <span className="text-[11px] text-muted-foreground">
                Verified at {new Date(lastVerifiedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {balanceNote}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button asChild variant="outline" size="sm">
            <a
              href={OFFICIAL_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Official Docs</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a
              href={OFFICIAL_BILLING_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>ReRouter Billing</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </Button>
          {isConnected && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => disconnect()}
              className="hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Disconnect Session</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Telemetry & Controls Workbench Container */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        {/* Top Controls Header */}
        <div className="p-4 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <RerouterLogo
              size="md"
              showWordmark={false}
              className="mt-0.5"
            />
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Live Verification & Telemetry Overview
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                All metrics are populated strictly from live HTTP responses
                executed during your current in-memory session via same-origin
                Next.js Route Handlers.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
              <span className="px-2 text-[11px] text-muted-foreground">
                Default Auth:
              </span>
              <Button
                type="button"
                size="sm"
                variant={activeAuthFormat === 'bearer' ? 'default' : 'ghost'}
                onClick={() => onChangeAuthFormat('bearer')}
                className="h-6 px-2 font-mono text-[11px]"
              >
                Authorization: Bearer
              </Button>
              <Button
                type="button"
                size="sm"
                variant={
                  activeAuthFormat === 'x-api-key' ? 'default' : 'ghost'
                }
                onClick={() => onChangeAuthFormat('x-api-key')}
                className="h-6 px-2 font-mono text-[11px]"
              >
                x-api-key
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefreshModels}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
              />
              <span>Refresh GET /v1/models</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={onRunSafeSuite}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Executing Safe Tests...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Run All Category A Safe Tests</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 10 Mandatory Dashboard Metrics Divided Grid (No nested cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border border-b border-border">
          <div className="p-3.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              1. Connection Status
            </div>
            <div
              className={`font-mono text-xs font-medium mt-1 leading-snug ${connectionStatusColor}`}
            >
              {connectionStatusLabel}
            </div>
          </div>

          <div className="p-3.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              2. API Authentication Status
            </div>
            <div
              className={`font-mono text-xs font-medium mt-1 leading-snug ${authStatusColor}`}
            >
              {authStatusLabel}
            </div>
          </div>

          <div className="p-3.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              3. Base URL
            </div>
            <div className="font-mono text-xs text-sky-700 dark:text-sky-400 mt-1 break-all">
              {configStatus?.baseUrl ?? 'https://rerouter.mubarokah.com/v1'}
            </div>
          </div>

          <div className="p-3.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              4. BYOK In-Memory Key
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge variant={isConnected ? 'success' : 'warning'}>
                {isConnected ? 'Active' : 'Disconnected'}
              </Badge>
              <span className="text-[11px] text-muted-foreground truncate">
                in-memory only
              </span>
            </div>
          </div>

          <div className="p-3.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              5. Last Successful Request
            </div>
            <div className="font-mono text-xs text-foreground mt-1">
              {lastSuccessfulRequest ? (
                <div>
                  <div className="text-emerald-700 dark:text-emerald-400 truncate">
                    {lastSuccessfulRequest.method}{' '}
                    {lastSuccessfulRequest.exactUrl.replace(
                      'https://rerouter.mubarokah.com',
                      ''
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(
                      lastSuccessfulRequest.timestamp
                    ).toLocaleTimeString()}{' '}
                    ({lastSuccessfulRequest.durationMs} ms)
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground">None observed yet</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="p-3.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              6. Total Tests Executed
            </div>
            <div className="font-mono text-xl font-semibold text-foreground mt-1">
              {totalTests}
            </div>
          </div>

          <div className="p-3.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              7. Successful Tests (2xx)
            </div>
            <div className="font-mono text-xl font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
              {successfulTests}
            </div>
          </div>

          <div className="p-3.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              8. Failed / Error Tests
            </div>
            <div className="font-mono text-xl font-semibold text-red-700 dark:text-red-400 mt-1 flex items-baseline gap-1.5">
              <span>{failedTests}</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                (incl. negative 4xx)
              </span>
            </div>
          </div>

          <div className="p-3.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              9. Latest HTTP Status
            </div>
            <div className="mt-1.5">
              {latestResult ? (
                <HttpStatusBadge
                  status={latestResult.httpStatus}
                  statusText={latestResult.statusText}
                />
              ) : (
                <span className="font-mono text-xs text-muted-foreground">
                  N/A
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              10. Latest Usage Cost
            </div>
            <div className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-1.5">
              {latestWithCost
                ? `${formatRequestCost(latestWithCost.usageAndCost.costValue)} (${latestWithCost.usageAndCost.costPath})`
                : formatRequestCost(undefined)}
            </div>
          </div>
        </div>
      </div>

      {/* Discovered Live Model Catalog Summary */}
      {catalogAnalysis && (
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-foreground">
                  Live Model Catalog Snapshot Summary
                </h3>
                <HttpMethodBadge method="GET" />
                <code className="font-mono text-xs text-foreground">
                  /v1/models
                </code>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Discovered {catalogAnalysis.totalModels} models across{' '}
                {catalogAnalysis.modesFound.length} modes and{' '}
                {catalogAnalysis.providersFound.length} provider groups.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onNavigateSection('model-catalog')}
            >
              <span>Open Full Model Catalog Inspector</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border font-mono text-xs">
            <div className="p-3.5">
              <div className="text-[11px] text-muted-foreground">
                Chat Models
              </div>
              <div className="text-lg font-semibold text-foreground mt-0.5">
                {catalogAnalysis.chatModels.length}
              </div>
              <div className="text-[11px] text-muted-foreground">
                mode = &quot;chat&quot;
              </div>
            </div>
            <div className="p-3.5">
              <div className="text-[11px] text-muted-foreground">
                Embedding Models
              </div>
              <div className="text-lg font-semibold text-foreground mt-0.5">
                {catalogAnalysis.embeddingModels.length}
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-400">
                Catalog dimensions: NOT PROVIDED
              </div>
            </div>
            <div className="p-3.5">
              <div className="text-[11px] text-muted-foreground">
                Decision Models
              </div>
              <div className="text-lg font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                {catalogAnalysis.decisionModels.length}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {catalogAnalysis.decisionModels.map((m) => m.modelId).join(', ')}
              </div>
            </div>
            <div className="p-3.5">
              <div className="text-[11px] text-muted-foreground">
                Discovered Capability Keys
              </div>
              <div className="text-xs font-semibold text-sky-700 dark:text-sky-400 mt-1">
                supports_vision, supports_reasoning
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Pricing: pricing.prompt / completion
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Execution Log Table */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 bg-muted/20 border-b border-border flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-foreground">
            Executed API Requests in Current In-Memory Session (
            {testResults.length})
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onNavigateSection('test-reports')}
            className="h-7 px-2 text-xs"
          >
            <span>View & Download Session Test Report</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {testResults.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
            <div>
              No API tests executed yet in this session. Click{' '}
              <strong>Run All Category A Safe Tests</strong> above or select an
              endpoint from the sidebar.
            </div>
            <div>
              Need reference examples? Visit{' '}
              <a
                href={OFFICIAL_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline hover:opacity-80"
              >
                ReRouter Official Documentation
              </a>
            </div>
          </div>
        ) : (
          <Table className="font-mono">
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Cat</TableHead>
                <TableHead>Test Label</TableHead>
                <TableHead>Method & URL</TableHead>
                <TableHead>HTTP Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Usage Cost</TableHead>
                <TableHead>Summary / Error Classification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testResults.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={r.category} label={r.category} />
                  </TableCell>
                  <TableCell className="font-sans font-medium text-foreground">
                    {r.label}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <HttpMethodBadge method={r.method} />
                      <span className="text-foreground">{r.exactUrl}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <HttpStatusBadge status={r.httpStatus} showPrefix={false} />
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {r.durationMs} ms
                  </TableCell>
                  <TableCell className="text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    {formatRequestCost(r.usageAndCost.costValue)}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {r.errorAnalysis
                      ? `${r.errorAnalysis.errorCategoryLabel}: ${r.errorAnalysis.readableMessage}`
                      : r.endpointId === 'models'
                        ? 'Model catalog fetched'
                        : r.finishReason
                          ? `finish_reason: ${r.finishReason}`
                          : 'Completed'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
