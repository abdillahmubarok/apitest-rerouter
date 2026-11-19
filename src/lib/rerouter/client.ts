import crypto from 'node:crypto';
import {
  getServerRerouterConfig,
  isPlaceholderKey,
  OFFICIAL_BILLING_URL,
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
  BalanceState,
  CatalogAnalysis,
  ConnectionState,
  ConnectionVerificationResponse,
  EndpointId,
  TestExecutionResult,
  UserAuthFormat,
} from './types';

export interface ExecuteTestOptions {
  endpointId: EndpointId;
  authFormat?: AuthFormat;
  userApiKey?: string | null;
  customBodyRaw?: string | null;
  selectedModelId?: string;
  catalogAnalysis?: CatalogAnalysis | null;
  dedicatedLowCreditKey?: string | null;
}

const DUMMY_INVALID_KEY = 'sk-rerouter-invalid-dummy-key-000000';
const REQUEST_TIMEOUT_MS = 45000;
export const MAX_PROXY_BODY_BYTES = 256 * 1024; // 256 KB reasonable proxy payload limit

export async function executeRerouterTest(
  options: ExecuteTestOptions
): Promise<TestExecutionResult> {
  const def = ENDPOINT_DEFINITIONS[options.endpointId];
  const cfg = getServerRerouterConfig();

  const authFormat: AuthFormat = options.authFormat ?? def.defaultAuthFormat;
  const basePrefix = def.useRootOrigin ? cfg.rootOriginUrl : cfg.baseUrl;
  const exactUrl = `${basePrefix}${def.path}`;

  const rawUserKey =
    options.userApiKey && !isPlaceholderKey(options.userApiKey)
      ? options.userApiKey.trim()
      : null;

  const rawLowCreditKey =
    options.endpointId === 'credit-limit-test' &&
    options.dedicatedLowCreditKey &&
    !isPlaceholderKey(options.dedicatedLowCreditKey)
      ? options.dedicatedLowCreditKey.trim()
      : null;

  // Strictly per-request key. Never falls back to any server environment variable.
  const activeSecretKey = rawLowCreditKey ?? rawUserKey;
  const userKeySupplied = Boolean(activeSecretKey);

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
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${DUMMY_INVALID_KEY}`;
    }
    notes.push('Used deliberate synthetic invalid dummy API key.');
  } else if (authFormat === 'bearer') {
    if (activeSecretKey) {
      headers['Authorization'] = `Bearer ${activeSecretKey}`;
    } else {
      notes.push(
        'No user API key supplied in request headers; sent without Authorization header.'
      );
    }
  } else if (authFormat === 'x-api-key') {
    headers['anthropic-version'] = '2023-06-01';
    if (activeSecretKey) {
      headers['x-api-key'] = activeSecretKey;
    } else {
      notes.push(
        'No user API key supplied in request headers; sent without x-api-key header.'
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

  const redactedRequestHeaders = redactRequestHeaders(
    headers,
    rawUserKey,
    rawLowCreditKey,
    activeSecretKey
  );
  const redactedRequestBodyRaw = requestBodyRaw
    ? redactSecretString(
        requestBodyRaw,
        rawUserKey,
        rawLowCreditKey,
        activeSecretKey
      )
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
      rawUserKey,
      rawLowCreditKey,
      activeSecretKey
    );

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      // Never include Authorization or x-api-key in returned response headers
      if (lower === 'authorization' || lower === 'x-api-key') {
        return;
      }
      responseHeaders[key] = redactSecretString(
        value,
        rawUserKey,
        rawLowCreditKey,
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
      userKeySupplied,
      apiKeyConfiguredOnServer: userKeySupplied,
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
      rawUserKey,
      rawLowCreditKey,
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
      userKeySupplied,
      apiKeyConfiguredOnServer: userKeySupplied,
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

/**
 * Validates a user-supplied ReRouter API key via POST /v1/messages/count_tokens.
 * Verified behavior:
 * - Non-billable (estimates input tokens without initiating generation).
 * - Reliably returns HTTP 200 {"input_tokens": <number>} for valid keys across both Bearer and x-api-key formats.
 * - Reliably returns HTTP 401 {"error":{"message":"invalid API key","type":"authentication_error"},"type":"error"} for invalid keys.
 */
export async function verifyUserApiKeyConnection(
  userApiKey: string,
  authFormat: UserAuthFormat
): Promise<ConnectionVerificationResponse> {
  const result = await executeRerouterTest({
    endpointId: 'count-tokens-v1',
    authFormat,
    userApiKey,
    customBodyRaw: JSON.stringify({
      model: 'claude-haiku-4-5',
      messages: [
        {
          role: 'user',
          content: 'ReRouter API Playground non-billable connection check.',
        },
      ],
    }),
  });

  let connectionState: ConnectionState = 'CONNECTION_ERROR';
  let balanceState: BalanceState = 'BALANCE_UNKNOWN';
  let shouldRedirectToBilling = false;
  let message = 'Unable to verify API key connection.';
  const balanceNote =
    'UNKNOWN / NOT AVAILABLE — ReRouter does not expose a dedicated balance inquiry endpoint. Balance status is monitored passively via authoritative HTTP 402 responses.';

  if (result.ok && result.httpStatus === 200) {
    connectionState = 'CONNECTED';
    balanceState = 'BALANCE_UNKNOWN';
    message = `Connected and verified via non-billable POST /v1/messages/count_tokens (${result.durationMs} ms).`;
  } else if (result.httpStatus === 401) {
    connectionState = 'INVALID_API_KEY';
    balanceState = 'BALANCE_UNKNOWN';
    const errText =
      result.errorAnalysis?.readableMessage ||
      'Invalid, missing, or revoked API key.';
    message = `Authentication failed (HTTP 401): ${errText}`;
  } else if (
    result.httpStatus === 402 ||
    result.errorAnalysis?.isAuthoritativeInsufficientBalance
  ) {
    connectionState = 'BALANCE_EMPTY';
    balanceState = 'BALANCE_EMPTY';
    shouldRedirectToBilling = true;
    const errText =
      result.errorAnalysis?.readableMessage ||
      'Account has no available credit balance or key credit limit reached.';
    message = `Authoritative insufficient credit balance response (HTTP 402): ${errText}`;
  } else if (
    result.httpStatus === 502 ||
    result.httpStatus === 503 ||
    result.httpStatus === 504
  ) {
    connectionState = 'RE_ROUTER_UNAVAILABLE';
    balanceState = 'BALANCE_UNKNOWN';
    message = `ReRouter API is temporarily unavailable (HTTP ${result.httpStatus}). Please retry shortly.`;
  } else if (result.httpStatus === 0) {
    connectionState = 'CONNECTION_ERROR';
    balanceState = 'BALANCE_UNKNOWN';
    message = `Network error or timeout while contacting ReRouter: ${
      result.networkError || 'Connection failed'
    }`;
  } else {
    connectionState = 'CONNECTION_ERROR';
    balanceState = 'BALANCE_UNKNOWN';
    message = `Unexpected response from validation endpoint (HTTP ${result.httpStatus}): ${
      result.errorAnalysis?.readableMessage || result.statusText
    }`;
  }

  return {
    ok: connectionState === 'CONNECTED',
    connectionState,
    balanceState,
    authFormatVerified: authFormat,
    httpStatus: result.httpStatus,
    durationMs: result.durationMs,
    endpointTested: result.exactUrl,
    message,
    balanceNote,
    shouldRedirectToBilling,
    billingUrl: OFFICIAL_BILLING_URL,
    verificationResult: result,
  };
}
