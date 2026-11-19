'use client';

import React, { useMemo, useState } from 'react';
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
          <span className="text-sky-400">&quot;{key}&quot;</span>
          <span className="text-slate-400">: </span>
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

  let colorClass = 'text-slate-200';
  if (core.startsWith('"') && core.endsWith('"')) {
    colorClass = 'text-emerald-400';
  } else if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(core)) {
    colorClass = 'text-amber-300';
  } else if (core === 'true' || core === 'false') {
    colorClass = 'text-purple-400 font-semibold';
  } else if (core === 'null') {
    colorClass = 'text-rose-400 italic';
  }

  return (
    <>
      <span>{leadingSpaces}</span>
      <span className={colorClass}>{core}</span>
      {hasComma && <span className="text-slate-400">,</span>}
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
      // Fallback ignored
    }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/90 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-mono text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded bg-slate-800/80"
            title={expanded ? 'Collapse section' : 'Expand section'}
          >
            {expanded ? '▼' : '▶'}
          </button>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {title}
          </span>
          {computedFields.length > 0 && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {computedFields.length} JSON paths
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {hasParsedJson && (
            <button
              type="button"
              onClick={() => setActiveTab('json')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'json'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Formatted JSON
            </button>
          )}
          {rawText !== undefined && (
            <button
              type="button"
              onClick={() => setActiveTab('raw')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'raw'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Raw Text ({rawText.length} chars)
            </button>
          )}
          {hasParsedJson && (
            <button
              type="button"
              onClick={() => setActiveTab('paths')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'paths'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Recursive Field Paths
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="ml-1 px-2.5 py-1 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {expanded && (
        <div>
          {activeTab === 'json' && hasParsedJson && (
            <div
              className={`p-3.5 overflow-auto font-mono text-xs ${maxHeightClass}`}
            >
              {formattedJson.length < 40000 ? (
                syntaxHighlightJson(formattedJson)
              ) : (
                <pre className="text-slate-200 whitespace-pre-wrap break-all">
                  {formattedJson}
                </pre>
              )}
            </div>
          )}

          {(activeTab === 'raw' || !hasParsedJson) && (
            <div
              className={`p-3.5 overflow-auto font-mono text-xs text-slate-200 ${maxHeightClass}`}
            >
              <pre className="whitespace-pre-wrap break-all">
                {rawText || formattedJson || '(empty response body)'}
              </pre>
            </div>
          )}

          {activeTab === 'paths' && hasParsedJson && (
            <div className="p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={pathFilter}
                  onChange={(e) => setPathFilter(e.target.value)}
                  placeholder="Filter by JSON path, field name, value, or data type (e.g. data[0].pricing.prompt)..."
                  className="w-full px-3 py-1.5 text-xs font-mono rounded bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs font-mono text-slate-400 shrink-0">
                  Showing {Math.min(filteredFields.length, 400)} of{' '}
                  {filteredFields.length}
                </span>
              </div>
              <div className={`overflow-auto ${maxHeightClass} border border-slate-800 rounded`}>
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead className="bg-slate-900 text-slate-300 sticky top-0">
                    <tr>
                      <th className="py-2 px-2.5 border-b border-slate-800">
                        Exact JSON Path
                      </th>
                      <th className="py-2 px-2.5 border-b border-slate-800">
                        Field Name
                      </th>
                      <th className="py-2 px-2.5 border-b border-slate-800">
                        Data Type
                      </th>
                      <th className="py-2 px-2.5 border-b border-slate-800">
                        Actual Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredFields.slice(0, 400).map((f, i) => (
                      <tr key={`${f.path}-${i}`} className="hover:bg-slate-900/50">
                        <td className="py-1.5 px-2.5 text-sky-400 break-all">
                          {f.path}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-300">
                          {f.fieldName}
                        </td>
                        <td className="py-1.5 px-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                              f.dataType === 'string'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                                : f.dataType === 'number'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                                  : f.dataType === 'boolean'
                                    ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                                    : f.dataType === 'null'
                                      ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                                      : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {f.dataType}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-200 break-all max-w-md">
                          {f.formattedValue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
