# ReRouter API Playground — Security, Architecture & Verification Report

**Application:** ReRouter API Playground (Upgraded from ReRouter API Inspector)
**Framework:** Next.js `16.4.6` (App Router, React 19, TypeScript, Tailwind CSS v4)
**Target Production Domain:** `https://apitest-rerouter.mubarokah.com`
**Official ReRouter API Base URL:** `https://rerouter.mubarokah.com/v1`
**Official Documentation URL:** `https://rerouter.mubarokah.com/docs`
**Official Billing & API Keys URL:** `https://rerouter.mubarokah.com/billing`

---

## 1. Architecture Migration Summary (Server-Key to Public Multi-User BYOK)

| Architectural Component | Previous Inspector Design | Upgraded Public BYOK Playground Design |
|---|---|---|
| **API Key Ownership** | Single server-side key in `.env.local` | Visitor supplies their own ReRouter API key (BYOK) via Connection Modal |
| **Client Session State** | None (relied on server `.env.local`) | Root-level `RerouterSessionProvider` holding key strictly in React in-memory state |
| **Persistent Browser Storage** | None | Strictly none (no persistent web storage, no IndexedDB, no cookies, no URL params) |
| **Database / Accounts** | None | Strictly none (no database, no user registration, no server session store) |
| **Server-Side Proxy** | Read fixed server key from disk/env | Per-request header extraction (`x-rerouter-user-key`); zero fallback to any server key |
| **Connection Validation** | Implicit via test runs | Dedicated non-billable `POST /api/rerouter/verify` → `POST /v1/messages/count_tokens` |
| **Balance & Billing Redirect** | Manual low-credit test only | Honest `BALANCE_UNKNOWN` baseline + automatic redirect to `/billing` on authoritative HTTP `402` |
| **Session Lifecycle** | Persisted across page refreshes | Survives in-app module navigation; cleared immediately on **Disconnect** or page refresh |

---

## 2. Verification Classification Matrix

All findings below are separated into **VERIFIED**, **PARTIALLY VERIFIED**, **NOT VERIFIED**, and **PROVIDER CONFIRMATION REQUIRED** based on actual code and live HTTP execution checks.

### A. VERIFIED

1. **Zero Server-Side API Key Dependency (`src/lib/rerouter/config.ts`, `src/lib/rerouter/client.ts`):**
   - **Status:** `VERIFIED`
   - **Evidence:** `getServerRerouterConfig()` reads only `REROUTER_BASE_URL` (defaulting to `https://rerouter.mubarokah.com/v1`). Even when an old key remains in `.env.local` or `process.env`, the application ignores it completely. Calling `POST /api/rerouter/verify` or `POST /api/rerouter/test` without a per-request user key header returns `HTTP 401` (`INVALID_API_KEY`).

2. **Safe Non-Billable Connection Validation via `POST /v1/messages/count_tokens`:**
   - **Status:** `VERIFIED`
   - **Evidence:** Empirically tested against `https://rerouter.mubarokah.com/v1/messages/count_tokens`:
     - Missing API key → `HTTP 401 {"error":{"message":"missing or malformed API key","type":"authentication_error"},"type":"error"}`
     - Invalid dummy key (`Authorization: Bearer`) → `HTTP 401 {"error":{"message":"invalid API key","type":"authentication_error"},"type":"error"}`
     - Invalid dummy key (`x-api-key` + `anthropic-version: 2023-06-01`) → `HTTP 401 {"error":{"message":"invalid API key","type":"authentication_error"},"type":"error"}`
     - Valid key (`Authorization: Bearer`) → `HTTP 200 {"input_tokens":15}`
     - Valid key (`x-api-key` + `anthropic-version: 2023-06-01`) → `HTTP 200 {"input_tokens":15}`
     - Does not generate an AI completion or consume generation credits.

3. **Multi-User Per-Request Isolation & Zero Shared State:**
   - **Status:** `VERIFIED`
   - **Evidence:** Concurrent requests executed against `/api/rerouter/verify` and `/api/rerouter/test` with User A (valid key, Bearer), User B (invalid key, `x-api-key`), and User C (valid key, `x-api-key`), followed immediately by an unauthenticated request, confirmed that each request uses only its own header-supplied key, returns `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0`, and retains zero state on the server after completion.

4. **Strict Proxy Allowlisting & Hardening (`src/lib/rerouter/security.ts`):**
   - **Status:** `VERIFIED`
   - **Evidence:**
     - Rejects any request attempting to pass an API key or token in URL query parameters (`HTTP 400`).
     - Rejects any request attempting to pass `url`, `targetUrl`, `host`, or `upstream` in query parameters or JSON body (`HTTP 400`).
     - Rejects any `endpointId` not in `ENDPOINT_DEFINITIONS` (`HTTP 400`).
     - Enforces same-origin validation when the `Origin` header is present (`HTTP 403` on cross-origin mismatch).
     - Enforces a 256 KB maximum proxy request body size (`HTTP 413`) and 45-second upstream fetch timeout.

5. **In-Memory Session Lifecycle & Browser Storage Hygiene:**
   - **Status:** `VERIFIED`
   - **Evidence:**
     - Static source scan and live browser inspection confirmed zero usage of persistent browser web storage, IndexedDB, or cookies for API keys or session request history.
     - Navigating across all 16 Playground sections preserves the active in-memory session.
     - Clicking **Disconnect** or refreshing the page clears the in-memory API key and session test history and re-opens the Connection Modal with an empty password input.

6. **Credential Redaction Across UI, Responses & Exported Reports:**
   - **Status:** `VERIFIED`
   - **Evidence:** `redactRequestHeaders()` and `redactSecretString()` scrub the per-request user API key from all recorded request headers, payload previews, response headers, error strings, and downloadable Markdown/JSON session reports. `Authorization` and `x-api-key` are explicitly excluded from returned response headers.

7. **Preservation of All 16 API Inspector Sections & Live Model Discovery (`GET /v1/models`):**
   - **Status:** `VERIFIED`
   - **Evidence:** All 16 panels (`Overview`, `Model Catalog`, `Chat Completions`, `Streaming`, `Responses API`, `Anthropic Messages`, `Count Tokens`, `Embeddings`, `Decisions`, `System One`, `Error Inspector`, `Rate Limits`, `Credit & Truncation`, `Model Changes`, `Privacy`, `Test Reports`) are preserved and operational, discovering all 73 live models and verified schema paths (`id`, `name`, `owned_by`, `mode`, `supports_vision`, `supports_reasoning`, `pricing.prompt`, `pricing.completion`, `pricing.input_cache_read`, `pricing_long_context`, `pricing_offpeak`, `context_length`, `created`, `description`, `object`).

8. **OpenAI vs Anthropic Error Schema Differences (`400`, `401`, `404`) & Non-`/v1` HTML Gateway Handling (`405`):**
   - **Status:** `VERIFIED`
   - **Evidence:**
     - OpenAI-compatible endpoints return `{"error":{"code":<number>,"message":"<string>","type":"<string>"}}`.
     - Anthropic-compatible endpoints (`/v1/messages`, `/v1/messages/count_tokens`) return `{"error":{"message":"<string>","type":"<string>"},"type":"error"}` without `error.code`.
     - Non-`/v1` root path (`POST https://rerouter.mubarokah.com/messages/count_tokens`) returns `HTTP 405 Not Allowed` HTML from `nginx`, safely captured as raw text and classified as `html-gateway`.

---

### B. PARTIALLY VERIFIED

1. **Authoritative Insufficient-Credit Detection & Billing Redirect (`HTTP 402` → `https://rerouter.mubarokah.com/billing`):**
   - **Status:** `PARTIALLY VERIFIED`
   - **Evidence & Limitation:**
     - Official ReRouter documentation (Sections 2 & 3) specifies that requests exceeding available credit or key credit limit are rejected with `HTTP 402 Payment Required`.
     - The Playground implements strict classification in `inspectErrorResponse()` and `RerouterSessionContext` that triggers the Billing Redirect modal and redirects to `https://rerouter.mubarokah.com/billing` (with zero credentials or request data in the URL) **only** upon receiving an authoritative `HTTP 402` response, and never misclassifies `400`, `401`, `403`, `404`, `429`, `500`, `502`, `503`, or timeouts as empty balance.
     - Classified as `PARTIALLY VERIFIED` because no live zero-balance or exhausted-credit API key was available to observe a real upstream `HTTP 402` payload from `rerouter.mubarokah.com`.

2. **Model ID Prefix Conventions & System One `typesafe/jev-1.14.0` vs Catalog `jev-1.14.0`:**
   - **Status:** `PARTIALLY VERIFIED`
   - **Evidence:** `GET /v1/models` lists decision models as `jev-1.13.0` and `jev-1.14.0` (`owned_by: "typesafe"`, no prefix), whereas the System One documentation example uses `"model": "typesafe/jev-1.14.0"`. Both options are preserved in the System One tester without automatic billable execution.

---

### C. NOT VERIFIED

1. **Account Balance Inquiry Endpoint:**
   - **Status:** `NOT VERIFIED` (Endpoint Does Not Exist in Official Documentation)
   - **Explanation:** Audit of the official ReRouter API documentation confirms that no account balance or credit-checking endpoint exists (only `/v1/models`, `/v1/chat/completions`, `/v1/responses`, `/v1/messages`, `/v1/messages/count_tokens`, `/v1/embeddings`, `/v1/decisions`, and `/v1/systemone` are documented). In compliance with project requirements, no balance endpoint or JSON property was invented, and the UI displays `Balance: Unknown` (`UNKNOWN / NOT AVAILABLE`) with a persistent link to `https://rerouter.mubarokah.com/billing`.

2. **Mid-Generation Credit-Limited Output Truncation Behavior:**
   - **Status:** `NOT VERIFIED`
   - **Explanation:** Reproducing mid-generation credit truncation requires a dedicated low-credit test API key and a billable generation request. The Category C `CREDIT-LIMIT TEST` panel remains disabled by default behind an explicit user confirmation gate.

3. **Live HTTP 429 `Retry-After` Header Format:**
   - **Status:** `NOT VERIFIED`
   - **Explanation:** Normal non-flood testing did not trigger an `HTTP 429` response, and standard `200`/`400`/`401`/`404` responses from ReRouter did not include `RateLimit-*`, `X-RateLimit-*`, or `Retry-After` headers.

---

### D. PROVIDER CONFIRMATION REQUIRED

1. **Numerical Per-Key and Per-Account Rate Limits:**
   - **Status:** `PROVIDER CONFIRMATION REQUIRED`
   - **Explanation:** Exact RPM/TPM limits per API key and per customer account are not published in response headers or endpoint documentation and must be confirmed by Mubarokah Digital.

2. **Upstream Prompt Retention, Completion Logging, Sub-Processor Policies & Zero Data Retention (ZDR):**
   - **Status:** `PROVIDER CONFIRMATION REQUIRED`
   - **Explanation:** While this Playground has no database and stores keys only in React memory during an active session, upstream data handling by `rerouter.mubarokah.com` and its 13+ downstream model providers cannot be verified via HTTP inspection. See `REROUTER_PRIVACY_QUESTIONS.md` (15-point provider questionnaire).

---

## 3. Production Deployment Checklist for `apitest-rerouter.mubarokah.com`

- [x] **No Administrator API Key Required:** Confirmed that `src/` contains zero references to any server-side API key environment variable and ignores any legacy key present in the host environment.
- [x] **No Database Required:** Confirmed zero database drivers, schemas, or persistent stores exist in the project.
- [x] **Production Build Passes (`npm run build`):** TypeScript compilation, ESLint validation, and Next.js 16.4.6 production build succeed cleanly.
- [x] **Security Headers Configured (`next.config.ts` & Route Handlers):**
  - `Content-Security-Policy` with `connect-src 'self'` and `frame-ancestors 'none'`
  - `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0` on all `/api/*` responses
  - `Referrer-Policy: no-referrer`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
- [ ] **Environment Variable Configuration on Hosting Provider:**
  - Set `REROUTER_BASE_URL=https://rerouter.mubarokah.com/v1`
  - Do **not** set `REROUTER_API_KEY` in the production environment (and delete any old key from deployment secrets).
- [ ] **DNS & TLS Configuration (`apitest-rerouter.mubarokah.com`):**
  - Add DNS `CNAME` (for managed PaaS) or `A`/`AAAA` record (for VPS/reverse proxy) for `apitest-rerouter.mubarokah.com`.
  - Provision TLS/HTTPS certificate and enforce HTTP-to-HTTPS redirect.
  - If using Nginx or a reverse proxy in front of Next.js, set `proxy_buffering off;` for `/api/rerouter/*` to ensure smooth SSE streaming.
- [ ] **Edge WAF / Hosting Rate Limiting:**
  - Configure per-IP rate limiting on `/api/rerouter/*` at your WAF, CDN (e.g., Cloudflare), or reverse proxy (e.g., Nginx `limit_req_zone`), as in-memory per-instance rate limiting does not share state across serverless or multi-instance deployments.
