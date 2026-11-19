'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Clock,
  Database,
  Layers,
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
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  compareNullablePricesForSort,
  extractModelPricingFromRaw,
  formatRequestCost,
  type ExtractedLongContextPricing,
  type ExtractedModelPricing,
  type ExtractedOffpeakPricing,
  type InspectedTokenPrice,
} from '@/lib/format/pricing';
import type {
  AnalyzedModelItem,
  CatalogAnalysis,
  TestExecutionResult,
} from '@/lib/rerouter/types';

export type PriceDisplayUnit = 'per_1m' | 'per_token';
type PriceSortColumn = 'none' | 'input' | 'output' | 'cache';
type SortDirection = 'asc' | 'desc';

interface ModelCatalogPanelProps {
  catalogAnalysis: CatalogAnalysis | null;
  modelsTestResult: TestExecutionResult | null;
  embeddingTestResults: TestExecutionResult[];
  onRefreshModels: () => void;
  onExecuteEmbeddingDimensionTest: (modelId: string) => void;
  isLoading: boolean;
}

function LongContextBadge({
  longContext,
  priceUnit,
}: {
  longContext: ExtractedLongContextPricing;
  priceUnit: PriceDisplayUnit;
}) {
  const formatTierPrice = (p: InspectedTokenPrice, isCache = false) => {
    if (p.status !== 'valid') return '—';
    if (priceUnit === 'per_token') return `${p.rawString} USD/token`;
    if (isCache && p.isZero) return '—';
    return `${p.formattedPer1M} / 1M`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center focus:outline-none"
        >
          <Badge
            variant="info"
            className="text-[10px] px-1.5 py-0 gap-1 cursor-help"
          >
            <Layers className="h-2.5 w-2.5" />
            <span>Long context</span>
          </Badge>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs sm:max-w-sm p-3 space-y-2 font-mono text-xs">
        <div className="font-sans font-semibold text-foreground border-b border-border pb-1 flex items-center justify-between gap-2">
          <span>Long-Context Tiered Pricing</span>
          <Badge variant="info" className="text-[10px] px-1.5 py-0">
            {longContext.thresholdLabel}
          </Badge>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Threshold:</span>
            <span className="text-foreground font-semibold">
              {longContext.thresholdLabel}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Input / 1M:</span>
            <span className="text-emerald-700 dark:text-emerald-400">
              {formatTierPrice(longContext.prompt)} (Raw:{' '}
              {longContext.prompt.rawString ?? '—'})
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Output / 1M:</span>
            <span className="text-amber-700 dark:text-amber-300">
              {formatTierPrice(longContext.completion)} (Raw:{' '}
              {longContext.completion.rawString ?? '—'})
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Cache Read / 1M:</span>
            <span className="text-sky-700 dark:text-sky-400">
              {formatTierPrice(longContext.inputCacheRead, true)} (Raw:{' '}
              {longContext.inputCacheRead.rawString ?? '—'})
            </span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function OffpeakBadge({
  offpeak,
  priceUnit,
}: {
  offpeak: ExtractedOffpeakPricing;
  priceUnit: PriceDisplayUnit;
}) {
  const formatTierPrice = (p: InspectedTokenPrice, isCache = false) => {
    if (p.status !== 'valid') return '—';
    if (priceUnit === 'per_token') return `${p.rawString} USD/token`;
    if (isCache && p.isZero) return '—';
    return `${p.formattedPer1M} / 1M`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center focus:outline-none"
        >
          <Badge
            variant="purple"
            className="text-[10px] px-1.5 py-0 gap-1 cursor-help"
          >
            <Clock className="h-2.5 w-2.5" />
            <span>Off-peak</span>
          </Badge>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs sm:max-w-md p-3 space-y-2 font-mono text-xs">
        <div className="font-sans font-semibold text-foreground border-b border-border pb-1">
          Off-Peak Discount Pricing & Windows
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Off-peak Input / 1M:</span>
            <span className="text-emerald-700 dark:text-emerald-400">
              {formatTierPrice(offpeak.prompt)} (Raw:{' '}
              {offpeak.prompt.rawString ?? '—'})
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Off-peak Output / 1M:</span>
            <span className="text-amber-700 dark:text-amber-300">
              {formatTierPrice(offpeak.completion)} (Raw:{' '}
              {offpeak.completion.rawString ?? '—'})
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">
              Off-peak Cache Read / 1M:
            </span>
            <span className="text-sky-700 dark:text-sky-400">
              {formatTierPrice(offpeak.inputCacheRead, true)} (Raw:{' '}
              {offpeak.inputCacheRead.rawString ?? '—'})
            </span>
          </div>
        </div>
        {offpeak.windows.length > 0 && (
          <div className="pt-1.5 border-t border-border space-y-1.5 text-[11px]">
            <div className="font-sans font-medium text-foreground">
              Off-Peak Windows ({offpeak.windows.length}):
            </div>
            {offpeak.windows.map((w, idx) => (
              <div
                key={idx}
                className="rounded border border-border bg-muted/30 p-1.5 space-y-0.5"
              >
                <div>
                  <span className="text-muted-foreground">UTC Hours: </span>
                  <span className="text-foreground font-semibold">
                    {w.utcHoursLabel}
                  </span>{' '}
                  <span className="text-muted-foreground">
                    (raw hours_utc: {JSON.stringify(w.rawHoursUtc)})
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Local Time: </span>
                  <span className="text-sky-700 dark:text-sky-400">
                    {w.localHoursLabel}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Weekdays: </span>
                  <span className="text-amber-700 dark:text-amber-300">
                    {w.weekdaysLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function PriceValueDisplay({
  price,
  priceUnit,
  isFreeModel,
  isEmbeddingOutput,
  isCacheRead,
  colorClass,
}: {
  price: InspectedTokenPrice;
  priceUnit: PriceDisplayUnit;
  isFreeModel?: boolean;
  isEmbeddingOutput?: boolean;
  isCacheRead?: boolean;
  colorClass: string;
}) {
  if (isEmbeddingOutput && priceUnit === 'per_1m') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground cursor-help select-none">
            —
          </span>
        </TooltipTrigger>
        <TooltipContent className="font-mono text-xs">
          Embedding models bill input tokens only
          {price.rawString ? ` (Raw: ${price.rawString} USD/token)` : ''}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (price.status === 'missing') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground cursor-help select-none">
            —
          </span>
        </TooltipTrigger>
        <TooltipContent className="font-mono text-xs">
          Not provided by catalog
        </TooltipContent>
      </Tooltip>
    );
  }

  if (price.status === 'unparseable') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 cursor-help">
            <span>—</span>
            <AlertTriangle
              className="h-3.5 w-3.5 shrink-0"
              aria-label={price.tooltip}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent className="font-mono text-xs">
          {price.tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Valid decimal price
  if (priceUnit === 'per_token') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1.5 cursor-help ${colorClass}`}
          >
            <span>{price.rawString}</span>
            {isFreeModel && !isCacheRead && (
              <Badge variant="success" className="text-[10px] px-1.5 py-0">
                FREE
              </Badge>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent className="font-mono text-xs">
          {isEmbeddingOutput
            ? `Embedding models bill input tokens only (Raw: ${price.rawString} USD/token)`
            : `${price.tooltip} (${price.formattedPer1M} / 1M)`}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Per 1M tokens mode
  if (isCacheRead && price.isZero) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground cursor-help select-none">
            —
          </span>
        </TooltipTrigger>
        <TooltipContent className="font-mono text-xs">
          {price.tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (isFreeModel && !isCacheRead) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1.5 cursor-help">
            <Badge variant="success" className="text-[10px] px-1.5 py-0">
              FREE
            </Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent className="font-mono text-xs">
          {price.tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`cursor-help ${colorClass}`}>
          {price.formattedPer1M}
        </span>
      </TooltipTrigger>
      <TooltipContent className="font-mono text-xs">
        {price.tooltip}
      </TooltipContent>
    </Tooltip>
  );
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

  // React state only (no browser storage) for price unit toggle & price sorting
  const [priceUnit, setPriceUnit] = useState<PriceDisplayUnit>('per_1m');
  const [sortColumn, setSortColumn] = useState<PriceSortColumn>('none');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const defaultEmbeddingModelId =
    catalogAnalysis?.embeddingModels[0]?.modelId ??
    'gemini/gemini-embedding-001';
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState<string>(
    defaultEmbeddingModelId
  );
  const [kbDimensionInput, setKbDimensionInput] = useState<string>('1536');

  // Pre-compute extracted pricing at render time without mutating raw model objects
  const modelPricingMap = useMemo(() => {
    const map = new Map<number, ExtractedModelPricing>();
    if (!catalogAnalysis) return map;
    for (const m of catalogAnalysis.models) {
      map.set(m.index, extractModelPricingFromRaw(m.rawObject));
    }
    return map;
  }, [catalogAnalysis]);

  const handleToggleSort = (column: Exclude<PriceSortColumn, 'none'>) => {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortColumn('none');
      setSortDirection('asc');
    }
  };

  const filteredModels = useMemo(() => {
    if (!catalogAnalysis) return [];
    const base = catalogAnalysis.models.filter((m) => {
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

    if (sortColumn === 'none') {
      return base;
    }

    return [...base].sort((a, b) => {
      const pA = modelPricingMap.get(a.index);
      const pB = modelPricingMap.get(b.index);

      if (sortColumn === 'input') {
        return compareNullablePricesForSort(
          pA?.prompt.rawString ?? null,
          pB?.prompt.rawString ?? null,
          sortDirection
        );
      }

      if (sortColumn === 'output') {
        const valA =
          a.mode === 'embedding' && priceUnit === 'per_1m'
            ? null
            : (pA?.completion.rawString ?? null);
        const valB =
          b.mode === 'embedding' && priceUnit === 'per_1m'
            ? null
            : (pB?.completion.rawString ?? null);
        return compareNullablePricesForSort(valA, valB, sortDirection);
      }

      // cache column
      const valA =
        priceUnit === 'per_1m' && pA?.inputCacheRead.isZero
          ? null
          : (pA?.inputCacheRead.rawString ?? null);
      const valB =
        priceUnit === 'per_1m' && pB?.inputCacheRead.isZero
          ? null
          : (pB?.inputCacheRead.rawString ?? null);
      return compareNullablePricesForSort(valA, valB, sortDirection);
    });
  }, [
    catalogAnalysis,
    modeFilter,
    providerFilter,
    visionFilter,
    reasoningFilter,
    searchQuery,
    sortColumn,
    sortDirection,
    modelPricingMap,
    priceUnit,
  ]);

  const inspectedModel: AnalyzedModelItem | null =
    catalogAnalysis?.models[selectedModelIndex] ??
    catalogAnalysis?.models[0] ??
    null;

  const inspectedModelPricing: ExtractedModelPricing | null = inspectedModel
    ? (modelPricingMap.get(inspectedModel.index) ??
      extractModelPricingFromRaw(inspectedModel.rawObject))
    : null;

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

  const renderSortIcon = (column: Exclude<PriceSortColumn, 'none'>) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-sky-600 dark:text-sky-400" />
    ) : (
      <ArrowDown className="h-3 w-3 text-sky-600 dark:text-sky-400" />
    );
  };

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
            human-readable USD / 1M token pricing structures, and embedding
            vector dimensions.
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
                    <TableHead>
                      Input / 1M (USD / 1M tokens · pricing.prompt)
                    </TableHead>
                    <TableHead>
                      Output / 1M (USD / 1M tokens · pricing.completion)
                    </TableHead>
                    <TableHead>Catalog-Declared Embedding Dimension</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalogAnalysis.embeddingModels.map((em) => {
                    const emPricing =
                      modelPricingMap.get(em.index) ??
                      extractModelPricingFromRaw(em.rawObject);
                    return (
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
                        <TableCell>
                          <PriceValueDisplay
                            price={emPricing.prompt}
                            priceUnit={priceUnit}
                            isFreeModel={emPricing.isFree}
                            colorClass="text-emerald-700 dark:text-emerald-400 font-semibold"
                          />
                        </TableCell>
                        <TableCell>
                          <PriceValueDisplay
                            price={emPricing.completion}
                            priceUnit={priceUnit}
                            isEmbeddingOutput
                            colorClass="text-amber-700 dark:text-amber-300"
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="warning">
                            {em.declaredEmbeddingDimension !== null
                              ? `${em.declaredEmbeddingDimension} (${em.declaredEmbeddingDimensionPath})`
                              : 'NOT PROVIDED BY MODEL CATALOG'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                        {formatRequestCost(
                          latestEmbeddingResultForSelected.embeddingVerification
                            .costUsd
                        )}
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
            <div className="px-4 py-3 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-foreground">
                  3. Interactive Model Catalog Table ({filteredModels.length} of{' '}
                  {catalogAnalysis.totalModels} models)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Prices displayed in{' '}
                  <strong className="text-foreground">
                    {priceUnit === 'per_1m'
                      ? 'USD / 1M tokens'
                      : 'Raw USD / token (API strings unchanged)'}
                  </strong>
                  . Hover any price for exact raw USD/token value, or click
                  price column headers to sort numerically.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono text-muted-foreground">
                  Pricing Unit:
                </span>
                <ToggleGroup
                  type="single"
                  value={priceUnit}
                  onValueChange={(val) =>
                    setPriceUnit(
                      val === 'per_token' ? 'per_token' : 'per_1m'
                    )
                  }
                  aria-label="Pricing display unit"
                >
                  <ToggleGroupItem value="per_1m">
                    Per 1M tokens
                  </ToggleGroupItem>
                  <ToggleGroupItem value="per_token">
                    Per token (raw)
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
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

            <div className="max-h-[480px] overflow-auto border-b border-border">
              <Table className="font-mono">
                <TableHeader className="sticky top-0 z-10 bg-muted">
                  <TableRow>
                    <TableHead>Path</TableHead>
                    <TableHead>id (Exact)</TableHead>
                    <TableHead>owned_by</TableHead>
                    <TableHead>mode</TableHead>
                    <TableHead>context_length</TableHead>
                    <TableHead>supports_vision</TableHead>
                    <TableHead>supports_reasoning</TableHead>
                    <TableHead>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => handleToggleSort('input')}
                            className="inline-flex items-center gap-1 text-left font-medium hover:text-foreground cursor-pointer"
                          >
                            <span>
                              {priceUnit === 'per_1m'
                                ? 'Input / 1M'
                                : 'Input (Raw)'}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              ({priceUnit === 'per_1m' ? 'USD / 1M tokens' : 'USD / token'})
                            </span>
                            {renderSortIcon('input')}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="font-mono text-xs">
                          Source: pricing.prompt · Unit: USD / 1M tokens (Click
                          to sort by numeric decimal price)
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => handleToggleSort('output')}
                            className="inline-flex items-center gap-1 text-left font-medium hover:text-foreground cursor-pointer"
                          >
                            <span>
                              {priceUnit === 'per_1m'
                                ? 'Output / 1M'
                                : 'Output (Raw)'}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              ({priceUnit === 'per_1m' ? 'USD / 1M tokens' : 'USD / token'})
                            </span>
                            {renderSortIcon('output')}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="font-mono text-xs">
                          Source: pricing.completion · Unit: USD / 1M tokens
                          (Click to sort by numeric decimal price)
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => handleToggleSort('cache')}
                            className="inline-flex items-center gap-1 text-left font-medium hover:text-foreground cursor-pointer"
                          >
                            <span>
                              {priceUnit === 'per_1m'
                                ? 'Cache Read / 1M'
                                : 'Cache Read (Raw)'}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              ({priceUnit === 'per_1m' ? 'USD / 1M tokens' : 'USD / token'})
                            </span>
                            {renderSortIcon('cache')}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="font-mono text-xs">
                          Source: pricing.input_cache_read · Unit: USD / 1M
                          tokens (Shows — if zero or absent)
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModels.map((m) => {
                    const isSelected = m.index === selectedModelIndex;
                    const pricing =
                      modelPricingMap.get(m.index) ??
                      extractModelPricingFromRaw(m.rawObject);
                    const isEmbedding = m.mode === 'embedding';

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
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span>{m.modelId}</span>
                            {pricing.isFree && (
                              <Badge
                                variant="success"
                                className="text-[10px] px-1.5 py-0"
                              >
                                FREE
                              </Badge>
                            )}
                          </div>
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
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <PriceValueDisplay
                              price={pricing.prompt}
                              priceUnit={priceUnit}
                              isFreeModel={pricing.isFree}
                              colorClass="text-emerald-700 dark:text-emerald-400 font-medium"
                            />
                            {pricing.longContext && (
                              <LongContextBadge
                                longContext={pricing.longContext}
                                priceUnit={priceUnit}
                              />
                            )}
                            {pricing.offpeak && (
                              <OffpeakBadge
                                offpeak={pricing.offpeak}
                                priceUnit={priceUnit}
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <PriceValueDisplay
                            price={pricing.completion}
                            priceUnit={priceUnit}
                            isFreeModel={pricing.isFree}
                            isEmbeddingOutput={isEmbedding}
                            colorClass="text-amber-700 dark:text-amber-300 font-medium"
                          />
                        </TableCell>
                        <TableCell>
                          <PriceValueDisplay
                            price={pricing.inputCacheRead}
                            priceUnit={priceUnit}
                            isCacheRead
                            colorClass="text-sky-700 dark:text-sky-400 font-medium"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {inspectedModel && inspectedModelPricing && (
              <div className="p-3.5 bg-background/20 space-y-3">
                {/* Selected Model Pricing & Tiered Pricing Summary Strip */}
                <div className="rounded-md border border-border bg-card p-3 space-y-2.5 font-mono text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-sans font-semibold text-foreground">
                        Selected Model Pricing Summary:
                      </span>
                      <code className="text-sky-700 dark:text-sky-400 font-semibold">
                        {inspectedModel.modelId}
                      </code>
                      <Badge variant="outline" className="text-[10px]">
                        mode: {inspectedModel.mode}
                      </Badge>
                      {inspectedModelPricing.isFree && (
                        <Badge variant="success" className="text-[10px]">
                          FREE
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Raw JSON below remains unmodified
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border rounded border border-border bg-muted/20">
                    <div className="px-3 py-2">
                      <div className="text-[10px] text-muted-foreground uppercase">
                        Input / 1M (pricing.prompt)
                      </div>
                      <div className="text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                        {inspectedModelPricing.isFree
                          ? '$0.00 / 1M (FREE)'
                          : `${inspectedModelPricing.prompt.formattedPer1M} / 1M`}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {inspectedModelPricing.prompt.tooltip}
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      <div className="text-[10px] text-muted-foreground uppercase">
                        Output / 1M (pricing.completion)
                      </div>
                      <div className="text-amber-700 dark:text-amber-300 font-semibold mt-0.5">
                        {inspectedModel.mode === 'embedding'
                          ? '— (Embedding models bill input tokens only)'
                          : inspectedModelPricing.isFree
                            ? '$0.00 / 1M (FREE)'
                            : `${inspectedModelPricing.completion.formattedPer1M} / 1M`}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {inspectedModelPricing.completion.tooltip}
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      <div className="text-[10px] text-muted-foreground uppercase">
                        Cache Read / 1M (pricing.input_cache_read)
                      </div>
                      <div className="text-sky-700 dark:text-sky-400 font-semibold mt-0.5">
                        {inspectedModelPricing.inputCacheRead.status ===
                          'valid' &&
                        !inspectedModelPricing.inputCacheRead.isZero
                          ? `${inspectedModelPricing.inputCacheRead.formattedPer1M} / 1M`
                          : '—'}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {inspectedModelPricing.inputCacheRead.tooltip}
                      </div>
                    </div>
                  </div>

                  {(inspectedModelPricing.longContext ||
                    inspectedModelPricing.offpeak) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                      {inspectedModelPricing.longContext && (
                        <div className="rounded border border-blue-500/30 bg-blue-500/5 p-2.5 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="info" className="text-[10px]">
                              Long context
                            </Badge>
                            <span className="text-[11px] font-semibold text-foreground">
                              {inspectedModelPricing.longContext.thresholdLabel}
                            </span>
                          </div>
                          <div className="text-[11px] space-y-0.5 pt-1">
                            <div>
                              Input:{' '}
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                {
                                  inspectedModelPricing.longContext.prompt
                                    .formattedPer1M
                                }{' '}
                                / 1M
                              </span>{' '}
                              <span className="text-muted-foreground">
                                (
                                {
                                  inspectedModelPricing.longContext.prompt
                                    .tooltip
                                }
                                )
                              </span>
                            </div>
                            <div>
                              Output:{' '}
                              <span className="text-amber-700 dark:text-amber-300 font-semibold">
                                {
                                  inspectedModelPricing.longContext.completion
                                    .formattedPer1M
                                }{' '}
                                / 1M
                              </span>{' '}
                              <span className="text-muted-foreground">
                                (
                                {
                                  inspectedModelPricing.longContext.completion
                                    .tooltip
                                }
                                )
                              </span>
                            </div>
                            <div>
                              Cache Read:{' '}
                              <span className="text-sky-700 dark:text-sky-400 font-semibold">
                                {inspectedModelPricing.longContext
                                  .inputCacheRead.status === 'valid' &&
                                !inspectedModelPricing.longContext
                                  .inputCacheRead.isZero
                                  ? `${inspectedModelPricing.longContext.inputCacheRead.formattedPer1M} / 1M`
                                  : '—'}
                              </span>{' '}
                              <span className="text-muted-foreground">
                                (
                                {
                                  inspectedModelPricing.longContext
                                    .inputCacheRead.tooltip
                                }
                                )
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {inspectedModelPricing.offpeak && (
                        <div className="rounded border border-purple-500/30 bg-purple-500/5 p-2.5 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="purple" className="text-[10px]">
                              Off-peak
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {inspectedModelPricing.offpeak.windows.length}{' '}
                              window(s)
                            </span>
                          </div>
                          <div className="text-[11px] space-y-0.5 pt-1">
                            <div>
                              Input:{' '}
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                {
                                  inspectedModelPricing.offpeak.prompt
                                    .formattedPer1M
                                }{' '}
                                / 1M
                              </span>{' '}
                              <span className="text-muted-foreground">
                                ({inspectedModelPricing.offpeak.prompt.tooltip})
                              </span>
                            </div>
                            <div>
                              Output:{' '}
                              <span className="text-amber-700 dark:text-amber-300 font-semibold">
                                {
                                  inspectedModelPricing.offpeak.completion
                                    .formattedPer1M
                                }{' '}
                                / 1M
                              </span>{' '}
                              <span className="text-muted-foreground">
                                (
                                {
                                  inspectedModelPricing.offpeak.completion
                                    .tooltip
                                }
                                )
                              </span>
                            </div>
                            <div>
                              Cache Read:{' '}
                              <span className="text-sky-700 dark:text-sky-400 font-semibold">
                                {inspectedModelPricing.offpeak.inputCacheRead
                                  .status === 'valid' &&
                                !inspectedModelPricing.offpeak.inputCacheRead
                                  .isZero
                                  ? `${inspectedModelPricing.offpeak.inputCacheRead.formattedPer1M} / 1M`
                                  : '—'}
                              </span>{' '}
                              <span className="text-muted-foreground">
                                (
                                {
                                  inspectedModelPricing.offpeak.inputCacheRead
                                    .tooltip
                                }
                                )
                              </span>
                            </div>
                            {inspectedModelPricing.offpeak.windows.map(
                              (w, idx) => (
                                <div
                                  key={idx}
                                  className="pt-1 mt-1 border-t border-border/60"
                                >
                                  <div>
                                    UTC: <strong>{w.utcHoursLabel}</strong> ·
                                    Local: {w.localHoursLabel}
                                  </div>
                                  <div className="text-amber-700 dark:text-amber-300">
                                    Weekdays: {w.weekdaysLabel}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

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
