'use client';

import React, { useMemo, useState } from 'react';
import { TestResultView } from '@/components/endpoint-tester/TestResultView';
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
    <div className="space-y-6">
      {/* Header & Lifecycle Policy Warning */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Model ID Format, Prefix Conventions & Catalog Snapshot Comparator
            </h2>
            <p className="text-xs text-slate-400">
              Preserves exact model IDs from <code className="font-mono">/v1/models</code>{' '}
              without adding or stripping prefixes, and tracks catalog diffs
              over time.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCaptureSnapshot()}
              disabled={!rawCatalogObject}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors disabled:opacity-40"
            >
              + Capture Snapshot in Session
            </button>
            <button
              type="button"
              onClick={handleDownloadLiveSnapshot}
              disabled={!rawCatalogObject}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40"
            >
              ⬇ Download Timestamped /v1/models Snapshot (.json)
            </button>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-amber-950/35 border border-amber-800/70 text-xs text-amber-200">
          <strong>Important Model Lifecycle Notice:</strong> A model
          disappearing from <code className="font-mono">GET /v1/models</code>{' '}
          does not conclusively prove it has been permanently retired. Do not
          claim model lifecycle or deprecation guarantees unless the provider
          supplies an explicit written policy.
        </div>
      </div>

      {/* Section 1: Exact Model ID Prefix Convention Audit */}
      {catalogAnalysis && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-4">
          <h3 className="text-sm font-bold text-slate-100">
            1. Exact Model ID Prefix & Format Audit Across{' '}
            {catalogAnalysis.totalModels} Models
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="text-slate-400">
                Models WITH Provider Prefix (<code>provider/model</code>)
              </div>
              <div className="text-2xl font-bold text-sky-400">
                {catalogAnalysis.prefixAnalysis.totalWithSlashPrefix}
              </div>
              <div className="text-[11px] text-slate-300">
                Observed prefixes:{' '}
                {catalogAnalysis.prefixAnalysis.observedPrefixes
                  .map((p) => `${p}/`)
                  .join(', ')}
              </div>
              <div className="text-[11px] text-slate-400 pt-1">
                Examples:{' '}
                {catalogAnalysis.prefixAnalysis.examplesWithPrefix
                  .slice(0, 4)
                  .join(', ')}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="text-slate-400">
                Models WITHOUT Provider Prefix (Bare ID)
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {catalogAnalysis.prefixAnalysis.totalWithoutSlashPrefix}
              </div>
              <div className="text-[11px] text-slate-300">
                Includes OpenAI, Anthropic, Alibaba, DeepSeek, Typesafe, xAI,
                Z.ai, etc.
              </div>
              <div className="text-[11px] text-slate-400 pt-1">
                Examples:{' '}
                {catalogAnalysis.prefixAnalysis.examplesWithoutPrefix
                  .slice(0, 5)
                  .join(', ')}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="text-slate-400">
                Models with Colon Variant Suffix (<code>:free</code>,{' '}
                <code>:fast</code>, <code>:netra</code>)
              </div>
              <div className="text-2xl font-bold text-purple-400">
                {catalogAnalysis.prefixAnalysis.totalWithColonTag}
              </div>
              <div className="text-[11px] text-slate-300">
                Note: All 16 <code>:free</code> models have{' '}
                <code>owned_by: &quot;&quot;</code> and include a{' '}
                <code>provider/</code> prefix in <code>id</code>.
              </div>
            </div>
          </div>

          {/* Provider-by-Provider ID Format Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead className="bg-slate-950 text-slate-300">
                <tr>
                  <th className="py-2 px-3 border-b border-slate-800">
                    owned_by (Provider)
                  </th>
                  <th className="py-2 px-3 border-b border-slate-800">
                    Count
                  </th>
                  <th className="py-2 px-3 border-b border-slate-800">
                    Prefix Convention Observed
                  </th>
                  <th className="py-2 px-3 border-b border-slate-800">
                    Exact Catalog Model IDs (Untransformed)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {catalogAnalysis.providersFound.map((prov) => {
                  const group = catalogAnalysis.models.filter(
                    (m) => (m.provider || '(empty string)') === prov
                  );
                  const withSlash = group.filter(
                    (m) => m.hasProviderPrefix
                  ).length;
                  return (
                    <tr key={prov} className="hover:bg-slate-950/60">
                      <td className="py-2 px-3 text-indigo-300 font-bold">
                        {prov}
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {group.length}
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        {withSlash === group.length
                          ? 'Always prefixed (provider/model)'
                          : withSlash === 0
                            ? 'Unprefixed (bare model ID)'
                            : 'Mixed'}
                      </td>
                      <td className="py-2 px-3 text-sky-400 break-all">
                        {group.map((m) => m.modelId).join(', ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Dated Claude Alias Verification Tool */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              2. Dated Claude Alias Verification Tool (
              <code className="text-sky-400">POST /v1/messages</code>)
            </h3>
            <p className="text-xs text-slate-400">
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
          <span className="px-2 py-0.5 text-xs font-mono rounded bg-amber-950 text-amber-300 border border-amber-800">
            Category B: Billable if Accepted
          </span>
        </div>

        <div className="p-2.5 rounded bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200">
          ⚠ This request may consume API credits if the alias resolves to an
          active model.
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={aliasInput}
            onChange={(e) => setAliasInput(e.target.value)}
            className="flex-1 min-w-[240px] px-3 py-2 text-xs font-mono rounded bg-slate-950 border border-slate-700 text-slate-100"
            placeholder="Enter dated Claude alias..."
          />
          {[
            'claude-3-5-sonnet-20241022',
            'claude-3-7-sonnet-20250219',
            'claude-haiku-4-5-20251001',
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAliasInput(preset)}
              className="px-2.5 py-1.5 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              {preset}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onExecuteClaudeAliasTest(aliasInput)}
            disabled={isLoading || !aliasInput.trim()}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Testing Alias...' : '▶ Test Claude Alias'}
          </button>
        </div>

        {aliasResults.map((res) => (
          <TestResultView key={res.id} result={res} />
        ))}
      </div>

      {/* Section 3: Snapshot Comparison Engine */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              3. Model Catalog Snapshot Comparison Engine
            </h3>
            <p className="text-xs text-slate-400">
              Compare any two timestamped snapshots of{' '}
              <code className="font-mono">/v1/models</code> to detect added/removed
              models, pricing changes, capability changes, embedding dimension
              changes, and metadata changes.
            </p>
          </div>

          <label className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer">
            ⬆ Import Snapshot JSON File
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {uploadError && (
          <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-xs text-rose-200">
            {uploadError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Baseline Snapshot (Snapshot A)
            </label>
            <select
              value={activeSnapshotA?.id ?? ''}
              onChange={(e) => setSnapshotAId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded bg-slate-950 border border-slate-700 text-slate-100"
            >
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({s.totalModels} models @{' '}
                  {new Date(s.timestamp).toLocaleTimeString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Target Snapshot (Snapshot B)
            </label>
            <select
              value={activeSnapshotB?.id ?? ''}
              onChange={(e) => setSnapshotBId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded bg-slate-950 border border-slate-700 text-slate-100"
            >
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({s.totalModels} models @{' '}
                  {new Date(s.timestamp).toLocaleTimeString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {comparisonResult && (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Newly Appearing IDs</div>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">
                  {comparisonResult.addedModelIds.length}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Disappeared IDs</div>
                <div className="text-lg font-bold text-rose-400 mt-0.5">
                  {comparisonResult.removedModelIds.length}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Changed Pricing</div>
                <div className="text-lg font-bold text-amber-300 mt-0.5">
                  {comparisonResult.pricingChanges.length}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Changed Capabilities</div>
                <div className="text-lg font-bold text-sky-400 mt-0.5">
                  {comparisonResult.capabilityChanges.length}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Changed Dimensions</div>
                <div className="text-lg font-bold text-indigo-400 mt-0.5">
                  {comparisonResult.embeddingDimensionChanges.length}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Changed Metadata</div>
                <div className="text-lg font-bold text-slate-200 mt-0.5">
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
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400">
                ✓ Snapshot A and Snapshot B are identical across all{' '}
                {comparisonResult.snapshotB.totalModels} models and all fields.
              </div>
            ) : (
              <div className="space-y-3 text-xs font-mono">
                {comparisonResult.addedModelIds.length > 0 && (
                  <div className="p-3 rounded bg-emerald-950/30 border border-emerald-800 text-emerald-300">
                    <strong>Newly Appearing Model IDs:</strong>{' '}
                    {comparisonResult.addedModelIds.join(', ')}
                  </div>
                )}
                {comparisonResult.removedModelIds.length > 0 && (
                  <div className="p-3 rounded bg-rose-950/30 border border-rose-800 text-rose-300">
                    <strong>Disappeared Model IDs:</strong>{' '}
                    {comparisonResult.removedModelIds.join(', ')}
                  </div>
                )}
                {[
                  ...comparisonResult.pricingChanges,
                  ...comparisonResult.capabilityChanges,
                  ...comparisonResult.embeddingDimensionChanges,
                  ...comparisonResult.metadataChanges,
                ].length > 0 && (
                  <div className="overflow-x-auto border border-slate-800 rounded">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-950 text-slate-300">
                        <tr>
                          <th className="py-2 px-3 border-b border-slate-800">
                            Model ID
                          </th>
                          <th className="py-2 px-3 border-b border-slate-800">
                            Category
                          </th>
                          <th className="py-2 px-3 border-b border-slate-800">
                            Field Path
                          </th>
                          <th className="py-2 px-3 border-b border-slate-800">
                            Snapshot A Value
                          </th>
                          <th className="py-2 px-3 border-b border-slate-800">
                            Snapshot B Value
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {[
                          ...comparisonResult.pricingChanges,
                          ...comparisonResult.capabilityChanges,
                          ...comparisonResult.embeddingDimensionChanges,
                          ...comparisonResult.metadataChanges,
                        ].map((d, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 px-3 text-sky-400">
                              {d.modelId}
                            </td>
                            <td className="py-1.5 px-3 text-slate-300">
                              {d.category}
                            </td>
                            <td className="py-1.5 px-3 text-indigo-300">
                              {d.fieldPath}
                            </td>
                            <td className="py-1.5 px-3 text-rose-300">
                              {JSON.stringify(d.oldValue)}
                            </td>
                            <td className="py-1.5 px-3 text-emerald-300">
                              {JSON.stringify(d.newValue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
