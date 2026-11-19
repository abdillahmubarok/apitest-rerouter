import type {
  CatalogAnalysis,
  EmbeddingDimensionVerification,
  ExtractedUsageAndCost,
  SSECapturedEvent,
  StreamInspection,
} from './types';

export function tryParseJson(rawText: string): {
  isJson: boolean;
  parsed: unknown | null;
} {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { isJson: false, parsed: null };
  }
  try {
    const parsed = JSON.parse(trimmed);
    return { isJson: true, parsed };
  } catch {
    return { isJson: false, parsed: null };
  }
}

export function isLikelySSE(
  contentType: string | null,
  rawBody: string
): boolean {
  if (contentType && contentType.toLowerCase().includes('text/event-stream')) {
    return true;
  }
  const trimmed = rawBody.trimStart();
  return trimmed.startsWith('data:') || trimmed.startsWith('event:');
}

export function parseSSEText(rawText: string): StreamInspection {
  const normalized = rawText.replace(/\r\n/g, '\n');
  const rawBlocks = normalized
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  const events: SSECapturedEvent[] = [];
  const observedEventTypesSet = new Set<string>();
  let hasDoneMarker = false;
  let assembledText = '';
  let finalChunk: unknown | null = null;
  let finalChunkIndex: number | null = null;
  let finalUsage: unknown | null = null;
  let finalUsagePath: string | null = null;
  let finalCost: unknown | null = null;
  let finalCostPath: string | null = null;
  let finishReason: string | null = null;
  let finishReasonPath: string | null = null;
  let responseCompletedEvent: unknown | null = null;

  for (let i = 0; i < rawBlocks.length; i++) {
    const block = rawBlocks[i];
    const lines = block.split('\n');
    let eventType: string | null = null;
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }

    const rawData = dataLines.join('\n');
    const isDoneMarker = rawData === '[DONE]';
    if (isDoneMarker) {
      hasDoneMarker = true;
    }

    let parsedData: unknown | null = null;
    if (rawData && !isDoneMarker) {
      const parsedRes = tryParseJson(rawData);
      if (parsedRes.isJson) {
        parsedData = parsedRes.parsed;
      }
    }

    if (eventType) {
      observedEventTypesSet.add(eventType);
    }

    if (parsedData && typeof parsedData === 'object') {
      const obj = parsedData as Record<string, unknown>;
      if (typeof obj.type === 'string') {
        observedEventTypesSet.add(obj.type);
      }

      finalChunk = parsedData;
      finalChunkIndex = i;

      // Check Chat Completions delta & finish_reason
      if (Array.isArray(obj.choices) && obj.choices.length > 0) {
        const c0 = obj.choices[0] as Record<string, unknown>;
        if (c0 && typeof c0 === 'object') {
          if (c0.delta && typeof c0.delta === 'object') {
            const delta = c0.delta as Record<string, unknown>;
            if (typeof delta.content === 'string') {
              assembledText += delta.content;
            }
          }
          if (
            typeof c0.finish_reason === 'string' &&
            c0.finish_reason.length > 0
          ) {
            finishReason = c0.finish_reason;
            finishReasonPath = `events[${i}].choices[0].finish_reason`;
          }
        }
      }

      // Check Responses API streaming events
      if (
        (eventType === 'response.output_text.delta' ||
          obj.type === 'response.output_text.delta') &&
        typeof obj.delta === 'string'
      ) {
        assembledText += obj.delta;
      }

      if (
        eventType === 'response.completed' ||
        obj.type === 'response.completed'
      ) {
        responseCompletedEvent = parsedData;
        if (obj.response && typeof obj.response === 'object') {
          const respObj = obj.response as Record<string, unknown>;
          if (typeof respObj.status === 'string' && !finishReason) {
            finishReason = respObj.status;
            finishReasonPath = `events[${i}].response.status`;
          }
          if (respObj.usage && typeof respObj.usage === 'object') {
            finalUsage = respObj.usage;
            finalUsagePath = `events[${i}].response.usage`;
            const u = respObj.usage as Record<string, unknown>;
            if ('cost' in u && u.cost !== undefined && u.cost !== null) {
              finalCost = u.cost;
              finalCostPath = `events[${i}].response.usage.cost`;
            } else if (
              'total_cost' in u &&
              u.total_cost !== undefined &&
              u.total_cost !== null
            ) {
              finalCost = u.total_cost;
              finalCostPath = `events[${i}].response.usage.total_cost`;
            }
          }
        }
      }

      // Top-level usage in chunk
      if (obj.usage && typeof obj.usage === 'object') {
        finalUsage = obj.usage;
        finalUsagePath = `events[${i}].usage`;
        const u = obj.usage as Record<string, unknown>;
        if ('cost' in u && u.cost !== undefined && u.cost !== null) {
          finalCost = u.cost;
          finalCostPath = `events[${i}].usage.cost`;
        } else if (
          'total_cost' in u &&
          u.total_cost !== undefined &&
          u.total_cost !== null
        ) {
          finalCost = u.total_cost;
          finalCostPath = `events[${i}].usage.total_cost`;
        }
      }

      if ('cost' in obj && obj.cost !== undefined && obj.cost !== null) {
        finalCost = obj.cost;
        finalCostPath = `events[${i}].cost`;
      }
    }

    events.push({
      index: i,
      rawFrame: block,
      eventType,
      rawData,
      parsedData,
      isDoneMarker,
    });
  }

  return {
    events,
    totalEvents: events.length,
    dataChunkCount: events.filter((e) => !e.isDoneMarker && e.rawData).length,
    hasDoneMarker,
    assembledText,
    finalChunk,
    finalChunkIndex,
    finalUsage,
    finalUsagePath,
    finalCost,
    finalCostPath,
    finishReason,
    finishReasonPath,
    responseCompletedEvent,
    observedEventTypes: Array.from(observedEventTypesSet),
  };
}

export function extractUsageAndCost(
  parsedBody: unknown | null,
  streamInspection: StreamInspection | null
): ExtractedUsageAndCost {
  if (streamInspection && streamInspection.finalUsage) {
    const u = streamInspection.finalUsage as Record<string, unknown>;
    const inputTokens =
      typeof u.prompt_tokens === 'number'
        ? u.prompt_tokens
        : typeof u.input_tokens === 'number'
          ? u.input_tokens
          : null;
    const outputTokens =
      typeof u.completion_tokens === 'number'
        ? u.completion_tokens
        : typeof u.output_tokens === 'number'
          ? u.output_tokens
          : null;
    const totalTokens =
      typeof u.total_tokens === 'number'
        ? u.total_tokens
        : inputTokens !== null && outputTokens !== null
          ? inputTokens + outputTokens
          : null;

    return {
      rawUsageObject: streamInspection.finalUsage,
      usagePath: streamInspection.finalUsagePath,
      inputTokens,
      outputTokens,
      totalTokens,
      costValue:
        typeof streamInspection.finalCost === 'number' ||
        typeof streamInspection.finalCost === 'string'
          ? streamInspection.finalCost
          : null,
      costPath: streamInspection.finalCostPath,
      tokenCountField: null,
      tokenCountValue: null,
    };
  }

  if (!parsedBody || typeof parsedBody !== 'object') {
    return {
      rawUsageObject: null,
      usagePath: null,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      costValue: null,
      costPath: null,
      tokenCountField: null,
      tokenCountValue: null,
    };
  }

  const root = parsedBody as Record<string, unknown>;

  // Check count_tokens direct token count fields
  let tokenCountField: string | null = null;
  let tokenCountValue: number | null = null;
  if (typeof root.input_tokens === 'number') {
    tokenCountField = 'input_tokens';
    tokenCountValue = root.input_tokens;
  } else if (typeof root.total_tokens === 'number') {
    tokenCountField = 'total_tokens';
    tokenCountValue = root.total_tokens;
  } else if (typeof root.token_count === 'number') {
    tokenCountField = 'token_count';
    tokenCountValue = root.token_count;
  }

  let rawUsageObject: unknown | null = null;
  let usagePath: string | null = null;

  if (root.usage && typeof root.usage === 'object') {
    rawUsageObject = root.usage;
    usagePath = 'usage';
  }

  let inputTokens: number | null = tokenCountValue;
  let outputTokens: number | null = null;
  let totalTokens: number | null = null;
  let costValue: string | number | null = null;
  let costPath: string | null = null;

  if (rawUsageObject && typeof rawUsageObject === 'object') {
    const u = rawUsageObject as Record<string, unknown>;
    if (typeof u.prompt_tokens === 'number') inputTokens = u.prompt_tokens;
    else if (typeof u.input_tokens === 'number') inputTokens = u.input_tokens;

    if (typeof u.completion_tokens === 'number')
      outputTokens = u.completion_tokens;
    else if (typeof u.output_tokens === 'number') outputTokens = u.output_tokens;

    if (typeof u.total_tokens === 'number') totalTokens = u.total_tokens;
    else if (inputTokens !== null && outputTokens !== null)
      totalTokens = inputTokens + outputTokens;

    if (typeof u.cost === 'number' || typeof u.cost === 'string') {
      costValue = u.cost;
      costPath = 'usage.cost';
    } else if (
      typeof u.total_cost === 'number' ||
      typeof u.total_cost === 'string'
    ) {
      costValue = u.total_cost;
      costPath = 'usage.total_cost';
    }
  }

  if (
    costValue === null &&
    (typeof root.cost === 'number' || typeof root.cost === 'string')
  ) {
    costValue = root.cost;
    costPath = 'cost';
  }

  return {
    rawUsageObject,
    usagePath,
    inputTokens,
    outputTokens,
    totalTokens,
    costValue,
    costPath,
    tokenCountField,
    tokenCountValue,
  };
}

export function extractFinishReason(
  parsedBody: unknown | null,
  streamInspection: StreamInspection | null
): { finishReason: string | null; finishReasonPath: string | null } {
  if (streamInspection && streamInspection.finishReason) {
    return {
      finishReason: streamInspection.finishReason,
      finishReasonPath: streamInspection.finishReasonPath,
    };
  }

  if (!parsedBody || typeof parsedBody !== 'object') {
    return { finishReason: null, finishReasonPath: null };
  }

  const root = parsedBody as Record<string, unknown>;
  if (Array.isArray(root.choices) && root.choices.length > 0) {
    const c0 = root.choices[0] as Record<string, unknown>;
    if (c0 && typeof c0.finish_reason === 'string') {
      return {
        finishReason: c0.finish_reason,
        finishReasonPath: 'choices[0].finish_reason',
      };
    }
  }

  if (typeof root.stop_reason === 'string') {
    return {
      finishReason: root.stop_reason,
      finishReasonPath: 'stop_reason',
    };
  }

  if (typeof root.status === 'string') {
    return {
      finishReason: root.status,
      finishReasonPath: 'status',
    };
  }

  return { finishReason: null, finishReasonPath: null };
}

export function extractEmbeddingVerification(
  modelId: string,
  httpStatus: number,
  parsedBody: unknown | null,
  usageAndCost: ExtractedUsageAndCost,
  catalogAnalysis?: CatalogAnalysis | null
): EmbeddingDimensionVerification {
  let actualVectorDimension: number | null = null;
  let vectorSampleFirst5: number[] = [];
  let responseDeclaredDimensionField: string | null = null;

  if (parsedBody && typeof parsedBody === 'object') {
    const root = parsedBody as Record<string, unknown>;
    if (Array.isArray(root.data) && root.data.length > 0) {
      const first = root.data[0] as Record<string, unknown>;
      if (first && Array.isArray(first.embedding)) {
        const embedding = first.embedding;
        actualVectorDimension = embedding.length;
        vectorSampleFirst5 = embedding
          .slice(0, 5)
          .filter((v): v is number => typeof v === 'number');
      }
      if (first && typeof first.dimensions === 'number') {
        responseDeclaredDimensionField = `data[0].dimensions = ${first.dimensions}`;
      }
    } else if (Array.isArray(root.embedding)) {
      const embedding = root.embedding;
      actualVectorDimension = embedding.length;
      vectorSampleFirst5 = embedding
        .slice(0, 5)
        .filter((v): v is number => typeof v === 'number');
    }

    if (typeof root.dimensions === 'number') {
      responseDeclaredDimensionField = `dimensions = ${root.dimensions}`;
    }
  }

  const catalogModel = catalogAnalysis?.models.find(
    (m) => m.modelId === modelId
  );
  const catalogDeclaredDimension =
    catalogModel?.declaredEmbeddingDimension ?? null;
  const catalogDeclaredStatus =
    catalogDeclaredDimension !== null
      ? `${catalogDeclaredDimension} (at ${catalogModel?.declaredEmbeddingDimensionPath})`
      : 'NOT PROVIDED BY MODEL CATALOG';

  let dimensionsMatch: EmbeddingDimensionVerification['dimensionsMatch'] =
    'CANNOT COMPARE — NOT PROVIDED BY MODEL CATALOG';
  if (
    catalogDeclaredDimension !== null &&
    actualVectorDimension !== null
  ) {
    dimensionsMatch =
      catalogDeclaredDimension === actualVectorDimension
        ? 'MATCH'
        : 'MISMATCH';
  }

  return {
    modelId,
    httpStatus,
    inputTokens: usageAndCost.inputTokens,
    actualVectorDimension,
    vectorSampleFirst5,
    catalogDeclaredDimension,
    catalogDeclaredStatus,
    dimensionsMatch,
    responseDeclaredDimensionField,
    costUsd: usageAndCost.costValue,
  };
}
