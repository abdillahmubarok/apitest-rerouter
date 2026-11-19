'use client';

import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileJson,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  OFFICIAL_BILLING_URL,
  OFFICIAL_DOCS_URL,
  useRerouterSession,
} from '@/context/RerouterSessionContext';
import {
  DEFAULT_PRIVACY_QUESTIONS,
  generatePrivacyQuestionsMarkdown,
  generateTestReportMarkdown,
} from '@/lib/rerouter/report';
import type {
  AuthFormat,
  CatalogAnalysis,
  ServerConfigStatus,
  TestExecutionResult,
} from '@/lib/rerouter/types';

interface TestReportsPanelProps {
  configStatus: ServerConfigStatus | null;
  activeAuthFormat: AuthFormat;
  catalogAnalysis: CatalogAnalysis | null;
  testResults: TestExecutionResult[];
}

export function TestReportsPanel({
  configStatus,
  activeAuthFormat,
  catalogAnalysis,
  testResults,
}: TestReportsPanelProps) {
  const { isConnected } = useRerouterSession();
  const [copiedReport, setCopiedReport] = useState(false);

  const effectiveConfig: ServerConfigStatus = useMemo(
    () =>
      configStatus ?? {
        baseUrl: 'https://rerouter.mubarokah.com/v1',
        docsUrl: OFFICIAL_DOCS_URL,
        billingUrl: OFFICIAL_BILLING_URL,
        productionDomain: 'https://apitest-rerouter.mubarokah.com',
        byokMode: true,
        apiKeyConfigured: isConnected,
        keySource: isConnected ? 'byok-memory' : 'none',
        maskedStatus: isConnected
          ? 'Connected via per-request BYOK in-memory session'
          : 'Not Connected',
        nextVersion: '16.4.6',
        timestamp: new Date().toISOString(),
      },
    [configStatus, isConnected]
  );

  const reportMarkdown = useMemo(
    () =>
      generateTestReportMarkdown({
        configStatus: effectiveConfig,
        activeAuthFormat,
        catalogAnalysis,
        testResults,
        privacyQuestions: DEFAULT_PRIVACY_QUESTIONS,
      }),
    [effectiveConfig, activeAuthFormat, catalogAnalysis, testResults]
  );

  const handleDownloadMarkdownReport = () => {
    const blob = new Blob([reportMarkdown], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'REROUTER_SESSION_TEST_REPORT.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJsonResults = () => {
    const payload = {
      reportType: 'BYOK_IN_MEMORY_SESSION_EXPORT',
      generatedAt: new Date().toISOString(),
      environment: {
        nextVersion: effectiveConfig.nextVersion,
        baseUrl: effectiveConfig.baseUrl,
        byokMode: true,
        storageModel: 'react-in-memory-only',
        activeAuthFormat,
        credentialsRedacted: true,
      },
      catalogSummary: catalogAnalysis
        ? {
            fetchedAt: catalogAnalysis.fetchedAt,
            totalModels: catalogAnalysis.totalModels,
            modesFound: catalogAnalysis.modesFound,
            providersFound: catalogAnalysis.providersFound,
            schemaSummary: catalogAnalysis.schemaSummary,
            prefixAnalysis: catalogAnalysis.prefixAnalysis,
          }
        : null,
      totalTestsExecuted: testResults.length,
      testResults,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rerouter-session-test-results.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPrivacyQuestions = () => {
    const md = generatePrivacyQuestionsMarkdown(DEFAULT_PRIVACY_QUESTIONS);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'REROUTER_PRIVACY_QUESTIONS.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportMarkdown);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 1800);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Download Actions */}
      <div className="rounded-md border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">
                In-Memory Session Test Reports & Evidence Exporter
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate and download reports directly to your device from your
              current in-memory session. All API keys and Authorization headers
              are automatically redacted.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyReport}
            >
              {copiedReport ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Copied Report</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Report Markdown</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDownloadMarkdownReport}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Session Report (.md)</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDownloadJsonResults}
            >
              <FileJson className="h-3.5 w-3.5" />
              <span>Download Session JSON (.json)</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadPrivacyQuestions}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Privacy Questionnaire (.md)</span>
            </Button>
          </div>
        </div>

        {/* Session Isolation & Redaction Notice */}
        <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">
            Session Isolation & Historical Documentation Distinction:
          </strong>{' '}
          The report previewed below is dynamically compiled from the{' '}
          <strong className="text-foreground">
            {testResults.length} request(s)
          </strong>{' '}
          executed in your current in-memory browser session using your own API
          key. It is never written to server disk, database, or persistent
          browser storage, and is cleared when you click{' '}
          <strong className="text-foreground">Disconnect</strong> or refresh the
          tab.
        </div>
      </div>

      {/* Live Markdown Report Viewer */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
          <span className="font-mono text-xs text-foreground font-medium">
            Live Session Report Preview: REROUTER_SESSION_TEST_REPORT.md (
            {testResults.length} Executed Tests Included)
          </span>
          <Badge variant="success">
            <ShieldCheck className="h-3 w-3" />
            <span>Credentials Redacted: Verified</span>
          </Badge>
        </div>
        <pre className="p-4 bg-background/60 text-xs font-mono text-foreground overflow-auto max-h-[700px] whitespace-pre-wrap leading-relaxed">
          {reportMarkdown}
        </pre>
      </div>
    </div>
  );
}
