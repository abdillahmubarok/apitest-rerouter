# ReRouter API Playground — Public BYOK Live Verification & Testing Platform

A public, multi-user **Bring Your Own API Key (BYOK)** developer playground, model catalog explorer, SSE stream inspector, and error schema verifier built on **Next.js 16.4.6** (App Router, TypeScript, React 19, Tailwind CSS v4) for **ReRouter by Mubarokah Digital**.

- **Production Domain:** `https://apitest-rerouter.mubarokah.com`
- **Official ReRouter API Base URL:** `https://rerouter.mubarokah.com/v1`
- **Official Documentation:** `https://rerouter.mubarokah.com/docs`
- **Official Billing & API Keys Portal:** `https://rerouter.mubarokah.com/billing`

---

## 1. Architecture & Security Model (BYOK · No Database)

1. **Bring Your Own API Key (BYOK):**
   - Visitors supply their own ReRouter API key in the centered connection modal upon opening the Playground.
   - The platform has **no database**, **no user registration**, **no account system**, and **no persistent API key storage**.
   - The server never uses or falls back to a shared administrator API key.

2. **Strictly In-Memory Session Management:**
   - The visitor's API key is stored exclusively in React in-memory state (`RerouterSessionProvider`) for the lifetime of the active browser tab session.
   - The key is never written to persistent browser storage, IndexedDB, cookies, URLs, or server files.
   - Navigating across all 16 Playground modules preserves the active in-memory session.
   - Clicking **Disconnect** or refreshing/reloading the browser tab immediately clears the API key and session request history from memory and returns to the connection modal.
   - *Developer Tools Note:* Because the visitor's browser sends their own key to the platform's same-origin proxy on each test request, the visitor can inspect their own requests in their own browser's Developer Tools. The security boundary prevents disclosure to other visitors, persistent storage, logs, and third-party services.

3. **Per-Request Server-Side API Proxy:**
   - All API requests pass through same-origin Next.js App Router Route Handlers (`/api/rerouter/verify`, `/api/rerouter/models`, `/api/rerouter/test`, `/api/rerouter/config`, `/api/rerouter/export`).
   - The proxy accepts the visitor's API key strictly via request headers (`x-rerouter-user-key`), never via URL query parameters.
   - The proxy only forwards requests to explicitly allowlisted ReRouter endpoints (`ENDPOINT_DEFINITIONS`), preventing arbitrary URL or host proxying.
   - Every response sets `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0`, `Referrer-Policy: no-referrer`, and `X-Content-Type-Options: nosniff`.
   - All recorded request headers, error messages, and downloadable session reports automatically redact credentials.

4. **Safe Non-Billable Connection Validation:**
   - Clicking **Test Connection** validates the visitor's API key via `POST https://rerouter.mubarokah.com/v1/messages/count_tokens` using the visitor's selected authentication format (`Authorization: Bearer` or `x-api-key` + `anthropic-version: 2023-06-01`).
   - Verified empirically to return `HTTP 200 {"input_tokens": ...}` for valid keys and `HTTP 401` for invalid or missing keys without generating an AI completion or consuming generation credits.
   - `GET /v1/models` is never used alone to validate an API key because the model catalog is publicly readable.

5. **Balance Status & Authoritative Billing Redirect:**
   - The ReRouter API does not expose a dedicated balance or credit inquiry endpoint. Accordingly, the Playground displays balance status as `UNKNOWN / NOT AVAILABLE` after connection rather than fabricating a balance number.
   - All user-triggered API responses are inspected for an authoritative insufficient-credit signal (`HTTP 402 Payment Required`, documented in ReRouter documentation Sections 2 & 3).
   - When an authoritative `HTTP 402` response is received, the Playground displays a brief explanation and redirects the developer to `https://rerouter.mubarokah.com/billing` without any API key or request data in the redirect URL.
   - Timeouts, invalid keys (`401`), forbidden model errors (`403`), unknown models (`404`), rate limits (`429`), and gateway errors (`500`/`502`/`503`) are never misclassified as empty balance.

---

## 2. Local Development & Environment Setup

No administrator API key or database is required to run this application locally or in production.

1. Copy `.env.example` to `.env.local` (optional if using the default base URL):

   ```bash
   cp .env.example .env.local
   ```

2. `.env.local` requires only non-secret configuration:

   ```env
   REROUTER_BASE_URL=https://rerouter.mubarokah.com/v1
   ```

3. Install dependencies and start the development server:

   ```bash
   npm install
   npm run dev
   ```

4. Open `http://localhost:4000` in your browser. The **ReRouter API Playground** connection modal will appear immediately. Enter your ReRouter API key and click **Test Connection**.

---

## 3. Preserved 16-Section Playground & API Inspector Modules

All 16 API inspection and testing sections are preserved:

1. **Overview:** Live connection status, BYOK authentication status, base URL, balance status indicator, request telemetry counters, and in-memory session execution log.
2. **Model Catalog:** Full raw JSON viewer, discovered field path mapping (`id`, `name`, `owned_by`, `mode`, `supports_vision`, `supports_reasoning`, `pricing.prompt`, `pricing.completion`, `pricing.input_cache_read`, `pricing_long_context`, `pricing_offpeak`, `context_length`, `created`, `description`, `object`), recursive JSON field inspector, and **Embedding Dimensions Inspector & RAG Compatibility Tool**.
3. **Chat Completions:** Non-streaming `POST /v1/chat/completions` tester.
4. **Streaming:** SSE frame-by-frame inspector for streaming chat completions (`stream: true`).
5. **Responses API:** Dual Non-Streaming and Streaming (`response.completed`) inspector for `POST /v1/responses`.
6. **Anthropic Messages:** `POST /v1/messages` inspector with `x-api-key` and `anthropic-version: 2023-06-01`.
7. **Count Tokens:** Side-by-side comparison of `https://rerouter.mubarokah.com/v1/messages/count_tokens` (`HTTP 200 {"input_tokens": 13}`) vs non-`/v1` root path (`HTTP 405 Not Allowed` HTML).
8. **Embeddings:** Live `POST /v1/embeddings` vector inspector calculating `embedding.length`.
9. **Decisions:** `POST /v1/decisions` predicate decision inspector.
10. **System One:** `POST /v1/systemone` inspector (comparing documented `"typesafe/jev-1.14.0"` vs catalog `"jev-1.14.0"`).
11. **Error Inspector:** OpenAI vs Anthropic error schema evaluator (`400`, `401`, `403`, `404`) and 11-category error classifier.
12. **Rate Limits:** Passive response header monitor (`Retry-After`, `RateLimit-*`, `X-RateLimit-*`).
13. **Credit & Truncation:** Comparison between ordinary `max_tokens: 4` truncation and confirmation-gated `CREDIT-LIMIT TEST`.
14. **Model Changes:** Prefix convention auditor, dated Claude alias tester, and timestamped `/v1/models` snapshot downloader & diff comparison engine.
15. **Privacy:** Explicit comparison between **This Playground's Verified Behavior** and **ReRouter / Upstream Provider Data Retention** (15-point provider questionnaire & `REROUTER_PRIVACY_QUESTIONS.md` exporter).
16. **Test Reports:** Live preview and one-click client-side download for redacted session Markdown (`REROUTER_SESSION_TEST_REPORT.md`) and JSON test results.

---

## 4. Billable Test Safety Categories

- **Category A (Safe / Non-Billable Verification Tests):**
  - `GET /v1/models`, `POST /v1/messages/count_tokens`, safe negative error tests (`400`, `401`, `404`), and passive rate-limit header inspection.
- **Category B (Billable Generation & Embedding Requests):**
  - Never executed automatically on page load or connection.
  - Require an explicit user click and display a visible credit consumption warning (`This request may consume API credits.`).
  - Never automatically retried on error or HTTP 429.
- **Category C (Restricted Tests):**
  - `CREDIT-LIMIT TEST` and restricted permission tests remain disabled by default behind an explicit confirmation gate.

---

## 5. Production Deployment Guide (`apitest-rerouter.mubarokah.com`)

### Build & Run Commands

```bash
npm run build
npm run start
```

### Environment Variables in Production

Configure only non-secret configuration:

```env
REROUTER_BASE_URL=https://rerouter.mubarokah.com/v1
NODE_ENV=production
```

- **No administrator API key** is needed or used.
- **No database** connection string is needed.

### DNS & Custom Domain Setup (`apitest-rerouter.mubarokah.com`)

Configure the `apitest-rerouter` subdomain in the DNS zone for `mubarokah.com` according to your hosting topology:

1. **Managed PaaS / Serverless Hosting (e.g., Vercel, Railway, Render, Cloudflare, Netlify):**
   - Add `apitest-rerouter.mubarokah.com` as a custom domain in your hosting project settings.
   - Create a `CNAME` record in DNS for `apitest-rerouter` pointing to your provider's target hostname (or `A`/`AAAA` record if required by the provider).
   - Enable automatic TLS/HTTPS certificate provisioning (Let's Encrypt / managed SSL) and enforce HTTPS redirection.

2. **Self-Hosted Container / Reverse Proxy (e.g., Docker + Nginx / Caddy / Traefik on VPS):**
   - Create an `A` (and optional `AAAA`) DNS record for `apitest-rerouter.mubarokah.com` pointing to your server's public IP address.
   - Configure your reverse proxy (Nginx / Caddy) to terminate TLS (HTTPS) for `apitest-rerouter.mubarokah.com` and proxy traffic to the Next.js server (`http://127.0.0.1:3000` or configured port), disabling proxy buffering (`proxy_buffering off;`) on `/api/rerouter/*` routes so SSE responses work smoothly.

### Production Rate Limiting & WAF Note

In-memory rate limiters inside a Node.js process are only best-effort per instance and do not share state across serverless functions or multi-instance horizontal replicas. For globally reliable abuse protection in production, configure rate limiting at your edge WAF / reverse proxy / hosting provider (e.g., Cloudflare Rate Limiting rules or Nginx `limit_req_zone` on `/api/rerouter/*`).
