# ReRouter by Mubarokah Digital — Privacy & Data Retention Questionnaire

**Generated:** 2026-11-19T07:34:31.054Z
**Target API Base URL:** `https://rerouter.mubarokah.com/v1`
**Classification:** `PROVIDER CONFIRMATION REQUIRED`

> **Important Notice:** Privacy, logging, sub-processor routing, and data retention guarantees cannot be established through HTTP response inspection alone. This questionnaire must be completed and confirmed in writing by the ReRouter provider (Mubarokah Digital) prior to processing production customer data.

## Summary Table

| # | Question | Current Status | Evidence Source | Notes |
|---|---|---|---|---|
| 1 | Does ReRouter store incoming prompts? | **Requires Provider Confirmation** | Cannot be determined via HTTP API responses alone. | Provider must confirm whether incoming request payloads/prompts are persisted to database or object storage. |
| 2 | Does ReRouter store generated completions? | **Requires Provider Confirmation** | Cannot be determined via HTTP API responses alone. | Provider must confirm whether non-streaming and streaming completions are stored server-side. |
| 3 | Are full request and response bodies logged? | **Requires Provider Confirmation** | Cannot be determined via HTTP API responses alone. | Clarify application logging, reverse-proxy (nginx) payload logging, and error/debug trace logging. |
| 4 | Are only request metadata and usage statistics stored? | **Requires Provider Confirmation** | Cannot be determined via HTTP API responses alone. | Confirm if billing/telemetry records store only token counts, model ID, latency, and cost without payload content. |
| 5 | How long are logs retained? | **Requires Provider Confirmation** | No retention headers or policy endpoint exposed in /v1. | Specify exact retention duration in days for billing logs, application logs, and audit trails. |
| 6 | Is retention different for failed requests? | **Requires Provider Confirmation** | Cannot be determined via HTTP API responses alone. | Confirm whether 4xx/5xx error payloads are retained longer for debugging/incident triage. |
| 7 | Are API keys stored as hashes or encrypted values? | **Requires Provider Confirmation** | Internal backend security architecture is not observable externally. | Confirm cryptographic hashing (e.g. SHA-256 / Argon2) vs reversible encryption at rest. |
| 8 | Are prompts or completions used for model training or fine-tuning? | **Requires Provider Confirmation** | Requires formal Data Processing Agreement (DPA) / Terms of Service. | Confirm both ReRouter policy and downstream model routing tier commitments (free vs paid models). |
| 9 | Are prompts forwarded to third-party model providers? | **Requires Provider Confirmation** | GET /v1/models lists models across multiple owned_by providers (openai, anthropic, gemini, deepseek, alibaba, byteplus, typesafe, xai, z.ai, etc.). | Provider must confirm exact sub-processors and routing paths for each model family. |
| 10 | What are the downstream providers' respective retention policies? | **Requires Provider Confirmation** | Requires provider sub-processor schedule. | Confirm whether enterprise/zero-data-retention endpoints or standard consumer/API endpoints are used upstream. |
| 11 | Can zero-retention mode be enabled? | **Requires Provider Confirmation** | No zero-retention parameter or header observed in API responses. | Confirm if an account-level or per-request header flag exists for Zero Data Retention (ZDR). |
| 12 | Can customers request complete deletion of request logs? | **Requires Provider Confirmation** | Requires provider support / compliance confirmation. | Confirm SLA and procedure for right-to-erasure / log purge requests. |
| 13 | Where is customer data processed and stored? | **Requires Provider Confirmation** | Server header reports nginx; data center jurisdiction unconfirmed. | Confirm cloud provider, primary hosting region(s), and cross-border data transfer safeguards. |
| 14 | Who can access request logs? | **Requires Provider Confirmation** | Internal access control policy not externally observable. | Confirm RBAC controls, employee access policies, and audit logging for internal staff. |
| 15 | Is data isolated between different customer accounts? | **Requires Provider Confirmation** | GET /v1/models includes pricing.input_cache_read fields, indicating prompt caching support. | Confirm strict tenant isolation for prompt caches (pricing.input_cache_read), logs, and rate-limit buckets. |

---

## Detailed Questions for Provider Sign-Off

### 1. Does ReRouter store incoming prompts?
- **Verification Status:** `Requires Provider Confirmation`
- **Evidence Source:** Cannot be determined via HTTP API responses alone.
- **Engineering Notes:** Provider must confirm whether incoming request payloads/prompts are persisted to database or object storage.
- **Provider Response:** _[To be completed by Mubarokah Digital]_

### 2. Does ReRouter store generated completions?
- **Verification Status:** `Requires Provider Confirmation`
- **Evidence Source:** Cannot be determined via HTTP API responses alone.
- **Engineering Notes:** Provider must confirm whether non-streaming and streaming completions are stored server-side.
- **Provider Response:** _[To be completed by Mubarokah Digital]_

### 3. Are full request and response bodies logged?
- **Verification Status:** `Requires Provider Confirmation`
- **Evidence Source:** Cannot be determined via HTTP API responses alone.
- **Engineering Notes:** Clarify application logging, reverse-proxy (nginx) payload logging, and error/debug trace logging.
- **Provider Response:** _[To be completed by Mubarokah Digital]_

### 4. Are only request metadata and usage statistics stored?
- **Verification Status:** `Requires Provider Confirmation`
- **Evidence Source:** Cannot be determined via HTTP API responses alone.
- **Engineering Notes:** Confirm if billing/telemetry records store only token counts, model ID, latency, and cost without payload content.
- **Provider Response:** _[To be completed by Mubarokah Digital]_

### 5. How long are logs retained?
- **Verification Status:** `Requires Provider Confirmation`
- **Evidence Source:** No retention headers or policy endpoint exposed in /v1.
- **Engineering Notes:** Specify exact retention duration in days for billing logs, application logs, and audit trails.
- **Provider Response:** _[To be completed by Mubarokah Digital]_

### 6. Is retention different for failed requests?
- **Verification Status:** `Requires Provider Confirmation`
- **Evidence Source:** Cannot be determined via HTTP API responses alone.
- **Engineering Notes:** Confirm whether 4xx/5xx error payloads are retained longer for debugging/incident triage.
- **Provider Response:** _[To be completed by Mubarokah Digital]_

### 7. Are API keys stored as hashes or encrypted values?
- **Verification Status:** `Requires Provider Confirmation`
- **Evidence Source:** Internal backend security architecture is not observable externally.
- **Engineering Notes:** Confirm cryptographic hashing (e.g. SHA-256 / Argon2) vs reversible encryption at rest.
- **Provider Response:** _[To be completed by Mubarokah Digital]_

### 8. Are prompts or completions used for model training or fine-tuning?
- **Verification Status:** `Requires Provider Confirmation`
- **Evidence Source:** Requires formal Data Processing Agreement (DPA) / Terms of Service.
- **Engineering Notes:** Confirm both ReRouter policy and downstream model routing tier commitments (free vs paid models).
- **Provider Response:** _[To be completed by Mubarokah Digital]_

### 9. Are prompts forwarded to third-party model providers?
- **Verification Status:** `Requires Provider Confirmation`
- **Evidence Source:** GET /v1/models lists models across multiple owned_by providers (openai, anthropic, gemini, deepseek, alibaba, byteplus, typesafe, xai, z.ai, etc.).
- **Engineering Notes:** Provider must confirm exact sub-processors and routing paths for each model family.
- **Provider Response:** _[To be completed by Mubarokah Digital]_

### 10. What are the downstream providers' respective retention policies?
- **Verification Status:** `Requires Provider Confirmation`
- **Evidence Source:** Requires provider sub-processor schedule.
- **Engineering Notes:** Confirm whether enterprise/zero-data-retention endpoints or standard consumer/API endpoints are used upstream.
- **Provider Response:** _[To be completed by Mubarokah Digital]_

### 11. Can zero-retention mode be enabled?
- **Verification Status:** `Requires Provider Confirmation`
- **Evidence Source:** No zero-retention parameter or header observed in API responses.
- **Engineering Notes:** Confirm if an account-level or per-request header flag exists for Zero Data Retention (ZDR).
- **Provider Response:** _[To be completed by Mubarokah Digital]_

### 12. Can customers request complete deletion of request logs?
- **Verification Status:** `Requires Provider Confirmation`
- **Evidence Source:** Requires provider support / compliance confirmation.
- **Engineering Notes:** Confirm SLA and procedure for right-to-erasure / log purge requests.
- **Provider Response:** _[To be completed by Mubarokah Digital]_

### 13. Where is customer data processed and stored?
- **Verification Status:** `Requires Provider Confirmation`
- **Evidence Source:** Server header reports nginx; data center jurisdiction unconfirmed.
- **Engineering Notes:** Confirm cloud provider, primary hosting region(s), and cross-border data transfer safeguards.
- **Provider Response:** _[To be completed by Mubarokah Digital]_

### 14. Who can access request logs?
- **Verification Status:** `Requires Provider Confirmation`
- **Evidence Source:** Internal access control policy not externally observable.
- **Engineering Notes:** Confirm RBAC controls, employee access policies, and audit logging for internal staff.
- **Provider Response:** _[To be completed by Mubarokah Digital]_

### 15. Is data isolated between different customer accounts?
- **Verification Status:** `Requires Provider Confirmation`
- **Evidence Source:** GET /v1/models includes pricing.input_cache_read fields, indicating prompt caching support.
- **Engineering Notes:** Confirm strict tenant isolation for prompt caches (pricing.input_cache_read), logs, and rate-limit buckets.
- **Provider Response:** _[To be completed by Mubarokah Digital]_
