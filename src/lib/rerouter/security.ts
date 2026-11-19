import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { MAX_PROXY_BODY_BYTES } from './client';
import { STANDARD_SECURITY_HEADERS } from './config';

const FORBIDDEN_QUERY_PARAM_NAMES = new Set([
  'apikey',
  'api_key',
  'api-key',
  'key',
  'token',
  'access_token',
  'secret',
  'authorization',
  'x-api-key',
  'x-rerouter-user-key',
]);

const FORBIDDEN_TARGET_PARAM_NAMES = new Set([
  'url',
  'target',
  'targeturl',
  'host',
  'upstream',
  'endpoint',
  'uri',
]);

/**
 * Validates incoming requests to internal Next.js Route Handlers:
 * 1. Rejects any API key or token passed in URL query parameters.
 * 2. Rejects any arbitrary target URL or upstream host parameters.
 * 3. Validates same-origin when Origin header is present.
 * 4. Enforces maximum request body size limit.
 */
export function validateProxyRequestSecurity(
  request: NextRequest
): NextResponse | null {
  // 1. Reject API keys or arbitrary target URLs in URL searchParams
  for (const [paramName] of request.nextUrl.searchParams.entries()) {
    const lower = paramName.toLowerCase();
    if (FORBIDDEN_QUERY_PARAM_NAMES.has(lower)) {
      return NextResponse.json(
        {
          error:
            'Security Policy Violation: API keys and tokens are strictly prohibited in URL query parameters. Supply your API key via request headers only.',
        },
        {
          status: 400,
          headers: STANDARD_SECURITY_HEADERS,
        }
      );
    }
    if (FORBIDDEN_TARGET_PARAM_NAMES.has(lower)) {
      return NextResponse.json(
        {
          error:
            'Security Policy Violation: Arbitrary upstream URLs or hosts are not permitted.',
        },
        {
          status: 400,
          headers: STANDARD_SECURITY_HEADERS,
        }
      );
    }
  }

  // 2. Same-origin verification when Origin header is present
  const originHeader = request.headers.get('origin');
  if (originHeader) {
    try {
      const originUrl = new URL(originHeader);
      const hostHeader =
        request.headers.get('x-forwarded-host') ||
        request.headers.get('host') ||
        '';
      const expectedHost = hostHeader.split(',')[0]?.trim().toLowerCase();
      if (
        expectedHost &&
        originUrl.host.toLowerCase() !== expectedHost
      ) {
        return NextResponse.json(
          {
            error:
              'Forbidden: Cross-origin requests to internal API proxy routes are not allowed.',
          },
          {
            status: 403,
            headers: STANDARD_SECURITY_HEADERS,
          }
        );
      }
    } catch {
      return NextResponse.json(
        {
          error: 'Forbidden: Malformed Origin header.',
        },
        {
          status: 403,
          headers: STANDARD_SECURITY_HEADERS,
        }
      );
    }
  }

  // 3. Enforce Content-Length limit
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (!Number.isNaN(contentLength) && contentLength > MAX_PROXY_BODY_BYTES) {
      return NextResponse.json(
        {
          error: `Payload Too Large: Proxy request body exceeds ${MAX_PROXY_BODY_BYTES} bytes limit.`,
        },
        {
          status: 413,
          headers: STANDARD_SECURITY_HEADERS,
        }
      );
    }
  }

  return null;
}
