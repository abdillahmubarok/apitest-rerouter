import fs from 'node:fs';
import path from 'node:path';
import type { ServerConfigStatus } from './types';

const DEFAULT_BASE_URL = 'https://rerouter.mubarokah.com/v1';

const PLACEHOLDER_KEYS = new Set([
  '',
  'YOUR_API_KEY',
  '<YOUR_API_KEY>',
  'REPLACE_WITH_YOUR_API_KEY',
  'your_api_key_here',
  'sk-your-api-key',
]);

interface ParsedEnvLocal {
  REROUTER_BASE_URL?: string;
  REROUTER_API_KEY?: string;
}

function readEnvLocalFromDisk(): ParsedEnvLocal {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
      return {};
    }
    const content = fs.readFileSync(envPath, 'utf-8');
    const result: ParsedEnvLocal = {};
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1).trim();
      }
      if (key === 'REROUTER_BASE_URL') {
        result.REROUTER_BASE_URL = val;
      } else if (key === 'REROUTER_API_KEY') {
        result.REROUTER_API_KEY = val;
      }
    }
    return result;
  } catch {
    return {};
  }
}

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
  apiKey: string | null;
  apiKeyConfigured: boolean;
  keySource: 'env' | 'env.local' | 'missing' | 'placeholder';
}

export function getServerRerouterConfig(): ServerRerouterConfig {
  const diskEnv = readEnvLocalFromDisk();

  const rawBaseUrl =
    diskEnv.REROUTER_BASE_URL ||
    process.env.REROUTER_BASE_URL ||
    DEFAULT_BASE_URL;
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');

  let rootOriginUrl = 'https://rerouter.mubarokah.com';
  try {
    const parsed = new URL(baseUrl);
    rootOriginUrl = parsed.origin;
  } catch {
    rootOriginUrl = baseUrl.replace(/\/v1$/, '');
  }

  const diskKey = diskEnv.REROUTER_API_KEY;
  const procKey = process.env.REROUTER_API_KEY;

  let rawKey: string | undefined;
  let source: 'env' | 'env.local' | 'missing' | 'placeholder' = 'missing';

  if (diskKey && !isPlaceholderKey(diskKey)) {
    rawKey = diskKey.trim();
    source = 'env.local';
  } else if (procKey && !isPlaceholderKey(procKey)) {
    rawKey = procKey.trim();
    source = 'env';
  } else if (diskKey || procKey) {
    source = 'placeholder';
  }

  return {
    baseUrl,
    rootOriginUrl,
    apiKey: rawKey ?? null,
    apiKeyConfigured: Boolean(rawKey),
    keySource: source,
  };
}

export function getPublicConfigStatus(): ServerConfigStatus {
  const cfg = getServerRerouterConfig();
  let maskedStatus = 'Not Configured (Missing REROUTER_API_KEY in .env.local)';
  if (cfg.apiKeyConfigured) {
    maskedStatus = 'Configured in server environment (secret value hidden)';
  } else if (cfg.keySource === 'placeholder') {
    maskedStatus = 'Placeholder detected (Replace YOUR_API_KEY in .env.local)';
  }

  return {
    baseUrl: cfg.baseUrl,
    apiKeyConfigured: cfg.apiKeyConfigured,
    keySource: cfg.keySource,
    maskedStatus,
    nextVersion: '16.4.6',
    timestamp: new Date().toISOString(),
  };
}

export function redactSecretString(
  input: string,
  secretKey?: string | null,
  extraSecret?: string | null
): string {
  if (!input) return input;
  let output = input;
  const cfg = getServerRerouterConfig();
  const secretsToRedact = [cfg.apiKey, secretKey, extraSecret].filter(
    (s): s is string => Boolean(s && s.trim().length > 3)
  );

  for (const secret of secretsToRedact) {
    if (output.includes(secret)) {
      output = output.split(secret).join('[REDACTED_API_KEY]');
    }
  }
  return output;
}

export function redactRequestHeaders(
  headers: Record<string, string>,
  secretKey?: string | null
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
      lower.includes('secret') ||
      lower.includes('token')
    ) {
      if (v.includes('invalid-dummy-key')) {
        redacted[k] = `${v} (deliberate dummy key)`;
      } else {
        redacted[k] = '[REDACTED_API_KEY]';
      }
    } else {
      redacted[k] = redactSecretString(v, secretKey);
    }
  }
  return redacted;
}
