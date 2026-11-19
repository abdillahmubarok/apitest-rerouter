import { NextRequest, NextResponse } from 'next/server';
import { executeRerouterTest } from '@/lib/rerouter/client';
import { getPublicConfigStatus } from '@/lib/rerouter/config';
import { isAllowedEndpointId } from '@/lib/rerouter/endpoints';
import type { AuthFormat } from '@/lib/rerouter/types';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const endpointId =
      typeof body.endpointId === 'string' ? body.endpointId : '';

    if (!isAllowedEndpointId(endpointId)) {
      return NextResponse.json(
        {
          error: `Disallowed endpointId: "${endpointId}". Generic proxying is prohibited; only explicitly defined ReRouter test endpoints are permitted.`,
        },
        { status: 400 }
      );
    }

    const rawAuth = body.authFormat;
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
    const dedicatedLowCreditKey =
      typeof body.dedicatedLowCreditKey === 'string'
        ? body.dedicatedLowCreditKey
        : null;

    if (
      endpointId === 'credit-limit-test' &&
      body.confirmLowCreditTest !== true
    ) {
      return NextResponse.json(
        {
          error:
            'CREDIT-LIMIT TEST is disabled by default. You must explicitly confirm that a dedicated low-credit test API key is being used.',
        },
        { status: 400 }
      );
    }

    const testResult = await executeRerouterTest({
      endpointId,
      authFormat,
      customBodyRaw,
      selectedModelId,
      dedicatedLowCreditKey,
    });

    const configStatus = getPublicConfigStatus();

    return NextResponse.json(
      {
        configStatus,
        testResult,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Failed to process test request: ${err.message}`
            : 'Failed to process test request',
      },
      { status: 500 }
    );
  }
}
