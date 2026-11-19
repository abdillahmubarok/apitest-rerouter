'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Database,
  Play,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { TestResultView } from '@/components/endpoint-tester/TestResultView';
import { JsonViewer } from '@/components/json-viewer/JsonViewer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
    <div className="space-y-4">
      {/* Top Endpoint Bar */}
      <div className="rounded-md border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Model Catalog Inspector
            </h2>
            <HttpMethodBadge method="GET" />
            <code className="font-mono text-xs text-foreground">
              /v1/models
            </code>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live discovery of exact JSON field paths, data types, capabilities,
            pricing structures, and embedding vector dimensions.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onRefreshModels}
          disabled={isLoading}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
          />
          <span>
            {isLoading ? 'Requesting /v1/models...' : 'Re-fetch GET /v1/models'}
          </span>
        </Button>
      </div>

      {!catalogAnalysis ? (
        <div className="rounded-md border border-dashed border-border bg-muted/15 p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <Database className="h-5 w-5 text-muted-foreground/70" />
          <div>
            {isLoading
              ? 'Loading live model catalog from https://rerouter.mubarokah.com/v1/models...'
              : 'Click "Re-fetch GET /v1/models" to load and analyze the live model catalog.'}
          </div>
        </div>
      ) : (
        <>
          {/* Section 1: Discovered Schema & Exact Field Names Mapping */}
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-foreground">
                  1. Discovered Model Object Schema & Exact Field Names
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  No field names were assumed. Reports actual JSON keys
                  discovered in{' '}
                  <code className="font-mono text-sky-700 dark:text-sky-400">
                    {catalogAnalysis.modelsArrayPath}[i]
                  </code>{' '}
                  across {catalogAnalysis.totalModels} models.
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                Inspector Model: {inspectedModel?.basePath} (
                {inspectedModel?.modelId})
              </Badge>
            </div>

            {inspectedModel && (
              <Table className="font-mono">
                <TableHeader>
                  <TableRow>
                    <TableHead>Required Concept</TableHead>
                    <TableHead>Exact JSON Path</TableHead>
                    <TableHead>Exact Field Name</TableHead>
                    <TableHead>Data Type</TableHead>
                    <TableHead>
                      Actual Value (in {inspectedModel.basePath})
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
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
                    <TableRow key={m.concept}>
                      <TableCell className="font-sans font-medium text-foreground">
                        {m.concept}
                      </TableCell>
                      <TableCell className="text-sky-700 dark:text-sky-400">
                        {m.exactPath}
                      </TableCell>
                      <TableCell className="text-purple-700 dark:text-purple-400">
                        {m.fieldName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={m.found ? 'success' : 'warning'}
                          className="uppercase text-[10px] px-1.5 py-0"
                        >
                          {m.dataType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground break-all">
                        {m.formattedValue}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-sans font-medium text-foreground">
                      Other Pricing Fields
                    </TableCell>
                    <TableCell className="text-sky-700 dark:text-sky-400">
                      {inspectedModel.discoveredMappings.otherPricingFields
                        .map((f) => f.exactPath)
                        .join(', ')}
                    </TableCell>
                    <TableCell className="text-purple-700 dark:text-purple-400">
                      {catalogAnalysis.schemaSummary.otherPricingFields.join(
                        ', '
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="uppercase text-[10px] px-1.5 py-0"
                      >
                        string / object / null
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground break-all">
                      {inspectedModel.discoveredMappings.otherPricingFields
                        .map((f) => `${f.fieldName}=${f.formattedValue}`)
                        .join('; ')}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-sans font-medium text-foreground">
                      Other Capability / Metadata Fields
                    </TableCell>
                    <TableCell className="text-sky-700 dark:text-sky-400">
                      {inspectedModel.discoveredMappings.otherCapabilityFields
                        .map((f) => f.exactPath)
                        .join(', ')}
                    </TableCell>
                    <TableCell className="text-purple-700 dark:text-purple-400">
                      {catalogAnalysis.schemaSummary.otherCapabilityFields.join(
                        ', '
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="uppercase text-[10px] px-1.5 py-0"
                      >
                        number / string
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground break-all">
                      {inspectedModel.discoveredMappings.otherCapabilityFields
                        .map((f) => `${f.fieldName}=${f.formattedValue}`)
                        .join('; ')}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>

          {/* Section 2: Embedding Dimensions Dual Inspection & RAG Compatibility Tool */}
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/20">
              <h3 className="text-xs font-semibold text-foreground">
                2. Embedding Dimensions Inspector & Knowledge-Base (RAG)
                Compatibility
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Performs two separate inspections: (1) Catalog metadata audit
                and (2) Live{' '}
                <code className="font-mono">POST /v1/embeddings</code> vector
                dimension measurement via{' '}
                <code className="font-mono text-emerald-700 dark:text-emerald-400">
                  embedding.length
                </code>
                .
              </p>
            </div>

            {/* Part 1: Catalog Metadata Table */}
            <div className="border-b border-border">
              <div className="px-4 py-2 bg-muted/10 border-b border-border text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Inspection 1: Catalog Metadata Inspection (
                {catalogAnalysis.embeddingModels.length} Embedding Models Found)
              </div>
              <Table className="font-mono">
                <TableHeader>
                  <TableRow>
                    <TableHead>Catalog Path</TableHead>
                    <TableHead>Exact Model ID</TableHead>
                    <TableHead>Provider (owned_by)</TableHead>
                    <TableHead>Context Length</TableHead>
                    <TableHead>Prompt Price (pricing.prompt)</TableHead>
                    <TableHead>Catalog-Declared Embedding Dimension</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalogAnalysis.embeddingModels.map((em) => (
                    <TableRow key={em.modelId}>
                      <TableCell className="text-muted-foreground">
                        {em.basePath}
                      </TableCell>
                      <TableCell className="text-sky-700 dark:text-sky-400 font-semibold">
                        {em.modelId}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {em.provider}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {String(em.contextLength)}
                      </TableCell>
                      <TableCell className="text-emerald-700 dark:text-emerald-400">
                        {String(em.inputTokenPrice)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="warning">
                          {em.declaredEmbeddingDimension !== null
                            ? `${em.declaredEmbeddingDimension} (${em.declaredEmbeddingDimensionPath})`
                            : 'NOT PROVIDED BY MODEL CATALOG'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Part 2 & Part 3: Divided 2-Column Workbench */}
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
              {/* Live Embedding Test */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <HttpMethodBadge method="POST" />
                    <span className="text-xs font-semibold text-foreground">
                      Inspection 2: Live Embedding Test (/v1/embeddings)
                    </span>
                  </div>
                  <CategoryBadge category="B" />
                </div>

                <Alert variant="warning" className="py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <AlertDescription className="text-xs">
                    <strong>Warning:</strong> This request may consume API
                    credits. Uses minimal synthetic input:{' '}
                    <code className="font-mono">
                      [&quot;ReRouter embedding dimension verification&quot;]
                    </code>
                    .
                  </AlertDescription>
                </Alert>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <NativeSelect
                    value={selectedEmbeddingModel}
                    onChange={(e) => setSelectedEmbeddingModel(e.target.value)}
                    className="flex-1"
                  >
                    {catalogAnalysis.embeddingModels.map((em) => (
                      <option key={em.modelId} value={em.modelId}>
                        {em.modelId} (owned_by: {em.provider})
                      </option>
                    ))}
                  </NativeSelect>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      onExecuteEmbeddingDimensionTest(selectedEmbeddingModel)
                    }
                    disabled={isLoading}
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>
                      {isLoading ? 'Testing...' : 'Verify Vector Dimension'}
                    </span>
                  </Button>
                </div>

                {latestEmbeddingResultForSelected?.embeddingVerification && (
                  <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Model ID:</span>
                      <span className="text-sky-700 dark:text-sky-400">
                        {
                          latestEmbeddingResultForSelected.embeddingVerification
                            .modelId
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        HTTP Status:
                      </span>
                      <span className="text-foreground">
                        {
                          latestEmbeddingResultForSelected.embeddingVerification
                            .httpStatus
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Input Token Usage:
                      </span>
                      <span className="text-foreground">
                        {latestEmbeddingResultForSelected.embeddingVerification
                          .inputTokens ?? 'Not returned'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Actual Vector Dimension (embedding.length):
                      </span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        {latestEmbeddingResultForSelected.embeddingVerification
                          .actualVectorDimension ?? 'No vector in response'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Catalog-Declared Dimension:
                      </span>
                      <span className="text-amber-700 dark:text-amber-400">
                        {
                          latestEmbeddingResultForSelected.embeddingVerification
                            .catalogDeclaredStatus
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Dimensions Match:
                      </span>
                      <span className="text-sky-700 dark:text-sky-400">
                        {
                          latestEmbeddingResultForSelected.embeddingVerification
                            .dimensionsMatch
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Cost in USD:
                      </span>
                      <span className="text-emerald-700 dark:text-emerald-400">
                        {latestEmbeddingResultForSelected.embeddingVerification
                          .costUsd ?? 'Not returned'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* RAG Vector Dimension Compatibility Comparison Tool */}
              <div className="p-4 space-y-3">
                <div className="text-xs font-semibold text-foreground">
                  Knowledge-Base Vector Dimension Compatibility Tool
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enter your existing knowledge-base or vector database index
                  dimension (e.g., pgvector / Qdrant / Pinecone column size) to
                  verify compatibility with{' '}
                  <code className="font-mono text-sky-700 dark:text-sky-400">
                    {selectedEmbeddingModel}
                  </code>
                  .
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Label className="shrink-0">
                    Existing KB Vector Dimension:
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={65536}
                    value={kbDimensionInput}
                    onChange={(e) => setKbDimensionInput(e.target.value)}
                    className="w-28 font-mono text-xs"
                  />
                  <div className="flex gap-1">
                    {[768, 1024, 1536, 3072].map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setKbDimensionInput(String(preset))}
                        className="h-7 px-2 font-mono text-[11px]"
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-border bg-muted/20 p-3 font-mono text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Target Knowledge-Base Dimension:
                    </span>
                    <span className="text-foreground">
                      {Number.isNaN(parsedKbDim) ? 'Invalid' : parsedKbDim}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Catalog-Declared Dimension:
                    </span>
                    <span className="text-amber-700 dark:text-amber-400">
                      NOT PROVIDED BY MODEL CATALOG
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Live Verified Dimension ({selectedEmbeddingModel}):
                    </span>
                    <span className="text-foreground">
                      {verifiedActualDim !== null
                        ? verifiedActualDim
                        : 'NOT TESTED YET (Run live test on left)'}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      Compatibility Status:
                    </span>
                    {verifiedActualDim === null ? (
                      <Badge variant="warning">
                        UNVERIFIED — Run POST /v1/embeddings first
                      </Badge>
                    ) : verifiedActualDim === parsedKbDim ? (
                      <Badge variant="success">
                        <Check className="h-3 w-3" />
                        <span>
                          COMPATIBLE ({verifiedActualDim} === {parsedKbDim})
                        </span>
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <X className="h-3 w-3" />
                        <span>
                          INCOMPATIBLE (Model: {verifiedActualDim}, KB:{' '}
                          {parsedKbDim})
                        </span>
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {latestEmbeddingResultForSelected && (
              <div className="p-4 border-t border-border">
                <TestResultView result={latestEmbeddingResultForSelected} />
              </div>
            )}
          </div>

          {/* Section 3: Interactive Model Catalog Table + Per-Model Recursive Field Inspector */}
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-foreground">
                3. Interactive Model Catalog Table ({filteredModels.length} of{' '}
                {catalogAnalysis.totalModels} models)
              </h3>
              <span className="text-xs text-muted-foreground">
                Click any row to inspect its exact recursive JSON paths below.
              </span>
            </div>

            {/* Filter Bar */}
            <div className="p-3 border-b border-border bg-muted/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search model ID or owned_by..."
                  className="pl-8 font-mono text-xs"
                />
              </div>
              <NativeSelect
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
              >
                <option value="all">
                  All Modes ({catalogAnalysis.totalModels})
                </option>
                {catalogAnalysis.modesFound.map((mode) => (
                  <option key={mode} value={mode}>
                    mode: {mode}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
              >
                <option value="all">All Providers (owned_by)</option>
                {catalogAnalysis.providersFound.map((p) => (
                  <option key={p} value={p}>
                    owned_by: {p}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect
                value={visionFilter}
                onChange={(e) => setVisionFilter(e.target.value)}
              >
                <option value="all">supports_vision: Any</option>
                <option value="true">supports_vision: true</option>
                <option value="false">supports_vision: false</option>
              </NativeSelect>
              <NativeSelect
                value={reasoningFilter}
                onChange={(e) => setReasoningFilter(e.target.value)}
              >
                <option value="all">supports_reasoning: Any</option>
                <option value="true">supports_reasoning: true</option>
                <option value="false">supports_reasoning: false</option>
              </NativeSelect>
            </div>

            <div className="max-h-96 overflow-auto border-b border-border">
              <Table className="font-mono">
                <TableHeader className="sticky top-0 bg-muted">
                  <TableRow>
                    <TableHead>Path</TableHead>
                    <TableHead>id (Exact)</TableHead>
                    <TableHead>owned_by</TableHead>
                    <TableHead>mode</TableHead>
                    <TableHead>context_length</TableHead>
                    <TableHead>supports_vision</TableHead>
                    <TableHead>supports_reasoning</TableHead>
                    <TableHead>pricing.prompt</TableHead>
                    <TableHead>pricing.completion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModels.map((m) => {
                    const isSelected = m.index === selectedModelIndex;
                    return (
                      <TableRow
                        key={m.modelId}
                        data-state={isSelected ? 'selected' : undefined}
                        onClick={() => setSelectedModelIndex(m.index)}
                        className={`cursor-pointer ${
                          isSelected ? 'bg-accent' : ''
                        }`}
                      >
                        <TableCell className="text-muted-foreground">
                          {m.basePath}
                        </TableCell>
                        <TableCell className="text-sky-700 dark:text-sky-400 font-semibold">
                          {m.modelId}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {m.provider || '""'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              m.mode === 'embedding'
                                ? 'info'
                                : m.mode === 'decision'
                                  ? 'success'
                                  : 'secondary'
                            }
                            className="uppercase text-[10px] px-1.5 py-0"
                          >
                            {m.mode}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {String(m.contextLength)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              m.visionSupport === true
                                ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                                : 'text-muted-foreground'
                            }
                          >
                            {String(m.visionSupport)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              m.thinkingSupport === true
                                ? 'text-purple-700 dark:text-purple-400 font-semibold'
                                : 'text-muted-foreground'
                            }
                          >
                            {String(m.thinkingSupport)}
                          </span>
                        </TableCell>
                        <TableCell className="text-emerald-700 dark:text-emerald-400">
                          {String(m.inputTokenPrice)}
                        </TableCell>
                        <TableCell className="text-amber-700 dark:text-amber-300">
                          {String(m.outputTokenPrice)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {inspectedModel && (
              <div className="p-3.5 bg-background/20">
                <JsonViewer
                  title={`Recursive JSON Field Inspector for ${inspectedModel.basePath} (${inspectedModel.modelId})`}
                  data={inspectedModel.rawObject}
                  recursiveFields={inspectedModel.allFields}
                  defaultTab="paths"
                  maxHeightClass="max-h-80"
                />
              </div>
            )}
          </div>

          {/* Section 4: Complete Raw GET /v1/models HTTP Response */}
          {modelsTestResult && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-foreground">
                  4. Complete Raw HTTP Response & Full Recursive Field Tree
                </h3>
                <HttpMethodBadge method="GET" />
                <code className="font-mono text-xs text-foreground">
                  /v1/models
                </code>
              </div>
              <TestResultView result={modelsTestResult} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
