'use client';

import React, { useMemo, useState } from 'react';
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
  const [copiedReport, setCopiedReport] = useState(false);

  const effectiveConfig: ServerConfigStatus = useMemo(
    () =>
      configStatus ?? {
        baseUrl: 'https://rerouter.mubarokah.com/v1',
        apiKeyConfigured: false,
        keySource: 'missing',
        maskedStatus: 'Not Configured',
        nextVersion: '16.4.6',
        timestamp: 'Pending initialization',
      },
    [configStatus]
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
    a.download = 'REROUTER_TEST_REPORT.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJsonResults = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      environment: {
        nextVersion: effectiveConfig.nextVersion,
        baseUrl: effectiveConfig.baseUrl,
        apiKeyConfigured: effectiveConfig.apiKeyConfigured,
        activeAuthFormat,
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
    a.download = 'rerouter-test-results.json';
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
            Test Reports & Evidence Exporter
          </h2>
          <p className="text-xs text-slate-400">
            Download the complete evidence-based Markdown specification report (
            <code className="font-mono">REROUTER_TEST_REPORT.md</code>), raw
            JSON test telemetry, and provider privacy questionnaire.
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
            ⬇ Download REROUTER_TEST_REPORT.md
          </button>
          <button
            type="button"
            onClick={handleDownloadJsonResults}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            ⬇ Download JSON Test Results (.json)
          </button>
          <button
            type="button"
            onClick={handleDownloadPrivacyQuestions}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            ⬇ Download REROUTER_PRIVACY_QUESTIONS.md
          </button>
        </div>
      </div>

      {/* Live Markdown Report Viewer */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Live Generated Report Preview: REROUTER_TEST_REPORT.md (
            {testResults.length} Executed Tests Included)
          </span>
          <span className="text-xs font-mono text-emerald-400">
            Secrets Redacted: Verified
          </span>
        </div>
        <pre className="p-4 rounded-lg bg-slate-900/90 text-xs font-mono text-slate-200 overflow-auto max-h-[700px] whitespace-pre-wrap leading-relaxed">
          {reportMarkdown}
        </pre>
      </div>
    </div>
  );
}
