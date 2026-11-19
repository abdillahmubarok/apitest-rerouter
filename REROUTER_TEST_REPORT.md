# ReRouter Live API Verification & Testing Report

## A. Environment

- **Next.js Version:** `16.4.6` (App Router)
- **Base URL:** `https://rerouter.mubarokah.com/v1`
- **Default Authentication Method:** `Authorization: Bearer [REDACTED]` (Both `Authorization: Bearer` and `x-api-key` supported)
- **Test Report Generated At:** `2026-11-19T07:34:31.054Z`
- **API Key Configured in Server Environment:** `Yes` (Configured in server environment (secret value hidden))
- **Secret Hygiene:** Verified — no API keys or secret values are included in this report.

---

## B. Model Catalog (`GET /v1/models`)

- **Catalog Fetched At:** `2026-11-19T07:34:31.338Z`
- **Top-Level JSON Keys:** `data`, `object`
- **Models Array Path:** `data`
- **Total Models Returned:** `73`
- **Observed Modes (`data[i].mode`):** `chat`, `embedding`, `decision`
- **Observed Providers (`data[i].owned_by`):** `(empty string)`, `alibaba`, `anthropic`, `byteplus`, `deepseek`, `gemini`, `mimo`, `minimax`, `moonshoot`, `netra-runtime`, `openai`, `typesafe`, `xai`, `z.ai`

### Exact Field Names & JSON Paths Discovered in `GET /v1/models`

| Concept | Exact Field Name in Model Object | Example Exact JSON Path | Observed Data Type | Notes |
|---|---|---|---|---|
| **Model ID** | `id` | `data[0].id` | `string` | Exact identifier used in requests |
| **Model Name** | `name` | `data[0].name` | `string` | Matches `id` across observed catalog items |
| **Provider** | `owned_by` | `data[0].owned_by` | `string` | Empty string `""` for `:free` models; vendor slug for paid models |
| **Mode** | `mode` | `data[0].mode` | `string` | Values observed: `"chat"`, `"embedding"`, `"decision"` |
| **Vision Support** | `supports_vision` | `data[0].supports_vision` | `boolean` | Exact field is `supports_vision` (NOT `vision`) |
| **Thinking Support** | `supports_reasoning` | `data[0].supports_reasoning` | `boolean` | Exact field is `supports_reasoning` (NOT `thinking`) |
| **Input Token Price** | `pricing.prompt` | `data[0].pricing.prompt` | `string` | Decimal USD string per token (NOT `input_price`) |
| **Output Token Price** | `pricing.completion` | `data[0].pricing.completion` | `string` | Decimal USD string per token (NOT `output_price`) |
| **Embedding Price** | `pricing.prompt (no separate embedding_price key; uses pricing.prompt)` | `data[i].pricing.prompt` | `string` | No separate `embedding_price` field; uses `pricing.prompt` |
| **Embedding Dimensions** | `NOT PROVIDED BY MODEL CATALOG` | `NOT PROVIDED BY MODEL CATALOG` | `not_present` | Catalog does NOT declare vector dimensions for any embedding model |
| **Other Pricing Fields** | `pricing`, `pricing.input_cache_read`, `pricing_long_context`, `pricing_long_context.completion`, `pricing_long_context.input_cache_read`, `pricing_long_context.prompt`, `pricing_long_context.threshold_tokens`, `pricing_offpeak`, `pricing_offpeak.completion`, `pricing_offpeak.input_cache_read`, `pricing_offpeak.prompt`, `pricing_offpeak.windows`, `pricing_offpeak.windows[0]`, `pricing_offpeak.windows[0].hours_utc`, `pricing_offpeak.windows[0].hours_utc[0]`, `pricing_offpeak.windows[0].hours_utc[1]`, `pricing_offpeak.windows[0].hours_utc[2]`, `pricing_offpeak.windows[0].weekdays`, `pricing_offpeak.windows[0].weekdays[0]`, `pricing_offpeak.windows[0].weekdays[1]`, `pricing_offpeak.windows[0].weekdays[2]`, `pricing_offpeak.windows[0].weekdays[3]`, `pricing_offpeak.windows[0].weekdays[4]`, `pricing_offpeak.windows[1]`, `pricing_offpeak.windows[1].hours_utc`, `pricing_offpeak.windows[1].hours_utc[0]`, `pricing_offpeak.windows[1].weekdays`, `pricing_offpeak.windows[1].weekdays[0]`, `pricing_offpeak.windows[1].weekdays[1]` | `data[i].pricing.input_cache_read`, `data[i].pricing_long_context`, `data[i].pricing_offpeak` | `string / object / null` | Tiered long-context & off-peak window pricing |
| **Other Capability / Metadata Fields** | `context_length`, `created`, `description`, `object` | `data[i].context_length`, `data[i].created`, `data[i].description`, `data[i].object` | `number / string` | Standard metadata fields |

### Embedding Models in Catalog & Dimension Metadata Audit

| Model ID | Provider (`owned_by`) | Mode | Context Length | Prompt Price (`pricing.prompt`) | Catalog-Declared Dimension |
|---|---|---|---|---|---|
| `gemini/gemini-embedding-001` | `gemini` | `embedding` | `2048` | `0.000000187500` | `NOT PROVIDED BY MODEL CATALOG` |
| `text-embedding-3-large` | `openai` | `embedding` | `8191` | `0.000000162500` | `NOT PROVIDED BY MODEL CATALOG` |
| `text-embedding-3-small` | `openai` | `embedding` | `8191` | `0.000000025000` | `NOT PROVIDED BY MODEL CATALOG` |

### Decision Models in Catalog

| Model ID | Provider (`owned_by`) | Mode | Context Length | Prompt Price (`pricing.prompt`) |
|---|---|---|---|---|
| `jev-1.13.0` | `typesafe` | `decision` | `65536` | `0.000000052500` |
| `jev-1.14.0` | `typesafe` | `decision` | `65536` | `0.000000052500` |

### Complete List of Observed Model IDs (`data[].id`)

- **Chat Models (68):** `baidu/ernie-5.5-flash-preview:free`, `cohere/north-mini-code:free`, `dots-studio/dots-3-note-preview:free`, `gpt-6-astra`, `inclusionai/ling-3.2-flash:free`, `liquid/lfm-3-1.7b:free`, `meituan/longcat-2.5:free`, `nvidia/nemotron-3.5-lightning:free`, `nvidia/nemotron-3.5-super-vl:free`, `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`, `nvidia/nemotron-3-ultra-550b-a55b:free`, `particle-ai/particle-1:free`, `recursive/flint-v1.0:free`, `reflection/beam-1.0-501b-a23b:free`, `stepfun/step-3.7-flash:free`, `thinkingmachines/inkling-2-small:free`, `qwen3.7-plus`, `qwen3.8-flash`, `qwen3.8-max`, `claude-haiku-4-5`, `claude-haiku-5-5`, `claude-opus-4-8`, `claude-opus-5`, `claude-opus-5-5`, `claude-sonnet-5`, `claude-sonnet-5-5`, `seed-2-0-code`, `seed-2-0-lite`, `seed-2-0-mini`, `seed-2-0-pro`, `deepseek-flash`, `deepseek-v4.1-flash-1017`, `deepseek-v4.1-flash:fast`, `deepseek-v4-flash`, `deepseek-v4-pro`, `gemini/gemini-3.1-flash-lite`, `gemini/gemini-3.1-pro-preview`, `gemini/gemini-3.5-flash`, `gemini/gemini-3.5-flash-lite`, `gemini/gemini-3.7-flash`, `gemini/gemini-3.8-flash`, `gemini/gemini-3-flash-preview`, `gemini/gemini-4-argon`, `mimo-v2.6-flash`, `mimo-v2.6-pro`, `mimo-v2.6-pro-ultraspeed`, `MiniMax-M3.1-Flash`, `kimi-k3`, `deepseek-v4.1-flash:netra`, `gpt-4.1`, `gpt-4.1-mini`, `gpt-4o`, `gpt-4o-mini`, `gpt-5`, `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.4-nano`, `gpt-5.6-luna`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5-mini`, `gpt-5-nano`, `gpt-6-luna`, `grok-4.7`, `glm-5.2`, `glm-5.3`, `glm-5.3-flash`, `glm-5.3-flash:fast`
- **Embedding Models (3):** `gemini/gemini-embedding-001`, `text-embedding-3-large`, `text-embedding-3-small`
- **Decision Models (2):** `jev-1.13.0`, `jev-1.14.0`

---

## C. Endpoint Results

### TEST 1: Models (GET /v1/models)
- **Category:** `Category A`
- **Timestamp:** `2026-11-19T07:34:31.337Z`
- **HTTP Method:** `GET`
- **Exact URL:** `https://rerouter.mubarokah.com/v1/models`
- **Auth Format Used:** `bearer` (Server Key Configured: `Yes`)
- **HTTP Status:** `200 (OK)`
- **Duration:** `278 ms`
- **Test Outcome:** `SUCCESS (2xx)`
- **Usage:** `Not present in response`
- **Cost:** `Not present in response`
- **Finish Reason:** `N/A`

#### Redacted Request Headers
```json
{
  "Accept": "application/json",
  "Authorization": "Bearer [REDACTED_API_KEY]"
}
```

#### Response Headers
```json
{
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "*",
  "content-length": "29283",
  "content-type": "application/json",
  "date": "Thu, 19 Nov 2026 07:34:31 GMT",
  "server": "nginx",
  "vary": "origin, access-control-request-method, access-control-request-headers"
}
```

#### Raw Response Body
```text
{"data":[{"context_length":0,"created":1794497523,"description":"","id":"baidu/ernie-5.5-flash-preview:free","mode":"chat","name":"baidu/ernie-5.5-flash-preview:free","object":"model","owned_by":"","pricing":{"completion":"0.000000000000","input_cache_read":"0.000000000000","prompt":"0.000000000000"},"pricing_long_context":null,"pricing_offpeak":null,"supports_reasoning":true,"supports_vision":false},{"context_length":0,"created":1794497523,"description":"","id":"cohere/north-mini-code:free","mode":"chat","name":"cohere/north-mini-code:free","object":"model","owned_by":"","pricing":{"completion":"0.000000000000","input_cache_read":"0.000000000000","prompt":"0.000000000000"},"pricing_long_context":null,"pricing_offpeak":null,"supports_reasoning":true,"supports_vision":false},{"context_length":0,"created":1794497523,"description":"","id":"dots-studio/dots-3-note-preview:free","mode":"chat","name":"dots-studio/dots-3-note-preview:free","object":"model","owned_by":"","pricing":{"completion":"0.000000000000","input_cache_read":"0.000000000000","prompt":"0.000000000000"},"pricing_long_context":null,"pricing_offpeak":null,"supports_reasoning":true,"supports_vision":true},{"context_length"
... [truncated 28083 chars in markdown preview]
```

#### Parsed Response Structure (Exact JSON Paths)
| JSON Path | Data Type | Actual Value |
|---|---|---|
| `data` | `array` | `Array(73)` |
| `data[0]` | `object` | `Object{context_length, created, description, id, mode, name, object, owned_by, pricing, pricing_long_context, pricing_offpeak, supports_reasoning, supports_vision}` |
| `data[0].context_length` | `number` | `0` |
| `data[0].created` | `number` | `1794497523` |
| `data[0].description` | `string` | `""` |
| `data[0].id` | `string` | `"baidu/ernie-5.5-flash-preview:free"` |
| `data[0].mode` | `string` | `"chat"` |
| `data[0].name` | `string` | `"baidu/ernie-5.5-flash-preview:free"` |
| `data[0].object` | `string` | `"model"` |
| `data[0].owned_by` | `string` | `""` |
| `data[0].pricing` | `object` | `Object{completion, input_cache_read, prompt}` |
| `data[0].pricing.completion` | `string` | `"0.000000000000"` |
| `data[0].pricing.input_cache_read` | `string` | `"0.000000000000"` |
| `data[0].pricing.prompt` | `string` | `"0.000000000000"` |
| `data[0].pricing_long_context` | `null` | `null` |
| `data[0].pricing_offpeak` | `null` | `null` |
| `data[0].supports_reasoning` | `boolean` | `true` |
| `data[0].supports_vision` | `boolean` | `false` |
| `data[1]` | `object` | `Object{context_length, created, description, id, mode, name, object, owned_by, pricing, pricing_long_context, pricing_offpeak, supports_reasoning, supports_vision}` |
| `data[1].context_length` | `number` | `0` |
| `data[1].created` | `number` | `1794497523` |
| `data[1].description` | `string` | `""` |
| `data[1].id` | `string` | `"cohere/north-mini-code:free"` |
| `data[1].mode` | `string` | `"chat"` |
| `data[1].name` | `string` | `"cohere/north-mini-code:free"` |

### TEST 6A: Count Tokens Candidate 1 (POST /v1/messages/count_tokens)
- **Category:** `Category A`
- **Timestamp:** `2026-11-19T07:34:31.554Z`
- **HTTP Method:** `POST`
- **Exact URL:** `https://rerouter.mubarokah.com/v1/messages/count_tokens`
- **Auth Format Used:** `x-api-key` (Server Key Configured: `Yes`)
- **HTTP Status:** `200 (OK)`
- **Duration:** `202 ms`
- **Test Outcome:** `SUCCESS (2xx)`
- **Usage:** `input_tokens: 13`
- **Cost:** `Not present in response`
- **Finish Reason:** `N/A`

#### Redacted Request Headers
```json
{
  "Accept": "application/json",
  "Content-Type": "application/json",
  "anthropic-version": "2023-06-01",
  "x-api-key": "[REDACTED_API_KEY]"
}
```

#### Request Payload
```json
{
  "model": "claude-haiku-4-5",
  "messages": [
    {
      "role": "user",
      "content": "Count these tokens."
    }
  ]
}
```

#### Response Headers
```json
{
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "*",
  "content-length": "19",
  "content-type": "application/json",
  "date": "Thu, 19 Nov 2026 07:34:31 GMT",
  "server": "nginx",
  "vary": "origin, access-control-request-method, access-control-request-headers"
}
```

#### Raw Response Body
```text
{"input_tokens":13}
```

#### Parsed Response Structure (Exact JSON Paths)
| JSON Path | Data Type | Actual Value |
|---|---|---|
| `input_tokens` | `number` | `13` |

### TEST 6B: Count Tokens Candidate 2 (POST /messages/count_tokens)
- **Category:** `Category A`
- **Timestamp:** `2026-11-19T07:34:31.602Z`
- **HTTP Method:** `POST`
- **Exact URL:** `https://rerouter.mubarokah.com/messages/count_tokens`
- **Auth Format Used:** `x-api-key` (Server Key Configured: `Yes`)
- **HTTP Status:** `405 (Method Not Allowed)`
- **Duration:** `45 ms`
- **Test Outcome:** `NON-2xx / ERROR (HTTP 405)`
- **Usage:** `Not present in response`
- **Cost:** `Not present in response`
- **Finish Reason:** `N/A`

#### Redacted Request Headers
```json
{
  "Accept": "application/json",
  "Content-Type": "application/json",
  "anthropic-version": "2023-06-01",
  "x-api-key": "[REDACTED_API_KEY]"
}
```

#### Request Payload
```json
{
  "model": "claude-haiku-4-5",
  "messages": [
    {
      "role": "user",
      "content": "Count these tokens."
    }
  ]
}
```

#### Response Headers
```json
{
  "content-security-policy": "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self' https://challenges.cloudflare.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "content-type": "text/html",
  "date": "Thu, 19 Nov 2026 07:34:31 GMT",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "server": "nginx",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "transfer-encoding": "chunked",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY"
}
```

#### Raw Response Body
```text
<html>
<head><title>405 Not Allowed</title></head>
<body>
<center><h1>405 Not Allowed</h1></center>
<hr><center>nginx</center>
</body>
</html>

```

### Negative Test A: Missing API Key (OpenAI Endpoint)
- **Category:** `Category A`
- **Timestamp:** `2026-11-19T07:34:31.659Z`
- **HTTP Method:** `POST`
- **Exact URL:** `https://rerouter.mubarokah.com/v1/chat/completions`
- **Auth Format Used:** `none` (Server Key Configured: `Yes`)
- **HTTP Status:** `401 (Unauthorized)`
- **Duration:** `54 ms`
- **Test Outcome:** `NON-2xx / ERROR (HTTP 401)`
- **Usage:** `Not present in response`
- **Cost:** `Not present in response`
- **Finish Reason:** `N/A`

#### Redacted Request Headers
```json
{
  "Accept": "application/json",
  "Content-Type": "application/json"
}
```

#### Request Payload
```json
{
  "model": "gpt-5-mini",
  "messages": [
    {
      "role": "user",
      "content": "Missing API key test."
    }
  ],
  "max_tokens": 8
}
```

#### Response Headers
```json
{
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "*",
  "content-length": "93",
  "content-type": "application/json",
  "date": "Thu, 19 Nov 2026 07:34:31 GMT",
  "server": "nginx",
  "vary": "origin, access-control-request-method, access-control-request-headers"
}
```

#### Raw Response Body
```text
{"error":{"code":401,"message":"missing or malformed API key","type":"authentication_error"}}
```

#### Parsed Response Structure (Exact JSON Paths)
| JSON Path | Data Type | Actual Value |
|---|---|---|
| `error` | `object` | `Object{code, message, type}` |
| `error.code` | `number` | `401` |
| `error.message` | `string` | `"missing or malformed API key"` |
| `error.type` | `string` | `"authentication_error"` |

### Negative Test B: Invalid Dummy API Key (OpenAI Endpoint)
- **Category:** `Category A`
- **Timestamp:** `2026-11-19T07:34:31.722Z`
- **HTTP Method:** `POST`
- **Exact URL:** `https://rerouter.mubarokah.com/v1/chat/completions`
- **Auth Format Used:** `invalid-dummy` (Server Key Configured: `Yes`)
- **HTTP Status:** `401 (Unauthorized)`
- **Duration:** `59 ms`
- **Test Outcome:** `NON-2xx / ERROR (HTTP 401)`
- **Usage:** `Not present in response`
- **Cost:** `Not present in response`
- **Finish Reason:** `N/A`

#### Redacted Request Headers
```json
{
  "Accept": "application/json",
  "Content-Type": "application/json",
  "Authorization": "Bearer sk-rerouter-invalid-dummy-key-000000 (deliberate dummy key)"
}
```

#### Request Payload
```json
{
  "model": "gpt-5-mini",
  "messages": [
    {
      "role": "user",
      "content": "Invalid dummy API key test."
    }
  ],
  "max_tokens": 8
}
```

#### Response Headers
```json
{
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "*",
  "content-length": "80",
  "content-type": "application/json",
  "date": "Thu, 19 Nov 2026 07:34:31 GMT",
  "server": "nginx",
  "vary": "origin, access-control-request-method, access-control-request-headers"
}
```

#### Raw Response Body
```text
{"error":{"code":401,"message":"invalid API key","type":"authentication_error"}}
```

#### Parsed Response Structure (Exact JSON Paths)
| JSON Path | Data Type | Actual Value |
|---|---|---|
| `error` | `object` | `Object{code, message, type}` |
| `error.code` | `number` | `401` |
| `error.message` | `string` | `"invalid API key"` |
| `error.type` | `string` | `"authentication_error"` |

### Negative Test C: Invalid / Malformed Request (400)
- **Category:** `Category A`
- **Timestamp:** `2026-11-19T07:34:31.795Z`
- **HTTP Method:** `POST`
- **Exact URL:** `https://rerouter.mubarokah.com/v1/chat/completions`
- **Auth Format Used:** `bearer` (Server Key Configured: `Yes`)
- **HTTP Status:** `400 (Bad Request)`
- **Duration:** `70 ms`
- **Test Outcome:** `NON-2xx / ERROR (HTTP 400)`
- **Usage:** `Not present in response`
- **Cost:** `Not present in response`
- **Finish Reason:** `N/A`

#### Redacted Request Headers
```json
{
  "Accept": "application/json",
  "Content-Type": "application/json",
  "Authorization": "Bearer [REDACTED_API_KEY]"
}
```

#### Request Payload
```json
{
  "model": "gpt-5-mini",
  "messages": "INVALID_NON_ARRAY_MESSAGES_FIELD"
}
```

#### Response Headers
```json
{
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "*",
  "content-length": "102",
  "content-type": "application/json",
  "date": "Thu, 19 Nov 2026 07:34:31 GMT",
  "server": "nginx",
  "vary": "origin, access-control-request-method, access-control-request-headers"
}
```

#### Raw Response Body
```text
{"error":{"code":400,"message":"'messages' must be a non-empty array","type":"invalid_request_error"}}
```

#### Parsed Response Structure (Exact JSON Paths)
| JSON Path | Data Type | Actual Value |
|---|---|---|
| `error` | `object` | `Object{code, message, type}` |
| `error.code` | `number` | `400` |
| `error.message` | `string` | `"'messages' must be a non-empty array"` |
| `error.type` | `string` | `"invalid_request_error"` |

### Negative Test D: Unknown Synthetic Model ID (404)
- **Category:** `Category A`
- **Timestamp:** `2026-11-19T07:34:31.857Z`
- **HTTP Method:** `POST`
- **Exact URL:** `https://rerouter.mubarokah.com/v1/chat/completions`
- **Auth Format Used:** `bearer` (Server Key Configured: `Yes`)
- **HTTP Status:** `404 (Not Found)`
- **Duration:** `60 ms`
- **Test Outcome:** `NON-2xx / ERROR (HTTP 404)`
- **Usage:** `Not present in response`
- **Cost:** `Not present in response`
- **Finish Reason:** `N/A`

#### Redacted Request Headers
```json
{
  "Accept": "application/json",
  "Content-Type": "application/json",
  "Authorization": "Bearer [REDACTED_API_KEY]"
}
```

#### Request Payload
```json
{
  "model": "nonexistent-provider/unknown-synthetic-model-000000",
  "messages": [
    {
      "role": "user",
      "content": "Unknown model test."
    }
  ],
  "max_tokens": 8
}
```

#### Response Headers
```json
{
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "*",
  "content-length": "129",
  "content-type": "application/json",
  "date": "Thu, 19 Nov 2026 07:34:31 GMT",
  "server": "nginx",
  "vary": "origin, access-control-request-method, access-control-request-headers"
}
```

#### Raw Response Body
```text
{"error":{"code":404,"message":"model 'nonexistent-provider/unknown-synthetic-model-000000' not found","type":"not_found_error"}}
```

#### Parsed Response Structure (Exact JSON Paths)
| JSON Path | Data Type | Actual Value |
|---|---|---|
| `error` | `object` | `Object{code, message, type}` |
| `error.code` | `number` | `404` |
| `error.message` | `string` | `"model 'nonexistent-provider/unknown-synthetic-model-000000' not found"` |
| `error.type` | `string` | `"not_found_error"` |

### Anthropic Negative Test A: Missing API Key (POST /v1/messages)
- **Category:** `Category A`
- **Timestamp:** `2026-11-19T07:34:31.909Z`
- **HTTP Method:** `POST`
- **Exact URL:** `https://rerouter.mubarokah.com/v1/messages`
- **Auth Format Used:** `none` (Server Key Configured: `Yes`)
- **HTTP Status:** `401 (Unauthorized)`
- **Duration:** `48 ms`
- **Test Outcome:** `NON-2xx / ERROR (HTTP 401)`
- **Usage:** `Not present in response`
- **Cost:** `Not present in response`
- **Finish Reason:** `N/A`

#### Redacted Request Headers
```json
{
  "Accept": "application/json",
  "Content-Type": "application/json",
  "anthropic-version": "2023-06-01"
}
```

#### Request Payload
```json
{
  "model": "claude-haiku-4-5",
  "max_tokens": 8,
  "messages": [
    {
      "role": "user",
      "content": "Anthropic missing key test."
    }
  ]
}
```

#### Response Headers
```json
{
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "*",
  "content-length": "97",
  "content-type": "application/json",
  "date": "Thu, 19 Nov 2026 07:34:31 GMT",
  "server": "nginx",
  "vary": "origin, access-control-request-method, access-control-request-headers"
}
```

#### Raw Response Body
```text
{"error":{"message":"missing or malformed API key","type":"authentication_error"},"type":"error"}
```

#### Parsed Response Structure (Exact JSON Paths)
| JSON Path | Data Type | Actual Value |
|---|---|---|
| `error` | `object` | `Object{message, type}` |
| `error.message` | `string` | `"missing or malformed API key"` |
| `error.type` | `string` | `"authentication_error"` |
| `type` | `string` | `"error"` |

### Anthropic Negative Test B: Invalid Dummy Key (POST /v1/messages)
- **Category:** `Category A`
- **Timestamp:** `2026-11-19T07:34:31.986Z`
- **HTTP Method:** `POST`
- **Exact URL:** `https://rerouter.mubarokah.com/v1/messages`
- **Auth Format Used:** `invalid-dummy` (Server Key Configured: `Yes`)
- **HTTP Status:** `401 (Unauthorized)`
- **Duration:** `73 ms`
- **Test Outcome:** `NON-2xx / ERROR (HTTP 401)`
- **Usage:** `Not present in response`
- **Cost:** `Not present in response`
- **Finish Reason:** `N/A`

#### Redacted Request Headers
```json
{
  "Accept": "application/json",
  "Content-Type": "application/json",
  "anthropic-version": "2023-06-01",
  "x-api-key": "sk-rerouter-invalid-dummy-key-000000 (deliberate dummy key)"
}
```

#### Request Payload
```json
{
  "model": "claude-haiku-4-5",
  "max_tokens": 8,
  "messages": [
    {
      "role": "user",
      "content": "Anthropic invalid key test."
    }
  ]
}
```

#### Response Headers
```json
{
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "*",
  "content-length": "84",
  "content-type": "application/json",
  "date": "Thu, 19 Nov 2026 07:34:31 GMT",
  "server": "nginx",
  "vary": "origin, access-control-request-method, access-control-request-headers"
}
```

#### Raw Response Body
```text
{"error":{"message":"invalid API key","type":"authentication_error"},"type":"error"}
```

#### Parsed Response Structure (Exact JSON Paths)
| JSON Path | Data Type | Actual Value |
|---|---|---|
| `error` | `object` | `Object{message, type}` |
| `error.message` | `string` | `"invalid API key"` |
| `error.type` | `string` | `"authentication_error"` |
| `type` | `string` | `"error"` |

### Anthropic Negative Test C: Malformed Request (POST /v1/messages)
- **Category:** `Category A`
- **Timestamp:** `2026-11-19T07:34:32.042Z`
- **HTTP Method:** `POST`
- **Exact URL:** `https://rerouter.mubarokah.com/v1/messages`
- **Auth Format Used:** `x-api-key` (Server Key Configured: `Yes`)
- **HTTP Status:** `400 (Bad Request)`
- **Duration:** `54 ms`
- **Test Outcome:** `NON-2xx / ERROR (HTTP 400)`
- **Usage:** `Not present in response`
- **Cost:** `Not present in response`
- **Finish Reason:** `N/A`

#### Redacted Request Headers
```json
{
  "Accept": "application/json",
  "Content-Type": "application/json",
  "anthropic-version": "2023-06-01",
  "x-api-key": "[REDACTED_API_KEY]"
}
```

#### Request Payload
```json
{
  "model": "claude-haiku-4-5",
  "messages": "INVALID_MESSAGES_TYPE"
}
```

#### Response Headers
```json
{
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "*",
  "content-length": "106",
  "content-type": "application/json",
  "date": "Thu, 19 Nov 2026 07:34:32 GMT",
  "server": "nginx",
  "vary": "origin, access-control-request-method, access-control-request-headers"
}
```

#### Raw Response Body
```text
{"error":{"message":"'messages' must be a non-empty array","type":"invalid_request_error"},"type":"error"}
```

#### Parsed Response Structure (Exact JSON Paths)
| JSON Path | Data Type | Actual Value |
|---|---|---|
| `error` | `object` | `Object{message, type}` |
| `error.message` | `string` | `"'messages' must be a non-empty array"` |
| `error.type` | `string` | `"invalid_request_error"` |
| `type` | `string` | `"error"` |

### Anthropic Negative Test D: Unknown Model (POST /v1/messages)
- **Category:** `Category A`
- **Timestamp:** `2026-11-19T07:34:32.123Z`
- **HTTP Method:** `POST`
- **Exact URL:** `https://rerouter.mubarokah.com/v1/messages`
- **Auth Format Used:** `x-api-key` (Server Key Configured: `Yes`)
- **HTTP Status:** `404 (Not Found)`
- **Duration:** `77 ms`
- **Test Outcome:** `NON-2xx / ERROR (HTTP 404)`
- **Usage:** `Not present in response`
- **Cost:** `Not present in response`
- **Finish Reason:** `N/A`

#### Redacted Request Headers
```json
{
  "Accept": "application/json",
  "Content-Type": "application/json",
  "anthropic-version": "2023-06-01",
  "x-api-key": "[REDACTED_API_KEY]"
}
```

#### Request Payload
```json
{
  "model": "nonexistent-anthropic/claude-unknown-000000",
  "max_tokens": 8,
  "messages": [
    {
      "role": "user",
      "content": "Unknown model test."
    }
  ]
}
```

#### Response Headers
```json
{
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "*",
  "content-length": "125",
  "content-type": "application/json",
  "date": "Thu, 19 Nov 2026 07:34:32 GMT",
  "server": "nginx",
  "vary": "origin, access-control-request-method, access-control-request-headers"
}
```

#### Raw Response Body
```text
{"error":{"message":"model 'nonexistent-anthropic/claude-unknown-000000' not found","type":"not_found_error"},"type":"error"}
```

#### Parsed Response Structure (Exact JSON Paths)
| JSON Path | Data Type | Actual Value |
|---|---|---|
| `error` | `object` | `Object{message, type}` |
| `error.message` | `string` | `"model 'nonexistent-anthropic/claude-unknown-000000' not found"` |
| `error.type` | `string` | `"not_found_error"` |
| `type` | `string` | `"error"` |

---

## D. Error Handling Investigation

| HTTP Status | Description | Verification Status | Observed Schema & Evidence |
|---|---|---|---|
| **400** | Bad Request / Malformed Payload | **OBSERVED (2 test(s))** | Format: `openai-style`, Fields: `error`, `error.code`, `error.message`, `error.type`, Message: "'messages' must be a non-empty array" |
| **401** | Unauthorized (Missing or Invalid API Key) | **OBSERVED (4 test(s))** | Format: `openai-style`, Fields: `error`, `error.code`, `error.message`, `error.type`, Message: "missing or malformed API key" |
| **402** | Payment Required / Insufficient Credits | **NOT OBSERVED / UNTESTED** | Requires valid/specific test key or trigger condition to observe live response. |
| **403** | Forbidden / Model Permission Denied | **NOT OBSERVED / UNTESTED** | Requires valid/specific test key or trigger condition to observe live response. |
| **404** | Not Found / Unknown Model ID | **OBSERVED (2 test(s))** | Format: `openai-style`, Fields: `error`, `error.code`, `error.message`, `error.type`, Message: "model 'nonexistent-provider/unknown-synthetic-model-000000' not found" |
| **405** | Method Not Allowed (Observed on non-/v1 root path) | **OBSERVED (1 test(s))** | Format: `html-gateway`, Fields: Non-JSON, Message: "405 Not Allowed" |
| **413** | Payload Too Large / Context Window Exceeded | **NOT OBSERVED / UNTESTED** | Requires valid/specific test key or trigger condition to observe live response. |
| **429** | Too Many Requests / Rate Limit Exceeded | **NOT OBSERVED / UNTESTED** | Requires valid/specific test key or trigger condition to observe live response. |
| **502** | Bad Gateway / Upstream Provider Error | **NOT OBSERVED / UNTESTED** | Requires valid/specific test key or trigger condition to observe live response. |

### Verified Error Schema Differences Across Endpoints

1. **OpenAI-Compatible Endpoints (`/v1/chat/completions`, `/v1/responses`, `/v1/embeddings`, `/v1/decisions`, `/v1/systemone`):**
   - Observed HTTP 400 JSON structure: `{"error":{"code":400,"message":"'messages' must be a non-empty array","type":"invalid_request_error"}}`
   - Observed HTTP 401 JSON structure: `{"error":{"code":401,"message":"missing or malformed API key","type":"authentication_error"}}` and `{"error":{"code":401,"message":"invalid API key","type":"authentication_error"}}`
   - Observed HTTP 404 JSON structure: `{"error":{"code":404,"message":"model 'nonexistent-provider/unknown-synthetic-model-000000' not found","type":"not_found_error"}}`
   - Exact fields: `error` (`object`), `error.code` (`number` — integer HTTP status code, NOT string), `error.message` (`string`), `error.type` (`string`).
2. **Anthropic-Compatible Endpoints (`/v1/messages`, `/v1/messages/count_tokens`):**
   - Observed HTTP 400 JSON structure: `{"error":{"message":"'messages' must be a non-empty array","type":"invalid_request_error"},"type":"error"}`
   - Observed HTTP 401 JSON structure: `{"error":{"message":"missing or malformed API key","type":"authentication_error"},"type":"error"}` and `{"error":{"message":"invalid API key","type":"authentication_error"},"type":"error"}`
   - Observed HTTP 404 JSON structure: `{"error":{"message":"model 'nonexistent-anthropic/claude-unknown-000000' not found","type":"not_found_error"},"type":"error"}`
   - Exact fields: `type` (`string` = `"error"`), `error` (`object`), `error.message` (`string`), `error.type` (`string`). Note that `error.code` is NOT present on Anthropic endpoints.
3. **Non-`/v1` Root Path (`POST https://rerouter.mubarokah.com/messages/count_tokens`):**
   - Returns `HTTP 405 Not Allowed` with `content-type: text/html` from `nginx` (`<html><head><title>405 Not Allowed</title></head>...`). Confirms that `/v1/messages/count_tokens` is the valid API gateway path.

---

## E. Rate Limits Investigation

- **HTTP 429 Observation Status:** `NOT VERIFIED — NO HTTP 429 RESPONSE OBSERVED`
- **Observed Rate-Limit Response Headers Across Executed Requests:** `None returned on observed responses (Retry-After, RateLimit-*, and X-RateLimit-* were absent)`
- **Per-Key Numerical Rate Limit:** `REQUIRES PROVIDER CONFIRMATION`
- **Per-Account Numerical Rate Limit:** `REQUIRES PROVIDER CONFIRMATION`
- **Retry-After Header Format on 429:** `NOT VERIFIED — NO HTTP 429 RESPONSE OBSERVED`

---

## F. Credit Exhaustion & Output Truncation Behavior

- **Credit-Limited Output Truncation Status:** `NOT VERIFIED — REQUIRES A DEDICATED LOW-CREDIT TEST KEY`
- **Ordinary Max-Token Truncation (`max_tokens: 4`):** `NOT EXECUTED (Requires valid API key and explicit billable test trigger)`
- **Distinguishing Credit Truncation from Max-Token Truncation:** `REQUIRES PROVIDER CONFIRMATION / DEDICATED LOW-CREDIT TEST KEY`

---

## G. Model IDs & Lifecycle Observations

- **Models with Provider Prefix (`provider/model`):** `24` of `73` (Prefixes: `baidu/`, `cohere/`, `dots-studio/`, `gemini/`, `inclusionai/`, `liquid/`, `meituan/`, `nvidia/`, `particle-ai/`, `recursive/`, `reflection/`, `stepfun/`, `thinkingmachines/`)
- **Models without Provider Prefix:** `49` of `73` (e.g. `gpt-6-astra`, `qwen3.7-plus`, `qwen3.8-flash`, `qwen3.8-max`, `claude-haiku-4-5`, `claude-haiku-5-5`, `claude-opus-4-8`, `claude-opus-5`)
- **Models with Colon Suffix Tag (e.g. `:free`, `:fast`, `:netra`):** `18`
- **Critical Prefix Discrepancy Discovered:**
  - In `GET /v1/models`, the Typesafe decision models have exact IDs `jev-1.13.0` and `jev-1.14.0` (with `owned_by: "typesafe"` and NO `typesafe/` prefix in `id`).
  - However, the System One documentation example references `"model": "typesafe/jev-1.14.0"`.
  - Gemini models DO include the `gemini/` prefix in `id` (e.g. `gemini/gemini-embedding-001`, `gemini/gemini-3.5-flash`), whereas OpenAI (`gpt-5-mini`, `text-embedding-3-small`) and Anthropic (`claude-haiku-4-5`, `claude-sonnet-5-5`) models do NOT include a `provider/` prefix.

---

## H. Privacy & Data Retention

- **Verified Facts from Live Catalog:**
  - `GET /v1/models` exposes models from 13+ distinct upstream model families (`alibaba`, `anthropic`, `byteplus`, `deepseek`, `gemini`, `mimo`, `minimax`, `moonshoot`, `netra-runtime`, `openai`, `typesafe`, `xai`, `z.ai`).
  - `GET /v1/models` includes `pricing.input_cache_read` on all models, indicating prompt caching infrastructure.
- **Unverified / Requires Provider Confirmation:**
  - All 15 privacy, prompt retention, logging duration, sub-processor policy, and zero-data-retention questions require formal written confirmation from Mubarokah Digital (see `REROUTER_PRIVACY_QUESTIONS.md`).

---

## I. Final Documentation Corrections

| Documentation Item | Verified Result | Evidence | Required Correction |
|---|---|---|---|
| `GET /v1/models` Authentication & Schema | **VERIFIED** | Live `GET https://rerouter.mubarokah.com/v1/models` returned HTTP 200 with `{ "data": [...], "object": "list" }` (73 models). | Document that `GET /v1/models` is publicly readable without an auth header and returns 73 models across `chat`, `embedding`, and `decision` modes. |
| Model Capability Field Names (`vision`, `thinking`) | **VERIFIED** | Live `data[i]` objects contain `supports_vision` (`boolean`) and `supports_reasoning` (`boolean`). | Update documentation to specify exact boolean field names `supports_vision` and `supports_reasoning` instead of `vision` or `thinking`. |
| Model Pricing Field Names (`input_price`, `output_price`) | **VERIFIED** | Live `data[i]` objects contain `pricing: { prompt: string, completion: string, input_cache_read: string }`, plus nullable `pricing_long_context` and `pricing_offpeak`. | Update documentation to specify `pricing.prompt`, `pricing.completion`, and `pricing.input_cache_read` (string decimals per token), plus `pricing_long_context` and `pricing_offpeak`. |
| Catalog Embedding Dimensions Metadata | **VERIFIED** | Inspected all 73 models and all 3 embedding models (`gemini/gemini-embedding-001`, `text-embedding-3-large`, `text-embedding-3-small`). No dimension property exists in `GET /v1/models`. | Document that `GET /v1/models` does **NOT** provide embedding vector dimensions (`NOT PROVIDED BY MODEL CATALOG`); applications must verify via `POST /v1/embeddings` (`embedding.length`). |
| Anthropic Count Tokens Endpoint Path (`/v1/messages/count_tokens` vs `/messages/count_tokens`) | **VERIFIED** | Live `POST https://rerouter.mubarokah.com/v1/messages/count_tokens` with valid key returned `HTTP 200` `{"input_tokens":13}` (works with both `x-api-key` and `Authorization: Bearer`, no generation charge). `POST https://rerouter.mubarokah.com/messages/count_tokens` returned `HTTP 405 Not Allowed` HTML from `nginx`. Note: `/v1/messages/count_tokens` does not validate `model` existence against the catalog. | Remove `/messages/count_tokens` from documentation; standardize exclusively on `https://rerouter.mubarokah.com/v1/messages/count_tokens` and document exact response schema `{"input_tokens": <number>}`. |
| OpenAI-Style Error Response Schema (`400`, `401`, `404`) | **VERIFIED** | Live 400 (`invalid_request_error`), 401 (`authentication_error`), and 404 (`not_found_error`) on `/v1/chat/completions` returned `{"error":{"code":<number>,"message":"<string>","type":"<string>"}}`. | Document that OpenAI-compatible endpoints return `error.code` as a numeric HTTP status (`number`, e.g. `400`, `401`, `404`), alongside `error.message` (`string`) and `error.type` (`string`). |
| Anthropic-Style Error Response Schema (`400`, `401`, `404`) | **VERIFIED** | Live 400 (`invalid_request_error`), 401 (`authentication_error`), and 404 (`not_found_error`) on `/v1/messages` returned `{"error":{"message":"<string>","type":"<string>"},"type":"error"}`. | Document that Anthropic-compatible endpoints return top-level `"type": "error"` and omit `error.code`. |
| Model ID Prefix Conventions & System One `typesafe/jev-1.14.0` | **PARTIALLY VERIFIED** | Catalog returns `id: "jev-1.14.0"` with `owned_by: "typesafe"` (no prefix), while Gemini models use `id: "gemini/..."` and `:free` models use `provider/model:free`. | Clarify in documentation that callers must use the exact `id` string from `/v1/models` without adding/stripping prefixes, and clarify whether `/v1/systemone` expects `jev-1.14.0` or `typesafe/jev-1.14.0`. |
| Rate Limit Headers & Per-Key / Per-Account Limits | **PROVIDER CONFIRMATION REQUIRED** | Live responses from `GET /v1/models` and `401` responses did not include `RateLimit-*`, `X-RateLimit-*`, or `Retry-After` headers. No HTTP 429 observed. | Request explicit numerical per-key and per-account rate limits and `Retry-After` specification from provider. |
| Credit Exhaustion & Output Truncation Behavior | **NOT VERIFIED** | Requires a dedicated low-credit test API key to reproduce mid-generation credit exhaustion safely. | Verify with a dedicated low-credit test key whether credit truncation sets `finish_reason: "length"` or includes custom truncation metadata. |
| Privacy, Logging & Data Retention Policy | **PROVIDER CONFIRMATION REQUIRED** | Cannot be verified via HTTP responses. | Submit `REROUTER_PRIVACY_QUESTIONS.md` (15 questions) to Mubarokah Digital for written confirmation. |
