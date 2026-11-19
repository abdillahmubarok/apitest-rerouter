'use client';

import React, { useState } from 'react';
import {
  OFFICIAL_BILLING_URL,
  OFFICIAL_DOCS_URL,
  useRerouterSession,
} from '@/context/RerouterSessionContext';
import type { UserAuthFormat } from '@/lib/rerouter/types';

export function ConnectionModal() {
  const {
    isConnected,
    authFormat,
    connectionState,
    connectionMessage,
    setAuthFormat,
    testAndConnect,
  } = useRerouterSession();

  const [keyInput, setKeyInput] = useState<string>('');
  const [selectedFormat, setSelectedFormat] =
    useState<UserAuthFormat>(authFormat);
  const [showKey, setShowKey] = useState<boolean>(false);

  if (isConnected) {
    return null;
  }

  const isConnecting = connectionState === 'CONNECTING';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isConnecting) return;
    setAuthFormat(selectedFormat);
    const result = await testAndConnect(keyInput, selectedFormat);
    if (result.ok) {
      // Clear local modal input buffer once key is transferred into session state
      setKeyInput('');
      setShowKey(false);
    }
  };

  const stateBadge = () => {
    switch (connectionState) {
      case 'CONNECTING':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-700 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
            CONNECTING
          </span>
        );
      case 'INVALID_API_KEY':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-rose-950 text-rose-300 border border-rose-700">
            INVALID_API_KEY
          </span>
        );
      case 'BALANCE_EMPTY':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-amber-950 text-amber-300 border border-amber-700">
            BALANCE_EMPTY (HTTP 402)
          </span>
        );
      case 'RE_ROUTER_UNAVAILABLE':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-amber-950 text-amber-300 border border-amber-700">
            RE_ROUTER_UNAVAILABLE
          </span>
        );
      case 'CONNECTION_ERROR':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-rose-950 text-rose-300 border border-rose-700">
            CONNECTION_ERROR
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-slate-900 text-slate-400 border border-slate-800">
            NOT_CONNECTED
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rerouter-connection-modal-title"
    >
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl shadow-indigo-950/40 overflow-hidden my-auto">
        {/* Top Accent Banner */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500" />

        <div className="p-6 sm:p-7 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-indigo-600 flex items-center justify-center font-mono font-bold text-base text-white shadow-lg shadow-indigo-600/30 shrink-0">
                RR
              </div>
              <div>
                <h2
                  id="rerouter-connection-modal-title"
                  className="text-lg sm:text-xl font-bold tracking-tight text-white"
                >
                  ReRouter API Playground
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                  Connect your ReRouter account to start testing APIs.
                </p>
              </div>
            </div>
            {stateBadge()}
          </div>

          {/* Connection Form */}
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            {/* API Key Password Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="rerouter-byok-key-input"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-300"
                >
                  Your ReRouter API Key (BYOK)
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  Target: https://rerouter.mubarokah.com/v1
                </span>
              </div>

              <div className="relative flex items-center">
                <input
                  id="rerouter-byok-key-input"
                  name="rerouter-byok-session-key"
                  type={showKey ? 'text' : 'password'}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  disabled={isConnecting}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  placeholder="Enter your ReRouter API key (e.g. sk-...)..."
                  className="w-full pr-20 pl-3.5 py-2.5 text-xs sm:text-sm font-mono rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((prev) => !prev)}
                  disabled={isConnecting}
                  aria-label={showKey ? 'Hide API key' : 'Show API key'}
                  className="absolute right-2 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Authentication Format Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                Authentication Header Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isConnecting}
                  onClick={() => setSelectedFormat('bearer')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedFormat === 'bearer'
                      ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">
                      1. Bearer Authentication
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-200">
                      Default
                    </span>
                  </div>
                  <code className="block text-[11px] font-mono text-sky-400 mt-1.5 truncate">
                    Authorization: Bearer YOUR_API_KEY
                  </code>
                </button>

                <button
                  type="button"
                  disabled={isConnecting}
                  onClick={() => setSelectedFormat('x-api-key')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedFormat === 'x-api-key'
                      ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">
                      2. Anthropic-Compatible
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      Header
                    </span>
                  </div>
                  <code className="block text-[11px] font-mono text-purple-300 mt-1.5 truncate">
                    x-api-key: YOUR_API_KEY
                  </code>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Both formats are supported by ReRouter. Endpoint-specific
                authentication headers can also be toggled inside individual
                testing panels.
              </p>
            </div>

            {/* Validation Feedback Box */}
            {connectionMessage && (
              <div
                className={`rounded-xl p-3.5 text-xs font-mono border space-y-2 ${
                  connectionState === 'INVALID_API_KEY' ||
                  connectionState === 'CONNECTION_ERROR'
                    ? 'bg-rose-950/60 border-rose-800 text-rose-200'
                    : connectionState === 'BALANCE_EMPTY' ||
                        connectionState === 'RE_ROUTER_UNAVAILABLE'
                      ? 'bg-amber-950/60 border-amber-700 text-amber-200'
                      : 'bg-slate-950/90 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="font-bold shrink-0">
                    {connectionState === 'INVALID_API_KEY' ||
                    connectionState === 'CONNECTION_ERROR'
                      ? '✕'
                      : connectionState === 'BALANCE_EMPTY'
                        ? '⚠'
                        : 'ℹ'}
                  </span>
                  <span className="leading-relaxed break-words">
                    {connectionMessage}
                  </span>
                </div>
                {connectionState === 'BALANCE_EMPTY' && (
                  <div className="pt-1">
                    <a
                      href={OFFICIAL_BILLING_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-sans font-semibold text-xs transition-colors"
                    >
                      Open ReRouter Billing Page →
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Primary Button & Secondary Links */}
            <div className="space-y-3 pt-1">
              <button
                type="submit"
                disabled={isConnecting || !keyInput.trim()}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <span className="h-2.5 w-2.5 rounded-full bg-white animate-ping" />
                    <span>
                      Testing Connection (Non-Billable Token Count Check)...
                    </span>
                  </>
                ) : (
                  <span>Test Connection</span>
                )}
              </button>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <a
                  href={OFFICIAL_DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-sky-400 border border-slate-800 transition-colors font-medium"
                >
                  <span>📖 Documentation</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    rerouter.mubarokah.com/docs ↗
                  </span>
                </a>

                <a
                  href={OFFICIAL_BILLING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 transition-colors font-medium"
                >
                  <span>💳 Get API Key / Billing</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    rerouter.mubarokah.com/billing ↗
                  </span>
                </a>
              </div>
            </div>
          </form>

          {/* Privacy & Session Architecture Notice */}
          <div className="rounded-xl bg-slate-950/90 border border-slate-800/90 p-3.5 space-y-2 text-[11px] text-slate-300 leading-relaxed">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 uppercase tracking-wider text-[10px] font-mono">
                🔒 BYOK Privacy & Session Architecture Notice
              </span>
              <span className="text-[10px] font-mono text-teal-400">
                No Database · In-Memory Only
              </span>
            </div>
            <ul className="space-y-1 text-slate-400 list-disc list-inside">
              <li>
                You supply your own ReRouter API key. This platform does{' '}
                <strong className="text-slate-200">not</strong> use a database or
                user account system.
              </li>
              <li>
                Your API key remains strictly in React browser application
                memory during your active page session and is{' '}
                <strong className="text-slate-200">never</strong> intentionally
                written to persistent browser web storage, IndexedDB, or
                cookies.
              </li>
              <li>
                For each test you trigger, your key is sent in request headers
                to this platform&apos;s server-side proxy solely to forward the
                request to{' '}
                <code className="font-mono text-sky-400">
                  https://rerouter.mubarokah.com/v1
                </code>{' '}
                without server logging or persistence.
              </li>
              <li>
                Refreshing or closing this browser tab clears your in-memory
                session and requires connecting again.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
