import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import { executeRerouterTest } from '@/lib/rerouter/client';
import { getPublicConfigStatus } from '@/lib/rerouter/config';
import { analyzeModelCatalog } from '@/lib/rerouter/inspect-models';
import {
  DEFAULT_PRIVACY_QUESTIONS,
  generatePrivacyQuestionsMarkdown,
  generateTestReportMarkdown,
} from '@/lib/rerouter/report';
import type { EndpointId, TestExecutionResult } from '@/lib/rerouter/types';

export async function GET() {
  await connection();
  const configStatus = getPublicConfigStatus();

  const modelsResult = await executeRerouterTest({
    endpointId: 'models',
    authFormat: 'bearer',
  });

  const catalogAnalysis =
    modelsResult.isJsonResponse && modelsResult.parsedResponseBody
      ? analyzeModelCatalog(modelsResult.parsedResponseBody)
      : null;

  const safeTestIds: EndpointId[] = [
    'count-tokens-v1',
    'count-tokens-root',
    'error-missing-key',
    'error-invalid-key',
    'error-invalid-request',
    'error-unknown-model',
    'error-anthropic-missing-key',
    'error-anthropic-invalid-key',
    'error-anthropic-invalid-request',
    'error-anthropic-unknown-model',
  ];

  const results: TestExecutionResult[] = [modelsResult];
  for (const id of safeTestIds) {
    const r = await executeRerouterTest({
      endpointId: id,
      catalogAnalysis,
    });
    results.push(r);
  }

  const testReportMarkdown = generateTestReportMarkdown({
    configStatus,
    activeAuthFormat: 'bearer',
    catalogAnalysis,
    testResults: results,
    privacyQuestions: DEFAULT_PRIVACY_QUESTIONS,
  });

  const privacyMarkdown = generatePrivacyQuestionsMarkdown(
    DEFAULT_PRIVACY_QUESTIONS,
    configStatus.timestamp
  );

  return NextResponse.json(
    {
      configStatus,
      testReportMarkdown,
      privacyMarkdown,
      testResultsCount: results.length,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
