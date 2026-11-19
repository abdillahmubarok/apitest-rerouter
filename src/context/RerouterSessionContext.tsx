'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  OFFICIAL_BILLING_URL,
  OFFICIAL_DOCS_URL,
  USER_AUTH_FORMAT_HEADER,
  USER_KEY_PROXY_HEADER,
} from '@/lib/rerouter/config';
import type {
  BalanceState,
  ConnectionState,
  ConnectionVerificationResponse,
  TestExecutionResult,
  UserAuthFormat,
} from '@/lib/rerouter/types';

export interface BillingRedirectAlert {
  triggeredAt: string;
  httpStatus: number;
  endpointUrl: string;
  readableMessage: string;
  billingUrl: string;
}

export interface RerouterSessionContextValue {
  /** Strictly in-memory API key. Never persisted to storage or displayed in UI. */
  apiKey: string | null;
  isConnected: boolean;
  authFormat: UserAuthFormat;
  connectionState: ConnectionState;
  balanceState: BalanceState;
  connectionMessage: string | null;
  balanceNote: string;
  lastVerifiedAt: string | null;
  lastVerificationResult: TestExecutionResult | null;
  sessionEpoch: number;
  billingAlert: BillingRedirectAlert | null;
  setAuthFormat: (format: UserAuthFormat) => void;
  testAndConnect: (
    candidateKey: string,
    selectedFormat: UserAuthFormat
  ) => Promise<ConnectionVerificationResponse>;
  disconnect: (reasonMessage?: string) => void;
  handleUnauthorized401: (endpointLabel: string, readableMsg: string) => void;
  handleAuthoritativeInsufficientBalance: (
    httpStatus: number,
    endpointUrl: string,
    readableMessage: string
  ) => void;
  dismissBillingAlert: () => void;
  buildProxyAuthHeaders: (
    overrideFormat?: UserAuthFormat
  ) => Record<string, string>;
}

const DEFAULT_BALANCE_NOTE =
  'UNKNOWN / NOT AVAILABLE — ReRouter does not provide a dedicated account balance endpoint. Balance status is monitored passively via authoritative HTTP 402 responses.';

const RerouterSessionContext =
  createContext<RerouterSessionContextValue | null>(null);

export function RerouterSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Strictly React in-memory state — never read from or written to persistent browser storage or cookies
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [authFormat, setAuthFormatState] = useState<UserAuthFormat>('bearer');
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('NOT_CONNECTED');
  const [balanceState, setBalanceState] =
    useState<BalanceState>('BALANCE_UNKNOWN');
  const [connectionMessage, setConnectionMessage] = useState<string | null>(
    null
  );
  const [balanceNote, setBalanceNote] = useState<string>(DEFAULT_BALANCE_NOTE);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string | null>(null);
  const [lastVerificationResult, setLastVerificationResult] =
    useState<TestExecutionResult | null>(null);
  const [sessionEpoch, setSessionEpoch] = useState<number>(1);
  const [billingAlert, setBillingAlert] = useState<BillingRedirectAlert | null>(
    null
  );

  const handleAuthoritativeInsufficientBalance = useCallback(
    (httpStatus: number, endpointUrl: string, readableMessage: string) => {
      setBalanceState('BALANCE_EMPTY');
      setConnectionState('BALANCE_EMPTY');
      setBalanceNote(
        `EMPTY / EXHAUSTED — Authoritative HTTP ${httpStatus} insufficient-credit response received from ReRouter.`
      );
      setBillingAlert({
        triggeredAt: new Date().toISOString(),
        httpStatus,
        endpointUrl,
        readableMessage,
        billingUrl: OFFICIAL_BILLING_URL,
      });

      // Automatically redirect to the official ReRouter billing portal after a short explanation delay
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          window.location.assign(OFFICIAL_BILLING_URL);
        }, 2800);
      }
    },
    []
  );

  const testAndConnect = useCallback(
    async (
      candidateKey: string,
      selectedFormat: UserAuthFormat
    ): Promise<ConnectionVerificationResponse> => {
      const trimmed = candidateKey.trim();
      setAuthFormatState(selectedFormat);

      if (!trimmed) {
        setConnectionState('INVALID_API_KEY');
        setConnectionMessage('Please enter your ReRouter API key to connect.');
        return {
          ok: false,
          connectionState: 'INVALID_API_KEY',
          balanceState: 'BALANCE_UNKNOWN',
          authFormatVerified: selectedFormat,
          httpStatus: 401,
          durationMs: 0,
          endpointTested:
            'https://rerouter.mubarokah.com/v1/messages/count_tokens',
          message: 'Please enter your ReRouter API key to connect.',
          balanceNote: DEFAULT_BALANCE_NOTE,
          shouldRedirectToBilling: false,
          billingUrl: OFFICIAL_BILLING_URL,
        };
      }

      setConnectionState('CONNECTING');
      setConnectionMessage(
        'Validating API key via non-billable POST /v1/messages/count_tokens...'
      );

      try {
        const res = await fetch('/api/rerouter/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [USER_KEY_PROXY_HEADER]: trimmed,
            [USER_AUTH_FORMAT_HEADER]: selectedFormat,
          },
          body: JSON.stringify({ authFormat: selectedFormat }),
          cache: 'no-store',
        });

        const data = (await res.json()) as ConnectionVerificationResponse;

        setConnectionState(data.connectionState);
        setBalanceState(data.balanceState);
        setConnectionMessage(data.message);
        setBalanceNote(data.balanceNote || DEFAULT_BALANCE_NOTE);

        if (data.verificationResult) {
          setLastVerificationResult(data.verificationResult);
        }

        if (data.ok && data.connectionState === 'CONNECTED') {
          setApiKey(trimmed);
          setLastVerifiedAt(new Date().toISOString());
        } else {
          setApiKey(null);
          setLastVerifiedAt(null);
        }

        if (
          data.shouldRedirectToBilling ||
          data.connectionState === 'BALANCE_EMPTY' ||
          data.httpStatus === 402
        ) {
          handleAuthoritativeInsufficientBalance(
            data.httpStatus || 402,
            data.endpointTested,
            data.message
          );
        }

        return data;
      } catch (err) {
        const msg =
          err instanceof Error
            ? `Unable to reach verification proxy: ${err.message}`
            : 'Unable to reach verification proxy.';
        setApiKey(null);
        setConnectionState('CONNECTION_ERROR');
        setConnectionMessage(msg);
        return {
          ok: false,
          connectionState: 'CONNECTION_ERROR',
          balanceState: 'BALANCE_UNKNOWN',
          authFormatVerified: selectedFormat,
          httpStatus: 0,
          durationMs: 0,
          endpointTested:
            'https://rerouter.mubarokah.com/v1/messages/count_tokens',
          message: msg,
          balanceNote: DEFAULT_BALANCE_NOTE,
          shouldRedirectToBilling: false,
          billingUrl: OFFICIAL_BILLING_URL,
        };
      }
    },
    [handleAuthoritativeInsufficientBalance]
  );

  const disconnect = useCallback((reasonMessage?: string) => {
    setApiKey(null);
    setConnectionState('NOT_CONNECTED');
    setBalanceState('BALANCE_UNKNOWN');
    setBalanceNote(DEFAULT_BALANCE_NOTE);
    setLastVerifiedAt(null);
    setLastVerificationResult(null);
    setBillingAlert(null);
    setConnectionMessage(
      reasonMessage ??
        'Disconnected. Your in-memory API key and session test history have been cleared.'
    );
    setSessionEpoch((prev) => prev + 1);
  }, []);

  const handleUnauthorized401 = useCallback(
    (endpointLabel: string, readableMsg: string) => {
      setApiKey(null);
      setConnectionState('INVALID_API_KEY');
      setLastVerifiedAt(null);
      setConnectionMessage(
        `Session disconnected: ${endpointLabel} returned HTTP 401 (${readableMsg}). Please verify or reconnect your ReRouter API key.`
      );
    },
    []
  );

  const dismissBillingAlert = useCallback(() => {
    setBillingAlert(null);
  }, []);

  const buildProxyAuthHeaders = useCallback(
    (overrideFormat?: UserAuthFormat): Record<string, string> => {
      const headers: Record<string, string> = {
        [USER_AUTH_FORMAT_HEADER]: overrideFormat ?? authFormat,
      };
      if (apiKey) {
        headers[USER_KEY_PROXY_HEADER] = apiKey;
      }
      return headers;
    },
    [apiKey, authFormat]
  );

  const isConnected =
    connectionState === 'CONNECTED' && Boolean(apiKey && apiKey.length > 0);

  const value = useMemo<RerouterSessionContextValue>(
    () => ({
      apiKey,
      isConnected,
      authFormat,
      connectionState,
      balanceState,
      connectionMessage,
      balanceNote,
      lastVerifiedAt,
      lastVerificationResult,
      sessionEpoch,
      billingAlert,
      setAuthFormat: setAuthFormatState,
      testAndConnect,
      disconnect,
      handleUnauthorized401,
      handleAuthoritativeInsufficientBalance,
      dismissBillingAlert,
      buildProxyAuthHeaders,
    }),
    [
      apiKey,
      isConnected,
      authFormat,
      connectionState,
      balanceState,
      connectionMessage,
      balanceNote,
      lastVerifiedAt,
      lastVerificationResult,
      sessionEpoch,
      billingAlert,
      testAndConnect,
      disconnect,
      handleUnauthorized401,
      handleAuthoritativeInsufficientBalance,
      dismissBillingAlert,
      buildProxyAuthHeaders,
    ]
  );

  return (
    <RerouterSessionContext.Provider value={value}>
      {children}
    </RerouterSessionContext.Provider>
  );
}

export function useRerouterSession(): RerouterSessionContextValue {
  const ctx = useContext(RerouterSessionContext);
  if (!ctx) {
    throw new Error(
      'useRerouterSession must be used within a RerouterSessionProvider'
    );
  }
  return ctx;
}

export { OFFICIAL_BILLING_URL, OFFICIAL_DOCS_URL };
