# ReRouter API Inspector — Live Verification & Testing Console

A developer-oriented live API verification, model catalog inspection, error schema audit, and endpoint testing console built on **Next.js 16.4.6** (App Router, TypeScript, React 19, Tailwind CSS v4) for **ReRouter by Mubarokah Digital** (`https://rerouter.mubarokah.com/v1`).

---

## 1. Purpose & Core Principles

This application discovers, inspects, and empirically verifies live ReRouter API behavior using a real server-side API key:

- **Zero Client-Side Secret Exposure:** `REROUTER_API_KEY` is read strictly on the server inside Next.js App Router Route Handlers. No `NEXT_PUBLIC_` variables are used for secrets, and all recorded request headers and exported reports automatically redact API keys.
- **No Assumed Schemas:** Responses are captured as raw text first, then parsed as JSON or Server-Sent Events (SSE) streams without discarding non-JSON responses (such as HTML gateway responses).
- **Recursive JSON Path Discovery:** Automatically inspects `GET /v1/models` and all endpoint responses to report exact JSON field paths, field names, values, and data types.
- **Strict Allowlisted Server Route Handlers:** All external requests originate from server-side Route Handlers (`/api/rerouter/models`, `/api/rerouter/test`) that only permit explicitly defined ReRouter test endpoints.

---

## 2. Environment Setup

1. Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Configure your ReRouter credentials in `.env.local`:

   ```env
   REROUTER_BASE_URL=https://rerouter.mubarokah.com/v1
   REROUTER_API_KEY=YOUR_API_KEY
   ```

   > **Note:** `.gitignore` excludes `.env.local` and all secret `.env*` files while keeping `.env.example` tracked. If `REROUTER_API_KEY` is missing or left as a placeholder, the console displays an informative configuration banner without blocking the application.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open the console in your browser (default port configured in `package.json`: `http://localhost:4000`).

---

## 3. Authentication Support

Both documented authentication header formats are supported and can be toggled globally or per-endpoint:

- **Bearer Authentication (Default):**
  ```http
  Authorization: Bearer YOUR_API_KEY
  ```
- **Anthropic-Compatible Header:**
  ```http
  x-api-key: YOUR_API_KEY
  ```

---

## 4. Test Execution Categories

### Category A: Safe Tests (Non-Billable)
Can be executed automatically or via the **"Run All Category A Safe Tests"** button:
- `GET /v1/models` — Live model catalog fetch and recursive schema analysis.
- `POST /v1/messages/count_tokens` vs `POST /messages/count_tokens` — Dual candidate endpoint path verification (no generation charge).
- Safe Negative Error Tests (`400`, `401`, `404`) across OpenAI-compatible (`/v1/chat/completions`) and Anthropic-compatible (`/v1/messages`) endpoints.
- Passive rate-limit response header inspection.

### Category B: Billable Tests (Explicit User Trigger Required)
Never executed automatically on page load. Each panel displays an explicit credit warning (`This request may consume API credits.`) and uses minimal synthetic inputs and low token limits:
- `POST /v1/chat/completions` (`stream: false`)
- `POST /v1/chat/completions` (`stream: true` SSE)
- `POST /v1/responses` (Non-Streaming and Streaming SSE with `response.completed` inspection)
- `POST /v1/messages` (Anthropic Messages API)
- `POST /v1/embeddings` (Actual vector dimension verification via `embedding.length` + Knowledge-Base RAG dimension compatibility checker)
- `POST /v1/decisions` (Predicate decision verification)
- `POST /v1/systemone` (Tests exact documented `"model": "typesafe/jev-1.14.0"` first, with documented substitution option for catalog ID `"jev-1.14.0"`)

### Category C: Restricted / Special Tests
- `CREDIT-LIMIT TEST`: Disabled by default behind an explicit confirmation gate. Only enable when testing with a dedicated low-credit test API key (never use a production key).

---

## 5. Console Sections (16 Panels)

1. **Overview:** Live connection status, authentication status, base URL, key status, request telemetry counters, and session execution log.
2. **Model Catalog:** Full raw JSON viewer, discovered field path mapping (`id`, `name`, `owned_by`, `mode`, `supports_vision`, `supports_reasoning`, `pricing.prompt`, `pricing.completion`, etc.), recursive JSON field inspector, and **Embedding Dimensions Inspector & RAG Compatibility Tool**.
3. **Chat Completions:** Non-streaming `POST /v1/chat/completions` inspector.
4. **Streaming:** SSE frame-by-frame inspector for streaming chat completions.
5. **Responses API:** Dual Non-Streaming and Streaming (`response.completed`) inspector for `POST /v1/responses`.
6. **Anthropic Messages:** `POST /v1/messages` inspector with `x-api-key` and `anthropic-version: 2023-06-01`.
7. **Count Tokens:** Side-by-side comparison of `https://rerouter.mubarokah.com/v1/messages/count_tokens` (`HTTP 200 {"input_tokens": 13}`) vs `https://rerouter.mubarokah.com/messages/count_tokens` (`HTTP 405 Not Allowed` HTML).
8. **Embeddings:** Live `POST /v1/embeddings` vector inspector calculating `embedding.length`.
9. **Decisions:** `POST /v1/decisions` predicate inspector.
10. **System One:** `POST /v1/systemone` inspector.
11. **Error Inspector:** OpenAI vs Anthropic error schema hypothesis evaluator (`400`, `401`, `403`, `404`).
12. **Rate Limits:** Passive response header monitor (`Retry-After`, `RateLimit-*`, `X-RateLimit-*`).
13. **Credit & Truncation:** Comparison between ordinary `max_tokens: 4` truncation and gated `CREDIT-LIMIT TEST`.
14. **Model Changes:** Prefix convention auditor, dated Claude alias tester, and timestamped `/v1/models` snapshot downloader & diff comparison engine.
15. **Privacy:** 15-point `Privacy & Data Retention — Provider Confirmation Required` questionnaire and `REROUTER_PRIVACY_QUESTIONS.md` exporter.
16. **Test Reports:** Live preview and one-click download for `REROUTER_TEST_REPORT.md` and JSON test results.
