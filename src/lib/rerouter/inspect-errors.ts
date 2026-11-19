import { getJsonDataType, inspectJsonRecursively } from './inspect-models';
import type { ErrorSchemaAnalysis } from './types';

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

    return {
      isErrorStatus,
      httpStatus,
      isJson: false,
      detectedFormat: isHtml ? 'html-gateway' : isErrorStatus ? 'plain-text' : 'none',
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
    isErrorStatus: isErrorStatus || hasErrorObject || topLevelTypeValue === 'error',
    httpStatus,
    isJson: true,
    detectedFormat,
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
