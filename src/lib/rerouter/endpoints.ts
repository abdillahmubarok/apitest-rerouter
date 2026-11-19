import type { AuthFormat, EndpointId, TestCategory } from './types';

export interface EndpointDefinition {
  id: EndpointId;
  testNumber?: number;
  label: string;
  description: string;
  category: TestCategory;
  method: 'GET' | 'POST';
  useRootOrigin?: boolean;
  path: string;
  defaultAuthFormat: AuthFormat;
  extraHeaders?: Record<string, string>;
  expectStream?: boolean;
  isEmbeddingTest?: boolean;
  defaultBodyBuilder: (selectedModelId?: string) => unknown | null;
}

export const ENDPOINT_DEFINITIONS: Record<EndpointId, EndpointDefinition> = {
  models: {
    id: 'models',
    testNumber: 1,
    label: 'TEST 1: Models (GET /v1/models)',
    description:
      'Retrieve all available models and inspect exact JSON paths, capabilities, modes, and pricing.',
    category: 'A',
    method: 'GET',
    path: '/models',
    defaultAuthFormat: 'bearer',
    defaultBodyBuilder: () => null,
  },
  'chat-completions': {
    id: 'chat-completions',
    testNumber: 2,
    label: 'TEST 2: Chat Completions (POST /v1/chat/completions)',
    description:
      'Execute a non-streaming chat completion using an actual chat model ID from the catalog.',
    category: 'B',
    method: 'POST',
    path: '/chat/completions',
    defaultAuthFormat: 'bearer',
    defaultBodyBuilder: (modelId = 'gpt-5-mini') => ({
      model: modelId,
      messages: [
        {
          role: 'user',
          content: 'Reply with exactly: ReRouter connection successful.',
        },
      ],
      max_tokens: 32,
      stream: false,
    }),
  },
  'chat-completions-stream': {
    id: 'chat-completions-stream',
    testNumber: 3,
    label: 'TEST 3: Streaming Chat Completions (POST /v1/chat/completions)',
    description:
      'Execute a streaming SSE chat completion and capture every event, chunk, finish_reason, usage, and cost.',
    category: 'B',
    method: 'POST',
    path: '/chat/completions',
    defaultAuthFormat: 'bearer',
    expectStream: true,
    defaultBodyBuilder: (modelId = 'gpt-5-mini') => ({
      model: modelId,
      messages: [
        {
          role: 'user',
          content: 'Write a short test response.',
        },
      ],
      max_tokens: 64,
      stream: true,
    }),
  },
  responses: {
    id: 'responses',
    testNumber: 4,
    label: 'TEST 4A: Responses API Non-Streaming (POST /v1/responses)',
    description:
      'Execute a non-streaming request against /v1/responses and inspect the complete response structure.',
    category: 'B',
    method: 'POST',
    path: '/responses',
    defaultAuthFormat: 'bearer',
    defaultBodyBuilder: (modelId = 'gpt-5-mini') => ({
      model: modelId,
      input: 'Reply with exactly: Responses API successful.',
      max_output_tokens: 32,
    }),
  },
  'responses-stream': {
    id: 'responses-stream',
    testNumber: 4,
    label: 'TEST 4B: Responses API Streaming (POST /v1/responses)',
    description:
      'Execute a streaming request against /v1/responses and record all SSE events including response.completed.',
    category: 'B',
    method: 'POST',
    path: '/responses',
    defaultAuthFormat: 'bearer',
    expectStream: true,
    defaultBodyBuilder: (modelId = 'gpt-5-mini') => ({
      model: modelId,
      input: 'Write a short test response.',
      max_output_tokens: 64,
      stream: true,
    }),
  },
  'anthropic-messages': {
    id: 'anthropic-messages',
    testNumber: 5,
    label: 'TEST 5: Anthropic Messages (POST /v1/messages)',
    description:
      'Test Anthropic Messages API with x-api-key and anthropic-version: 2023-06-01 headers.',
    category: 'B',
    method: 'POST',
    path: '/messages',
    defaultAuthFormat: 'x-api-key',
    extraHeaders: {
      'anthropic-version': '2023-06-01',
    },
    defaultBodyBuilder: (modelId = 'claude-haiku-4-5') => ({
      model: modelId,
      max_tokens: 32,
      messages: [
        {
          role: 'user',
          content: 'Reply with exactly: Anthropic Messages successful.',
        },
      ],
    }),
  },
  'count-tokens-v1': {
    id: 'count-tokens-v1',
    testNumber: 6,
    label: 'TEST 6A: Count Tokens Candidate 1 (POST /v1/messages/count_tokens)',
    description:
      'Test token counting at https://rerouter.mubarokah.com/v1/messages/count_tokens.',
    category: 'A',
    method: 'POST',
    path: '/messages/count_tokens',
    defaultAuthFormat: 'x-api-key',
    extraHeaders: {
      'anthropic-version': '2023-06-01',
    },
    defaultBodyBuilder: (modelId = 'claude-haiku-4-5') => ({
      model: modelId,
      messages: [
        {
          role: 'user',
          content: 'Count these tokens.',
        },
      ],
    }),
  },
  'count-tokens-root': {
    id: 'count-tokens-root',
    testNumber: 6,
    label: 'TEST 6B: Count Tokens Candidate 2 (POST /messages/count_tokens)',
    description:
      'Test token counting at https://rerouter.mubarokah.com/messages/count_tokens (root path without /v1).',
    category: 'A',
    method: 'POST',
    useRootOrigin: true,
    path: '/messages/count_tokens',
    defaultAuthFormat: 'x-api-key',
    extraHeaders: {
      'anthropic-version': '2023-06-01',
    },
    defaultBodyBuilder: (modelId = 'claude-haiku-4-5') => ({
      model: modelId,
      messages: [
        {
          role: 'user',
          content: 'Count these tokens.',
        },
      ],
    }),
  },
  embeddings: {
    id: 'embeddings',
    testNumber: 7,
    label: 'TEST 7: Embeddings (POST /v1/embeddings)',
    description:
      'Generate embeddings using an actual catalog embedding model ID and verify vector dimensions via embedding.length.',
    category: 'B',
    method: 'POST',
    path: '/embeddings',
    defaultAuthFormat: 'bearer',
    isEmbeddingTest: true,
    defaultBodyBuilder: (modelId = 'gemini/gemini-embedding-001') => ({
      model: modelId,
      input: ['ReRouter API integration test'],
    }),
  },
  decisions: {
    id: 'decisions',
    testNumber: 8,
    label: 'TEST 8: Decisions API (POST /v1/decisions)',
    description:
      'Test structured predicate decisions using a decision model from the catalog (e.g. jev-1.14.0).',
    category: 'B',
    method: 'POST',
    path: '/decisions',
    defaultAuthFormat: 'bearer',
    defaultBodyBuilder: (modelId = 'jev-1.14.0') => ({
      model: modelId,
      input: 'Customer requests a refund because they were charged twice.',
      questions: [
        {
          type: 'predicate',
          name: 'is_refund',
          instructions: 'Is the customer asking for a refund?',
        },
      ],
    }),
  },
  systemone: {
    id: 'systemone',
    testNumber: 9,
    label: 'TEST 9: System One API (POST /v1/systemone)',
    description:
      'Test the exact documented System One payload (model: "typesafe/jev-1.14.0") first, and inspect response or error.',
    category: 'B',
    method: 'POST',
    path: '/systemone',
    defaultAuthFormat: 'bearer',
    defaultBodyBuilder: (modelId = 'typesafe/jev-1.14.0') => ({
      model: modelId,
      state: 'Customer requests a refund because they were charged twice.',
      questions: {
        is_refund: {
          type: 'noul',
          instructions: 'Is this a refund request?',
        },
      },
    }),
  },
  'error-missing-key': {
    id: 'error-missing-key',
    label: 'Negative Test A: Missing API Key (OpenAI Endpoint)',
    description:
      'Call POST /v1/chat/completions without any Authorization or x-api-key header (Expected HTTP 401).',
    category: 'A',
    method: 'POST',
    path: '/chat/completions',
    defaultAuthFormat: 'none',
    defaultBodyBuilder: (modelId = 'gpt-5-mini') => ({
      model: modelId,
      messages: [{ role: 'user', content: 'Missing API key test.' }],
      max_tokens: 8,
    }),
  },
  'error-invalid-key': {
    id: 'error-invalid-key',
    label: 'Negative Test B: Invalid Dummy API Key (OpenAI Endpoint)',
    description:
      'Call POST /v1/chat/completions with a deliberate synthetic dummy key (Expected HTTP 401).',
    category: 'A',
    method: 'POST',
    path: '/chat/completions',
    defaultAuthFormat: 'invalid-dummy',
    defaultBodyBuilder: (modelId = 'gpt-5-mini') => ({
      model: modelId,
      messages: [{ role: 'user', content: 'Invalid dummy API key test.' }],
      max_tokens: 8,
    }),
  },
  'error-invalid-request': {
    id: 'error-invalid-request',
    label: 'Negative Test C: Invalid / Malformed Request (400)',
    description:
      'Send a minimal malformed payload missing required messages array to POST /v1/chat/completions.',
    category: 'A',
    method: 'POST',
    path: '/chat/completions',
    defaultAuthFormat: 'bearer',
    defaultBodyBuilder: (modelId = 'gpt-5-mini') => ({
      model: modelId,
      messages: 'INVALID_NON_ARRAY_MESSAGES_FIELD',
    }),
  },
  'error-unknown-model': {
    id: 'error-unknown-model',
    label: 'Negative Test D: Unknown Synthetic Model ID (404)',
    description:
      'Send a request with a clearly nonexistent synthetic model ID to capture the unknown-model error response.',
    category: 'A',
    method: 'POST',
    path: '/chat/completions',
    defaultAuthFormat: 'bearer',
    defaultBodyBuilder: () => ({
      model: 'nonexistent-provider/unknown-synthetic-model-000000',
      messages: [{ role: 'user', content: 'Unknown model test.' }],
      max_tokens: 8,
    }),
  },
  'error-forbidden-model': {
    id: 'error-forbidden-model',
    label: 'Negative Test E: Forbidden / Restricted Model (403)',
    description:
      'Test a restricted model ID when a key with model permission restrictions is configured.',
    category: 'C',
    method: 'POST',
    path: '/chat/completions',
    defaultAuthFormat: 'bearer',
    defaultBodyBuilder: (modelId = 'claude-opus-5-5') => ({
      model: modelId,
      messages: [{ role: 'user', content: 'Forbidden model permission test.' }],
      max_tokens: 8,
    }),
  },
  'error-anthropic-missing-key': {
    id: 'error-anthropic-missing-key',
    label: 'Anthropic Negative Test A: Missing API Key (POST /v1/messages)',
    description:
      'Call POST /v1/messages without x-api-key to inspect Anthropic error envelope.',
    category: 'A',
    method: 'POST',
    path: '/messages',
    defaultAuthFormat: 'none',
    extraHeaders: {
      'anthropic-version': '2023-06-01',
    },
    defaultBodyBuilder: (modelId = 'claude-haiku-4-5') => ({
      model: modelId,
      max_tokens: 8,
      messages: [{ role: 'user', content: 'Anthropic missing key test.' }],
    }),
  },
  'error-anthropic-invalid-key': {
    id: 'error-anthropic-invalid-key',
    label: 'Anthropic Negative Test B: Invalid Dummy Key (POST /v1/messages)',
    description:
      'Call POST /v1/messages with a deliberate invalid dummy x-api-key to inspect Anthropic 401 error format.',
    category: 'A',
    method: 'POST',
    path: '/messages',
    defaultAuthFormat: 'invalid-dummy',
    extraHeaders: {
      'anthropic-version': '2023-06-01',
    },
    defaultBodyBuilder: (modelId = 'claude-haiku-4-5') => ({
      model: modelId,
      max_tokens: 8,
      messages: [{ role: 'user', content: 'Anthropic invalid key test.' }],
    }),
  },
  'error-anthropic-invalid-request': {
    id: 'error-anthropic-invalid-request',
    label: 'Anthropic Negative Test C: Malformed Request (POST /v1/messages)',
    description:
      'Send a malformed payload to POST /v1/messages to inspect Anthropic 400 error format.',
    category: 'A',
    method: 'POST',
    path: '/messages',
    defaultAuthFormat: 'x-api-key',
    extraHeaders: {
      'anthropic-version': '2023-06-01',
    },
    defaultBodyBuilder: (modelId = 'claude-haiku-4-5') => ({
      model: modelId,
      messages: 'INVALID_MESSAGES_TYPE',
    }),
  },
  'error-anthropic-unknown-model': {
    id: 'error-anthropic-unknown-model',
    label: 'Anthropic Negative Test D: Unknown Model (POST /v1/messages)',
    description:
      'Send a synthetic nonexistent model ID to POST /v1/messages to inspect Anthropic 404 error format.',
    category: 'A',
    method: 'POST',
    path: '/messages',
    defaultAuthFormat: 'x-api-key',
    extraHeaders: {
      'anthropic-version': '2023-06-01',
    },
    defaultBodyBuilder: () => ({
      model: 'nonexistent-anthropic/claude-unknown-000000',
      max_tokens: 8,
      messages: [{ role: 'user', content: 'Unknown model test.' }],
    }),
  },
  'token-limit-test': {
    id: 'token-limit-test',
    label: 'Ordinary Max-Token Truncation Test (max_tokens: 4)',
    description:
      'Verify whether an ordinary token-limited completion returns finish_reason: "length".',
    category: 'B',
    method: 'POST',
    path: '/chat/completions',
    defaultAuthFormat: 'bearer',
    defaultBodyBuilder: (modelId = 'gpt-5-mini') => ({
      model: modelId,
      messages: [
        {
          role: 'user',
          content:
            'Write a 50-word paragraph explaining how HTTP status codes work.',
        },
      ],
      max_tokens: 4,
      stream: false,
    }),
  },
  'credit-limit-test': {
    id: 'credit-limit-test',
    label: 'CREDIT-LIMIT TEST (Restricted — Low-Credit Test Key Only)',
    description:
      'Investigate credit-based output truncation when remaining credit is insufficient for requested max_tokens.',
    category: 'C',
    method: 'POST',
    path: '/chat/completions',
    defaultAuthFormat: 'bearer',
    defaultBodyBuilder: (modelId = 'gpt-5-mini') => ({
      model: modelId,
      messages: [
        {
          role: 'user',
          content:
            'Write a detailed explanation of distributed consensus algorithms.',
        },
      ],
      max_tokens: 512,
      stream: false,
    }),
  },
  'claude-alias-test': {
    id: 'claude-alias-test',
    label: 'Dated Claude Alias Resolution Test',
    description:
      'Test whether a dated Claude model alias (e.g. claude-haiku-4-5-20251001 or claude-3-5-sonnet-20241022) is accepted and mapped to a catalog ID.',
    category: 'B',
    method: 'POST',
    path: '/messages',
    defaultAuthFormat: 'x-api-key',
    extraHeaders: {
      'anthropic-version': '2023-06-01',
    },
    defaultBodyBuilder: (modelId = 'claude-3-5-sonnet-20241022') => ({
      model: modelId,
      max_tokens: 16,
      messages: [
        {
          role: 'user',
          content: 'Reply with: Alias test.',
        },
      ],
    }),
  },
};

export function isAllowedEndpointId(id: string): id is EndpointId {
  return Object.prototype.hasOwnProperty.call(ENDPOINT_DEFINITIONS, id);
}
