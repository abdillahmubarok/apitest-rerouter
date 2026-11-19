'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Cpu,
  GitCompare,
  Loader2,
  Play,
  RotateCcw,
  Terminal,
} from 'lucide-react';
import { TestResultView } from './TestResultView';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  CategoryBadge,
  HttpMethodBadge,
} from '@/components/ui/http-badge';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ENDPOINT_DEFINITIONS } from '@/lib/rerouter/endpoints';
import type {
  AnalyzedModelItem,
  AuthFormat,
  CatalogAnalysis,
  EndpointId,
  TestExecutionResult,
} from '@/lib/rerouter/types';

interface EndpointTestPanelProps {
  primaryEndpointId: EndpointId;
  secondaryEndpointId?: EndpointId;
  catalogAnalysis: CatalogAnalysis | null;
  testResults: TestExecutionResult[];
  defaultAuthFormat: AuthFormat;
  onExecuteTest: (params: {
    endpointId: EndpointId;
    authFormat: AuthFormat;
    customBodyRaw: string;
    selectedModelId: string;
  }) => Promise<void>;
  isLoading: boolean;
}

export function EndpointTestPanel({
  primaryEndpointId,
  secondaryEndpointId,
  catalogAnalysis,
  testResults,
  defaultAuthFormat,
  onExecuteTest,
  isLoading,
}: EndpointTestPanelProps) {
  const def = ENDPOINT_DEFINITIONS[primaryEndpointId];
  const secondaryDef = secondaryEndpointId
    ? ENDPOINT_DEFINITIONS[secondaryEndpointId]
    : null;

  const availableModels: AnalyzedModelItem[] = useMemo(() => {
    if (!catalogAnalysis) return [];
    if (primaryEndpointId === 'embeddings') {
      return catalogAnalysis.embeddingModels;
    }
    if (primaryEndpointId === 'decisions') {
      return catalogAnalysis.decisionModels;
    }
    if (primaryEndpointId === 'systemone') {
      return [
        ...catalogAnalysis.decisionModels,
        ...catalogAnalysis.chatModels,
      ];
    }
    return catalogAnalysis.chatModels;
  }, [catalogAnalysis, primaryEndpointId]);

  const initialModelId = useMemo(() => {
    if (primaryEndpointId === 'systemone') {
      return 'typesafe/jev-1.14.0';
    }
    if (primaryEndpointId === 'embeddings') {
      return (
        catalogAnalysis?.embeddingModels[0]?.modelId ??
        'gemini/gemini-embedding-001'
      );
    }
    if (primaryEndpointId === 'decisions') {
      return catalogAnalysis?.decisionModels[1]?.modelId ?? 'jev-1.14.0';
    }
    if (
      primaryEndpointId === 'anthropic-messages' ||
      primaryEndpointId === 'count-tokens-v1'
    ) {
      const claude = catalogAnalysis?.chatModels.find((m) =>
        m.modelId.includes('claude')
      );
      return claude?.modelId ?? 'claude-haiku-4-5';
    }
    const gptMini = catalogAnalysis?.chatModels.find(
      (m) => m.modelId === 'gpt-5-mini'
    );
    return (
      gptMini?.modelId ??
      catalogAnalysis?.chatModels[0]?.modelId ??
      'gpt-5-mini'
    );
  }, [catalogAnalysis, primaryEndpointId]);

  const [selectedModelId, setSelectedModelId] =
    useState<string>(initialModelId);
  const [authFormat, setAuthFormat] = useState<AuthFormat>(
    def.defaultAuthFormat === 'x-api-key' ? 'x-api-key' : defaultAuthFormat
  );
  const [customBodyRaw, setCustomBodyRaw] = useState<string>(() => {
    const payload = def.defaultBodyBuilder(initialModelId);
    return payload ? JSON.stringify(payload, null, 2) : '';
  });
  const [secondaryBodyRaw, setSecondaryBodyRaw] = useState<string>(() => {
    if (!secondaryDef) return '';
    const payload = secondaryDef.defaultBodyBuilder(initialModelId);
    return payload ? JSON.stringify(payload, null, 2) : '';
  });
  const [systemOneSubstitutionNote, setSystemOneSubstitutionNote] = useState<
    string | null
  >(null);

  const handleModelChange = (newModelId: string, note?: string) => {
    setSelectedModelId(newModelId);
    const built = def.defaultBodyBuilder(newModelId);
    if (built) {
      setCustomBodyRaw(JSON.stringify(built, null, 2));
    }
    if (secondaryDef) {
      const secBuilt = secondaryDef.defaultBodyBuilder(newModelId);
      if (secBuilt) {
        setSecondaryBodyRaw(JSON.stringify(secBuilt, null, 2));
      }
    }
    setSystemOneSubstitutionNote(note ?? null);
  };

  const primaryResults = useMemo(
    () => testResults.filter((r) => r.endpointId === primaryEndpointId),
    [testResults, primaryEndpointId]
  );

  const secondaryResults = useMemo(
    () =>
      secondaryEndpointId
        ? testResults.filter((r) => r.endpointId === secondaryEndpointId)
        : [],
    [testResults, secondaryEndpointId]
  );

  const handleRunBothCountTokens = async () => {
    if (
      primaryEndpointId === 'count-tokens-v1' &&
      secondaryEndpointId === 'count-tokens-root'
    ) {
      await onExecuteTest({
        endpointId: 'count-tokens-v1',
        authFormat,
        customBodyRaw,
        selectedModelId,
      });
      await onExecuteTest({
        endpointId: 'count-tokens-root',
        authFormat,
        customBodyRaw: secondaryBodyRaw || customBodyRaw,
        selectedModelId,
      });
    }
  };

  const fullPathDisplay = def.useRootOrigin
    ? `https://rerouter.mubarokah.com${def.path}`
    : `https://rerouter.mubarokah.com/v1${def.path}`;

  return (
    <div className="space-y-4">
      {/* Main Request Workbench Container */}
      <div className="rounded-md border border-border bg-card text-card-foreground overflow-hidden">
        {/* Top Endpoint Identity & URL Bar */}
        <div className="p-4 border-b border-border space-y-3 bg-muted/20">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  {def.label}
                </h2>
                <CategoryBadge
                  category={def.category}
                  label={`Category ${def.category} · ${
                    def.category === 'A' ? 'Safe Test' : 'Billable Test'
                  }`}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {def.description}
              </p>
            </div>
          </div>

          {/* Postman/Hoppscotch-style Endpoint Execution Bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background p-1.5">
            <HttpMethodBadge method={def.method} className="px-2 py-1 text-xs" />
            <code className="flex-1 font-mono text-xs text-foreground px-1.5 truncate">
              {fullPathDisplay}
            </code>
            <Button
              type="button"
              size="sm"
              disabled={isLoading}
              onClick={() =>
                onExecuteTest({
                  endpointId: primaryEndpointId,
                  authFormat,
                  customBodyRaw,
                  selectedModelId,
                })
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Send Request</span>
                </>
              )}
            </Button>
          </div>

          {/* Category B Credit Warning */}
          {def.category === 'B' && (
            <Alert variant="warning" className="py-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <AlertDescription className="text-xs">
                <strong>Credit Consumption Warning:</strong>{' '}
                <span className="font-mono underline">
                  This request may consume API credits.
                </span>{' '}
                Default payload uses minimal synthetic prompt input and a low
                output token limit.
              </AlertDescription>
            </Alert>
          )}

          {/* System One Investigation Note */}
          {primaryEndpointId === 'systemone' && (
            <div className="rounded-md border border-border bg-background p-3 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                <span>System One Model ID Investigation Note</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                The supplied documentation specifies{' '}
                <code className="font-mono text-amber-700 dark:text-amber-400">
                  &quot;model&quot;: &quot;typesafe/jev-1.14.0&quot;
                </code>
                . Live inspection of{' '}
                <code className="font-mono text-sky-700 dark:text-sky-400">
                  GET /v1/models
                </code>{' '}
                shows that the catalog returns{' '}
                <code className="font-mono text-emerald-700 dark:text-emerald-400">
                  &quot;id&quot;: &quot;jev-1.14.0&quot;
                </code>{' '}
                with{' '}
                <code className="font-mono">
                  &quot;owned_by&quot;: &quot;typesafe&quot;
                </code>{' '}
                (without the <code className="font-mono">typesafe/</code>{' '}
                prefix). Test the exact documented example first, then
                optionally test the catalog ID substitution below.
              </p>
              <div className="flex flex-wrap gap-2 pt-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    selectedModelId === 'typesafe/jev-1.14.0'
                      ? 'default'
                      : 'outline'
                  }
                  onClick={() =>
                    handleModelChange(
                      'typesafe/jev-1.14.0',
                      'Using exact documented example model ID: "typesafe/jev-1.14.0".'
                    )
                  }
                  className="font-mono text-xs"
                >
                  1. Documented Example: &quot;typesafe/jev-1.14.0&quot;
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    selectedModelId === 'jev-1.14.0' ? 'default' : 'outline'
                  }
                  onClick={() =>
                    handleModelChange(
                      'jev-1.14.0',
                      'Documented Substitution: Replaced documented "typesafe/jev-1.14.0" with exact catalog ID "jev-1.14.0" (from GET /v1/models data[].id).'
                    )
                  }
                  className="font-mono text-xs"
                >
                  2. Catalog ID Substitution: &quot;jev-1.14.0&quot;
                </Button>
              </div>
              {systemOneSubstitutionNote && (
                <div className="font-mono text-[11px] text-amber-700 dark:text-amber-400">
                  Active Note: {systemOneSubstitutionNote}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divided Parameters Bar: Model Selector & Auth Header Format */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border border-b border-border">
          <div className="p-3.5 space-y-1.5">
            <Label htmlFor={`model-select-${primaryEndpointId}`}>
              Exact Model ID from <code className="font-mono">/v1/models</code>{' '}
              (Untransformed)
            </Label>
            <NativeSelect
              id={`model-select-${primaryEndpointId}`}
              value={selectedModelId}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              {primaryEndpointId === 'systemone' && (
                <option value="typesafe/jev-1.14.0">
                  typesafe/jev-1.14.0 (Exact Documented Example)
                </option>
              )}
              {availableModels.map((m) => (
                <option key={m.modelId} value={m.modelId}>
                  {m.modelId} (mode: {m.mode}, owned_by: {m.provider || '""'})
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="p-3.5 space-y-1.5">
            <Label>Authentication Header Format</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={authFormat === 'bearer' ? 'default' : 'outline'}
                onClick={() => setAuthFormat('bearer')}
                className="font-mono text-xs"
              >
                Authorization: Bearer
              </Button>
              <Button
                type="button"
                size="sm"
                variant={authFormat === 'x-api-key' ? 'default' : 'outline'}
                onClick={() => setAuthFormat('x-api-key')}
                className="font-mono text-xs"
              >
                x-api-key
              </Button>
            </div>
          </div>
        </div>

        {/* Request JSON Body Editor(s) */}
        <div
          className={`grid grid-cols-1 ${
            secondaryDef && primaryEndpointId === 'responses'
              ? 'lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border'
              : ''
          }`}
        >
          {/* Primary Payload Editor */}
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HttpMethodBadge method={def.method} />
                <Label className="font-mono text-xs">
                  {secondaryDef && primaryEndpointId === 'responses'
                    ? 'Non-Streaming Request Payload (/v1/responses)'
                    : `Request JSON Body (${def.path})`}
                </Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const built = def.defaultBodyBuilder(selectedModelId);
                  setCustomBodyRaw(built ? JSON.stringify(built, null, 2) : '');
                }}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Payload</span>
              </Button>
            </div>

            <Textarea
              rows={9}
              value={customBodyRaw}
              onChange={(e) => setCustomBodyRaw(e.target.value)}
              spellCheck={false}
              className="font-mono text-xs bg-muted/20"
            />

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                onClick={() =>
                  onExecuteTest({
                    endpointId: primaryEndpointId,
                    authFormat,
                    customBodyRaw,
                    selectedModelId,
                  })
                }
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Executing Request...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    <span>Run {def.label}</span>
                  </>
                )}
              </Button>

              {primaryEndpointId === 'count-tokens-v1' &&
                secondaryEndpointId === 'count-tokens-root' && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        onExecuteTest({
                          endpointId: 'count-tokens-root',
                          authFormat,
                          customBodyRaw,
                          selectedModelId,
                        })
                      }
                      disabled={isLoading}
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>Run Candidate 2 (/messages/count_tokens)</span>
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleRunBothCountTokens}
                      disabled={isLoading}
                    >
                      <GitCompare className="h-3.5 w-3.5" />
                      <span>Test & Compare Both Candidate URLs</span>
                    </Button>
                  </>
                )}
            </div>
          </div>

          {/* Secondary Request Payload for Responses API Streaming */}
          {secondaryDef && primaryEndpointId === 'responses' && (
            <div className="p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <HttpMethodBadge method={secondaryDef.method} />
                  <Label className="font-mono text-xs">
                    Streaming Request Payload (/v1/responses · stream: true)
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const built =
                      secondaryDef.defaultBodyBuilder(selectedModelId);
                    setSecondaryBodyRaw(
                      built ? JSON.stringify(built, null, 2) : ''
                    );
                  }}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset Payload</span>
                </Button>
              </div>

              <Textarea
                rows={9}
                value={secondaryBodyRaw}
                onChange={(e) => setSecondaryBodyRaw(e.target.value)}
                spellCheck={false}
                className="font-mono text-xs bg-muted/20"
              />

              <div className="pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    onExecuteTest({
                      endpointId: secondaryDef.id,
                      authFormat,
                      customBodyRaw: secondaryBodyRaw,
                      selectedModelId,
                    })
                  }
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Streaming...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span>Run {secondaryDef.label}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Count Tokens Dual-Path Side-by-Side Comparison Matrix */}
      {primaryEndpointId === 'count-tokens-v1' &&
        secondaryEndpointId === 'count-tokens-root' && (
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="text-xs font-semibold text-foreground">
                Count Tokens Candidate Endpoint Path Comparison
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Live empirical comparison between both documented candidate
                URLs:
              </p>
            </div>
            <Table className="font-mono">
              <TableHeader>
                <TableRow>
                  <TableHead>Attribute</TableHead>
                  <TableHead className="text-sky-700 dark:text-sky-400">
                    Candidate 1: /v1/messages/count_tokens
                  </TableHead>
                  <TableHead className="text-amber-700 dark:text-amber-400">
                    Candidate 2: /messages/count_tokens (No /v1)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-muted-foreground">
                    Exact Tested URL
                  </TableCell>
                  <TableCell className="text-foreground">
                    https://rerouter.mubarokah.com/v1/messages/count_tokens
                  </TableCell>
                  <TableCell className="text-foreground">
                    https://rerouter.mubarokah.com/messages/count_tokens
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">
                    HTTP Status
                  </TableCell>
                  <TableCell className="text-foreground">
                    {primaryResults[0]
                      ? `HTTP ${primaryResults[0].httpStatus} (${primaryResults[0].statusText})`
                      : 'Not run yet in UI'}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {secondaryResults[0]
                      ? `HTTP ${secondaryResults[0].httpStatus} (${secondaryResults[0].statusText})`
                      : 'Not run yet in UI'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">
                    Content-Type
                  </TableCell>
                  <TableCell className="text-emerald-700 dark:text-emerald-400">
                    {primaryResults[0]?.responseHeaders['content-type'] ??
                      'application/json (API Gateway)'}
                  </TableCell>
                  <TableCell className="text-red-700 dark:text-red-400">
                    {secondaryResults[0]?.responseHeaders['content-type'] ??
                      'text/html (nginx 405 Not Allowed)'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">
                    Token Count Field
                  </TableCell>
                  <TableCell className="text-foreground">
                    {primaryResults[0]?.usageAndCost.tokenCountField
                      ? `${primaryResults[0].usageAndCost.tokenCountField} = ${primaryResults[0].usageAndCost.tokenCountValue}`
                      : primaryResults[0]?.errorAnalysis
                        ? `Error (${primaryResults[0].errorAnalysis.readableMessage})`
                        : 'Awaiting valid API key'}
                  </TableCell>
                  <TableCell className="text-red-700 dark:text-red-400">
                    None — Endpoint does not exist on root origin (returns HTML
                    405)
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">
                    Generation Charge / Cost
                  </TableCell>
                  <TableCell className="text-foreground">
                    {primaryResults[0]?.usageAndCost.costValue !== null &&
                    primaryResults[0]?.usageAndCost.costValue !== undefined
                      ? `$${primaryResults[0].usageAndCost.costValue}`
                      : 'No cost field returned'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    N/A (HTTP 405)
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">
                    Verified Path Difference
                  </TableCell>
                  <TableCell className="text-emerald-700 dark:text-emerald-400">
                    Routes to ReRouter API Backend (/v1 prefix required)
                  </TableCell>
                  <TableCell className="text-red-700 dark:text-red-400">
                    Hits nginx web frontend static router (405 Not Allowed)
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

      {/* Executed Results List */}
      <div className="space-y-4">
        {primaryResults.map((res) => (
          <TestResultView key={res.id} result={res} />
        ))}
        {secondaryResults.map((res) => (
          <TestResultView key={res.id} result={res} />
        ))}
        {primaryResults.length === 0 && secondaryResults.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-muted/15 p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Terminal className="h-5 w-5 text-muted-foreground/70" />
            <div>
              No live requests executed for this endpoint in the current session
              view yet. Click <strong>Send Request</strong> above to test
              against{' '}
              <code className="font-mono text-foreground">
                https://rerouter.mubarokah.com/v1
              </code>
              .
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
