import { NextRequest, NextResponse } from 'next/server';
import { connection } from 'next/server';
import { executeRerouterTest } from '@/lib/rerouter/client';
import {
  extractUserApiKeyFromHeaders,
  getPublicConfigStatus,
  redactSecretString,
  STANDARD_SECURITY_HEADERS,
  USER_AUTH_FORMAT_HEADER,
} from '@/lib/rerouter/config';
import { analyzeModelCatalog } from '@/lib/rerouter/inspect-models';
import {
  DEFAULT_PRIVACY_QUESTIONS,
  generatePrivacyQuestionsMarkdown,
  generateTestReportMarkdown,
} from '@/lib/rerouter/report';
import { validateProxyRequestSecurity } from '@/lib/rerouter/security';
import type {
  AuthFormat,
  CatalogAnalysis,
  EndpointId,
  TestExecutionResult,
} from '@/lib/rerouter/types';

/**
 * Generates redacted session reports strictly for the individual visitor request.
 * Never persists reports to server disk and never uses a shared server API key.
 */
export async function GET(request: NextRequest) {
  await connection();
  const securityViolation = validateProxyRequestSecurity(request);
  if (securityViolation) {
    return securityViolation;
  }

  const userApiKey = extractUserApiKeyFromHeaders(request.headers);
  const headerAuth = request.headers.get(USER_AUTH_FORMAT_HEADER);
  const activeAuthFormat: AuthFormat =
    headerAuth === 'x-api-key' ? 'x-api-key' : 'bearer';

  const configStatus = getPublicConfigStatus(Boolean(userApiKey));

  const modelsResult = await executeRerouterTest({
    endpointId: 'models',
    authFormat: activeAuthFormat,
    userApiKey,
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
      userApiKey,
      catalogAnalysis,
    });
    results.push(r);
  }

  const testReportMarkdown = redactSecretString(
    generateTestReportMarkdown({
      configStatus,
      activeAuthFormat,
      catalogAnalysis,
      testResults: results,
      privacyQuestions: DEFAULT_PRIVACY_QUESTIONS,
    }),
    userApiKey
  );

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
      headers: STANDARD_SECURITY_HEADERS,
    }
  );
}

export async function POST(request: NextRequest) {
  const securityViolation = validateProxyRequestSecurity(request);
  if (securityViolation) {
    return securityViolation;
  }

  const userApiKey = extractUserApiKeyFromHeaders(request.headers);
  const configStatus = getPublicConfigStatus(Boolean(userApiKey));

  try {
    const body = (await request.json()) as {
      activeAuthFormat?: AuthFormat;
      catalogAnalysis?: CatalogAnalysis | null;
      testResults?: TestExecutionResult[];
    };

    const activeAuthFormat: AuthFormat =
      body.activeAuthFormat === 'x-api-key' ? 'x-api-key' : 'bearer';
    const catalogAnalysis = body.catalogAnalysis ?? null;
    const testResults = Array.isArray(body.testResults) ? body.testResults : [];

    const testReportMarkdown = redactSecretString(
      generateTestReportMarkdown({
        configStatus,
        activeAuthFormat,
        catalogAnalysis,
        testResults,
        privacyQuestions: DEFAULT_PRIVACY_QUESTIONS,
      }),
      userApiKey
    );

    const privacyMarkdown = generatePrivacyQuestionsMarkdown(
      DEFAULT_PRIVACY_QUESTIONS,
      configStatus.timestamp
    );

    return NextResponse.json(
      {
        configStatus,
        testReportMarkdown,
        privacyMarkdown,
        testResultsCount: testResults.length,
      },
      {
        headers: STANDARD_SECURITY_HEADERS,
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: redactSecretString(
          err instanceof Error
            ? `Failed to generate export report: ${err.message}`
            : 'Failed to generate export report',
          userApiKey
        ),
      },
      {
        status: 400,
        headers: STANDARD_SECURITY_HEADERS,
      }
    );
  }
}
