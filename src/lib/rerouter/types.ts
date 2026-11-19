export type AuthFormat = 'bearer' | 'x-api-key' | 'none' | 'invalid-dummy';

export type TestCategory = 'A' | 'B' | 'C';

export type EndpointId =
  | 'models'
  | 'chat-completions'
  | 'chat-completions-stream'
  | 'responses'
  | 'responses-stream'
  | 'anthropic-messages'
  | 'count-tokens-v1'
  | 'count-tokens-root'
  | 'embeddings'
  | 'decisions'
  | 'systemone'
  | 'error-missing-key'
  | 'error-invalid-key'
  | 'error-invalid-request'
  | 'error-unknown-model'
  | 'error-forbidden-model'
  | 'error-anthropic-missing-key'
  | 'error-anthropic-invalid-key'
  | 'error-anthropic-invalid-request'
  | 'error-anthropic-unknown-model'
  | 'credit-limit-test'
  | 'token-limit-test'
  | 'claude-alias-test';

export type SidebarSectionId =
  | 'overview'
  | 'model-catalog'
  | 'chat-completions'
  | 'streaming'
  | 'responses'
  | 'anthropic-messages'
  | 'count-tokens'
  | 'embeddings'
  | 'decisions'
  | 'systemone'
  | 'error-inspector'
  | 'rate-limits'
  | 'credit-truncation'
  | 'model-changes'
  | 'privacy'
  | 'test-reports';

export type JsonDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'array'
  | 'object';

export interface JsonFieldEntry {
  path: string;
  fieldName: string;
  value: unknown;
  formattedValue: string;
  dataType: JsonDataType;
}

export interface DiscoveredFieldPath {
  concept: string;
  found: boolean;
  exactPath: string;
  fieldName: string;
  actualValue: unknown;
  formattedValue: string;
  dataType: JsonDataType | 'not_present';
  note?: string;
}

export interface AnalyzedModelItem {
  index: number;
  basePath: string;
  rawObject: Record<string, unknown>;
  modelId: string;
  modelName: string;
  provider: string;
  mode: string;
  hasProviderPrefix: boolean;
  providerPrefix: string | null;
  hasTagSuffix: boolean;
  tagSuffix: string | null;
  visionSupport: unknown;
  thinkingSupport: unknown;
  inputTokenPrice: unknown;
  outputTokenPrice: unknown;
  embeddingPrice: unknown;
  declaredEmbeddingDimension: number | null;
  declaredEmbeddingDimensionPath: string;
  contextLength: unknown;
  discoveredMappings: {
    modelId: DiscoveredFieldPath;
    modelName: DiscoveredFieldPath;
    provider: DiscoveredFieldPath;
    mode: DiscoveredFieldPath;
    visionSupport: DiscoveredFieldPath;
    thinkingSupport: DiscoveredFieldPath;
    inputTokenPrice: DiscoveredFieldPath;
    outputTokenPrice: DiscoveredFieldPath;
    embeddingPrice: DiscoveredFieldPath;
    embeddingDimensions: DiscoveredFieldPath;
    otherPricingFields: DiscoveredFieldPath[];
    otherCapabilityFields: DiscoveredFieldPath[];
  };
  allFields: JsonFieldEntry[];
}

export interface CatalogAnalysis {
  fetchedAt: string;
  topLevelKeys: string[];
  modelsArrayPath: string;
  totalModels: number;
  modesFound: string[];
  providersFound: string[];
  allObservedModelFieldPaths: string[];
  schemaSummary: {
    modelIdField: string;
    modelNameField: string;
    providerField: string;
    modeField: string;
    visionSupportField: string;
    thinkingSupportField: string;
    inputTokenPriceField: string;
    outputTokenPriceField: string;
    embeddingPriceField: string;
    embeddingDimensionsField: string;
    otherPricingFields: string[];
    otherCapabilityFields: string[];
  };
  prefixAnalysis: {
    totalWithSlashPrefix: number;
    totalWithoutSlashPrefix: number;
    totalWithColonTag: number;
    observedPrefixes: string[];
    examplesWithPrefix: string[];
    examplesWithoutPrefix: string[];
  };
  models: AnalyzedModelItem[];
  chatModels: AnalyzedModelItem[];
  embeddingModels: AnalyzedModelItem[];
  decisionModels: AnalyzedModelItem[];
  recursiveFields: JsonFieldEntry[];
}

export interface SSECapturedEvent {
  index: number;
  rawFrame: string;
  eventType: string | null;
  rawData: string;
  parsedData: unknown | null;
  isDoneMarker: boolean;
}

export interface StreamInspection {
  events: SSECapturedEvent[];
  totalEvents: number;
  dataChunkCount: number;
  hasDoneMarker: boolean;
  assembledText: string;
  finalChunk: unknown | null;
  finalChunkIndex: number | null;
  finalUsage: unknown | null;
  finalUsagePath: string | null;
  finalCost: unknown | null;
  finalCostPath: string | null;
  finishReason: string | null;
  finishReasonPath: string | null;
  responseCompletedEvent: unknown | null;
  observedEventTypes: string[];
}

export interface RateLimitInspection {
  observedRateLimitHeaders: Record<string, string>;
  standardHeaders: {
    retryAfter: string | null;
    rateLimitLimit: string | null;
    rateLimitRemaining: string | null;
    rateLimitReset: string | null;
    xRateLimitLimit: string | null;
    xRateLimitRemaining: string | null;
    xRateLimitReset: string | null;
  };
  hasAnyRateLimitHeader: boolean;
  is429: boolean;
  retryAfterExists: boolean;
  retryAfterValue: string | null;
  retryAfterFormat: 'seconds' | 'http-date' | 'other' | 'none';
  statusSummary: string;
  perKeyLimitStatus: string;
  perAccountLimitStatus: string;
}

export interface ErrorSchemaAnalysis {
  isErrorStatus: boolean;
  httpStatus: number;
  isJson: boolean;
  detectedFormat:
    | 'openai-style'
    | 'anthropic-style'
    | 'html-gateway'
    | 'custom-json'
    | 'plain-text'
    | 'none';
  readableMessage: string;
  hasErrorObject: boolean;
  hasErrorCode: boolean;
  errorCodeValue: unknown;
  errorCodeType: string;
  errorTypeValue: unknown;
  errorTypeDataType: string;
  errorMessageValue: unknown;
  errorMessageDataType: string;
  topLevelTypeValue: unknown;
  exactFieldNames: string[];
  exactFields: JsonFieldEntry[];
  matchesOpenAIHypothesis: boolean;
  openAIHypothesisNote: string;
  matchesAnthropicHypothesis: boolean;
  anthropicHypothesisNote: string;
}

export interface EmbeddingDimensionVerification {
  modelId: string;
  httpStatus: number;
  inputTokens: number | null;
  actualVectorDimension: number | null;
  vectorSampleFirst5: number[];
  catalogDeclaredDimension: number | null;
  catalogDeclaredStatus: string;
  dimensionsMatch: 'MATCH' | 'MISMATCH' | 'CANNOT COMPARE — NOT PROVIDED BY MODEL CATALOG';
  responseDeclaredDimensionField: string | null;
  costUsd: string | number | null;
}

export interface ExtractedUsageAndCost {
  rawUsageObject: unknown | null;
  usagePath: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  costValue: string | number | null;
  costPath: string | null;
  tokenCountField: string | null;
  tokenCountValue: number | null;
}

export interface TestExecutionResult {
  id: string;
  endpointId: EndpointId;
  label: string;
  category: TestCategory;
  timestamp: string;
  authFormatUsed: AuthFormat;
  apiKeyConfiguredOnServer: boolean;
  method: 'GET' | 'POST';
  exactUrl: string;
  redactedRequestHeaders: Record<string, string>;
  requestBodyRaw: string | null;
  parsedRequestBody: unknown | null;
  httpStatus: number;
  statusText: string;
  ok: boolean;
  durationMs: number;
  responseHeaders: Record<string, string>;
  rawResponseBody: string;
  isJsonResponse: boolean;
  parsedResponseBody: unknown | null;
  responseRecursiveFields: JsonFieldEntry[];
  usageAndCost: ExtractedUsageAndCost;
  finishReason: string | null;
  finishReasonPath: string | null;
  streamInspection: StreamInspection | null;
  rateLimitInspection: RateLimitInspection;
  errorAnalysis: ErrorSchemaAnalysis | null;
  embeddingVerification: EmbeddingDimensionVerification | null;
  networkError: string | null;
  notes?: string[];
}

export interface CatalogSnapshot {
  id: string;
  label: string;
  timestamp: string;
  totalModels: number;
  rawCatalog: unknown;
}

export interface SnapshotFieldDiff {
  modelId: string;
  category: 'pricing' | 'capability' | 'embedding_dimension' | 'metadata';
  fieldPath: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface CatalogSnapshotComparison {
  snapshotA: { id: string; label: string; timestamp: string; totalModels: number };
  snapshotB: { id: string; label: string; timestamp: string; totalModels: number };
  addedModelIds: string[];
  removedModelIds: string[];
  pricingChanges: SnapshotFieldDiff[];
  capabilityChanges: SnapshotFieldDiff[];
  embeddingDimensionChanges: SnapshotFieldDiff[];
  metadataChanges: SnapshotFieldDiff[];
}

export interface PrivacyQuestionItem {
  id: number;
  question: string;
  status: 'Verified' | 'Unverified' | 'Requires Provider Confirmation';
  evidenceSource: string;
  notes: string;
}

export interface ServerConfigStatus {
  baseUrl: string;
  apiKeyConfigured: boolean;
  keySource: 'env' | 'env.local' | 'missing' | 'placeholder';
  maskedStatus: string;
  nextVersion: string;
  timestamp: string;
}
