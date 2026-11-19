import type {
  AnalyzedModelItem,
  CatalogAnalysis,
  CatalogSnapshot,
  CatalogSnapshotComparison,
  DiscoveredFieldPath,
  JsonDataType,
  JsonFieldEntry,
  SnapshotFieldDiff,
} from './types';

export function getJsonDataType(val: unknown): JsonDataType {
  if (val === null || val === undefined) return 'null';
  if (Array.isArray(val)) return 'array';
  const t = typeof val;
  if (t === 'string') return 'string';
  if (t === 'number') return 'number';
  if (t === 'boolean') return 'boolean';
  return 'object';
}

export function formatJsonValue(val: unknown): string {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val === 'string') return JSON.stringify(val);
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) return `Array(${val.length})`;
  if (typeof val === 'object') {
    const keys = Object.keys(val as Record<string, unknown>);
    return `Object{${keys.join(', ')}}`;
  }
  return String(val);
}

export function inspectJsonRecursively(
  data: unknown,
  basePath = '',
  maxEntries = 4000
): JsonFieldEntry[] {
  const entries: JsonFieldEntry[] = [];

  function walk(current: unknown, currentPath: string, fieldName: string) {
    if (entries.length >= maxEntries) return;
    const dataType = getJsonDataType(current);

    if (currentPath) {
      entries.push({
        path: currentPath,
        fieldName,
        value:
          dataType === 'object' || dataType === 'array'
            ? undefined
            : current,
        formattedValue: formatJsonValue(current),
        dataType,
      });
    }

    if (Array.isArray(current)) {
      for (let i = 0; i < current.length; i++) {
        if (entries.length >= maxEntries) break;
        const itemPath = currentPath ? `${currentPath}[${i}]` : `[${i}]`;
        walk(current[i], itemPath, `[${i}]`);
      }
    } else if (current !== null && typeof current === 'object') {
      const obj = current as Record<string, unknown>;
      for (const key of Object.keys(obj)) {
        if (entries.length >= maxEntries) break;
        const nextPath = currentPath ? `${currentPath}.${key}` : key;
        walk(obj[key], nextPath, key);
      }
    }
  }

  walk(data, basePath, basePath);
  return entries;
}

function getRelativeEntries(obj: Record<string, unknown>, basePath: string): JsonFieldEntry[] {
  return inspectJsonRecursively(obj, basePath, 500);
}

function findMatchingField(
  relEntries: JsonFieldEntry[],
  basePath: string,
  concept: string,
  candidateRelativePaths: string[],
  fallbackRegex?: RegExp,
  notFoundLabel = 'NOT PRESENT IN MODEL OBJECT'
): DiscoveredFieldPath {
  for (const rel of candidateRelativePaths) {
    const targetPath = `${basePath}.${rel}`;
    const match = relEntries.find((e) => e.path === targetPath);
    if (match) {
      return {
        concept,
        found: true,
        exactPath: match.path,
        fieldName: rel,
        actualValue: match.value,
        formattedValue: match.formattedValue,
        dataType: match.dataType,
      };
    }
  }

  if (fallbackRegex) {
    const match = relEntries.find((e) => {
      const relPath = e.path.startsWith(`${basePath}.`)
        ? e.path.slice(basePath.length + 1)
        : e.path;
      return (
        fallbackRegex.test(relPath) &&
        e.dataType !== 'object' &&
        e.dataType !== 'array'
      );
    });
    if (match) {
      const relName = match.path.startsWith(`${basePath}.`)
        ? match.path.slice(basePath.length + 1)
        : match.fieldName;
      return {
        concept,
        found: true,
        exactPath: match.path,
        fieldName: relName,
        actualValue: match.value,
        formattedValue: match.formattedValue,
        dataType: match.dataType,
      };
    }
  }

  return {
    concept,
    found: false,
    exactPath: notFoundLabel,
    fieldName: notFoundLabel,
    actualValue: null,
    formattedValue: notFoundLabel,
    dataType: 'not_present',
  };
}

export function analyzeModelCatalog(rawJson: unknown): CatalogAnalysis {
  const fetchedAt = new Date().toISOString();
  let topLevelKeys: string[] = [];
  let modelsArray: unknown[] = [];
  let modelsArrayPath = '';

  if (Array.isArray(rawJson)) {
    modelsArray = rawJson;
    modelsArrayPath = '';
    topLevelKeys = ['[root array]'];
  } else if (rawJson !== null && typeof rawJson === 'object') {
    const rootObj = rawJson as Record<string, unknown>;
    topLevelKeys = Object.keys(rootObj);
    if (Array.isArray(rootObj.data)) {
      modelsArray = rootObj.data;
      modelsArrayPath = 'data';
    } else if (Array.isArray(rootObj.models)) {
      modelsArray = rootObj.models;
      modelsArrayPath = 'models';
    } else {
      const firstArrKey = topLevelKeys.find((k) => Array.isArray(rootObj[k]));
      if (firstArrKey) {
        modelsArray = rootObj[firstArrKey] as unknown[];
        modelsArrayPath = firstArrKey;
      }
    }
  }

  const allObservedPathsSet = new Set<string>();
  const modesSet = new Set<string>();
  const providersSet = new Set<string>();
  const prefixesSet = new Set<string>();

  let totalWithSlashPrefix = 0;
  let totalWithoutSlashPrefix = 0;
  let totalWithColonTag = 0;
  const examplesWithPrefix: string[] = [];
  const examplesWithoutPrefix: string[] = [];

  const analyzedModels: AnalyzedModelItem[] = [];

  for (let i = 0; i < modelsArray.length; i++) {
    const item = modelsArray[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const rawObj = item as Record<string, unknown>;
    const basePath = modelsArrayPath ? `${modelsArrayPath}[${i}]` : `[${i}]`;
    const allFields = getRelativeEntries(rawObj, basePath);

    for (const f of allFields) {
      if (f.path.startsWith(`${basePath}.`)) {
        allObservedPathsSet.add(f.path.slice(basePath.length + 1));
      }
    }

    const modelIdMap = findMatchingField(
      allFields,
      basePath,
      'Model ID',
      ['id', 'model_id', 'modelId', 'slug'],
      /^id$/i
    );
    const modelNameMap = findMatchingField(
      allFields,
      basePath,
      'Model Name',
      ['name', 'display_name', 'model_name', 'title'],
      /name/i
    );
    const providerMap = findMatchingField(
      allFields,
      basePath,
      'Provider',
      ['owned_by', 'provider', 'vendor', 'organization', 'owner'],
      /owned_by|provider|owner/i
    );
    const modeMap = findMatchingField(
      allFields,
      basePath,
      'Mode',
      ['mode', 'type', 'task', 'modality'],
      /^mode$/i
    );
    const visionMap = findMatchingField(
      allFields,
      basePath,
      'Vision Support',
      ['supports_vision', 'vision', 'capabilities.vision', 'architecture.vision'],
      /vision/i
    );
    const thinkingMap = findMatchingField(
      allFields,
      basePath,
      'Thinking / Reasoning Support',
      [
        'supports_reasoning',
        'supports_thinking',
        'thinking',
        'reasoning',
        'capabilities.reasoning',
        'capabilities.thinking',
      ],
      /reasoning|thinking/i
    );
    const inputPriceMap = findMatchingField(
      allFields,
      basePath,
      'Input Token Price',
      ['pricing.prompt', 'input_price', 'pricing.input', 'price.input', 'prompt_price'],
      /pricing\.prompt|input_price/i
    );
    const outputPriceMap = findMatchingField(
      allFields,
      basePath,
      'Output Token Price',
      [
        'pricing.completion',
        'output_price',
        'pricing.output',
        'price.output',
        'completion_price',
      ],
      /pricing\.completion|output_price/i
    );

    const modeStr =
      typeof modeMap.actualValue === 'string' ? modeMap.actualValue : 'unknown';

    const dedicatedEmbeddingPriceMap = findMatchingField(
      allFields,
      basePath,
      'Embedding Price',
      ['embedding_price', 'pricing.embedding', 'price.embedding'],
      /embedding_price|pricing\.embedding/i
    );

    let embeddingPriceMap: DiscoveredFieldPath;
    if (dedicatedEmbeddingPriceMap.found) {
      embeddingPriceMap = dedicatedEmbeddingPriceMap;
    } else if (modeStr === 'embedding' && inputPriceMap.found) {
      embeddingPriceMap = {
        concept: 'Embedding Price',
        found: true,
        exactPath: inputPriceMap.exactPath,
        fieldName: `${inputPriceMap.fieldName} (no separate embedding_price key; uses pricing.prompt)`,
        actualValue: inputPriceMap.actualValue,
        formattedValue: inputPriceMap.formattedValue,
        dataType: inputPriceMap.dataType,
        note: 'No dedicated embedding_price key exists; embedding models report per-token price under pricing.prompt (and pricing.input_cache_read) with pricing.completion = "0.000000000000".',
      };
    } else {
      embeddingPriceMap = {
        concept: 'Embedding Price',
        found: false,
        exactPath:
          modeStr === 'embedding'
            ? 'NOT PROVIDED BY MODEL CATALOG'
            : 'N/A (no separate embedding_price field in schema)',
        fieldName: 'NOT PRESENT IN MODEL OBJECT',
        actualValue: null,
        formattedValue:
          modeStr === 'embedding'
            ? 'NOT PROVIDED BY MODEL CATALOG'
            : 'No dedicated embedding_price field',
        dataType: 'not_present',
      };
    }

    const embeddingDimMap = findMatchingField(
      allFields,
      basePath,
      'Embedding Dimensions',
      [
        'dimensions',
        'embedding_dimensions',
        'embedding_dimension',
        'vector_size',
        'output_dimensions',
        'dimension',
      ],
      /dimension|vector_size|embedding_len/i,
      'NOT PROVIDED BY MODEL CATALOG'
    );

    const primaryPaths = new Set([
      modelIdMap.exactPath,
      modelNameMap.exactPath,
      providerMap.exactPath,
      modeMap.exactPath,
      visionMap.exactPath,
      thinkingMap.exactPath,
      inputPriceMap.exactPath,
      outputPriceMap.exactPath,
      dedicatedEmbeddingPriceMap.exactPath,
      embeddingDimMap.exactPath,
    ]);

    const otherPricingFields: DiscoveredFieldPath[] = [];
    const otherCapabilityFields: DiscoveredFieldPath[] = [];

    for (const entry of allFields) {
      if (entry.path === basePath) continue;
      if (primaryPaths.has(entry.path)) continue;
      const rel = entry.path.startsWith(`${basePath}.`)
        ? entry.path.slice(basePath.length + 1)
        : entry.path;

      if (/price|pricing|cost/i.test(rel)) {
        otherPricingFields.push({
          concept: `Other Pricing (${rel})`,
          found: true,
          exactPath: entry.path,
          fieldName: rel,
          actualValue: entry.value,
          formattedValue: entry.formattedValue,
          dataType: entry.dataType,
        });
      } else {
        otherCapabilityFields.push({
          concept: `Capability / Metadata (${rel})`,
          found: true,
          exactPath: entry.path,
          fieldName: rel,
          actualValue: entry.value,
          formattedValue: entry.formattedValue,
          dataType: entry.dataType,
        });
      }
    }

    const modelId =
      typeof modelIdMap.actualValue === 'string'
        ? modelIdMap.actualValue
        : String(modelIdMap.actualValue ?? `unknown-${i}`);
    const modelName =
      typeof modelNameMap.actualValue === 'string'
        ? modelNameMap.actualValue
        : modelId;
    const provider =
      typeof providerMap.actualValue === 'string'
        ? providerMap.actualValue
        : '';

    modesSet.add(modeStr);
    providersSet.add(provider || '(empty string)');

    const slashIdx = modelId.indexOf('/');
    const hasProviderPrefix = slashIdx > 0;
    const providerPrefix = hasProviderPrefix ? modelId.slice(0, slashIdx) : null;
    if (hasProviderPrefix && providerPrefix) {
      totalWithSlashPrefix++;
      prefixesSet.add(providerPrefix);
      if (examplesWithPrefix.length < 8) examplesWithPrefix.push(modelId);
    } else {
      totalWithoutSlashPrefix++;
      if (examplesWithoutPrefix.length < 8) examplesWithoutPrefix.push(modelId);
    }

    const colonIdx = modelId.indexOf(':');
    const hasTagSuffix = colonIdx > 0;
    const tagSuffix = hasTagSuffix ? modelId.slice(colonIdx + 1) : null;
    if (hasTagSuffix) {
      totalWithColonTag++;
    }

    const declaredDim =
      embeddingDimMap.found && typeof embeddingDimMap.actualValue === 'number'
        ? embeddingDimMap.actualValue
        : null;

    analyzedModels.push({
      index: i,
      basePath,
      rawObject: rawObj,
      modelId,
      modelName,
      provider,
      mode: modeStr,
      hasProviderPrefix,
      providerPrefix,
      hasTagSuffix,
      tagSuffix,
      visionSupport: visionMap.actualValue,
      thinkingSupport: thinkingMap.actualValue,
      inputTokenPrice: inputPriceMap.actualValue,
      outputTokenPrice: outputPriceMap.actualValue,
      embeddingPrice: embeddingPriceMap.actualValue,
      declaredEmbeddingDimension: declaredDim,
      declaredEmbeddingDimensionPath: embeddingDimMap.found
        ? embeddingDimMap.exactPath
        : 'NOT PROVIDED BY MODEL CATALOG',
      contextLength: rawObj.context_length ?? null,
      discoveredMappings: {
        modelId: modelIdMap,
        modelName: modelNameMap,
        provider: providerMap,
        mode: modeMap,
        visionSupport: visionMap,
        thinkingSupport: thinkingMap,
        inputTokenPrice: inputPriceMap,
        outputTokenPrice: outputPriceMap,
        embeddingPrice: embeddingPriceMap,
        embeddingDimensions: embeddingDimMap,
        otherPricingFields,
        otherCapabilityFields,
      },
      allFields,
    });
  }

  const firstModel = analyzedModels[0];
  const allPaths = Array.from(allObservedPathsSet).sort();

  const otherPricingPaths = allPaths.filter(
    (p) =>
      /price|pricing|cost/i.test(p) &&
      p !== 'pricing.prompt' &&
      p !== 'pricing.completion'
  );
  const otherCapabilityPaths = allPaths.filter(
    (p) =>
      !/price|pricing|cost/i.test(p) &&
      ![
        'id',
        'name',
        'owned_by',
        'mode',
        'supports_vision',
        'supports_reasoning',
      ].includes(p)
  );

  const schemaSummary = {
    modelIdField: firstModel?.discoveredMappings.modelId.fieldName ?? 'NOT OBSERVED',
    modelNameField: firstModel?.discoveredMappings.modelName.fieldName ?? 'NOT OBSERVED',
    providerField: firstModel?.discoveredMappings.provider.fieldName ?? 'NOT OBSERVED',
    modeField: firstModel?.discoveredMappings.mode.fieldName ?? 'NOT OBSERVED',
    visionSupportField:
      firstModel?.discoveredMappings.visionSupport.fieldName ?? 'NOT OBSERVED',
    thinkingSupportField:
      firstModel?.discoveredMappings.thinkingSupport.fieldName ?? 'NOT OBSERVED',
    inputTokenPriceField:
      firstModel?.discoveredMappings.inputTokenPrice.fieldName ?? 'NOT OBSERVED',
    outputTokenPriceField:
      firstModel?.discoveredMappings.outputTokenPrice.fieldName ?? 'NOT OBSERVED',
    embeddingPriceField:
      analyzedModels.find((m) => m.mode === 'embedding')?.discoveredMappings
        .embeddingPrice.fieldName ??
      'No separate embedding_price field (uses pricing.prompt)',
    embeddingDimensionsField:
      analyzedModels.find((m) => m.declaredEmbeddingDimension !== null)
        ?.discoveredMappings.embeddingDimensions.fieldName ??
      'NOT PROVIDED BY MODEL CATALOG',
    otherPricingFields: otherPricingPaths,
    otherCapabilityFields: otherCapabilityPaths,
  };

  return {
    fetchedAt,
    topLevelKeys,
    modelsArrayPath: modelsArrayPath || '[root]',
    totalModels: analyzedModels.length,
    modesFound: Array.from(modesSet),
    providersFound: Array.from(providersSet).sort(),
    allObservedModelFieldPaths: allPaths,
    schemaSummary,
    prefixAnalysis: {
      totalWithSlashPrefix,
      totalWithoutSlashPrefix,
      totalWithColonTag,
      observedPrefixes: Array.from(prefixesSet).sort(),
      examplesWithPrefix,
      examplesWithoutPrefix,
    },
    models: analyzedModels,
    chatModels: analyzedModels.filter((m) => m.mode === 'chat'),
    embeddingModels: analyzedModels.filter((m) => m.mode === 'embedding'),
    decisionModels: analyzedModels.filter((m) => m.mode === 'decision'),
    recursiveFields: inspectJsonRecursively(rawJson, '', 3500),
  };
}

export function compareCatalogSnapshots(
  snapshotA: CatalogSnapshot,
  snapshotB: CatalogSnapshot
): CatalogSnapshotComparison {
  const analysisA = analyzeModelCatalog(snapshotA.rawCatalog);
  const analysisB = analyzeModelCatalog(snapshotB.rawCatalog);

  const mapA = new Map<string, AnalyzedModelItem>();
  for (const m of analysisA.models) {
    mapA.set(m.modelId, m);
  }
  const mapB = new Map<string, AnalyzedModelItem>();
  for (const m of analysisB.models) {
    mapB.set(m.modelId, m);
  }

  const addedModelIds: string[] = [];
  const removedModelIds: string[] = [];

  for (const id of mapB.keys()) {
    if (!mapA.has(id)) addedModelIds.push(id);
  }
  for (const id of mapA.keys()) {
    if (!mapB.has(id)) removedModelIds.push(id);
  }

  const pricingChanges: SnapshotFieldDiff[] = [];
  const capabilityChanges: SnapshotFieldDiff[] = [];
  const embeddingDimensionChanges: SnapshotFieldDiff[] = [];
  const metadataChanges: SnapshotFieldDiff[] = [];

  for (const [modelId, modelB] of mapB.entries()) {
    const modelA = mapA.get(modelId);
    if (!modelA) continue;

    const fieldsA = new Map<string, JsonFieldEntry>();
    for (const f of modelA.allFields) {
      if (f.dataType === 'object' || f.dataType === 'array') continue;
      const rel = f.path.startsWith(`${modelA.basePath}.`)
        ? f.path.slice(modelA.basePath.length + 1)
        : f.path;
      fieldsA.set(rel, f);
    }

    const fieldsB = new Map<string, JsonFieldEntry>();
    for (const f of modelB.allFields) {
      if (f.dataType === 'object' || f.dataType === 'array') continue;
      const rel = f.path.startsWith(`${modelB.basePath}.`)
        ? f.path.slice(modelB.basePath.length + 1)
        : f.path;
      fieldsB.set(rel, f);
    }

    const allRelPaths = new Set([...fieldsA.keys(), ...fieldsB.keys()]);
    for (const relPath of allRelPaths) {
      const valA = fieldsA.get(relPath)?.value;
      const valB = fieldsB.get(relPath)?.value;

      if (JSON.stringify(valA) !== JSON.stringify(valB)) {
        let category: SnapshotFieldDiff['category'] = 'metadata';
        if (/dimension|vector_size/i.test(relPath)) {
          category = 'embedding_dimension';
        } else if (/price|pricing|cost/i.test(relPath)) {
          category = 'pricing';
        } else if (
          /support|vision|reasoning|thinking|context_length|mode/i.test(relPath)
        ) {
          category = 'capability';
        }

        const diff: SnapshotFieldDiff = {
          modelId,
          category,
          fieldPath: relPath,
          oldValue: valA,
          newValue: valB,
        };

        if (category === 'pricing') pricingChanges.push(diff);
        else if (category === 'capability') capabilityChanges.push(diff);
        else if (category === 'embedding_dimension')
          embeddingDimensionChanges.push(diff);
        else metadataChanges.push(diff);
      }
    }
  }

  return {
    snapshotA: {
      id: snapshotA.id,
      label: snapshotA.label,
      timestamp: snapshotA.timestamp,
      totalModels: analysisA.totalModels,
    },
    snapshotB: {
      id: snapshotB.id,
      label: snapshotB.label,
      timestamp: snapshotB.timestamp,
      totalModels: analysisB.totalModels,
    },
    addedModelIds,
    removedModelIds,
    pricingChanges,
    capabilityChanges,
    embeddingDimensionChanges,
    metadataChanges,
  };
}
