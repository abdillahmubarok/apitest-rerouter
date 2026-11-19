'use client';

import React, { useState } from 'react';
import {
  DEFAULT_PRIVACY_QUESTIONS,
  generatePrivacyQuestionsMarkdown,
} from '@/lib/rerouter/report';
import type { PrivacyQuestionItem } from '@/lib/rerouter/types';

export function PrivacyPanel() {
  const [questions, setQuestions] = useState<PrivacyQuestionItem[]>(
    DEFAULT_PRIVACY_QUESTIONS
  );
  const [copied, setCopied] = useState(false);

  const markdown = generatePrivacyQuestionsMarkdown(questions);

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'REROUTER_PRIVACY_QUESTIONS.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore
    }
  };

  const handleStatusChange = (
    id: number,
    status: PrivacyQuestionItem['status']
  ) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status } : q))
    );
  };

  const handleNotesChange = (id: number, notes: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, notes } : q))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100">
            Privacy, BYOK Session Architecture & Upstream Data Retention
          </h2>
          <p className="text-xs text-slate-400">
            Clear separation between this Playground&apos;s verified no-database
            architecture and ReRouter / upstream provider data-handling policies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            {copied ? '✓ Copied Markdown' : 'Copy Questionnaire Markdown'}
          </button>
          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            ⬇ Download REROUTER_PRIVACY_QUESTIONS.md
          </button>
        </div>
      </div>

      {/* Explicit Separation: This Playground's Behavior vs ReRouter & Upstream Provider Behavior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Column 1: This Playground's Verified Behavior */}
        <div className="rounded-xl border border-emerald-800/80 bg-emerald-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-emerald-300">
              1. This Playground&apos;s Behavior (Verified in Code)
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
              VERIFIED
            </span>
          </div>
          <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside leading-relaxed">
            <li>
              <strong className="text-slate-100">No Database & No Accounts:</strong>{' '}
              This application does not use any database, user registration, or
              server-side session store.
            </li>
            <li>
              <strong className="text-slate-100">
                Strictly In-Memory API Key State:
              </strong>{' '}
              Your ReRouter API key is held exclusively in React in-memory state
              during your active page session. It is never written to persistent
              browser web storage, IndexedDB, or cookies.
            </li>
            <li>
              <strong className="text-slate-100">
                Per-Request Server-Side Proxy Forwarding:
              </strong>{' '}
              Each test request sends your key in request headers to this
              application&apos;s Next.js Route Handler solely to authenticate
              that individual request with{' '}
              <code className="font-mono text-sky-400">
                https://rerouter.mubarokah.com/v1
              </code>
              .
            </li>
            <li>
              <strong className="text-slate-100">
                Zero Credential Logging & Redacted Exports:
              </strong>{' '}
              Application code does not log API keys or prompts, and all UI
              request headers and downloadable session reports redact your key
              automatically.
            </li>
            <li>
              <strong className="text-slate-100">
                Disconnect & Refresh Behavior:
              </strong>{' '}
              Clicking <strong>Disconnect</strong> or refreshing the browser tab
              immediately purges your API key and session request history from
              React memory.
            </li>
            <li>
              <strong className="text-slate-100">
                Browser Developer Tools Transparency:
              </strong>{' '}
              Because your browser sends your key to the same-origin proxy for
              each test, you can inspect your own requests in your browser&apos;s
              Developer Tools. The security model prevents disclosure to other
              visitors, permanent storage, server logs, and third-party
              services.
            </li>
          </ul>
        </div>

        {/* Column 2: ReRouter and Upstream Provider Behavior */}
        <div className="rounded-xl border border-amber-800/80 bg-amber-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-300">
              2. ReRouter & Upstream Provider Behavior
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-amber-950 text-amber-300 border border-amber-700">
              PROVIDER CONFIRMATION REQUIRED
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The fact that this Playground has no database does{' '}
            <strong className="text-white">not</strong> imply that the entire
            end-to-end API route is zero-retention. Once a request is forwarded
            to <code className="font-mono">rerouter.mubarokah.com</code> and
            its downstream model providers, the following matters are governed
            by provider policies and cannot be verified by HTTP API inspection:
          </p>
          <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
            <li>
              <strong className="text-slate-100">Prompt & Completion Retention:</strong>{' '}
              Whether ReRouter stores incoming prompts or generated outputs.
            </li>
            <li>
              <strong className="text-slate-100">Logging Duration:</strong>{' '}
              How long request payloads, metadata, or failed request traces are
              kept.
            </li>
            <li>
              <strong className="text-slate-100">Data Residency:</strong>{' '}
              Jurisdiction and cloud infrastructure where requests are
              processed.
            </li>
            <li>
              <strong className="text-slate-100">
                Third-Party Sub-Processor Policies:
              </strong>{' '}
              Upstream data handling across the 13+ model families exposed in{' '}
              <code className="font-mono">/v1/models</code>.
            </li>
            <li>
              <strong className="text-slate-100">
                Model Training & Zero Data Retention (ZDR):
              </strong>{' '}
              Whether prompts/outputs are excluded from training or eligible
              for ZDR.
            </li>
          </ul>
        </div>
      </div>

      {/* Synthetic Test Data Hygiene Notice */}
      <div className="rounded-xl border border-teal-800/80 bg-teal-950/30 p-3.5 text-xs text-teal-200">
        <strong>Synthetic Data Guarantee:</strong> All default test payloads in
        this Playground use strictly synthetic, non-personal test prompts. Never
        submit sensitive production customer data during API testing unless your
        organization has obtained written data-handling confirmation from the
        provider.
      </div>

      {/* 15 Mandatory Questions Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-950 text-slate-300 font-mono">
              <tr>
                <th className="py-2.5 px-3 border-b border-slate-800 w-10">
                  #
                </th>
                <th className="py-2.5 px-3 border-b border-slate-800">
                  Upstream Provider Privacy & Data Retention Question
                </th>
                <th className="py-2.5 px-3 border-b border-slate-800 w-56">
                  Status
                </th>
                <th className="py-2.5 px-3 border-b border-slate-800">
                  Evidence Source
                </th>
                <th className="py-2.5 px-3 border-b border-slate-800">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {questions.map((q) => (
                <tr key={q.id} className="hover:bg-slate-950/60">
                  <td className="py-2.5 px-3 font-mono text-slate-400">
                    {q.id}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-100">
                    {q.question}
                  </td>
                  <td className="py-2.5 px-3">
                    <select
                      value={q.status}
                      onChange={(e) =>
                        handleStatusChange(
                          q.id,
                          e.target.value as PrivacyQuestionItem['status']
                        )
                      }
                      className={`w-full px-2 py-1 rounded text-xs font-mono border ${
                        q.status === 'Verified'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          : q.status === 'Unverified'
                            ? 'bg-rose-950 text-rose-300 border-rose-700'
                            : 'bg-amber-950 text-amber-300 border-amber-700'
                      }`}
                    >
                      <option value="Requires Provider Confirmation">
                        Requires Provider Confirmation
                      </option>
                      <option value="Unverified">Unverified</option>
                      <option value="Verified">Verified</option>
                    </select>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                    {q.evidenceSource}
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={q.notes}
                      onChange={(e) => handleNotesChange(q.id, e.target.value)}
                      className="w-full px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Markdown Preview */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Preview: REROUTER_PRIVACY_QUESTIONS.md
        </div>
        <pre className="p-3 rounded bg-slate-900/90 text-xs font-mono text-slate-200 overflow-auto max-h-96 whitespace-pre-wrap">
          {markdown}
        </pre>
      </div>
    </div>
  );
}
