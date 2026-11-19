'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Download,
  GitCompare,
  Loader2,
  Play,
  Plus,
  Upload,
} from 'lucide-react';
import { TestResultView } from '@/components/endpoint-tester/TestResultView';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  CategoryBadge,
  HttpMethodBadge,
} from '@/components/ui/http-badge';
import { Input } from '@/components/ui/input';
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
import { compareCatalogSnapshots } from '@/lib/rerouter/inspect-models';
import type {
  CatalogAnalysis,
  CatalogSnapshot,
  CatalogSnapshotComparison,
  TestExecutionResult,
} from '@/lib/rerouter/types';

interface ModelChangesPanelProps {
  catalogAnalysis: CatalogAnalysis | null;
  rawCatalogObject: unknown | null;
  snapshots: CatalogSnapshot[];
  testResults: TestExecutionResult[];
  onCaptureSnapshot: (label?: string) => void;
  onImportSnapshot: (snapshot: CatalogSnapshot) => void;
  onExecuteClaudeAliasTest: (aliasModelId: string) => Promise<void>;
  isLoading: boolean;
}

export function ModelChangesPanel({
  catalogAnalysis,
  rawCatalogObject,
  snapshots,
  testResults,
  onCaptureSnapshot,
  onImportSnapshot,
  onExecuteClaudeAliasTest,
  isLoading,
}: ModelChangesPanelProps) {
  const [aliasInput, setAliasInput] = useState<string>(
    'claude-3-5-sonnet-20241022'
  );
  const [snapshotAId, setSnapshotAId] = useState<string>('');
  const [snapshotBId, setSnapshotBId] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const aliasResults = testResults.filter(
    (r) => r.endpointId === 'claude-alias-test'
  );

  const activeSnapshotA = useMemo(() => {
    if (snapshotAId) {
      return snapshots.find((s) => s.id === snapshotAId) ?? snapshots[0] ?? null;
    }
    return snapshots[0] ?? null;
  }, [snapshots, snapshotAId]);

  const activeSnapshotB = useMemo(() => {
    if (snapshotBId) {
      return (
        snapshots.find((s) => s.id === snapshotBId) ??
        snapshots[snapshots.length - 1] ??
        null
      );
    }
    return snapshots[snapshots.length - 1] ?? null;
  }, [snapshots, snapshotBId]);

  const comparisonResult: CatalogSnapshotComparison | null = useMemo(() => {
    if (!activeSnapshotA || !activeSnapshotB) return null;
    return compareCatalogSnapshots(activeSnapshotA, activeSnapshotB);
  }, [activeSnapshotA, activeSnapshotB]);

  const handleDownloadSnapshot = (snap: CatalogSnapshot) => {
    const safeTime = snap.timestamp.replace(/[:.]/g, '-');
    const filename = `rerouter-models-snapshot-${safeTime}.json`;
    const blob = new Blob([JSON.stringify(snap, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadLiveSnapshot = () => {
    if (!rawCatalogObject || !catalogAnalysis) return;
    const now = new Date().toISOString();
    const snap: CatalogSnapshot = {
      id: `live-${now}`,
      label: `Live Snapshot (${now})`,
      timestamp: now,
      totalModels: catalogAnalysis.totalModels,
      rawCatalog: rawCatalogObject,
    };
    handleDownloadSnapshot(snap);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const rawCatalog =
        parsed && typeof parsed === 'object' && 'rawCatalog' in parsed
          ? parsed.rawCatalog
          : parsed;
      const now = new Date().toISOString();
      const snap: CatalogSnapshot = {
        id: parsed.id || `imported-${now}-${file.name}`,
        label: parsed.label || `Imported: ${file.name}`,
        timestamp: parsed.timestamp || now,
        totalModels: Array.isArray(rawCatalog?.data)
          ? rawCatalog.data.length
          : 0,
        rawCatalog,
      };
      onImportSnapshot(snap);
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? `Invalid JSON snapshot file: ${err.message}`
          : 'Invalid JSON snapshot file'
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Lifecycle Policy Warning */}
      <div className="rounded-md border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">
                Model ID Format, Prefix Conventions & Catalog Snapshot
                Comparator
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Preserves exact model IDs from{' '}
              <code className="font-mono">/v1/models</code> without adding or
              stripping prefixes, and tracks catalog diffs over time.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onCaptureSnapshot()}
              disabled={!rawCatalogObject}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Capture Snapshot in Session</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDownloadLiveSnapshot}
              disabled={!rawCatalogObject}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Timestamped Snapshot (.json)</span>
            </Button>
          </div>
        </div>

        <Alert variant="warning" className="py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <AlertDescription className="text-xs">
            <strong>Important Model Lifecycle Notice:</strong> A model
            disappearing from <code className="font-mono">GET /v1/models</code>{' '}
            does not conclusively prove it has been permanently retired. Do not
            claim model lifecycle or deprecation guarantees unless the provider
            supplies an explicit written policy.
          </AlertDescription>
        </Alert>
      </div>

      {/* Section 1: Exact Model ID Prefix Convention Audit */}
      {catalogAnalysis && (
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/20">
            <h3 className="text-xs font-semibold text-foreground">
              1. Exact Model ID Prefix & Format Audit Across{' '}
              {catalogAnalysis.totalModels} Models
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border border-b border-border font-mono text-xs">
            <div className="p-3.5 space-y-1">
              <div className="text-muted-foreground">
                Models WITH Provider Prefix (<code>provider/model</code>)
              </div>
              <div className="text-xl font-semibold text-sky-700 dark:text-sky-400">
                {catalogAnalysis.prefixAnalysis.totalWithSlashPrefix}
              </div>
              <div className="text-[11px] text-foreground">
                Observed prefixes:{' '}
                {catalogAnalysis.prefixAnalysis.observedPrefixes
                  .map((p) => `${p}/`)
                  .join(', ')}
              </div>
              <div className="text-[11px] text-muted-foreground pt-0.5">
                Examples:{' '}
                {catalogAnalysis.prefixAnalysis.examplesWithPrefix
                  .slice(0, 4)
                  .join(', ')}
              </div>
            </div>

            <div className="p-3.5 space-y-1">
              <div className="text-muted-foreground">
                Models WITHOUT Provider Prefix (Bare ID)
              </div>
              <div className="text-xl font-semibold text-emerald-700 dark:text-emerald-400">
                {catalogAnalysis.prefixAnalysis.totalWithoutSlashPrefix}
              </div>
              <div className="text-[11px] text-foreground">
                Includes OpenAI, Anthropic, Alibaba, DeepSeek, Typesafe, xAI,
                Z.ai, etc.
              </div>
              <div className="text-[11px] text-muted-foreground pt-0.5">
                Examples:{' '}
                {catalogAnalysis.prefixAnalysis.examplesWithoutPrefix
                  .slice(0, 5)
                  .join(', ')}
              </div>
            </div>

            <div className="p-3.5 space-y-1">
              <div className="text-muted-foreground">
                Models with Colon Variant Suffix (<code>:free</code>,{' '}
                <code>:fast</code>, <code>:netra</code>)
              </div>
              <div className="text-xl font-semibold text-purple-700 dark:text-purple-400">
                {catalogAnalysis.prefixAnalysis.totalWithColonTag}
              </div>
              <div className="text-[11px] text-foreground">
                Note: All 16 <code>:free</code> models have{' '}
                <code>owned_by: &quot;&quot;</code> and include a{' '}
                <code>provider/</code> prefix in <code>id</code>.
              </div>
            </div>
          </div>

          <Table className="font-mono">
            <TableHeader>
              <TableRow>
                <TableHead>owned_by (Provider)</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Prefix Convention Observed</TableHead>
                <TableHead>Exact Catalog Model IDs (Untransformed)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogAnalysis.providersFound.map((prov) => {
                const group = catalogAnalysis.models.filter(
                  (m) => (m.provider || '(empty string)') === prov
                );
                const withSlash = group.filter(
                  (m) => m.hasProviderPrefix
                ).length;
                return (
                  <TableRow key={prov}>
                    <TableCell className="text-purple-700 dark:text-purple-400 font-semibold">
                      {prov}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {group.length}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {withSlash === group.length
                        ? 'Always prefixed (provider/model)'
                        : withSlash === 0
                          ? 'Unprefixed (bare model ID)'
                          : 'Mixed'}
                    </TableCell>
                    <TableCell className="text-sky-700 dark:text-sky-400 break-all">
                      {group.map((m) => m.modelId).join(', ')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Section 2: Dated Claude Alias Verification Tool */}
      <div className="rounded-md border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-foreground">
                2. Dated Claude Alias Verification Tool
              </h3>
              <HttpMethodBadge method="POST" />
              <code className="font-mono text-xs text-foreground">
                /v1/messages
              </code>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Catalog lists undated Anthropic IDs (
              <code className="font-mono">claude-haiku-4-5</code>,{' '}
              <code className="font-mono">claude-haiku-5-5</code>,{' '}
              <code className="font-mono">claude-opus-4-8</code>,{' '}
              <code className="font-mono">claude-opus-5</code>,{' '}
              <code className="font-mono">claude-opus-5-5</code>,{' '}
              <code className="font-mono">claude-sonnet-5</code>,{' '}
              <code className="font-mono">claude-sonnet-5-5</code>). Test
              whether dated Claude aliases are accepted or mapped.
            </p>
          </div>
          <CategoryBadge category="B" label="Category B · Billable if Accepted" />
        </div>

        <Alert variant="warning" className="py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <AlertDescription className="text-xs">
            This request may consume API credits if the alias resolves to an
            active model.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="text"
            value={aliasInput}
            onChange={(e) => setAliasInput(e.target.value)}
            className="flex-1 min-w-[240px] font-mono text-xs"
            placeholder="Enter dated Claude alias..."
          />
          {[
            'claude-3-5-sonnet-20241022',
            'claude-3-7-sonnet-20250219',
            'claude-haiku-4-5-20251001',
          ].map((preset) => (
            <Button
              key={preset}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAliasInput(preset)}
              className="font-mono text-xs"
            >
              {preset}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            onClick={() => onExecuteClaudeAliasTest(aliasInput)}
            disabled={isLoading || !aliasInput.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Testing Alias...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                <span>Test Claude Alias</span>
              </>
            )}
          </Button>
        </div>

        {aliasResults.map((res) => (
          <TestResultView key={res.id} result={res} />
        ))}
      </div>

      {/* Section 3: Snapshot Comparison Engine */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold text-foreground">
              3. Model Catalog Snapshot Comparison Engine
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Compare any two timestamped snapshots of{' '}
              <code className="font-mono">/v1/models</code> to detect
              added/removed models, pricing changes, capability changes,
              embedding dimension changes, and metadata changes.
            </p>
          </div>

          <Button asChild variant="outline" size="sm">
            <label className="cursor-pointer">
              <Upload className="h-3.5 w-3.5" />
              <span>Import Snapshot JSON File</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </Button>
        </div>

        {uploadError && (
          <div className="p-3 border-b border-border">
            <Alert variant="destructive">
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border border-b border-border">
          <div className="p-3.5 space-y-1.5">
            <Label>Baseline Snapshot (Snapshot A)</Label>
            <NativeSelect
              value={activeSnapshotA?.id ?? ''}
              onChange={(e) => setSnapshotAId(e.target.value)}
            >
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({s.totalModels} models @{' '}
                  {new Date(s.timestamp).toLocaleTimeString()})
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="p-3.5 space-y-1.5">
            <Label>Target Snapshot (Snapshot B)</Label>
            <NativeSelect
              value={activeSnapshotB?.id ?? ''}
              onChange={(e) => setSnapshotBId(e.target.value)}
            >
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({s.totalModels} models @{' '}
                  {new Date(s.timestamp).toLocaleTimeString()})
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        {comparisonResult && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-border border-b border-border font-mono text-xs">
              <div className="p-3.5">
                <div className="text-[11px] text-muted-foreground">
                  Newly Appearing IDs
                </div>
                <div className="text-lg font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {comparisonResult.addedModelIds.length}
                </div>
              </div>
              <div className="p-3.5">
                <div className="text-[11px] text-muted-foreground">
                  Disappeared IDs
                </div>
                <div className="text-lg font-semibold text-red-700 dark:text-red-400 mt-0.5">
                  {comparisonResult.removedModelIds.length}
                </div>
              </div>
              <div className="p-3.5">
                <div className="text-[11px] text-muted-foreground">
                  Changed Pricing
                </div>
                <div className="text-lg font-semibold text-amber-700 dark:text-amber-400 mt-0.5">
                  {comparisonResult.pricingChanges.length}
                </div>
              </div>
              <div className="p-3.5">
                <div className="text-[11px] text-muted-foreground">
                  Changed Capabilities
                </div>
                <div className="text-lg font-semibold text-sky-700 dark:text-sky-400 mt-0.5">
                  {comparisonResult.capabilityChanges.length}
                </div>
              </div>
              <div className="p-3.5">
                <div className="text-[11px] text-muted-foreground">
                  Changed Dimensions
                </div>
                <div className="text-lg font-semibold text-purple-700 dark:text-purple-400 mt-0.5">
                  {comparisonResult.embeddingDimensionChanges.length}
                </div>
              </div>
              <div className="p-3.5">
                <div className="text-[11px] text-muted-foreground">
                  Changed Metadata
                </div>
                <div className="text-lg font-semibold text-foreground mt-0.5">
                  {comparisonResult.metadataChanges.length}
                </div>
              </div>
            </div>

            {comparisonResult.addedModelIds.length === 0 &&
            comparisonResult.removedModelIds.length === 0 &&
            comparisonResult.pricingChanges.length === 0 &&
            comparisonResult.capabilityChanges.length === 0 &&
            comparisonResult.embeddingDimensionChanges.length === 0 &&
            comparisonResult.metadataChanges.length === 0 ? (
              <div className="p-4 font-mono text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <Check className="h-3.5 w-3.5" />
                <span>
                  Snapshot A and Snapshot B are identical across all{' '}
                  {comparisonResult.snapshotB.totalModels} models and all
                  fields.
                </span>
              </div>
            ) : (
              <div className="p-4 space-y-3 font-mono text-xs">
                {comparisonResult.addedModelIds.length > 0 && (
                  <Alert variant="success">
                    <AlertDescription>
                      <strong>Newly Appearing Model IDs:</strong>{' '}
                      {comparisonResult.addedModelIds.join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
                {comparisonResult.removedModelIds.length > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <strong>Disappeared Model IDs:</strong>{' '}
                      {comparisonResult.removedModelIds.join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
                {[
                  ...comparisonResult.pricingChanges,
                  ...comparisonResult.capabilityChanges,
                  ...comparisonResult.embeddingDimensionChanges,
                  ...comparisonResult.metadataChanges,
                ].length > 0 && (
                  <div className="rounded-md border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Model ID</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Field Path</TableHead>
                          <TableHead>Snapshot A Value</TableHead>
                          <TableHead>Snapshot B Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          ...comparisonResult.pricingChanges,
                          ...comparisonResult.capabilityChanges,
                          ...comparisonResult.embeddingDimensionChanges,
                          ...comparisonResult.metadataChanges,
                        ].map((d, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-sky-700 dark:text-sky-400">
                              {d.modelId}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {d.category}
                            </TableCell>
                            <TableCell className="text-purple-700 dark:text-purple-400">
                              {d.fieldPath}
                            </TableCell>
                            <TableCell className="text-red-700 dark:text-red-400">
                              {JSON.stringify(d.oldValue)}
                            </TableCell>
                            <TableCell className="text-emerald-700 dark:text-emerald-400">
                              {JSON.stringify(d.newValue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
