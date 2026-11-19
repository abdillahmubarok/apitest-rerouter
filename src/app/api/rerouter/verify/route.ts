import { NextRequest, NextResponse } from 'next/server';
import { verifyUserApiKeyConnection } from '@/lib/rerouter/client';
import {
  extractUserApiKeyFromHeaders,
  OFFICIAL_BILLING_URL,
  redactSecretString,
  STANDARD_SECURITY_HEADERS,
  USER_AUTH_FORMAT_HEADER,
} from '@/lib/rerouter/config';
import { validateProxyRequestSecurity } from '@/lib/rerouter/security';
import type {
  ConnectionVerificationResponse,
  UserAuthFormat,
} from '@/lib/rerouter/types';

export async function POST(request: NextRequest) {
  const securityViolation = validateProxyRequestSecurity(request);
  if (securityViolation) {
    return securityViolation;
  }

  const userApiKey = extractUserApiKeyFromHeaders(request.headers);

  let authFormat: UserAuthFormat = 'bearer';
  const headerFormat = request.headers.get(USER_AUTH_FORMAT_HEADER);
  if (headerFormat === 'x-api-key' || headerFormat === 'bearer') {
    authFormat = headerFormat;
  } else {
    try {
      const text = await request.text();
      if (text.trim()) {
        const body = JSON.parse(text) as Record<string, unknown>;
        if (body.authFormat === 'x-api-key' || body.authFormat === 'bearer') {
          authFormat = body.authFormat;
        }
      }
    } catch {
      // Ignore malformed optional body
    }
  }

  if (!userApiKey) {
    const missingKeyResponse: ConnectionVerificationResponse = {
      ok: false,
      connectionState: 'INVALID_API_KEY',
      balanceState: 'BALANCE_UNKNOWN',
      authFormatVerified: authFormat,
      httpStatus: 401,
      durationMs: 0,
      endpointTested:
        'https://rerouter.mubarokah.com/v1/messages/count_tokens',
      message:
        'Please enter a valid ReRouter API key. API keys must be sent in request headers.',
      balanceNote: 'UNKNOWN / NOT AVAILABLE',
      shouldRedirectToBilling: false,
      billingUrl: OFFICIAL_BILLING_URL,
    };

    return NextResponse.json(missingKeyResponse, {
      status: 401,
      headers: STANDARD_SECURITY_HEADERS,
    });
  }

  try {
    const verification = await verifyUserApiKeyConnection(
      userApiKey,
      authFormat
    );

    const status =
      verification.connectionState === 'CONNECTED'
        ? 200
        : verification.httpStatus >= 400
          ? verification.httpStatus
          : 502;

    return NextResponse.json(verification, {
      status,
      headers: STANDARD_SECURITY_HEADERS,
    });
  } catch (err) {
    const safeMsg = redactSecretString(
      err instanceof Error ? err.message : 'Connection verification failed',
      userApiKey
    );

    const errorResponse: ConnectionVerificationResponse = {
      ok: false,
      connectionState: 'CONNECTION_ERROR',
      balanceState: 'BALANCE_UNKNOWN',
      authFormatVerified: authFormat,
      httpStatus: 500,
      durationMs: 0,
      endpointTested:
        'https://rerouter.mubarokah.com/v1/messages/count_tokens',
      message: `Connection verification error: ${safeMsg}`,
      balanceNote: 'UNKNOWN / NOT AVAILABLE',
      shouldRedirectToBilling: false,
      billingUrl: OFFICIAL_BILLING_URL,
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: STANDARD_SECURITY_HEADERS,
    });
  }
}
