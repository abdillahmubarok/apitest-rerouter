'use client';

import React, { useMemo, useState } from 'react';
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
    <div className="space-y-6">
      {/* Header & Download Actions */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100">
            In-Memory Session Test Reports & Evidence Exporter
          </h2>
          <p className="text-xs text-slate-400">
            Generate and download reports directly to your device from your
            current in-memory session. All API keys and Authorization headers
            are automatically redacted.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyReport}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            {copiedReport ? '✓ Copied Report' : 'Copy Report Markdown'}
          </button>
          <button
            type="button"
            onClick={handleDownloadMarkdownReport}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            ⬇ Download Session Report (.md)
          </button>
          <button
            type="button"
            onClick={handleDownloadJsonResults}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            ⬇ Download Session JSON (.json)
          </button>
          <button
            type="button"
            onClick={handleDownloadPrivacyQuestions}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            ⬇ Download Privacy Questionnaire (.md)
          </button>
        </div>
      </div>

      {/* Session Isolation & Redaction Notice */}
      <div className="rounded-xl border border-indigo-800/70 bg-indigo-950/25 p-3.5 text-xs text-slate-300 space-y-1">
        <div className="font-semibold text-indigo-300">
          Session Isolation & Historical Documentation Distinction:
        </div>
        <p className="leading-relaxed">
          The report previewed below is dynamically compiled from the{' '}
          <strong>{testResults.length} request(s)</strong> executed in your
          current in-memory browser session using your own API key. It is never
          written to server disk, database, or persistent browser storage, and
          is cleared when you click <strong>Disconnect</strong> or refresh the
          tab.
        </p>
      </div>

      {/* Live Markdown Report Viewer */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Live Session Report Preview: REROUTER_SESSION_TEST_REPORT.md (
            {testResults.length} Executed Tests Included)
          </span>
          <span className="text-xs font-mono text-emerald-400">
            Credentials Redacted: Verified
          </span>
        </div>
        <pre className="p-4 rounded-lg bg-slate-900/90 text-xs font-mono text-slate-200 overflow-auto max-h-[700px] whitespace-pre-wrap leading-relaxed">
          {reportMarkdown}
        </pre>
      </div>
    </div>
  );
}
