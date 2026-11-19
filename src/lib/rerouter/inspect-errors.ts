import { getJsonDataType, inspectJsonRecursively } from './inspect-models';
import type { ErrorCategory, ErrorSchemaAnalysis } from './types';

function classifyErrorCategory(
  httpStatus: number,
  readableMessage: string,
  errorTypeValue: unknown,
  isErrorStatus: boolean
): {
  errorCategory: ErrorCategory;
  errorCategoryLabel: string;
  isAuthFailure401: boolean;
  isAuthoritativeInsufficientBalance: boolean;
  isTemporaryUnavailable: boolean;
} {
  if (!isErrorStatus && httpStatus >= 200 && httpStatus < 400) {
    return {
      errorCategory: 'none',
      errorCategoryLabel: 'No Error (2xx Success)',
      isAuthFailure401: false,
      isAuthoritativeInsufficientBalance: false,
      isTemporaryUnavailable: false,
    };
  }

  const lowerMsg = readableMessage.toLowerCase();
  const lowerType =
    typeof errorTypeValue === 'string' ? errorTypeValue.toLowerCase() : '';

  if (httpStatus === 0) {
    return {
      errorCategory: 'network_timeout',
      errorCategoryLabel: 'Network Timeout / Unreachable',
      isAuthFailure401: false,
      isAuthoritativeInsufficientBalance: false,
      isTemporaryUnavailable: true,
    };
  }

  if (httpStatus === 401) {
    const isRevokedOrExpired =
      lowerMsg.includes('revoked') ||
      lowerMsg.includes('expired') ||
      lowerMsg.includes('cabut') ||
      lowerType.includes('revoked') ||
      lowerType.includes('expired');

    if (isRevokedOrExpired) {
      return {
        errorCategory: 'expired_or_revoked_api_key',
        errorCategoryLabel: 'Expired or Revoked API Key (HTTP 401)',
        isAuthFailure401: true,
        isAuthoritativeInsufficientBalance: false,
        isTemporaryUnavailable: false,
      };
    }

    return {
      errorCategory: 'invalid_api_key',
      errorCategoryLabel: 'Invalid or Missing API Key (HTTP 401)',
      isAuthFailure401: true,
      isAuthoritativeInsufficientBalance: false,
      isTemporaryUnavailable: false,
    };
  }

  // Strictly classify HTTP 402 (documented ReRouter insufficient credits status) as insufficient_balance.
  // Never classify 400, 401, 403, 404, 429, 500, 502, 503, or timeouts as empty balance.
  if (httpStatus === 402) {
    return {
      errorCategory: 'insufficient_balance',
      errorCategoryLabel:
        'Insufficient Balance / Credit Limit Reached (HTTP 402)',
      isAuthFailure401: false,
      isAuthoritativeInsufficientBalance: true,
      isTemporaryUnavailable: false,
    };
  }

  if (httpStatus === 403) {
    return {
      errorCategory: 'model_access_denied',
      errorCategoryLabel:
        'Model Access Denied / Restricted by Key Allow-List (HTTP 403)',
      isAuthFailure401: false,
      isAuthoritativeInsufficientBalance: false,
      isTemporaryUnavailable: false,
    };
  }

  if (httpStatus === 404) {
    return {
      errorCategory: 'model_not_found',
      errorCategoryLabel: 'Model Not Found (HTTP 404)',
      isAuthFailure401: false,
      isAuthoritativeInsufficientBalance: false,
      isTemporaryUnavailable: false,
    };
  }

  if (httpStatus === 400 || httpStatus === 413 || httpStatus === 422) {
    return {
      errorCategory: 'invalid_request_payload',
      errorCategoryLabel:
        httpStatus === 413
          ? 'Payload Too Large (>32 MB, HTTP 413)'
          : 'Invalid Request Payload (HTTP 400)',
      isAuthFailure401: false,
      isAuthoritativeInsufficientBalance: false,
      isTemporaryUnavailable: false,
    };
  }

  if (httpStatus === 429) {
    return {
      errorCategory: 'rate_limit',
      errorCategoryLabel: 'Rate Limit Exceeded (HTTP 429)',
      isAuthFailure401: false,
      isAuthoritativeInsufficientBalance: false,
      isTemporaryUnavailable: false,
    };
  }

  if (httpStatus === 502) {
    return {
      errorCategory: 'upstream_provider_error',
      errorCategoryLabel:
        'Upstream Model Provider Unavailable (HTTP 502 Bad Gateway)',
      isAuthFailure401: false,
      isAuthoritativeInsufficientBalance: false,
      isTemporaryUnavailable: true,
    };
  }

  if (httpStatus === 503 || httpStatus === 504) {
    return {
      errorCategory: 'service_unavailable',
      errorCategoryLabel: `ReRouter Service Temporarily Unavailable (HTTP ${httpStatus})`,
      isAuthFailure401: false,
      isAuthoritativeInsufficientBalance: false,
      isTemporaryUnavailable: true,
    };
  }

  return {
    errorCategory: 'unknown_error',
    errorCategoryLabel: `Unexpected Error (HTTP ${httpStatus})`,
    isAuthFailure401: false,
    isAuthoritativeInsufficientBalance: false,
    isTemporaryUnavailable: false,
  };
}

export function inspectErrorResponse(
  httpStatus: number,
  rawBody: string,
  isJson: boolean,
  parsedBody: unknown | null
): ErrorSchemaAnalysis {
  const isErrorStatus = httpStatus >= 400 || httpStatus === 0;
  const exactFields =
    isJson && parsedBody !== null
      ? inspectJsonRecursively(parsedBody, '', 500)
      : [];
  const exactFieldNames = exactFields.map((f) => f.path);

  if (!isJson || parsedBody === null || typeof parsedBody !== 'object') {
    const isHtml = /<html|<head|<body|<!doctype html/i.test(rawBody);
    let readableMessage = rawBody.trim().slice(0, 300) || `HTTP ${httpStatus}`;
    if (isHtml) {
      const titleMatch = rawBody.match(/<title>([^<]+)<\/title>/i);
      const h1Match = rawBody.match(/<h1>([^<]+)<\/h1>/i);
      readableMessage =
        titleMatch?.[1]?.trim() ||
        h1Match?.[1]?.trim() ||
        `HTML Error Response (HTTP ${httpStatus})`;
    }

    const classification = classifyErrorCategory(
      httpStatus,
      readableMessage,
      null,
      isErrorStatus
    );

    return {
      isErrorStatus,
      httpStatus,
      isJson: false,
      detectedFormat: isHtml
        ? 'html-gateway'
        : isErrorStatus
          ? 'plain-text'
          : 'none',
      ...classification,
      readableMessage,
      hasErrorObject: false,
      hasErrorCode: false,
      errorCodeValue: null,
      errorCodeType: 'not_present',
      errorTypeValue: null,
      errorTypeDataType: 'not_present',
      errorMessageValue: null,
      errorMessageDataType: 'not_present',
      topLevelTypeValue: null,
      exactFieldNames: [],
      exactFields: [],
      matchesOpenAIHypothesis: false,
      openAIHypothesisNote: isHtml
        ? 'Response is raw HTML (e.g. nginx gateway response), not JSON.'
        : 'Response is not a JSON object.',
      matchesAnthropicHypothesis: false,
      anthropicHypothesisNote: isHtml
        ? 'Response is raw HTML (e.g. nginx gateway response), not JSON.'
        : 'Response is not a JSON object.',
    };
  }

  const root = parsedBody as Record<string, unknown>;
  const topLevelTypeValue = root.type ?? null;
  const errProp = root.error;
  const hasErrorObject =
    errProp !== null && typeof errProp === 'object' && !Array.isArray(errProp);

  const errObj = hasErrorObject ? (errProp as Record<string, unknown>) : null;
  const hasErrorCode = Boolean(errObj && 'code' in errObj);
  const errorCodeValue = errObj && 'code' in errObj ? errObj.code : null;
  const errorCodeType =
    errObj && 'code' in errObj ? getJsonDataType(errObj.code) : 'not_present';

  const errorTypeValue = errObj && 'type' in errObj ? errObj.type : null;
  const errorTypeDataType =
    errObj && 'type' in errObj ? getJsonDataType(errObj.type) : 'not_present';

  const errorMessageValue =
    errObj && 'message' in errObj
      ? errObj.message
      : 'message' in root
        ? root.message
        : null;
  const errorMessageDataType =
    errObj && 'message' in errObj
      ? getJsonDataType(errObj.message)
      : 'message' in root
        ? getJsonDataType(root.message)
        : 'not_present';

  const matchesAnthropicHypothesis =
    topLevelTypeValue === 'error' &&
    hasErrorObject &&
    typeof errorMessageValue === 'string' &&
    typeof errorTypeValue === 'string';

  const matchesOpenAIHypothesis =
    topLevelTypeValue === null &&
    hasErrorObject &&
    typeof errorMessageValue === 'string' &&
    typeof errorTypeValue === 'string';

  let detectedFormat: ErrorSchemaAnalysis['detectedFormat'] = 'custom-json';
  if (!isErrorStatus && !hasErrorObject && topLevelTypeValue !== 'error') {
    detectedFormat = 'none';
  } else if (matchesAnthropicHypothesis) {
    detectedFormat = 'anthropic-style';
  } else if (matchesOpenAIHypothesis) {
    detectedFormat = 'openai-style';
  }

  let readableMessage = `HTTP ${httpStatus}`;
  if (typeof errorMessageValue === 'string' && errorMessageValue.trim()) {
    readableMessage = errorMessageValue;
  } else if (typeof errProp === 'string') {
    readableMessage = errProp;
  } else if (typeof root.detail === 'string') {
    readableMessage = root.detail;
  }

  const effectiveIsError =
    isErrorStatus || hasErrorObject || topLevelTypeValue === 'error';

  const classification = classifyErrorCategory(
    httpStatus,
    readableMessage,
    errorTypeValue,
    effectiveIsError
  );

  let openAIHypothesisNote = 'Does not match OpenAI error object structure.';
  if (matchesOpenAIHypothesis) {
    if (hasErrorCode) {
      openAIHypothesisNote = `Matches { error: { message, type, code } }. Note: error.code is of type "${errorCodeType}" (actual value: ${JSON.stringify(errorCodeValue)}).`;
    } else {
      openAIHypothesisNote =
        'Matches { error: { message, type } }, but error.code is omitted.';
    }
  } else if (matchesAnthropicHypothesis) {
    openAIHypothesisNote =
      'Uses Anthropic envelope { type: "error", error: { type, message } } without error.code.';
  }

  let anthropicHypothesisNote =
    'Does not match Anthropic { type: "error", error: { type, message } } structure.';
  if (matchesAnthropicHypothesis) {
    anthropicHypothesisNote = `Matches { type: "error", error: { type: ${JSON.stringify(
      errorTypeValue
    )}, message: ${JSON.stringify(errorMessageValue)} } }.`;
  }

  return {
    isErrorStatus: effectiveIsError,
    httpStatus,
    isJson: true,
    detectedFormat,
    ...classification,
    readableMessage,
    hasErrorObject,
    hasErrorCode,
    errorCodeValue,
    errorCodeType,
    errorTypeValue,
    errorTypeDataType,
    errorMessageValue,
    errorMessageDataType,
    topLevelTypeValue,
    exactFieldNames,
    exactFields,
    matchesOpenAIHypothesis,
    openAIHypothesisNote,
    matchesAnthropicHypothesis,
    anthropicHypothesisNote,
  };
}
