'use client';

import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileCode2,
  Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { inspectJsonRecursively } from '@/lib/rerouter/inspect-models';
import type { JsonFieldEntry } from '@/lib/rerouter/types';

interface JsonViewerProps {
  title?: string;
  data?: unknown;
  rawText?: string;
  recursiveFields?: JsonFieldEntry[];
  defaultTab?: 'json' | 'raw' | 'paths';
  maxHeightClass?: string;
}

function syntaxHighlightJson(jsonStr: string): React.ReactNode[] {
  const lines = jsonStr.split('\n');
  return lines.map((line, idx) => {
    const keyMatch = line.match(/^(\s*)"([^"]+)":\s*(.*)$/);
    if (keyMatch) {
      const [, indent, key, rest] = keyMatch;
      return (
        <div key={idx} className="leading-relaxed">
          <span>{indent}</span>
          <span className="text-sky-700 dark:text-sky-400">&quot;{key}&quot;</span>
          <span className="text-muted-foreground">: </span>
          {highlightValuePart(rest)}
        </div>
      );
    }
    return (
      <div key={idx} className="leading-relaxed">
        {highlightValuePart(line)}
      </div>
    );
  });
}

function highlightValuePart(part: string): React.ReactNode {
  const trimmed = part.trim();
  const hasComma = trimmed.endsWith(',');
  const core = hasComma ? trimmed.slice(0, -1) : trimmed;
  const leadingSpaces = part.match(/^\s*/)?.[0] ?? '';

  let colorClass = 'text-foreground';
  if (core.startsWith('"') && core.endsWith('"')) {
    colorClass = 'text-emerald-700 dark:text-emerald-400';
  } else if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(core)) {
    colorClass = 'text-amber-700 dark:text-amber-300';
  } else if (core === 'true' || core === 'false') {
    colorClass = 'text-purple-700 dark:text-purple-400 font-semibold';
  } else if (core === 'null') {
    colorClass = 'text-rose-700 dark:text-rose-400 italic';
  } else if (
    core === '{' ||
    core === '}' ||
    core === '[' ||
    core === ']' ||
    core === '{}' ||
    core === '[]'
  ) {
    colorClass = 'text-muted-foreground';
  }

  return (
    <>
      <span>{leadingSpaces}</span>
      <span className={colorClass}>{core}</span>
      {hasComma && <span className="text-muted-foreground">,</span>}
    </>
  );
}

export function JsonViewer({
  title = 'Response Viewer',
  data,
  rawText,
  recursiveFields,
  defaultTab = 'json',
  maxHeightClass = 'max-h-[520px]',
}: JsonViewerProps) {
  const hasParsedJson = data !== undefined && data !== null;
  const [activeTab, setActiveTab] = useState<'json' | 'raw' | 'paths'>(
    hasParsedJson ? defaultTab : 'raw'
  );
  const [copied, setCopied] = useState(false);
  const [pathFilter, setPathFilter] = useState('');
  const [expanded, setExpanded] = useState(true);

  const formattedJson = useMemo(() => {
    if (!hasParsedJson) return '';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data, hasParsedJson]);

  const computedFields = useMemo(() => {
    if (recursiveFields && recursiveFields.length > 0) return recursiveFields;
    if (!hasParsedJson) return [];
    return inspectJsonRecursively(data, '', 2500);
  }, [recursiveFields, data, hasParsedJson]);

  const filteredFields = useMemo(() => {
    if (!pathFilter.trim()) return computedFields;
    const q = pathFilter.toLowerCase();
    return computedFields.filter(
      (f) =>
        f.path.toLowerCase().includes(q) ||
        f.fieldName.toLowerCase().includes(q) ||
        f.formattedValue.toLowerCase().includes(q) ||
        f.dataType.toLowerCase().includes(q)
    );
  }, [computedFields, pathFilter]);

  const handleCopy = async () => {
    const textToCopy =
      activeTab === 'raw' && rawText !== undefined
        ? rawText
        : formattedJson || rawText || '';
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <Collapsible
      open={expanded}
      onOpenChange={setExpanded}
      className="rounded-md border border-border bg-card overflow-hidden"
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'json' | 'raw' | 'paths')}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-muted/40 border-b border-border">
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                aria-label={expanded ? 'Collapse JSON viewer' : 'Expand JSON viewer'}
              >
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
            <FileCode2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">{title}</span>
            {computedFields.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {computedFields.length} paths
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <TabsList>
              {hasParsedJson && (
                <TabsTrigger value="json">Formatted JSON</TabsTrigger>
              )}
              {rawText !== undefined && (
                <TabsTrigger value="raw">
                  Raw ({rawText.length} chars)
                </TabsTrigger>
              )}
              {hasParsedJson && (
                <TabsTrigger value="paths">Field Paths</TabsTrigger>
              )}
            </TabsList>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          {hasParsedJson && (
            <TabsContent value="json" className="m-0">
              <div
                className={`p-3.5 overflow-auto font-mono text-xs bg-background/60 ${maxHeightClass}`}
              >
                {formattedJson.length < 40000 ? (
                  syntaxHighlightJson(formattedJson)
                ) : (
                  <pre className="text-foreground whitespace-pre-wrap break-all">
                    {formattedJson}
                  </pre>
                )}
              </div>
            </TabsContent>
          )}

          <TabsContent value="raw" className="m-0">
            <div
              className={`p-3.5 overflow-auto font-mono text-xs text-foreground bg-background/60 ${maxHeightClass}`}
            >
              <pre className="whitespace-pre-wrap break-all">
                {rawText || formattedJson || '(empty response body)'}
              </pre>
            </div>
          </TabsContent>

          {hasParsedJson && (
            <TabsContent value="paths" className="m-0">
              <div className="p-3 space-y-2.5 bg-background/40">
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="text"
                      value={pathFilter}
                      onChange={(e) => setPathFilter(e.target.value)}
                      placeholder="Filter by JSON path, field name, value, or type (e.g. data[0].pricing.prompt)..."
                      className="pl-8 font-mono text-xs"
                    />
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                    {Math.min(filteredFields.length, 400)} /{' '}
                    {filteredFields.length}
                  </span>
                </div>

                <div
                  className={`overflow-auto ${maxHeightClass} rounded-md border border-border bg-card`}
                >
                  <Table className="font-mono">
                    <TableHeader className="sticky top-0 bg-muted">
                      <TableRow>
                        <TableHead>Exact JSON Path</TableHead>
                        <TableHead>Field Name</TableHead>
                        <TableHead>Data Type</TableHead>
                        <TableHead>Actual Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFields.slice(0, 400).map((f, i) => (
                        <TableRow key={`${f.path}-${i}`}>
                          <TableCell className="text-sky-700 dark:text-sky-400 break-all">
                            {f.path}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {f.fieldName}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                f.dataType === 'string'
                                  ? 'success'
                                  : f.dataType === 'number'
                                    ? 'warning'
                                    : f.dataType === 'boolean'
                                      ? 'purple'
                                      : f.dataType === 'null'
                                        ? 'destructive'
                                        : 'secondary'
                              }
                              className="uppercase text-[10px] px-1.5 py-0"
                            >
                              {f.dataType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-foreground break-all max-w-md">
                            {f.formattedValue}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          )}
        </CollapsibleContent>
      </Tabs>
    </Collapsible>
  );
}
