'use client';

import React, { useMemo, useState } from 'react';
import { TestResultView } from '@/components/endpoint-tester/TestResultView';
import { JsonViewer } from '@/components/json-viewer/JsonViewer';
import type {
  AnalyzedModelItem,
  CatalogAnalysis,
  TestExecutionResult,
} from '@/lib/rerouter/types';

interface ModelCatalogPanelProps {
  catalogAnalysis: CatalogAnalysis | null;
  modelsTestResult: TestExecutionResult | null;
  embeddingTestResults: TestExecutionResult[];
  onRefreshModels: () => void;
  onExecuteEmbeddingDimensionTest: (modelId: string) => void;
  isLoading: boolean;
}

export function ModelCatalogPanel({
  catalogAnalysis,
  modelsTestResult,
  embeddingTestResults,
  onRefreshModels,
  onExecuteEmbeddingDimensionTest,
  isLoading,
}: ModelCatalogPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [visionFilter, setVisionFilter] = useState<string>('all');
  const [reasoningFilter, setReasoningFilter] = useState<string>('all');
  const [selectedModelIndex, setSelectedModelIndex] = useState<number>(0);

  const defaultEmbeddingModelId =
    catalogAnalysis?.embeddingModels[0]?.modelId ??
    'gemini/gemini-embedding-001';
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState<string>(
    defaultEmbeddingModelId
  );
  const [kbDimensionInput, setKbDimensionInput] = useState<string>('1536');

  const filteredModels = useMemo(() => {
    if (!catalogAnalysis) return [];
    return catalogAnalysis.models.filter((m) => {
      if (modeFilter !== 'all' && m.mode !== modeFilter) return false;
      if (
        providerFilter !== 'all' &&
        (m.provider || '(empty string)') !== providerFilter
      ) {
        return false;
      }
      if (visionFilter === 'true' && m.visionSupport !== true) return false;
      if (visionFilter === 'false' && m.visionSupport !== false) return false;
      if (reasoningFilter === 'true' && m.thinkingSupport !== true)
        return false;
      if (reasoningFilter === 'false' && m.thinkingSupport !== false)
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.modelId.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q) ||
          m.mode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    catalogAnalysis,
    modeFilter,
    providerFilter,
    visionFilter,
    reasoningFilter,
    searchQuery,
  ]);

  const inspectedModel: AnalyzedModelItem | null =
    catalogAnalysis?.models[selectedModelIndex] ??
    catalogAnalysis?.models[0] ??
    null;

  const latestEmbeddingResultForSelected = useMemo(() => {
    return (
      embeddingTestResults.find(
        (r) => r.embeddingVerification?.modelId === selectedEmbeddingModel
      ) ??
      embeddingTestResults[0] ??
      null
    );
  }, [embeddingTestResults, selectedEmbeddingModel]);

  const parsedKbDim = Number.parseInt(kbDimensionInput, 10);
  const verifiedActualDim =
    latestEmbeddingResultForSelected?.embeddingVerification
      ?.actualVectorDimension ?? null;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100">
            Model Catalog Inspector (<code className="text-sky-400">GET /v1/models</code>)
          </h2>
          <p className="text-xs text-slate-400">
            Live discovery of exact JSON field paths, data types, capabilities,
            pricing structures, and embedding vector dimensions.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefreshModels}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Requesting /v1/models...' : '↻ Re-fetch GET /v1/models'}
        </button>
      </div>

      {!catalogAnalysis ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
          {isLoading
            ? 'Loading live model catalog from https://rerouter.mubarokah.com/v1/models...'
            : 'Click "Re-fetch GET /v1/models" to load and analyze the live model catalog.'}
        </div>
      ) : (
        <>
          {/* Section 1: Discovered Schema & Exact Field Names Mapping */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  1. Discovered Model Object Schema & Exact Field Names
                </h3>
                <p className="text-xs text-slate-400">
                  No field names were assumed. The table below reports the
                  actual JSON keys discovered in{' '}
                  <code className="font-mono text-sky-400">
                    {catalogAnalysis.modelsArrayPath}[i]
                  </code>{' '}
                  across {catalogAnalysis.totalModels} models.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                  Inspector Model:{' '}
                  <strong className="text-sky-400">
                    {inspectedModel?.basePath} ({inspectedModel?.modelId})
                  </strong>
                </span>
              </div>
            </div>

            {inspectedModel && (
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-300">
                    <tr>
                      <th className="py-2.5 px-3 border-b border-slate-800">
                        Required Concept
                      </th>
                      <th className="py-2.5 px-3 border-b border-slate-800">
                        Exact JSON Path
                      </th>
                      <th className="py-2.5 px-3 border-b border-slate-800">
                        Exact Field Name
                      </th>
                      <th className="py-2.5 px-3 border-b border-slate-800">
                        Data Type
                      </th>
                      <th className="py-2.5 px-3 border-b border-slate-800">
                        Actual Value (in {inspectedModel.basePath})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {[
                      inspectedModel.discoveredMappings.modelId,
                      inspectedModel.discoveredMappings.modelName,
                      inspectedModel.discoveredMappings.provider,
                      inspectedModel.discoveredMappings.mode,
                      inspectedModel.discoveredMappings.visionSupport,
                      inspectedModel.discoveredMappings.thinkingSupport,
                      inspectedModel.discoveredMappings.inputTokenPrice,
                      inspectedModel.discoveredMappings.outputTokenPrice,
                      inspectedModel.discoveredMappings.embeddingPrice,
                      inspectedModel.discoveredMappings.embeddingDimensions,
                    ].map((m) => (
                      <tr key={m.concept} className="hover:bg-slate-950/50">
                        <td className="py-2 px-3 font-sans font-semibold text-slate-200">
                          {m.concept}
                        </td>
                        <td className="py-2 px-3 text-sky-400">
                          {m.exactPath}
                        </td>
                        <td className="py-2 px-3 text-indigo-300">
                          {m.fieldName}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                              m.found
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {m.dataType}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-200 break-all">
                          {m.formattedValue}
                        </td>
                      </tr>
                    ))}
                    <tr className="hover:bg-slate-950/50">
                      <td className="py-2 px-3 font-sans font-semibold text-slate-200">
                        Other Pricing Fields
                      </td>
                      <td className="py-2 px-3 text-sky-400">
                        {inspectedModel.discoveredMappings.otherPricingFields
                          .map((f) => f.exactPath)
                          .join(', ')}
                      </td>
                      <td className="py-2 px-3 text-indigo-300">
                        {catalogAnalysis.schemaSummary.otherPricingFields.join(
                          ', '
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-300">
                          string / object / null
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-200 break-all">
                        {inspectedModel.discoveredMappings.otherPricingFields
                          .map((f) => `${f.fieldName}=${f.formattedValue}`)
                          .join('; ')}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-950/50">
                      <td className="py-2 px-3 font-sans font-semibold text-slate-200">
                        Other Capability / Metadata Fields
                      </td>
                      <td className="py-2 px-3 text-sky-400">
                        {inspectedModel.discoveredMappings.otherCapabilityFields
                          .map((f) => f.exactPath)
                          .join(', ')}
                      </td>
                      <td className="py-2 px-3 text-indigo-300">
                        {catalogAnalysis.schemaSummary.otherCapabilityFields.join(
                          ', '
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-300">
                          number / string
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-200 break-all">
                        {inspectedModel.discoveredMappings.otherCapabilityFields
                          .map((f) => `${f.fieldName}=${f.formattedValue}`)
                          .join('; ')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Embedding Dimensions Dual Inspection & RAG Compatibility Tool */}
          <div className="rounded-xl border border-indigo-800/70 bg-slate-900/70 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-indigo-300">
                2. Embedding Dimensions Inspector & Knowledge-Base (RAG)
                Compatibility
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Performs two separate inspections: (1) Catalog metadata audit
                and (2) Live <code className="font-mono">POST /v1/embeddings</code>{' '}
                vector dimension measurement via{' '}
                <code className="font-mono text-emerald-400">
                  embedding.length
                </code>
                .
              </p>
            </div>

            {/* Part 1: Catalog Metadata Inspection */}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Inspection 1: Catalog Metadata Inspection (
                {catalogAnalysis.embeddingModels.length} Embedding Models Found)
              </div>
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-300">
                    <tr>
                      <th className="py-2 px-3 border-b border-slate-800">
                        Catalog Path
                      </th>
                      <th className="py-2 px-3 border-b border-slate-800">
                        Exact Model ID
                      </th>
                      <th className="py-2 px-3 border-b border-slate-800">
                        Provider (owned_by)
                      </th>
                      <th className="py-2 px-3 border-b border-slate-800">
                        Context Length
                      </th>
                      <th className="py-2 px-3 border-b border-slate-800">
                        Prompt Price (pricing.prompt)
                      </th>
                      <th className="py-2 px-3 border-b border-slate-800">
                        Catalog-Declared Embedding Dimension
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {catalogAnalysis.embeddingModels.map((em) => (
                      <tr key={em.modelId} className="hover:bg-slate-950/60">
                        <td className="py-2 px-3 text-slate-400">
                          {em.basePath}
                        </td>
                        <td className="py-2 px-3 text-sky-400 font-bold">
                          {em.modelId}
                        </td>
                        <td className="py-2 px-3 text-slate-200">
                          {em.provider}
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          {String(em.contextLength)}
                        </td>
                        <td className="py-2 px-3 text-emerald-400">
                          {String(em.inputTokenPrice)}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                            {em.declaredEmbeddingDimension !== null
                              ? `${em.declaredEmbeddingDimension} (${em.declaredEmbeddingDimensionPath})`
                              : 'NOT PROVIDED BY MODEL CATALOG'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Part 2: Live Embedding Dimension Verification & Part 3: RAG Compatibility Tool */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                    Inspection 2: Live Embedding Test (POST /v1/embeddings)
                  </span>
                  <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-amber-950 text-amber-300 border border-amber-800">
                    Category B: Billable
                  </span>
                </div>

                <div className="p-2.5 rounded bg-amber-950/40 border border-amber-800/70 text-xs text-amber-200">
                  ⚠ <strong>Warning:</strong> This request may consume API
                  credits. Uses minimal synthetic input:{' '}
                  <code className="font-mono">
                    [&quot;ReRouter embedding dimension verification&quot;]
                  </code>
                  .
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={selectedEmbeddingModel}
                    onChange={(e) => setSelectedEmbeddingModel(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs font-mono rounded bg-slate-900 border border-slate-700 text-slate-100"
                  >
                    {catalogAnalysis.embeddingModels.map((em) => (
                      <option key={em.modelId} value={em.modelId}>
                        {em.modelId} (owned_by: {em.provider})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      onExecuteEmbeddingDimensionTest(selectedEmbeddingModel)
                    }
                    disabled={isLoading}
                    className="px-3.5 py-2 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Testing...' : '▶ Verify Vector Dimension'}
                  </button>
                </div>

                {latestEmbeddingResultForSelected?.embeddingVerification && (
                  <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Model ID:</span>
                      <span className="text-sky-400">
                        {
                          latestEmbeddingResultForSelected.embeddingVerification
                            .modelId
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">HTTP Status:</span>
                      <span className="text-slate-100">
                        {
                          latestEmbeddingResultForSelected.embeddingVerification
                            .httpStatus
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Input Token Usage:</span>
                      <span className="text-slate-100">
                        {latestEmbeddingResultForSelected.embeddingVerification
                          .inputTokens ?? 'Not returned'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Actual Vector Dimension (embedding.length):
                      </span>
                      <span className="text-emerald-400 font-bold">
                        {latestEmbeddingResultForSelected.embeddingVerification
                          .actualVectorDimension ?? 'No vector in response'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Catalog-Declared Dimension:
                      </span>
                      <span className="text-amber-300">
                        {
                          latestEmbeddingResultForSelected.embeddingVerification
                            .catalogDeclaredStatus
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Dimensions Match:</span>
                      <span className="text-sky-300">
                        {
                          latestEmbeddingResultForSelected.embeddingVerification
                            .dimensionsMatch
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cost in USD:</span>
                      <span className="text-emerald-400">
                        {latestEmbeddingResultForSelected.embeddingVerification
                          .costUsd ?? 'Not returned'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Part 3: RAG Vector Dimension Compatibility Comparison Tool */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Knowledge-Base Vector Dimension Compatibility Tool
                </div>
                <p className="text-xs text-slate-400">
                  Enter your existing knowledge-base or vector database index
                  dimension (e.g., pgvector / Qdrant / Pinecone column size) to
                  verify compatibility with{' '}
                  <code className="font-mono text-sky-400">
                    {selectedEmbeddingModel}
                  </code>
                  .
                </p>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-300 shrink-0">
                    Existing KB Vector Dimension:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={65536}
                    value={kbDimensionInput}
                    onChange={(e) => setKbDimensionInput(e.target.value)}
                    className="w-32 px-3 py-1.5 text-xs font-mono rounded bg-slate-900 border border-slate-700 text-slate-100"
                  />
                  <div className="flex gap-1">
                    {[768, 1024, 1536, 3072].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setKbDimensionInput(String(preset))}
                        className="px-2 py-1 text-[11px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded bg-slate-900 border border-slate-800 text-xs font-mono space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      Target Knowledge-Base Dimension:
                    </span>
                    <span className="text-slate-100">
                      {Number.isNaN(parsedKbDim) ? 'Invalid' : parsedKbDim}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      Catalog-Declared Dimension:
                    </span>
                    <span className="text-amber-300">
                      NOT PROVIDED BY MODEL CATALOG
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      Live Verified Dimension ({selectedEmbeddingModel}):
                    </span>
                    <span className="text-slate-100">
                      {verifiedActualDim !== null
                        ? verifiedActualDim
                        : 'NOT TESTED YET (Run live test on left)'}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">
                      Compatibility Status:
                    </span>
                    {verifiedActualDim === null ? (
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                        UNVERIFIED — Run POST /v1/embeddings first
                      </span>
                    ) : verifiedActualDim === parsedKbDim ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold">
                        ✓ COMPATIBLE ({verifiedActualDim} === {parsedKbDim})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 font-bold">
                        ✗ INCOMPATIBLE (Model returns {verifiedActualDim}, KB
                        expects {parsedKbDim})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {latestEmbeddingResultForSelected && (
              <TestResultView result={latestEmbeddingResultForSelected} />
            )}
          </div>

          {/* Section 3: Interactive Model Catalog Table + Per-Model Recursive Field Inspector */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-100">
                3. Interactive Model Catalog Table ({filteredModels.length} of{' '}
                {catalogAnalysis.totalModels} models)
              </h3>
              <span className="text-xs text-slate-400">
                Click any row to inspect its exact recursive JSON paths below.
              </span>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search model ID or owned_by..."
                className="px-3 py-1.5 text-xs font-mono rounded bg-slate-950 border border-slate-700 text-slate-100"
              />
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono rounded bg-slate-950 border border-slate-700 text-slate-100"
              >
                <option value="all">All Modes ({catalogAnalysis.totalModels})</option>
                {catalogAnalysis.modesFound.map((mode) => (
                  <option key={mode} value={mode}>
                    mode: {mode}
                  </option>
                ))}
              </select>
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono rounded bg-slate-950 border border-slate-700 text-slate-100"
              >
                <option value="all">All Providers (owned_by)</option>
                {catalogAnalysis.providersFound.map((p) => (
                  <option key={p} value={p}>
                    owned_by: {p}
                  </option>
                ))}
              </select>
              <select
                value={visionFilter}
                onChange={(e) => setVisionFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono rounded bg-slate-950 border border-slate-700 text-slate-100"
              >
                <option value="all">supports_vision: Any</option>
                <option value="true">supports_vision: true</option>
                <option value="false">supports_vision: false</option>
              </select>
              <select
                value={reasoningFilter}
                onChange={(e) => setReasoningFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono rounded bg-slate-950 border border-slate-700 text-slate-100"
              >
                <option value="all">supports_reasoning: Any</option>
                <option value="true">supports_reasoning: true</option>
                <option value="false">supports_reasoning: false</option>
              </select>
            </div>

            <div className="max-h-96 overflow-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead className="bg-slate-950 text-slate-300 sticky top-0">
                  <tr>
                    <th className="py-2 px-2.5 border-b border-slate-800">
                      Path
                    </th>
                    <th className="py-2 px-2.5 border-b border-slate-800">
                      id (Exact)
                    </th>
                    <th className="py-2 px-2.5 border-b border-slate-800">
                      owned_by
                    </th>
                    <th className="py-2 px-2.5 border-b border-slate-800">
                      mode
                    </th>
                    <th className="py-2 px-2.5 border-b border-slate-800">
                      context_length
                    </th>
                    <th className="py-2 px-2.5 border-b border-slate-800">
                      supports_vision
                    </th>
                    <th className="py-2 px-2.5 border-b border-slate-800">
                      supports_reasoning
                    </th>
                    <th className="py-2 px-2.5 border-b border-slate-800">
                      pricing.prompt
                    </th>
                    <th className="py-2 px-2.5 border-b border-slate-800">
                      pricing.completion
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredModels.map((m) => {
                    const isSelected = m.index === selectedModelIndex;
                    return (
                      <tr
                        key={m.modelId}
                        onClick={() => setSelectedModelIndex(m.index)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-950/60'
                            : 'hover:bg-slate-950/60'
                        }`}
                      >
                        <td className="py-1.5 px-2.5 text-slate-400">
                          {m.basePath}
                        </td>
                        <td className="py-1.5 px-2.5 text-sky-400 font-semibold">
                          {m.modelId}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-300">
                          {m.provider || '""'}
                        </td>
                        <td className="py-1.5 px-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                              m.mode === 'embedding'
                                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                                : m.mode === 'decision'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {m.mode}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-300">
                          {String(m.contextLength)}
                        </td>
                        <td className="py-1.5 px-2.5">
                          <span
                            className={
                              m.visionSupport === true
                                ? 'text-emerald-400 font-bold'
                                : 'text-slate-500'
                            }
                          >
                            {String(m.visionSupport)}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5">
                          <span
                            className={
                              m.thinkingSupport === true
                                ? 'text-purple-400 font-bold'
                                : 'text-slate-500'
                            }
                          >
                            {String(m.thinkingSupport)}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-emerald-300">
                          {String(m.inputTokenPrice)}
                        </td>
                        <td className="py-1.5 px-2.5 text-amber-300">
                          {String(m.outputTokenPrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Selected Model Recursive JSON Field Inspector */}
            {inspectedModel && (
              <JsonViewer
                title={`Recursive JSON Field Inspector for ${inspectedModel.basePath} (${inspectedModel.modelId})`}
                data={inspectedModel.rawObject}
                recursiveFields={inspectedModel.allFields}
                defaultTab="paths"
                maxHeightClass="max-h-80"
              />
            )}
          </div>

          {/* Section 4: Complete Raw GET /v1/models HTTP Response */}
          {modelsTestResult && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-100">
                4. Complete Raw <code className="text-sky-400">GET /v1/models</code> HTTP
                Response & Full Recursive Field Tree
              </h3>
              <TestResultView result={modelsTestResult} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
