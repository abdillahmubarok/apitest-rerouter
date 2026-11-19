'use client';

import React from 'react';
import {
  OFFICIAL_BILLING_URL,
  useRerouterSession,
} from '@/context/RerouterSessionContext';

export function BillingRedirectModal() {
  const { billingAlert, dismissBillingAlert } = useRerouterSession();

  if (!billingAlert) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="rerouter-billing-redirect-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-amber-700 bg-slate-900 shadow-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 text-lg font-bold shrink-0">
              💳
            </div>
            <div>
              <h3
                id="rerouter-billing-redirect-title"
                className="text-base font-bold text-white"
              >
                Insufficient ReRouter Credit Balance (HTTP{' '}
                {billingAlert.httpStatus})
              </h3>
              <p className="text-xs text-amber-300 font-mono">
                Authoritative empty-balance or credit-limit signal received
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs font-mono">
          <div className="text-slate-400">
            Endpoint:{' '}
            <span className="text-sky-400 break-all">
              {billingAlert.endpointUrl}
            </span>
          </div>
          <div className="text-slate-400">
            Upstream Message:{' '}
            <span className="text-amber-200">
              {billingAlert.readableMessage}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          ReRouter returned an authoritative{' '}
          <code className="font-mono text-amber-300">
            HTTP {billingAlert.httpStatus} Payment Required
          </code>{' '}
          response indicating that your account has no available balance or your
          API key has reached its configured credit limit. Redirecting you to
          the official ReRouter Billing portal (no API key or request data is
          included in the redirect URL).
        </p>

        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={dismissBillingAlert}
            className="px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            Stay on Playground
          </button>
          <a
            href={OFFICIAL_BILLING_URL}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
          >
            Go to ReRouter Billing Now →
          </a>
        </div>
      </div>
    </div>
  );
}
