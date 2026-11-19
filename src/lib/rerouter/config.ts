import type { ServerConfigStatus } from './types';

export const DEFAULT_BASE_URL = 'https://rerouter.mubarokah.com/v1';
export const OFFICIAL_DOCS_URL = 'https://rerouter.mubarokah.com/docs';
export const OFFICIAL_BILLING_URL = 'https://rerouter.mubarokah.com/billing';
export const PRODUCTION_DOMAIN = 'https://apitest-rerouter.mubarokah.com';

export const USER_KEY_PROXY_HEADER = 'x-rerouter-user-key';
export const USER_AUTH_FORMAT_HEADER = 'x-rerouter-auth-format';

const PLACEHOLDER_KEYS = new Set([
  '',
  'YOUR_API_KEY',
  '<YOUR_API_KEY>',
  'REPLACE_WITH_YOUR_API_KEY',
  'your_api_key_here',
  'sk-your-api-key',
]);

export const STANDARD_SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control':
    'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

export function isPlaceholderKey(key: string | undefined | null): boolean {
  if (!key) return true;
  const trimmed = key.trim();
  if (!trimmed) return true;
  if (PLACEHOLDER_KEYS.has(trimmed)) return true;
  if (PLACEHOLDER_KEYS.has(trimmed.toUpperCase())) return true;
  return false;
}

export interface ServerRerouterConfig {
  baseUrl: string;
  rootOriginUrl: string;
  docsUrl: string;
  billingUrl: string;
  productionDomain: string;
}

/**
 * Returns non-secret server configuration only.
 * Any server-side API key environment variable is intentionally ignored
 * to enforce strict per-request Bring Your Own API Key (BYOK) isolation.
 */
export function getServerRerouterConfig(): ServerRerouterConfig {
  const rawBaseUrl = process.env.REROUTER_BASE_URL || DEFAULT_BASE_URL;
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');

  let rootOriginUrl = 'https://rerouter.mubarokah.com';
  try {
    const parsed = new URL(baseUrl);
    rootOriginUrl = parsed.origin;
  } catch {
    rootOriginUrl = baseUrl.replace(/\/v1$/, '');
  }

  return {
    baseUrl,
    rootOriginUrl,
    docsUrl: OFFICIAL_DOCS_URL,
    billingUrl: OFFICIAL_BILLING_URL,
    productionDomain: PRODUCTION_DOMAIN,
  };
}

export function getPublicConfigStatus(
  userKeySupplied = false
): ServerConfigStatus {
  const cfg = getServerRerouterConfig();

  return {
    baseUrl: cfg.baseUrl,
    docsUrl: cfg.docsUrl,
    billingUrl: cfg.billingUrl,
    productionDomain: cfg.productionDomain,
    byokMode: true,
    apiKeyConfigured: userKeySupplied,
    keySource: userKeySupplied ? 'byok-memory' : 'none',
    maskedStatus: userKeySupplied
      ? 'Connected via per-request BYOK in-memory session (not stored on server)'
      : 'No active in-memory API key supplied with request (BYOK mode)',
    nextVersion: '16.4.6',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Extracts the per-request user-supplied API key from incoming request headers.
 * Never accepts API keys from URL search parameters or server environment variables.
 */
export function extractUserApiKeyFromHeaders(headers: Headers): string | null {
  const proxyHeaderKey = headers.get(USER_KEY_PROXY_HEADER);
  if (proxyHeaderKey && !isPlaceholderKey(proxyHeaderKey)) {
    return proxyHeaderKey.trim();
  }

  const xApiKey = headers.get('x-api-key');
  if (xApiKey && !isPlaceholderKey(xApiKey)) {
    return xApiKey.trim();
  }

  const authHeader = headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token && !isPlaceholderKey(token)) {
      return token;
    }
  }

  return null;
}

export function redactSecretString(
  input: string,
  ...secrets: Array<string | null | undefined>
): string {
  if (!input) return input;
  let output = input;
  const secretsToRedact = secrets.filter((s): s is string =>
    Boolean(s && s.trim().length > 3)
  );

  for (const secret of secretsToRedact) {
    const trimmed = secret.trim();
    if (output.includes(trimmed)) {
      output = output.split(trimmed).join('[REDACTED_API_KEY]');
    }
  }
  return output;
}

export function redactRequestHeaders(
  headers: Record<string, string>,
  ...secrets: Array<string | null | undefined>
): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const lower = k.toLowerCase();
    if (lower === 'authorization') {
      if (v.toLowerCase().startsWith('bearer ')) {
        const token = v.slice(7).trim();
        if (token.includes('invalid-dummy-key')) {
          redacted[k] = `Bearer ${token} (deliberate dummy key)`;
        } else {
          redacted[k] = 'Bearer [REDACTED_API_KEY]';
        }
      } else {
        redacted[k] = '[REDACTED_AUTH_HEADER]';
      }
    } else if (
      lower === 'x-api-key' ||
      lower === 'api-key' ||
      lower === USER_KEY_PROXY_HEADER ||
      lower.includes('secret') ||
      lower.includes('token')
    ) {
      if (v.includes('invalid-dummy-key')) {
        redacted[k] = `${v} (deliberate dummy key)`;
      } else {
        redacted[k] = '[REDACTED_API_KEY]';
      }
    } else {
      redacted[k] = redactSecretString(v, ...secrets);
    }
  }
  return redacted;
}
