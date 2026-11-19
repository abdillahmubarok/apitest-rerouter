'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="rounded-md border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Privacy, BYOK Session Architecture & Upstream Data Retention
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Clear separation between this Playground&apos;s verified no-database
            architecture and ReRouter / upstream provider data-handling
            policies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyMarkdown}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Copied Markdown</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Questionnaire Markdown</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleDownloadMarkdown}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download REROUTER_PRIVACY_QUESTIONS.md</span>
          </Button>
        </div>
      </div>

      {/* Explicit Separation: This Playground's Behavior vs ReRouter & Upstream Provider Behavior */}
      <div className="rounded-md border border-border bg-card overflow-hidden grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* Column 1: This Playground's Verified Behavior */}
        <div className="p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-foreground">
              1. This Playground&apos;s Behavior (Verified in Code)
            </h3>
            <Badge variant="success">VERIFIED</Badge>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside leading-relaxed">
            <li>
              <strong className="text-foreground">
                No Database & No Accounts:
              </strong>{' '}
              This application does not use any database, user registration, or
              server-side session store.
            </li>
            <li>
              <strong className="text-foreground">
                Strictly In-Memory API Key State:
              </strong>{' '}
              Your ReRouter API key is held exclusively in React in-memory state
              during your active page session. It is never written to persistent
              browser web storage, IndexedDB, or cookies.
            </li>
            <li>
              <strong className="text-foreground">
                Per-Request Server-Side Proxy Forwarding:
              </strong>{' '}
              Each test request sends your key in request headers to this
              application&apos;s Next.js Route Handler solely to authenticate
              that individual request with{' '}
              <code className="font-mono text-sky-700 dark:text-sky-400">
                https://rerouter.mubarokah.com/v1
              </code>
              .
            </li>
            <li>
              <strong className="text-foreground">
                Zero Credential Logging & Redacted Exports:
              </strong>{' '}
              Application code does not log API keys or prompts, and all UI
              request headers and downloadable session reports redact your key
              automatically.
            </li>
            <li>
              <strong className="text-foreground">
                Disconnect & Refresh Behavior:
              </strong>{' '}
              Clicking <strong>Disconnect</strong> or refreshing the browser tab
              immediately purges your API key and session request history from
              React memory.
            </li>
            <li>
              <strong className="text-foreground">
                Browser Developer Tools Transparency:
              </strong>{' '}
              Because your browser sends your key to the same-origin proxy for
              each test, you can inspect your own requests in your
              browser&apos;s Developer Tools. The security model prevents
              disclosure to other visitors, permanent storage, server logs, and
              third-party services.
            </li>
          </ul>
        </div>

        {/* Column 2: ReRouter and Upstream Provider Behavior */}
        <div className="p-4 space-y-2.5 bg-muted/10">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-foreground">
              2. ReRouter & Upstream Provider Behavior
            </h3>
            <Badge variant="warning">PROVIDER CONFIRMATION REQUIRED</Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The fact that this Playground has no database does{' '}
            <strong className="text-foreground">not</strong> imply that the
            entire end-to-end API route is zero-retention. Once a request is
            forwarded to <code className="font-mono">rerouter.mubarokah.com</code>{' '}
            and its downstream model providers, the following matters are
            governed by provider policies and cannot be verified by HTTP API
            inspection:
          </p>
          <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside leading-relaxed">
            <li>
              <strong className="text-foreground">
                Prompt & Completion Retention:
              </strong>{' '}
              Whether ReRouter stores incoming prompts or generated outputs.
            </li>
            <li>
              <strong className="text-foreground">Logging Duration:</strong> How
              long request payloads, metadata, or failed request traces are
              kept.
            </li>
            <li>
              <strong className="text-foreground">Data Residency:</strong>{' '}
              Jurisdiction and cloud infrastructure where requests are
              processed.
            </li>
            <li>
              <strong className="text-foreground">
                Third-Party Sub-Processor Policies:
              </strong>{' '}
              Upstream data handling across the 13+ model families exposed in{' '}
              <code className="font-mono">/v1/models</code>.
            </li>
            <li>
              <strong className="text-foreground">
                Model Training & Zero Data Retention (ZDR):
              </strong>{' '}
              Whether prompts/outputs are excluded from training or eligible for
              ZDR.
            </li>
          </ul>
        </div>
      </div>

      {/* Synthetic Test Data Hygiene Notice */}
      <Alert variant="info" className="py-2.5">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <AlertDescription className="text-xs">
          <strong>Synthetic Data Guarantee:</strong> All default test payloads
          in this Playground use strictly synthetic, non-personal test prompts.
          Never submit sensitive production customer data during API testing
          unless your organization has obtained written data-handling
          confirmation from the provider.
        </AlertDescription>
      </Alert>

      {/* 15 Mandatory Questions Table */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <h3 className="text-xs font-semibold text-foreground">
            Upstream Provider Privacy & Data Retention Questionnaire (15
            Questions)
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>
                Upstream Provider Privacy & Data Retention Question
              </TableHead>
              <TableHead className="w-56">Status</TableHead>
              <TableHead>Evidence Source</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="font-mono text-muted-foreground">
                  {q.id}
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {q.question}
                </TableCell>
                <TableCell>
                  <NativeSelect
                    value={q.status}
                    onChange={(e) =>
                      handleStatusChange(
                        q.id,
                        e.target.value as PrivacyQuestionItem['status']
                      )
                    }
                    className="h-7 text-xs"
                  >
                    <option value="Requires Provider Confirmation">
                      Requires Provider Confirmation
                    </option>
                    <option value="Unverified">Unverified</option>
                    <option value="Verified">Verified</option>
                  </NativeSelect>
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-[11px]">
                  {q.evidenceSource}
                </TableCell>
                <TableCell>
                  <Input
                    type="text"
                    value={q.notes}
                    onChange={(e) => handleNotesChange(q.id, e.target.value)}
                    className="h-7 text-xs"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Markdown Preview */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/30 text-xs font-mono text-muted-foreground">
          Preview: REROUTER_PRIVACY_QUESTIONS.md
        </div>
        <pre className="p-4 bg-background/60 text-xs font-mono text-foreground overflow-auto max-h-96 whitespace-pre-wrap leading-relaxed">
          {markdown}
        </pre>
      </div>
    </div>
  );
}
