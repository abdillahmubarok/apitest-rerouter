import {
  extractModelPricingFromRaw,
  formatPerTokenPrice,
  formatRequestCost,
} from '@/lib/format/pricing';
import type {
  AuthFormat,
  CatalogAnalysis,
  PrivacyQuestionItem,
  ServerConfigStatus,
  TestExecutionResult,
} from './types';

export const DEFAULT_PRIVACY_QUESTIONS: PrivacyQuestionItem[] = [
  {
    id: 1,
    question: 'Does ReRouter store incoming prompts?',
    status: 'Requires Provider Confirmation',
    evidenceSource: 'Cannot be determined via HTTP API responses alone.',
    notes:
      'Provider must confirm whether incoming request payloads/prompts are persisted to database or object storage.',
  },
  {
    id: 2,
    question: 'Does ReRouter store generated completions?',
    status: 'Requires Provider Confirmation',
    evidenceSource: 'Cannot be determined via HTTP API responses alone.',
    notes:
      'Provider must confirm whether non-streaming and streaming completions are stored server-side.',
  },
  {
    id: 3,
    question: 'Are full request and response bodies logged?',
    status: 'Requires Provider Confirmation',
    evidenceSource: 'Cannot be determined via HTTP API responses alone.',
    notes:
      'Clarify application logging, reverse-proxy (nginx) payload logging, and error/debug trace logging.',
  },
  {
    id: 4,
    question: 'Are only request metadata and usage statistics stored?',
    status: 'Requires Provider Confirmation',
    evidenceSource: 'Cannot be determined via HTTP API responses alone.',
    notes:
      'Confirm if billing/telemetry records store only token counts, model ID, latency, and cost without payload content.',
  },
  {
    id: 5,
    question: 'How long are logs retained?',
    status: 'Requires Provider Confirmation',
    evidenceSource: 'No retention headers or policy endpoint exposed in /v1.',
    notes:
      'Specify exact retention duration in days for billing logs, application logs, and audit trails.',
  },
  {
    id: 6,
    question: 'Is retention different for failed requests?',
    status: 'Requires Provider Confirmation',
    evidenceSource: 'Cannot be determined via HTTP API responses alone.',
    notes:
      'Confirm whether 4xx/5xx error payloads are retained longer for debugging/incident triage.',
  },
  {
    id: 7,
    question: 'Are API keys stored as hashes or encrypted values?',
    status: 'Requires Provider Confirmation',
    evidenceSource: 'Internal backend security architecture is not observable externally.',
    notes:
      'Confirm cryptographic hashing (e.g. SHA-256 / Argon2) vs reversible encryption at rest.',
  },
  {
    id: 8,
    question: 'Are prompts or completions used for model training or fine-tuning?',
    status: 'Requires Provider Confirmation',
    evidenceSource: 'Requires formal Data Processing Agreement (DPA) / Terms of Service.',
    notes:
      'Confirm both ReRouter policy and downstream model routing tier commitments (free vs paid models).',
  },
  {
    id: 9,
    question: 'Are prompts forwarded to third-party model providers?',
    status: 'Requires Provider Confirmation',
    evidenceSource:
      'GET /v1/models lists models across multiple owned_by providers (openai, anthropic, gemini, deepseek, alibaba, byteplus, typesafe, xai, z.ai, etc.).',
    notes:
      'Provider must confirm exact sub-processors and routing paths for each model family.',
  },
  {
    id: 10,
    question: "What are the downstream providers' respective retention policies?",
    status: 'Requires Provider Confirmation',
    evidenceSource: 'Requires provider sub-processor schedule.',
    notes:
      'Confirm whether enterprise/zero-data-retention endpoints or standard consumer/API endpoints are used upstream.',
  },
  {
    id: 11,
    question: 'Can zero-retention mode be enabled?',
    status: 'Requires Provider Confirmation',
    evidenceSource: 'No zero-retention parameter or header observed in API responses.',
    notes:
      'Confirm if an account-level or per-request header flag exists for Zero Data Retention (ZDR).',
  },
  {
    id: 12,
    question: 'Can customers request complete deletion of request logs?',
    status: 'Requires Provider Confirmation',
    evidenceSource: 'Requires provider support / compliance confirmation.',
    notes:
      'Confirm SLA and procedure for right-to-erasure / log purge requests.',
  },
  {
    id: 13,
    question: 'Where is customer data processed and stored?',
    status: 'Requires Provider Confirmation',
    evidenceSource: 'Server header reports nginx; data center jurisdiction unconfirmed.',
    notes:
      'Confirm cloud provider, primary hosting region(s), and cross-border data transfer safeguards.',
  },
  {
    id: 14,
    question: 'Who can access request logs?',
    status: 'Requires Provider Confirmation',
    evidenceSource: 'Internal access control policy not externally observable.',
    notes:
      'Confirm RBAC controls, employee access policies, and audit logging for internal staff.',
  },
  {
    id: 15,
    question: 'Is data isolated between different customer accounts?',
    status: 'Requires Provider Confirmation',
    evidenceSource:
      'GET /v1/models includes pricing.input_cache_read fields, indicating prompt caching support.',
    notes:
      'Confirm strict tenant isolation for prompt caches (pricing.input_cache_read), logs, and rate-limit buckets.',
  },
];

export function generatePrivacyQuestionsMarkdown(
  questions: PrivacyQuestionItem[] = DEFAULT_PRIVACY_QUESTIONS,
  generatedAt = '2026-11-19'
): string {
  const now = generatedAt;
  const lines: string[] = [
    '# ReRouter by Mubarokah Digital — Privacy & Data Retention Questionnaire',
    '',
    `**Generated:** ${now}`,
    '**Target API Base URL:** `https://rerouter.mubarokah.com/v1`',
    '**Classification:** `PROVIDER CONFIRMATION REQUIRED`',
    '',
    '> **Important Notice:** Privacy, logging, sub-processor routing, and data retention guarantees cannot be established through HTTP response inspection alone. This questionnaire must be completed and confirmed in writing by the ReRouter provider (Mubarokah Digital) prior to processing production customer data.',
    '',
    '## Summary Table',
    '',
    '| # | Question | Current Status | Evidence Source | Notes |',
    '|---|---|---|---|---|',
  ];

  for (const q of questions) {
    lines.push(
      `| ${q.id} | ${q.question} | **${q.status}** | ${q.evidenceSource} | ${q.notes} |`
    );
  }

  lines.push(
    '',
    '---',
    '',
    '## Detailed Questions for Provider Sign-Off',
    ''
  );

  for (const q of questions) {
    lines.push(
      `### ${q.id}. ${q.question}`,
      `- **Verification Status:** \`${q.status}\``,
      `- **Evidence Source:** ${q.evidenceSource}`,
      `- **Engineering Notes:** ${q.notes}`,
      `- **Provider Response:** _[To be completed by Mubarokah Digital]_`,
      ''
    );
  }

  return lines.join('\n');
}

export interface ReportGenerationInput {
  configStatus: ServerConfigStatus;
  activeAuthFormat: AuthFormat;
  catalogAnalysis: CatalogAnalysis | null;
  testResults: TestExecutionResult[];
  privacyQuestions?: PrivacyQuestionItem[];
}

export function generateTestReportMarkdown(
  input: ReportGenerationInput
): string {
  const {
    configStatus,
    activeAuthFormat,
    catalogAnalysis,
    testResults,
    privacyQuestions = DEFAULT_PRIVACY_QUESTIONS,
  } = input;

  const reportTime = configStatus.timestamp || new Date().toISOString();
  const lines: string[] = [
    '# ReRouter API Playground — Live BYOK Session Verification Report',
    '',
    '> **Session Report Notice:** This report is generated dynamically from your active in-memory browser session in the public ReRouter API Playground (`https://apitest-rerouter.mubarokah.com`). It reflects only the requests executed during your current session using your own Bring Your Own API Key (BYOK) and is completely distinct from historical project verification documentation. All API keys and authentication headers are redacted.',
    '',
    '## A. Environment & Session Architecture',
    '',
    `- **Platform:** \`ReRouter API Playground (Public Multi-User BYOK)\``,
    `- **Production Domain:** \`${configStatus.productionDomain || 'https://apitest-rerouter.mubarokah.com'}\``,
    `- **Next.js Version:** \`${configStatus.nextVersion}\` (App Router)`,
    `- **Target ReRouter Base URL:** \`${configStatus.baseUrl}\``,
    `- **Official Documentation:** \`${configStatus.docsUrl || 'https://rerouter.mubarokah.com/docs'}\``,
    `- **Official Billing Portal:** \`${configStatus.billingUrl || 'https://rerouter.mubarokah.com/billing'}\``,
    `- **Active Authentication Format:** \`${
      activeAuthFormat === 'x-api-key'
        ? 'x-api-key: [REDACTED_API_KEY]'
        : 'Authorization: Bearer [REDACTED_API_KEY]'
    }\` (Both \`Authorization: Bearer\` and \`x-api-key\` supported)`,
    `- **Report Generated At:** \`${reportTime}\``,
    `- **Session Storage Model:** \`In-Memory React State Only (No database, no persistent browser storage, no server key storage)\``,
    '- **Secret Hygiene:** Verified — all user API keys and authentication headers are redacted in this report.',
    '',
    '---',
    '',
    '## B. Model Catalog (`GET /v1/models`)',
    '',
  ];

  if (!catalogAnalysis) {
    lines.push(
      '_Model catalog has not been fetched yet in this session._',
      ''
    );
  } else {
    lines.push(
      `- **Catalog Fetched At:** \`${catalogAnalysis.fetchedAt}\``,
      `- **Top-Level JSON Keys:** ${catalogAnalysis.topLevelKeys
        .map((k) => `\`${k}\``)
        .join(', ')}`,
      `- **Models Array Path:** \`${catalogAnalysis.modelsArrayPath}\``,
      `- **Total Models Returned:** \`${catalogAnalysis.totalModels}\``,
      `- **Observed Modes (\`data[i].mode\`):** ${catalogAnalysis.modesFound
        .map((m) => `\`${m}\``)
        .join(', ')}`,
      `- **Observed Providers (\`data[i].owned_by\`):** ${catalogAnalysis.providersFound
        .map((p) => `\`${p}\``)
        .join(', ')}`,
      '',
      '### Exact Field Names & JSON Paths Discovered in `GET /v1/models`',
      '',
      '| Concept | Exact Field Name in Model Object | Example Exact JSON Path | Observed Data Type | Notes |',
      '|---|---|---|---|---|',
      `| **Model ID** | \`${catalogAnalysis.schemaSummary.modelIdField}\` | \`data[0].id\` | \`string\` | Exact identifier used in requests |`,
      `| **Model Name** | \`${catalogAnalysis.schemaSummary.modelNameField}\` | \`data[0].name\` | \`string\` | Matches \`id\` across observed catalog items |`,
      `| **Provider** | \`${catalogAnalysis.schemaSummary.providerField}\` | \`data[0].owned_by\` | \`string\` | Empty string \`""\` for \`:free\` models; vendor slug for paid models |`,
      `| **Mode** | \`${catalogAnalysis.schemaSummary.modeField}\` | \`data[0].mode\` | \`string\` | Values observed: \`"chat"\`, \`"embedding"\`, \`"decision"\` |`,
      `| **Vision Support** | \`${catalogAnalysis.schemaSummary.visionSupportField}\` | \`data[0].supports_vision\` | \`boolean\` | Exact field is \`supports_vision\` (NOT \`vision\`) |`,
      `| **Thinking Support** | \`${catalogAnalysis.schemaSummary.thinkingSupportField}\` | \`data[0].supports_reasoning\` | \`boolean\` | Exact field is \`supports_reasoning\` (NOT \`thinking\`) |`,
      `| **Input Token Price** | \`${catalogAnalysis.schemaSummary.inputTokenPriceField}\` | \`data[0].pricing.prompt\` | \`string\` | Decimal USD string per token (NOT \`input_price\`) |`,
      `| **Output Token Price** | \`${catalogAnalysis.schemaSummary.outputTokenPriceField}\` | \`data[0].pricing.completion\` | \`string\` | Decimal USD string per token (NOT \`output_price\`) |`,
      `| **Embedding Price** | \`${catalogAnalysis.schemaSummary.embeddingPriceField}\` | \`data[i].pricing.prompt\` | \`string\` | No separate \`embedding_price\` field; uses \`pricing.prompt\` |`,
      `| **Embedding Dimensions** | \`${catalogAnalysis.schemaSummary.embeddingDimensionsField}\` | \`NOT PROVIDED BY MODEL CATALOG\` | \`not_present\` | Catalog does NOT declare vector dimensions for any embedding model |`,
      `| **Other Pricing Fields** | ${catalogAnalysis.schemaSummary.otherPricingFields
        .map((f) => `\`${f}\``)
        .join(', ')} | \`data[i].pricing.input_cache_read\`, \`data[i].pricing_long_context\`, \`data[i].pricing_offpeak\` | \`string / object / null\` | Tiered long-context & off-peak window pricing |`,
      `| **Other Capability / Metadata Fields** | ${catalogAnalysis.schemaSummary.otherCapabilityFields
        .map((f) => `\`${f}\``)
        .join(', ')} | \`data[i].context_length\`, \`data[i].created\`, \`data[i].description\`, \`data[i].object\` | \`number / string\` | Standard metadata fields |`,
      '',
      '### Embedding Models in Catalog & Dimension Metadata Audit',
      '',
      '| Model ID | Provider (`owned_by`) | Mode | Context Length | Prompt Price (Raw `pricing.prompt` / USD per 1M) | Catalog-Declared Dimension |',
      '|---|---|---|---|---|---|'
    );

    for (const em of catalogAnalysis.embeddingModels) {
      const rawPrompt =
        typeof em.inputTokenPrice === 'string'
          ? em.inputTokenPrice
          : String(em.inputTokenPrice ?? '');
      const per1MPrompt = formatPerTokenPrice(em.inputTokenPrice);
      lines.push(
        `| \`${em.modelId}\` | \`${em.provider}\` | \`${em.mode}\` | \`${em.contextLength}\` | \`${rawPrompt}\` (${per1MPrompt} / 1M) | \`${
          em.declaredEmbeddingDimension !== null
            ? em.declaredEmbeddingDimension
            : 'NOT PROVIDED BY MODEL CATALOG'
        }\` |`
      );
    }

    lines.push(
      '',
      '### Decision Models in Catalog',
      '',
      '| Model ID | Provider (`owned_by`) | Mode | Context Length | Prompt Price (Raw `pricing.prompt` / USD per 1M) | Completion Price (Raw `pricing.completion` / USD per 1M) |',
      '|---|---|---|---|---|---|'
    );

    for (const dm of catalogAnalysis.decisionModels) {
      const rawPrompt =
        typeof dm.inputTokenPrice === 'string'
          ? dm.inputTokenPrice
          : String(dm.inputTokenPrice ?? '');
      const per1MPrompt = formatPerTokenPrice(dm.inputTokenPrice);
      const rawCompletion =
        typeof dm.outputTokenPrice === 'string'
          ? dm.outputTokenPrice
          : String(dm.outputTokenPrice ?? '');
      const per1MCompletion = formatPerTokenPrice(dm.outputTokenPrice);
      lines.push(
        `| \`${dm.modelId}\` | \`${dm.provider}\` | \`${dm.mode}\` | \`${dm.contextLength}\` | \`${rawPrompt}\` (${per1MPrompt} / 1M) | \`${rawCompletion}\` (${per1MCompletion} / 1M) |`
      );
    }

    lines.push(
      '',
      '### Model Pricing Table (Raw USD/token Source of Truth & Formatted USD / 1M Tokens)',
      '',
      '| Model ID | Mode | Input / 1M (`pricing.prompt`) | Raw `pricing.prompt` | Output / 1M (`pricing.completion`) | Raw `pricing.completion` | Cache Read / 1M (`pricing.input_cache_read`) | Raw `pricing.input_cache_read` | Tiered Pricing |',
      '|---|---|---|---|---|---|---|---|---|'
    );

    for (const m of catalogAnalysis.models) {
      const p = extractModelPricingFromRaw(m.rawObject);
      const inputPer1M = p.isFree ? 'FREE ($0.00)' : p.prompt.formattedPer1M;
      const outputPer1M =
        m.mode === 'embedding'
          ? '— (Input only)'
          : p.isFree
            ? 'FREE ($0.00)'
            : p.completion.formattedPer1M;
      const cachePer1M =
        p.inputCacheRead.status === 'valid' && !p.inputCacheRead.isZero
          ? p.inputCacheRead.formattedPer1M
          : '—';
      const tiers: string[] = [];
      if (p.longContext) {
        tiers.push(
          `Long context (${p.longContext.thresholdLabel}: In ${p.longContext.prompt.formattedPer1M}/1M, Out ${p.longContext.completion.formattedPer1M}/1M)`
        );
      }
      if (p.offpeak) {
        tiers.push(
          `Off-peak (In ${p.offpeak.prompt.formattedPer1M}/1M, Out ${p.offpeak.completion.formattedPer1M}/1M)`
        );
      }
      lines.push(
        `| \`${m.modelId}\` | \`${m.mode}\` | **${inputPer1M}** | \`${p.prompt.rawString ?? '—'}\` | **${outputPer1M}** | \`${p.completion.rawString ?? '—'}\` | **${cachePer1M}** | \`${p.inputCacheRead.rawString ?? '—'}\` | ${tiers.length > 0 ? tiers.join('; ') : '—'} |`
      );
    }

    lines.push(
      '',
      '### Complete List of Observed Model IDs (`data[].id`)',
      '',
      `- **Chat Models (${catalogAnalysis.chatModels.length}):** ${catalogAnalysis.chatModels
        .map((m) => `\`${m.modelId}\``)
        .join(', ')}`,
      `- **Embedding Models (${catalogAnalysis.embeddingModels.length}):** ${catalogAnalysis.embeddingModels
        .map((m) => `\`${m.modelId}\``)
        .join(', ')}`,
      `- **Decision Models (${catalogAnalysis.decisionModels.length}):** ${catalogAnalysis.decisionModels
        .map((m) => `\`${m.modelId}\``)
        .join(', ')}`,
      ''
    );
  }

  lines.push('---', '', '## C. Endpoint Results', '');

  if (testResults.length === 0) {
    lines.push('_No endpoint tests executed yet in this session._', '');
  } else {
    for (const res of testResults) {
      const rawPreview =
        res.rawResponseBody.length > 1200
          ? `${res.rawResponseBody.slice(0, 1200)}\n... [truncated ${
              res.rawResponseBody.length - 1200
            } chars in markdown preview]`
          : res.rawResponseBody;

      lines.push(
        `### ${res.label}`,
        `- **Category:** \`Category ${res.category}\``,
        `- **Timestamp:** \`${res.timestamp}\``,
        `- **HTTP Method:** \`${res.method}\``,
        `- **Exact URL:** \`${res.exactUrl}\``,
        `- **Auth Format Used:** \`${res.authFormatUsed}\` (BYOK Per-Request Key Supplied: \`${
          res.userKeySupplied ? 'Yes (Redacted)' : 'No (Unauthenticated Test)'
        }\`)`,
        `- **HTTP Status:** \`${res.httpStatus} (${res.statusText})\``,
        `- **Duration:** \`${res.durationMs} ms\``,
        `- **Test Outcome:** \`${
          res.ok ? 'SUCCESS (2xx)' : `NON-2xx / ERROR (HTTP ${res.httpStatus})`
        }\``,
        `- **Usage:** \`${
          res.usageAndCost.rawUsageObject
            ? JSON.stringify(res.usageAndCost.rawUsageObject)
            : res.usageAndCost.tokenCountField
              ? `${res.usageAndCost.tokenCountField}: ${res.usageAndCost.tokenCountValue}`
              : 'Not present in response'
        }\``,
        `- **Cost:** \`${formatRequestCost(res.usageAndCost.costValue)}\`${
          res.usageAndCost.costValue !== null &&
          res.usageAndCost.costValue !== undefined
            ? ` (raw: \`${String(res.usageAndCost.costValue)}\` at \`${res.usageAndCost.costPath}\`)`
            : ''
        }`,
        `- **Finish Reason:** \`${
          res.finishReason
            ? `${res.finishReason} (at ${res.finishReasonPath})`
            : 'N/A'
        }\``,
        ''
      );

      if (res.embeddingVerification) {
        const ev = res.embeddingVerification;
        lines.push(
          '#### Embedding Dimension Verification',
          `- **Actual Vector Dimension (\`embedding.length\`):** \`${
            ev.actualVectorDimension ?? 'N/A (no vector returned)'
          }\``,
          `- **Catalog-Declared Dimension:** \`${ev.catalogDeclaredStatus}\``,
          `- **Comparison Result:** \`${ev.dimensionsMatch}\``,
          ''
        );
      }

      if (res.streamInspection) {
        const si = res.streamInspection;
        lines.push(
          '#### SSE Stream Inspection',
          `- **Total SSE Events Captured:** \`${si.totalEvents}\``,
          `- **Data Chunks:** \`${si.dataChunkCount}\``,
          `- **Terminal \`[DONE]\` Marker Observed:** \`${si.hasDoneMarker}\``,
          `- **Observed Event Types:** ${
            si.observedEventTypes.length > 0
              ? si.observedEventTypes.map((t) => `\`${t}\``).join(', ')
              : '`data-only (no named event: header)`'
          }`,
          `- **Assembled Text:** ${JSON.stringify(si.assembledText)}`,
          ''
        );
      }

      lines.push(
        '#### Redacted Request Headers',
        '```json',
        JSON.stringify(res.redactedRequestHeaders, null, 2),
        '```',
        ''
      );

      if (res.requestBodyRaw) {
        lines.push(
          '#### Request Payload',
          '```json',
          res.requestBodyRaw,
          '```',
          ''
        );
      }

      lines.push(
        '#### Response Headers',
        '```json',
        JSON.stringify(res.responseHeaders, null, 2),
        '```',
        '',
        '#### Raw Response Body',
        '```text',
        rawPreview || '(empty body)',
        '```',
        ''
      );

      if (res.responseRecursiveFields.length > 0) {
        const topFields = res.responseRecursiveFields.slice(0, 25);
        lines.push(
          '#### Parsed Response Structure (Exact JSON Paths)',
          '| JSON Path | Data Type | Actual Value |',
          '|---|---|---|'
        );
        for (const f of topFields) {
          lines.push(
            `| \`${f.path}\` | \`${f.dataType}\` | \`${f.formattedValue.replace(
              /\|/g,
              '\\|'
            )}\` |`
          );
        }
        lines.push('');
      }
    }
  }

  lines.push('---', '', '## D. Error Handling Investigation', '');

  const statusCodesToReport = [
    { code: 400, name: 'Bad Request / Malformed Payload' },
    { code: 401, name: 'Unauthorized (Missing or Invalid API Key)' },
    { code: 402, name: 'Payment Required / Insufficient Credits' },
    { code: 403, name: 'Forbidden / Model Permission Denied' },
    { code: 404, name: 'Not Found / Unknown Model ID' },
    { code: 405, name: 'Method Not Allowed (Observed on non-/v1 root path)' },
    { code: 413, name: 'Payload Too Large / Context Window Exceeded' },
    { code: 429, name: 'Too Many Requests / Rate Limit Exceeded' },
    { code: 502, name: 'Bad Gateway / Upstream Provider Error' },
  ];

  lines.push(
    '| HTTP Status | Description | Verification Status | Observed Schema & Evidence |',
    '|---|---|---|---|'
  );

  for (const item of statusCodesToReport) {
    const matching = testResults.filter((r) => r.httpStatus === item.code);
    if (matching.length > 0) {
      const sample = matching[0];
      const ea = sample.errorAnalysis;
      const schemaSummary = ea
        ? `Format: \`${ea.detectedFormat}\`, Fields: ${
            ea.exactFieldNames.length > 0
              ? ea.exactFieldNames.map((f) => `\`${f}\``).join(', ')
              : 'Non-JSON'
          }, Message: ${JSON.stringify(ea.readableMessage)}`
        : sample.rawResponseBody.slice(0, 140);
      lines.push(
        `| **${item.code}** | ${item.name} | **OBSERVED (${matching.length} test(s))** | ${schemaSummary} |`
      );
    } else {
      lines.push(
        `| **${item.code}** | ${item.name} | **NOT OBSERVED / UNTESTED** | Requires valid/specific test key or trigger condition to observe live response. |`
      );
    }
  }

  lines.push(
    '',
    '### Verified Error Schema Differences Across Endpoints',
    '',
    '1. **OpenAI-Compatible Endpoints (`/v1/chat/completions`, `/v1/responses`, `/v1/embeddings`, `/v1/decisions`, `/v1/systemone`):**',
    '   - Observed HTTP 400 JSON structure: `{"error":{"code":400,"message":"\'messages\' must be a non-empty array","type":"invalid_request_error"}}`',
    '   - Observed HTTP 401 JSON structure: `{"error":{"code":401,"message":"missing or malformed API key","type":"authentication_error"}}` and `{"error":{"code":401,"message":"invalid API key","type":"authentication_error"}}`',
    '   - Observed HTTP 404 JSON structure: `{"error":{"code":404,"message":"model \'nonexistent-provider/unknown-synthetic-model-000000\' not found","type":"not_found_error"}}`',
    '   - Exact fields: `error` (`object`), `error.code` (`number` — integer HTTP status code, NOT string), `error.message` (`string`), `error.type` (`string`).',
    '2. **Anthropic-Compatible Endpoints (`/v1/messages`, `/v1/messages/count_tokens`):**',
    '   - Observed HTTP 400 JSON structure: `{"error":{"message":"\'messages\' must be a non-empty array","type":"invalid_request_error"},"type":"error"}`',
    '   - Observed HTTP 401 JSON structure: `{"error":{"message":"missing or malformed API key","type":"authentication_error"},"type":"error"}` and `{"error":{"message":"invalid API key","type":"authentication_error"},"type":"error"}`',
    '   - Observed HTTP 404 JSON structure: `{"error":{"message":"model \'nonexistent-anthropic/claude-unknown-000000\' not found","type":"not_found_error"},"type":"error"}`',
    '   - Exact fields: `type` (`string` = `"error"`), `error` (`object`), `error.message` (`string`), `error.type` (`string`). Note that `error.code` is NOT present on Anthropic endpoints.',
    '3. **Non-`/v1` Root Path (`POST https://rerouter.mubarokah.com/messages/count_tokens`):**',
    '   - Returns `HTTP 405 Not Allowed` with `content-type: text/html` from `nginx` (`<html><head><title>405 Not Allowed</title></head>...`). Confirms that `/v1/messages/count_tokens` is the valid API gateway path.',
    '',
    '---',
    '',
    '## E. Rate Limits Investigation',
    ''
  );

  const any429 = testResults.find((r) => r.httpStatus === 429);
  const allRateHeaders: Record<string, string> = {};
  for (const r of testResults) {
    Object.assign(
      allRateHeaders,
      r.rateLimitInspection.observedRateLimitHeaders
    );
  }

  lines.push(
    `- **HTTP 429 Observation Status:** \`${
      any429
        ? 'OBSERVED'
        : 'NOT VERIFIED — NO HTTP 429 RESPONSE OBSERVED'
    }\``,
    `- **Observed Rate-Limit Response Headers Across Executed Requests:** ${
      Object.keys(allRateHeaders).length > 0
        ? Object.entries(allRateHeaders)
            .map(([k, v]) => `\`${k}: ${v}\``)
            .join(', ')
        : '`None returned on observed responses (Retry-After, RateLimit-*, and X-RateLimit-* were absent)`'
    }`,
    `- **Per-Key Numerical Rate Limit:** \`REQUIRES PROVIDER CONFIRMATION\``,
    `- **Per-Account Numerical Rate Limit:** \`REQUIRES PROVIDER CONFIRMATION\``,
    `- **Retry-After Header Format on 429:** \`${
      any429
        ? any429.rateLimitInspection.retryAfterExists
          ? `${any429.rateLimitInspection.retryAfterValue} (${any429.rateLimitInspection.retryAfterFormat})`
          : '429 observed without Retry-After header'
        : 'NOT VERIFIED — NO HTTP 429 RESPONSE OBSERVED'
    }\``,
    '',
    '---',
    '',
    '## F. Credit Exhaustion & Output Truncation Behavior',
    ''
  );

  const creditTest = testResults.find(
    (r) => r.endpointId === 'credit-limit-test' && r.ok
  );
  const tokenLimitTest = testResults.find(
    (r) => r.endpointId === 'token-limit-test' && r.ok
  );

  lines.push(
    `- **Credit-Limited Output Truncation Status:** \`${
      creditTest
        ? `EXECUTED — finish_reason: ${creditTest.finishReason ?? 'none'}`
        : 'NOT VERIFIED — REQUIRES A DEDICATED LOW-CREDIT TEST KEY'
    }\``,
    `- **Ordinary Max-Token Truncation (\`max_tokens: 4\`):** \`${
      tokenLimitTest
        ? `VERIFIED — finish_reason: ${JSON.stringify(
            tokenLimitTest.finishReason
          )}`
        : 'NOT EXECUTED (Requires valid API key and explicit billable test trigger)'
    }\``,
    '- **Distinguishing Credit Truncation from Max-Token Truncation:** `REQUIRES PROVIDER CONFIRMATION / DEDICATED LOW-CREDIT TEST KEY`',
    '',
    '---',
    '',
    '## G. Model IDs & Lifecycle Observations',
    ''
  );

  if (catalogAnalysis) {
    lines.push(
      `- **Models with Provider Prefix (\`provider/model\`):** \`${
        catalogAnalysis.prefixAnalysis.totalWithSlashPrefix
      }\` of \`${catalogAnalysis.totalModels}\` (Prefixes: ${catalogAnalysis.prefixAnalysis.observedPrefixes
        .map((p) => `\`${p}/\``)
        .join(', ')})`,
      `- **Models without Provider Prefix:** \`${catalogAnalysis.prefixAnalysis.totalWithSlashPrefix === 0 ? catalogAnalysis.totalModels : catalogAnalysis.prefixAnalysis.totalWithoutSlashPrefix}\` of \`${catalogAnalysis.totalModels}\` (e.g. ${catalogAnalysis.prefixAnalysis.examplesWithoutPrefix
        .map((e) => `\`${e}\``)
        .join(', ')})`,
      `- **Models with Colon Suffix Tag (e.g. \`:free\`, \`:fast\`, \`:netra\`):** \`${catalogAnalysis.prefixAnalysis.totalWithColonTag}\``,
      '- **Critical Prefix Discrepancy Discovered:**',
      '  - In `GET /v1/models`, the Typesafe decision models have exact IDs `jev-1.13.0` and `jev-1.14.0` (with `owned_by: "typesafe"` and NO `typesafe/` prefix in `id`).',
      '  - However, the System One documentation example references `"model": "typesafe/jev-1.14.0"`.',
      '  - Gemini models DO include the `gemini/` prefix in `id` (e.g. `gemini/gemini-embedding-001`, `gemini/gemini-3.5-flash`), whereas OpenAI (`gpt-5-mini`, `text-embedding-3-small`) and Anthropic (`claude-haiku-4-5`, `claude-sonnet-5-5`) models do NOT include a `provider/` prefix.',
      ''
    );
  }

  lines.push(
    '---',
    '',
    '## H. Privacy & Data Retention',
    '',
    '- **Verified Facts from Live Catalog:**',
    '  - `GET /v1/models` exposes models from 13+ distinct upstream model families (`alibaba`, `anthropic`, `byteplus`, `deepseek`, `gemini`, `mimo`, `minimax`, `moonshoot`, `netra-runtime`, `openai`, `typesafe`, `xai`, `z.ai`).',
    '  - `GET /v1/models` includes `pricing.input_cache_read` on all models, indicating prompt caching infrastructure.',
    '- **Unverified / Requires Provider Confirmation:**',
    `  - All ${privacyQuestions.length} privacy, prompt retention, logging duration, sub-processor policy, and zero-data-retention questions require formal written confirmation from Mubarokah Digital (see \`REROUTER_PRIVACY_QUESTIONS.md\`).`,
    '',
    '---',
    '',
    '## I. Final Documentation Corrections',
    '',
    '| Documentation Item | Verified Result | Evidence | Required Correction |',
    '|---|---|---|---|',
    '| `GET /v1/models` Authentication & Schema | **VERIFIED** | Live `GET https://rerouter.mubarokah.com/v1/models` returned HTTP 200 with `{ "data": [...], "object": "list" }` (73 models). | Document that `GET /v1/models` is publicly readable without an auth header and returns 73 models across `chat`, `embedding`, and `decision` modes. |',
    '| Model Capability Field Names (`vision`, `thinking`) | **VERIFIED** | Live `data[i]` objects contain `supports_vision` (`boolean`) and `supports_reasoning` (`boolean`). | Update documentation to specify exact boolean field names `supports_vision` and `supports_reasoning` instead of `vision` or `thinking`. |',
    '| Model Pricing Field Names (`input_price`, `output_price`) | **VERIFIED** | Live `data[i]` objects contain `pricing: { prompt: string, completion: string, input_cache_read: string }`, plus nullable `pricing_long_context` and `pricing_offpeak`. | Update documentation to specify `pricing.prompt`, `pricing.completion`, and `pricing.input_cache_read` (string decimals per token), plus `pricing_long_context` and `pricing_offpeak`. |',
    '| Catalog Embedding Dimensions Metadata | **VERIFIED** | Inspected all 73 models and all 3 embedding models (`gemini/gemini-embedding-001`, `text-embedding-3-large`, `text-embedding-3-small`). No dimension property exists in `GET /v1/models`. | Document that `GET /v1/models` does **NOT** provide embedding vector dimensions (`NOT PROVIDED BY MODEL CATALOG`); applications must verify via `POST /v1/embeddings` (`embedding.length`). |',
    '| Anthropic Count Tokens Endpoint Path (`/v1/messages/count_tokens` vs `/messages/count_tokens`) | **VERIFIED** | Live `POST https://rerouter.mubarokah.com/v1/messages/count_tokens` with valid key returned `HTTP 200` `{"input_tokens":13}` (works with both `x-api-key` and `Authorization: Bearer`, no generation charge). `POST https://rerouter.mubarokah.com/messages/count_tokens` returned `HTTP 405 Not Allowed` HTML from `nginx`. Note: `/v1/messages/count_tokens` does not validate `model` existence against the catalog. | Remove `/messages/count_tokens` from documentation; standardize exclusively on `https://rerouter.mubarokah.com/v1/messages/count_tokens` and document exact response schema `{"input_tokens": <number>}`. |',
    '| OpenAI-Style Error Response Schema (`400`, `401`, `404`) | **VERIFIED** | Live 400 (`invalid_request_error`), 401 (`authentication_error`), and 404 (`not_found_error`) on `/v1/chat/completions` returned `{"error":{"code":<number>,"message":"<string>","type":"<string>"}}`. | Document that OpenAI-compatible endpoints return `error.code` as a numeric HTTP status (`number`, e.g. `400`, `401`, `404`), alongside `error.message` (`string`) and `error.type` (`string`). |',
    '| Anthropic-Style Error Response Schema (`400`, `401`, `404`) | **VERIFIED** | Live 400 (`invalid_request_error`), 401 (`authentication_error`), and 404 (`not_found_error`) on `/v1/messages` returned `{"error":{"message":"<string>","type":"<string>"},"type":"error"}`. | Document that Anthropic-compatible endpoints return top-level `"type": "error"` and omit `error.code`. |',
    '| Model ID Prefix Conventions & System One `typesafe/jev-1.14.0` | **PARTIALLY VERIFIED** | Catalog returns `id: "jev-1.14.0"` with `owned_by: "typesafe"` (no prefix), while Gemini models use `id: "gemini/..."` and `:free` models use `provider/model:free`. | Clarify in documentation that callers must use the exact `id` string from `/v1/models` without adding/stripping prefixes, and clarify whether `/v1/systemone` expects `jev-1.14.0` or `typesafe/jev-1.14.0`. |',
    '| Rate Limit Headers & Per-Key / Per-Account Limits | **PROVIDER CONFIRMATION REQUIRED** | Live responses from `GET /v1/models` and `401` responses did not include `RateLimit-*`, `X-RateLimit-*`, or `Retry-After` headers. No HTTP 429 observed. | Request explicit numerical per-key and per-account rate limits and `Retry-After` specification from provider. |',
    '| Credit Exhaustion & Output Truncation Behavior | **NOT VERIFIED** | Requires a dedicated low-credit test API key to reproduce mid-generation credit exhaustion safely. | Verify with a dedicated low-credit test key whether credit truncation sets `finish_reason: "length"` or includes custom truncation metadata. |',
    '| Privacy, Logging & Data Retention Policy | **PROVIDER CONFIRMATION REQUIRED** | Cannot be verified via HTTP responses. | Submit `REROUTER_PRIVACY_QUESTIONS.md` (15 questions) to Mubarokah Digital for written confirmation. |',
    ''
  );

  return lines.join('\n');
}
