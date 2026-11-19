'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { RerouterLogo } from '@/components/brand/RerouterLogo';
import { SEO_CONFIG } from '@/config/seo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
      setKeyInput('');
      setShowKey(false);
    }
  };

  const renderStateBadge = () => {
    switch (connectionState) {
      case 'CONNECTING':
        return (
          <Badge variant="info" className="gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            CONNECTING
          </Badge>
        );
      case 'INVALID_API_KEY':
        return <Badge variant="destructive">INVALID_API_KEY</Badge>;
      case 'BALANCE_EMPTY':
        return <Badge variant="warning">BALANCE_EMPTY (402)</Badge>;
      case 'RE_ROUTER_UNAVAILABLE':
        return <Badge variant="warning">RE_ROUTER_UNAVAILABLE</Badge>;
      case 'CONNECTION_ERROR':
        return <Badge variant="destructive">CONNECTION_ERROR</Badge>;
      default:
        return <Badge variant="secondary">NOT_CONNECTED</Badge>;
    }
  };

  const feedbackVariant =
    connectionState === 'INVALID_API_KEY' ||
    connectionState === 'CONNECTION_ERROR'
      ? 'destructive'
      : connectionState === 'BALANCE_EMPTY' ||
          connectionState === 'RE_ROUTER_UNAVAILABLE'
        ? 'warning'
        : 'default';

  return (
    <Dialog open={!isConnected}>
      <DialogContent
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="max-w-lg p-0 overflow-hidden"
      >
        <div className="p-5 space-y-4">
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <RerouterLogo
                size="lg"
                subtitle={SEO_CONFIG.branding.modalSubtitle}
              />
              {renderStateBadge()}
            </div>
            <DialogTitle className="text-sm font-semibold pt-1">
              Connect Your ReRouter API Key
            </DialogTitle>
            <DialogDescription className="text-xs">
              Authenticate against{' '}
              <code className="font-mono text-foreground">
                https://rerouter.mubarokah.com/v1
              </code>{' '}
              to inspect live endpoints, model schemas, and SSE streams.
            </DialogDescription>
          </DialogHeader>

          <Separator />

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* API Key Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="rerouter-byok-key-input">
                  ReRouter API Key
                </Label>
                <span className="font-mono text-[11px] text-muted-foreground">
                  In-Memory Session Only
                </span>
              </div>
              <div className="relative flex items-center">
                <KeyRound className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
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
                  placeholder="sk-..."
                  className="h-9 pl-8 pr-16 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKey((prev) => !prev)}
                  disabled={isConnecting}
                  aria-label={showKey ? 'Hide API key' : 'Show API key'}
                  className="absolute right-1 h-7 px-2 text-[11px] font-mono text-muted-foreground hover:text-foreground"
                >
                  {showKey ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      <span>Show</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Authentication Header Format */}
            <div className="space-y-1.5">
              <Label htmlFor="rerouter-auth-format-select">
                Default Authentication Header Format
              </Label>
              <Select
                disabled={isConnecting}
                value={selectedFormat}
                onValueChange={(val) => setSelectedFormat(val as UserAuthFormat)}
              >
                <SelectTrigger
                  id="rerouter-auth-format-select"
                  className="h-9 font-mono text-xs"
                >
                  <SelectValue placeholder="Select authentication header format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bearer" className="font-mono text-xs">
                    Authorization: Bearer YOUR_API_KEY (Default / OpenAI)
                  </SelectItem>
                  <SelectItem value="x-api-key" className="font-mono text-xs">
                    x-api-key: YOUR_API_KEY (Anthropic-Compatible)
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={isConnecting}
                  onClick={() => setSelectedFormat('bearer')}
                  className={`rounded-md border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                    selectedFormat === 'bearer'
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-medium text-foreground">
                    <span>Bearer Header</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      Default
                    </Badge>
                  </div>
                  <code className="mt-1 block truncate font-mono text-[10px] text-muted-foreground">
                    Authorization: Bearer ...
                  </code>
                </button>
                <button
                  type="button"
                  disabled={isConnecting}
                  onClick={() => setSelectedFormat('x-api-key')}
                  className={`rounded-md border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                    selectedFormat === 'x-api-key'
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-medium text-foreground">
                    <span>Anthropic Header</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      x-api-key
                    </Badge>
                  </div>
                  <code className="mt-1 block truncate font-mono text-[10px] text-muted-foreground">
                    x-api-key: ...
                  </code>
                </button>
              </div>
            </div>

            {/* Validation Feedback Alert */}
            {connectionMessage && (
              <Alert variant={feedbackVariant}>
                {feedbackVariant === 'destructive' ? (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                ) : feedbackVariant === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <div className="space-y-2 flex-1 min-w-0">
                  <AlertTitle className="font-mono text-xs">
                    {connectionState}
                  </AlertTitle>
                  <AlertDescription className="font-mono text-[11px] break-words">
                    {connectionMessage}
                  </AlertDescription>
                  {connectionState === 'BALANCE_EMPTY' && (
                    <div className="pt-1">
                      <Button asChild size="sm" variant="outline">
                        <a
                          href={OFFICIAL_BILLING_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>Open ReRouter Billing</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </Alert>
            )}

            {/* Primary Action & External Links */}
            <div className="space-y-2.5 pt-1">
              <Button
                type="submit"
                size="lg"
                disabled={isConnecting || !keyInput.trim()}
                className="w-full font-medium"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                      Verifying Key (Non-Billable Token Count Check)...
                    </span>
                  </>
                ) : (
                  <span>Test Connection & Enter Playground</span>
                )}
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <a
                    href={OFFICIAL_DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Documentation</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <a
                    href={OFFICIAL_BILLING_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Get Key / Billing</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                  </a>
                </Button>
              </div>
            </div>
          </form>

          <Separator />

          {/* BYOK Privacy & Session Architecture Notice */}
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2 text-[11px] text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                BYOK Privacy & Session Architecture
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                No DB · In-Memory
              </Badge>
            </div>
            <ul className="space-y-1 list-disc list-inside leading-relaxed">
              <li>
                Your API key is held exclusively in React browser memory during
                your active tab session—never stored in databases, cookies, or
                web storage.
              </li>
              <li>
                Each test forwards your key over same-origin request headers to
                the Next.js proxy solely to authenticate against{' '}
                <code className="font-mono text-foreground">
                  rerouter.mubarokah.com/v1
                </code>{' '}
                without server logging.
              </li>
              <li>
                Disconnecting or refreshing this tab immediately purges your key
                and session history from memory.
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
