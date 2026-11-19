import crypto from 'node:crypto';
import {
  getServerRerouterConfig,
  redactRequestHeaders,
  redactSecretString,
} from './config';
import { ENDPOINT_DEFINITIONS } from './endpoints';
import { inspectErrorResponse } from './inspect-errors';
import { inspectResponseHeaders } from './inspect-headers';
import { inspectJsonRecursively } from './inspect-models';
import {
  extractEmbeddingVerification,
  extractFinishReason,
  extractUsageAndCost,
  isLikelySSE,
  parseSSEText,
  tryParseJson,
} from './parser';
import type {
  AuthFormat,
  CatalogAnalysis,
  EndpointId,
  TestExecutionResult,
} from './types';

export interface ExecuteTestOptions {
  endpointId: EndpointId;
  authFormat?: AuthFormat;
  customBodyRaw?: string | null;
  selectedModelId?: string;
  catalogAnalysis?: CatalogAnalysis | null;
  dedicatedLowCreditKey?: string | null;
}

const DUMMY_INVALID_KEY = 'sk-rerouter-invalid-dummy-key-000000';
const REQUEST_TIMEOUT_MS = 45000;

export async function executeRerouterTest(
  options: ExecuteTestOptions
): Promise<TestExecutionResult> {
  const def = ENDPOINT_DEFINITIONS[options.endpointId];
  const cfg = getServerRerouterConfig();

  const authFormat: AuthFormat = options.authFormat ?? def.defaultAuthFormat;
  const basePrefix = def.useRootOrigin ? cfg.rootOriginUrl : cfg.baseUrl;
  const exactUrl = `${basePrefix}${def.path}`;

  const activeSecretKey =
    options.endpointId === 'credit-limit-test' &&
    options.dedicatedLowCreditKey &&
    options.dedicatedLowCreditKey.trim().length > 0
      ? options.dedicatedLowCreditKey.trim()
      : cfg.apiKey;

  const headers: Record<string, string> = {
    Accept: def.expectStream
      ? 'text/event-stream, application/json'
      : 'application/json',
  };

  if (def.method === 'POST') {
    headers['Content-Type'] = 'application/json';
  }

  if (def.extraHeaders) {
    for (const [k, v] of Object.entries(def.extraHeaders)) {
      headers[k] = v;
    }
  }

  const notes: string[] = [];

  if (authFormat === 'none') {
    notes.push('Deliberately omitted API key header for unauthenticated test.');
  } else if (authFormat === 'invalid-dummy') {
    if (
      def.path.startsWith('/messages') ||
      def.defaultAuthFormat === 'x-api-key'
    ) {
      headers['x-api-key'] = DUMMY_INVALID_KEY;
    } else {
      headers['Authorization'] = `Bearer ${DUMMY_INVALID_KEY}`;
    }
    notes.push('Used deliberate synthetic invalid dummy API key.');
  } else if (authFormat === 'bearer') {
    if (activeSecretKey) {
      headers['Authorization'] = `Bearer ${activeSecretKey}`;
    } else {
      notes.push(
        'REROUTER_API_KEY is not configured in .env.local; request sent without Authorization header.'
      );
    }
  } else if (authFormat === 'x-api-key') {
    if (activeSecretKey) {
      headers['x-api-key'] = activeSecretKey;
    } else {
      notes.push(
        'REROUTER_API_KEY is not configured in .env.local; request sent without x-api-key header.'
      );
    }
  }

  let requestBodyRaw: string | null = null;
  let parsedRequestBody: unknown | null = null;

  if (def.method === 'POST') {
    if (
      typeof options.customBodyRaw === 'string' &&
      options.customBodyRaw.trim().length > 0
    ) {
      requestBodyRaw = options.customBodyRaw;
      const parsedReq = tryParseJson(requestBodyRaw);
      parsedRequestBody = parsedReq.isJson ? parsedReq.parsed : null;
    } else {
      const built = def.defaultBodyBuilder(options.selectedModelId);
      parsedRequestBody = built;
      requestBodyRaw = built !== null ? JSON.stringify(built, null, 2) : null;
    }
  }

  const redactedRequestHeaders = redactRequestHeaders(headers, activeSecretKey);
  const redactedRequestBodyRaw = requestBodyRaw
    ? redactSecretString(requestBodyRaw, cfg.apiKey, activeSecretKey)
    : null;

  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(exactUrl, {
      method: def.method,
      headers,
      body: def.method === 'POST' ? (requestBodyRaw ?? undefined) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });

    const rawTextUnredacted = await response.text();
    const durationMs = Math.round(performance.now() - startTime);
    clearTimeout(timeoutId);

    const rawResponseBody = redactSecretString(
      rawTextUnredacted,
      cfg.apiKey,
      activeSecretKey
    );

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = redactSecretString(
        value,
        cfg.apiKey,
        activeSecretKey
      );
    });

    const contentType = response.headers.get('content-type');
    const isStreamResponse =
      (def.expectStream || isLikelySSE(contentType, rawResponseBody)) &&
      isLikelySSE(contentType, rawResponseBody);

    const streamInspection = isStreamResponse
      ? parseSSEText(rawResponseBody)
      : null;

    const jsonParseResult = tryParseJson(rawResponseBody);
    const isJsonResponse = jsonParseResult.isJson;
    const parsedResponseBody = jsonParseResult.parsed;

    const targetInspectObject =
      parsedResponseBody ?? streamInspection?.finalChunk ?? null;
    const responseRecursiveFields =
      targetInspectObject !== null
        ? inspectJsonRecursively(targetInspectObject, '', 1500)
        : [];

    const usageAndCost = extractUsageAndCost(
      parsedResponseBody,
      streamInspection
    );
    const { finishReason, finishReasonPath } = extractFinishReason(
      parsedResponseBody,
      streamInspection
    );
    const rateLimitInspection = inspectResponseHeaders(
      responseHeaders,
      response.status
    );

    const hasErrorInJson =
      isJsonResponse &&
      parsedResponseBody !== null &&
      typeof parsedResponseBody === 'object' &&
      ('error' in (parsedResponseBody as Record<string, unknown>) ||
        (parsedResponseBody as Record<string, unknown>).type === 'error');

    const errorAnalysis =
      response.status >= 400 || hasErrorInJson
        ? inspectErrorResponse(
            response.status,
            rawResponseBody,
            isJsonResponse,
            parsedResponseBody
          )
        : null;

    const effectiveOk =
      response.status >= 200 &&
      response.status < 300 &&
      !hasErrorInJson &&
      (isJsonResponse || isStreamResponse);

    let modelIdForEmbedding = options.selectedModelId ?? 'unknown';
    if (
      parsedRequestBody &&
      typeof parsedRequestBody === 'object' &&
      typeof (parsedRequestBody as Record<string, unknown>).model === 'string'
    ) {
      modelIdForEmbedding = (parsedRequestBody as Record<string, unknown>)
        .model as string;
    }

    const embeddingVerification = def.isEmbeddingTest
      ? extractEmbeddingVerification(
          modelIdForEmbedding,
          response.status,
          parsedResponseBody,
          usageAndCost,
          options.catalogAnalysis
        )
      : null;

    return {
      id: crypto.randomUUID(),
      endpointId: options.endpointId,
      label: def.label,
      category: def.category,
      timestamp: new Date().toISOString(),
      authFormatUsed: authFormat,
      apiKeyConfiguredOnServer: cfg.apiKeyConfigured,
      method: def.method,
      exactUrl,
      redactedRequestHeaders,
      requestBodyRaw: redactedRequestBodyRaw,
      parsedRequestBody,
      httpStatus: response.status,
      statusText: response.statusText || `HTTP ${response.status}`,
      ok: effectiveOk,
      durationMs,
      responseHeaders,
      rawResponseBody,
      isJsonResponse,
      parsedResponseBody,
      responseRecursiveFields,
      usageAndCost,
      finishReason,
      finishReasonPath,
      streamInspection,
      rateLimitInspection,
      errorAnalysis,
      embeddingVerification,
      networkError: null,
      notes,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const durationMs = Math.round(performance.now() - startTime);
    const errMessage = redactSecretString(
      err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      cfg.apiKey,
      activeSecretKey
    );

    const rateLimitInspection = inspectResponseHeaders({}, 0);
    const errorAnalysis = inspectErrorResponse(0, errMessage, false, null);

    return {
      id: crypto.randomUUID(),
      endpointId: options.endpointId,
      label: def.label,
      category: def.category,
      timestamp: new Date().toISOString(),
      authFormatUsed: authFormat,
      apiKeyConfiguredOnServer: cfg.apiKeyConfigured,
      method: def.method,
      exactUrl,
      redactedRequestHeaders,
      requestBodyRaw: redactedRequestBodyRaw,
      parsedRequestBody,
      httpStatus: 0,
      statusText: 'NETWORK_OR_TIMEOUT_ERROR',
      ok: false,
      durationMs,
      responseHeaders: {},
      rawResponseBody: errMessage,
      isJsonResponse: false,
      parsedResponseBody: null,
      responseRecursiveFields: [],
      usageAndCost: {
        rawUsageObject: null,
        usagePath: null,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        costValue: null,
        costPath: null,
        tokenCountField: null,
        tokenCountValue: null,
      },
      finishReason: null,
      finishReasonPath: null,
      streamInspection: null,
      rateLimitInspection,
      errorAnalysis,
      embeddingVerification: null,
      networkError: errMessage,
      notes: [...notes, `Network/Timeout error: ${errMessage}`],
    };
  }
}
