import { NextRequest, NextResponse } from 'next/server';
import { connection } from 'next/server';
import {
  extractUserApiKeyFromHeaders,
  getPublicConfigStatus,
  STANDARD_SECURITY_HEADERS,
} from '@/lib/rerouter/config';
import { validateProxyRequestSecurity } from '@/lib/rerouter/security';

export async function GET(request: NextRequest) {
  await connection();
  const securityViolation = validateProxyRequestSecurity(request);
  if (securityViolation) {
    return securityViolation;
  }

  const userKey = extractUserApiKeyFromHeaders(request.headers);
  const status = getPublicConfigStatus(Boolean(userKey));

  return NextResponse.json(status, {
    headers: STANDARD_SECURITY_HEADERS,
  });
}
