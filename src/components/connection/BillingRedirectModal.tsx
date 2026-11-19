'use client';

import React from 'react';
import { AlertTriangle, CreditCard, ExternalLink } from 'lucide-react';
import { RerouterLogo } from '@/components/brand/RerouterLogo';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { HttpStatusBadge } from '@/components/ui/http-badge';
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
    <AlertDialog open={Boolean(billingAlert)}>
      <AlertDialogContent>
        <AlertDialogHeader className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <RerouterLogo size="sm" />
            <HttpStatusBadge
              status={billingAlert.httpStatus}
              statusText="Payment Required"
            />
          </div>
          <AlertDialogTitle className="flex items-center gap-2 text-base pt-1">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Insufficient ReRouter Credit Balance (HTTP{' '}
              {billingAlert.httpStatus})
            </span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            Authoritative empty-balance or credit-limit signal received from
            upstream API gateway.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-md border border-border bg-muted/40 p-3 space-y-1.5 font-mono text-xs">
          <div className="text-muted-foreground">
            Endpoint:{' '}
            <span className="text-foreground break-all">
              {billingAlert.endpointUrl}
            </span>
          </div>
          <div className="text-muted-foreground">
            Upstream Message:{' '}
            <span className="text-amber-700 dark:text-amber-300">
              {billingAlert.readableMessage}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          ReRouter returned an authoritative{' '}
          <code className="font-mono text-foreground">
            HTTP {billingAlert.httpStatus} Payment Required
          </code>{' '}
          response indicating that your account has no available balance or your
          API key has reached its configured credit limit. Redirecting to the
          official ReRouter Billing portal (no API key or request payload is
          included in the redirect URL).
        </p>

        <AlertDialogFooter>
          <Button variant="outline" size="sm" onClick={dismissBillingAlert}>
            Stay on Playground
          </Button>
          <Button asChild size="sm">
            <a href={OFFICIAL_BILLING_URL}>
              <CreditCard className="h-3.5 w-3.5" />
              <span>Go to ReRouter Billing Now</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
