import { NextRequest, NextResponse } from 'next/server';
import { connection } from 'next/server';
import { executeRerouterTest } from '@/lib/rerouter/client';
import {
  extractUserApiKeyFromHeaders,
  getPublicConfigStatus,
  STANDARD_SECURITY_HEADERS,
  USER_AUTH_FORMAT_HEADER,
} from '@/lib/rerouter/config';
import { analyzeModelCatalog } from '@/lib/rerouter/inspect-models';
import { validateProxyRequestSecurity } from '@/lib/rerouter/security';
import type { AuthFormat } from '@/lib/rerouter/types';

export async function GET(request: NextRequest) {
  await connection();
  const securityViolation = validateProxyRequestSecurity(request);
  if (securityViolation) {
    return securityViolation;
  }

  const userApiKey = extractUserApiKeyFromHeaders(request.headers);
  const headerAuth = request.headers.get(USER_AUTH_FORMAT_HEADER);
  const authParam = headerAuth || request.nextUrl.searchParams.get('authFormat');
  const authFormat: AuthFormat =
    authParam === 'x-api-key' ||
    authParam === 'none' ||
    authParam === 'invalid-dummy'
      ? authParam
      : 'bearer';

  const configStatus = getPublicConfigStatus(Boolean(userApiKey));
  const testResult = await executeRerouterTest({
    endpointId: 'models',
    authFormat,
    userApiKey,
  });

  const catalogAnalysis =
    testResult.isJsonResponse && testResult.parsedResponseBody
      ? analyzeModelCatalog(testResult.parsedResponseBody)
      : null;

  return NextResponse.json(
    {
      configStatus,
      testResult,
      catalogAnalysis,
    },
    {
      headers: STANDARD_SECURITY_HEADERS,
    }
  );
}
