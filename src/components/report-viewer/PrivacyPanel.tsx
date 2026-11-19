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
            Privacy & Data Retention — Provider Confirmation Required
          </h2>
          <p className="text-xs text-slate-400">
            Data retention, logging scope, and sub-processor policies cannot be
            verified via HTTP headers alone. All 15 items below must be
            confirmed in writing by Mubarokah Digital.
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

      {/* Synthetic Test Data Hygiene Notice */}
      <div className="rounded-xl border border-teal-800/80 bg-teal-950/30 p-3.5 text-xs text-teal-200">
        <strong>Synthetic Data Guarantee:</strong> All test payloads in this
        console use strictly synthetic, non-personal test prompts. Never submit
        real customer data during API verification.
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
                  Privacy & Data Retention Question
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
