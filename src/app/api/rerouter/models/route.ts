import { NextRequest, NextResponse } from 'next/server';
import { connection } from 'next/server';
import { executeRerouterTest } from '@/lib/rerouter/client';
import { getPublicConfigStatus } from '@/lib/rerouter/config';
import { analyzeModelCatalog } from '@/lib/rerouter/inspect-models';
import type { AuthFormat } from '@/lib/rerouter/types';

export async function GET(request: NextRequest) {
  await connection();

  const authParam = request.nextUrl.searchParams.get('authFormat');
  const authFormat: AuthFormat =
    authParam === 'x-api-key' ||
    authParam === 'none' ||
    authParam === 'invalid-dummy'
      ? authParam
      : 'bearer';

  const configStatus = getPublicConfigStatus();
  const testResult = await executeRerouterTest({
    endpointId: 'models',
    authFormat,
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
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
