import { NextRequest, NextResponse } from 'next/server';
import {
  executeRerouterTest,
  MAX_PROXY_BODY_BYTES,
} from '@/lib/rerouter/client';
import {
  extractUserApiKeyFromHeaders,
  getPublicConfigStatus,
  redactSecretString,
  STANDARD_SECURITY_HEADERS,
  USER_AUTH_FORMAT_HEADER,
} from '@/lib/rerouter/config';
import { isAllowedEndpointId } from '@/lib/rerouter/endpoints';
import { validateProxyRequestSecurity } from '@/lib/rerouter/security';
import type { AuthFormat } from '@/lib/rerouter/types';

export async function POST(request: NextRequest) {
  const securityViolation = validateProxyRequestSecurity(request);
  if (securityViolation) {
    return securityViolation;
  }

  const userApiKey = extractUserApiKeyFromHeaders(request.headers);

  try {
    const rawBodyText = await request.text();
    if (rawBodyText.length > MAX_PROXY_BODY_BYTES) {
      return NextResponse.json(
        {
          error: `Request payload exceeds maximum allowed size (${MAX_PROXY_BODY_BYTES} bytes).`,
        },
        {
          status: 413,
          headers: STANDARD_SECURITY_HEADERS,
        }
      );
    }

    const body = (rawBodyText ? JSON.parse(rawBodyText) : {}) as Record<
      string,
      unknown
    >;

    // Strictly reject any attempt to supply arbitrary upstream URLs or hosts
    if (
      'url' in body ||
      'targetUrl' in body ||
      'host' in body ||
      'upstream' in body
    ) {
      return NextResponse.json(
        {
          error:
            'Security Policy Violation: Arbitrary target URLs and upstream hosts are strictly prohibited.',
        },
        {
          status: 400,
          headers: STANDARD_SECURITY_HEADERS,
        }
      );
    }

    const endpointId =
      typeof body.endpointId === 'string' ? body.endpointId : '';

    if (!isAllowedEndpointId(endpointId)) {
      return NextResponse.json(
        {
          error: `Disallowed endpointId: "${endpointId}". Generic proxying is prohibited; only explicitly allowlisted ReRouter endpoints are permitted.`,
        },
        {
          status: 400,
          headers: STANDARD_SECURITY_HEADERS,
        }
      );
    }

    const headerAuth = request.headers.get(USER_AUTH_FORMAT_HEADER);
    const rawAuth = body.authFormat ?? headerAuth;
    const authFormat: AuthFormat | undefined =
      rawAuth === 'bearer' ||
      rawAuth === 'x-api-key' ||
      rawAuth === 'none' ||
      rawAuth === 'invalid-dummy'
        ? rawAuth
        : undefined;

    const customBodyRaw =
      typeof body.customBodyRaw === 'string' ? body.customBodyRaw : null;
    const selectedModelId =
      typeof body.selectedModelId === 'string'
        ? body.selectedModelId
        : undefined;

    const headerLowCreditKey = request.headers.get(
      'x-rerouter-low-credit-key'
    );
    const dedicatedLowCreditKey =
      headerLowCreditKey ||
      (typeof body.dedicatedLowCreditKey === 'string'
        ? body.dedicatedLowCreditKey
        : null);

    if (
      endpointId === 'credit-limit-test' &&
      body.confirmLowCreditTest !== true
    ) {
      return NextResponse.json(
        {
          error:
            'CREDIT-LIMIT TEST is disabled by default. You must explicitly confirm that a dedicated low-credit test API key is being used.',
        },
        {
          status: 400,
          headers: STANDARD_SECURITY_HEADERS,
        }
      );
    }

    const testResult = await executeRerouterTest({
      endpointId,
      authFormat,
      userApiKey,
      customBodyRaw,
      selectedModelId,
      dedicatedLowCreditKey,
    });

    const configStatus = getPublicConfigStatus(Boolean(userApiKey));

    return NextResponse.json(
      {
        configStatus,
        testResult,
      },
      {
        headers: STANDARD_SECURITY_HEADERS,
      }
    );
  } catch (err) {
    const safeError = redactSecretString(
      err instanceof Error
        ? `Failed to process test request: ${err.message}`
        : 'Failed to process test request',
      userApiKey
    );
    return NextResponse.json(
      {
        error: safeError,
      },
      {
        status: 500,
        headers: STANDARD_SECURITY_HEADERS,
      }
    );
  }
}
