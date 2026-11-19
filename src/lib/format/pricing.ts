export interface FormatUsdOptions {
  /** Minimum decimal places to keep (default: 2) */
  minDecimals?: number;
  /** Optional unit suffix to append, e.g. ' / 1M' */
  unitSuffix?: string;
  /** Fallback string when value is null, empty, or unparseable (default: '—') */
  fallback?: string;
}

export interface ParsedDecimal {
  intPart: string;
  fracPart: string;
  isZero: boolean;
}

export interface InspectedTokenPrice {
  status: 'valid' | 'missing' | 'unparseable';
  rawValue: unknown;
  rawString: string | null;
  perMillionString: string | null;
  formattedPer1M: string;
  isZero: boolean;
  hasParseWarning: boolean;
  tooltip: string;
}

export interface ExtractedLongContextPricing {
  prompt: InspectedTokenPrice;
  completion: InspectedTokenPrice;
  inputCacheRead: InspectedTokenPrice;
  thresholdTokens: number | null;
  thresholdLabel: string;
  rawObject: Record<string, unknown>;
}

export interface ExtractedOffpeakWindow {
  rawHoursUtc: unknown;
  rawWeekdays: unknown;
  utcHoursLabel: string;
  localHoursLabel: string;
  weekdaysLabel: string;
}

export interface ExtractedOffpeakPricing {
  prompt: InspectedTokenPrice;
  completion: InspectedTokenPrice;
  inputCacheRead: InspectedTokenPrice;
  windows: ExtractedOffpeakWindow[];
  rawObject: Record<string, unknown>;
}

export interface ExtractedModelPricing {
  prompt: InspectedTokenPrice;
  completion: InspectedTokenPrice;
  inputCacheRead: InspectedTokenPrice;
  isFree: boolean;
  longContext: ExtractedLongContextPricing | null;
  offpeak: ExtractedOffpeakPricing | null;
}

/**
 * Decimal-safe parser and decimal-point shifter.
 * Never uses floating-point multiplication (parseFloat(x) * 1e6).
 */
export function parseAndShiftDecimal(
  raw: string | number | null | undefined,
  shiftPlaces = 0
): ParsedDecimal | null {
  if (raw === null || raw === undefined) return null;

  let str: string;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 0) return null;
    str = String(raw);
  } else if (typeof raw === 'string') {
    str = raw.trim();
  } else {
    return null;
  }

  if (!str) return null;

  // Match optional +, integer digits, optional fractional digits, and optional scientific exponent.
  // Rejects negative numbers and malformed strings.
  const match = str.match(
    /^\+?(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/
  );
  if (!match) return null;

  const rawInt = match[1] ?? '0';
  const rawFrac = match[2] ?? match[3] ?? '';
  const exp = match[4] !== undefined ? Number.parseInt(match[4], 10) : 0;
  if (!Number.isSafeInteger(exp)) return null;

  const allDigits = rawInt + rawFrac;
  if (/^0+$/.test(allDigits)) {
    return { intPart: '0', fracPart: '', isZero: true };
  }

  const totalShift = shiftPlaces + exp;
  const decimalPos = rawInt.length + totalShift;

  let newInt: string;
  let newFrac: string;

  if (decimalPos <= 0) {
    newInt = '0';
    newFrac = '0'.repeat(-decimalPos) + allDigits;
  } else if (decimalPos >= allDigits.length) {
    newInt = allDigits + '0'.repeat(decimalPos - allDigits.length);
    newFrac = '';
  } else {
    newInt = allDigits.slice(0, decimalPos);
    newFrac = allDigits.slice(decimalPos);
  }

  // Normalize leading zeros on integer part and trailing zeros on fractional part
  newInt = newInt.replace(/^0+(?=\d)/, '') || '0';
  newFrac = newFrac.replace(/0+$/, '');

  const isZero = newInt === '0' && newFrac === '';
  return {
    intPart: newInt,
    fracPart: newFrac,
    isZero,
  };
}

/**
 * Converts a per-token USD decimal string (e.g. "0.000000187500")
 * into a per-1-million-tokens decimal string (e.g. "0.1875") using exact
 * string decimal-point shifting (6 places right).
 * Returns null if the input is missing, empty, or unparseable.
 */
export function perTokenToPerMillion(
  raw: string | null | undefined
): string | null {
  if (typeof raw !== 'string') return null;
  const parsed = parseAndShiftDecimal(raw, 6);
  if (!parsed) return null;
  if (parsed.isZero) return '0';
  return parsed.fracPart.length > 0
    ? `${parsed.intPart}.${parsed.fracPart}`
    : parsed.intPart;
}

/**
 * Formats a decimal USD string (e.g. "0.4", "0.1875", "1250") into
 * human-readable en-US USD currency:
 * - Strips trailing zeros, but keeps at least 2 decimals ("0.4" -> "$0.40", "0.1875" -> "$0.1875")
 * - Never rounds meaningful digits away ("0.125" -> "$0.125")
 * - Uses thousands separators for large values ("1250" -> "$1,250.00")
 * - Returns "—" (or opts.fallback) if value is null, empty, or unparseable
 */
export function formatUsd(
  value: string | null | undefined,
  opts: FormatUsdOptions = {}
): string {
  const fallback = opts.fallback ?? '—';
  if (typeof value !== 'string') return fallback;

  const parsed = parseAndShiftDecimal(value, 0);
  if (!parsed) return fallback;

  const minDecimals = opts.minDecimals ?? 2;
  const formattedInt = parsed.intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formattedFrac = parsed.fracPart.padEnd(minDecimals, '0');

  const core =
    formattedFrac.length > 0
      ? `$${formattedInt}.${formattedFrac}`
      : `$${formattedInt}`;

  return opts.unitSuffix ? `${core}${opts.unitSuffix}` : core;
}

/**
 * Returns true if and only if raw is a valid decimal string equal to zero
 * (e.g. "0", "0.0", "0.000000000000"). Returns false for null, undefined, "", or "abc".
 */
export function isZeroPrice(raw: string | null | undefined): boolean {
  if (typeof raw !== 'string') return false;
  const parsed = parseAndShiftDecimal(raw, 0);
  return parsed !== null && parsed.isZero;
}

/**
 * Free detection based strictly on VALUE, never model ID suffix:
 * Both pricing.prompt and pricing.completion must be valid zero prices.
 */
export function isFreeModelPricing(
  promptRaw: unknown,
  completionRaw: unknown
): boolean {
  return (
    typeof promptRaw === 'string' &&
    typeof completionRaw === 'string' &&
    isZeroPrice(promptRaw) &&
    isZeroPrice(completionRaw)
  );
}

/**
 * Formats response-level usage.cost (total USD for a single request).
 * Never multiplies by 1e6.
 * - Preserves all significant digits (e.g. 0.0000315 -> "$0.0000315"), never rounding to "$0.00"
 * - If cost is exactly 0 -> "$0.00 (free)"
 * - If usage.cost is absent (undefined, null, "") -> "Not reported"
 * - If unparseable -> "—"
 */
export function formatRequestCost(
  cost: number | string | null | undefined
): string {
  if (cost === undefined || cost === null) {
    return 'Not reported';
  }
  if (typeof cost === 'string' && cost.trim() === '') {
    return 'Not reported';
  }

  const parsed = parseAndShiftDecimal(cost, 0);
  if (!parsed) {
    return '—';
  }

  if (parsed.isZero) {
    return '$0.00 (free)';
  }

  const formattedInt = parsed.intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formattedFrac = parsed.fracPart.padEnd(2, '0');
  return `$${formattedInt}.${formattedFrac}`;
}

/**
 * Convenience helper: converts a per-token price string to per-1M and formats as USD.
 */
export function formatPerTokenPrice(
  raw: unknown,
  opts: FormatUsdOptions = {}
): string {
  if (typeof raw !== 'string') return opts.fallback ?? '—';
  const perMillion = perTokenToPerMillion(raw);
  if (perMillion === null) return opts.fallback ?? '—';
  return formatUsd(perMillion, opts);
}

/**
 * Inspects a raw catalog token price field and classifies it as:
 * - 'valid': valid decimal string, with formatted per-1M string and raw tooltip
 * - 'missing': null, undefined, or empty string -> "—" with tooltip "Not provided by catalog"
 * - 'unparseable': non-empty value that cannot be parsed -> "—" with warning icon and tooltip "Unparseable price value: <raw>"
 */
export function inspectTokenPrice(raw: unknown): InspectedTokenPrice {
  if (
    raw === null ||
    raw === undefined ||
    (typeof raw === 'string' && raw.trim() === '')
  ) {
    return {
      status: 'missing',
      rawValue: raw,
      rawString: null,
      perMillionString: null,
      formattedPer1M: '—',
      isZero: false,
      hasParseWarning: false,
      tooltip: 'Not provided by catalog',
    };
  }

  if (typeof raw !== 'string') {
    const rawStr =
      typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
    return {
      status: 'unparseable',
      rawValue: raw,
      rawString: rawStr,
      perMillionString: null,
      formattedPer1M: '—',
      isZero: false,
      hasParseWarning: true,
      tooltip: `Unparseable price value: ${rawStr}`,
    };
  }

  const trimmed = raw.trim();
  const perMillion = perTokenToPerMillion(trimmed);
  if (perMillion === null) {
    return {
      status: 'unparseable',
      rawValue: raw,
      rawString: trimmed,
      perMillionString: null,
      formattedPer1M: '—',
      isZero: false,
      hasParseWarning: true,
      tooltip: `Unparseable price value: ${trimmed}`,
    };
  }

  const zero = isZeroPrice(trimmed);
  return {
    status: 'valid',
    rawValue: raw,
    rawString: trimmed,
    perMillionString: perMillion,
    formattedPer1M: formatUsd(perMillion),
    isZero: zero,
    hasParseWarning: false,
    tooltip: `Raw: ${trimmed} USD/token`,
  };
}

/**
 * Exact numeric decimal comparison between two decimal strings (or numbers).
 * Returns -1 if a < b, 0 if a === b, 1 if a > b, or null if either is not a valid decimal.
 */
export function compareDecimalPrices(
  rawA: unknown,
  rawB: unknown
): number | null {
  const parsedA =
    typeof rawA === 'string' || typeof rawA === 'number'
      ? parseAndShiftDecimal(rawA, 0)
      : null;
  const parsedB =
    typeof rawB === 'string' || typeof rawB === 'number'
      ? parseAndShiftDecimal(rawB, 0)
      : null;

  if (!parsedA || !parsedB) return null;

  if (parsedA.intPart.length !== parsedB.intPart.length) {
    return parsedA.intPart.length < parsedB.intPart.length ? -1 : 1;
  }
  if (parsedA.intPart !== parsedB.intPart) {
    return parsedA.intPart < parsedB.intPart ? -1 : 1;
  }
  if (parsedA.fracPart !== parsedB.fracPart) {
    return parsedA.fracPart < parsedB.fracPart ? -1 : 1;
  }
  return 0;
}

/**
 * Sorting comparator for table price columns.
 * Valid prices are compared numerically according to `direction`;
 * missing or unparseable values are always placed at the bottom.
 */
export function compareNullablePricesForSort(
  rawA: unknown,
  rawB: unknown,
  direction: 'asc' | 'desc' = 'asc'
): number {
  const validA =
    typeof rawA === 'string' || typeof rawA === 'number'
      ? parseAndShiftDecimal(rawA, 0) !== null
      : false;
  const validB =
    typeof rawB === 'string' || typeof rawB === 'number'
      ? parseAndShiftDecimal(rawB, 0) !== null
      : false;

  if (!validA && !validB) return 0;
  if (!validA) return 1;
  if (!validB) return -1;

  const cmp = compareDecimalPrices(rawA, rawB) ?? 0;
  return direction === 'asc' ? cmp : -cmp;
}

/**
 * Formats an hours_utc array from pricing_offpeak.windows into human-readable UTC ranges
 * (e.g. [16] -> "16:00–17:00 UTC", [16, 17, 18] -> "16:00–19:00 UTC") and visitor local time.
 */
export function formatOffpeakHoursUtc(hoursUtc: unknown): {
  utcHoursLabel: string;
  localHoursLabel: string;
} {
  if (!Array.isArray(hoursUtc) || hoursUtc.length === 0) {
    return {
      utcHoursLabel: 'Not specified',
      localHoursLabel: 'Not specified',
    };
  }

  const numericHours = hoursUtc
    .filter((h): h is number => typeof h === 'number' && Number.isInteger(h) && h >= 0 && h <= 23)
    .sort((a, b) => a - b);

  if (numericHours.length !== hoursUtc.length || numericHours.length === 0) {
    const rawJoined = hoursUtc.map((h) => String(h)).join(', ');
    return {
      utcHoursLabel: `${rawJoined} UTC`,
      localHoursLabel: `Raw hours_utc: [${rawJoined}]`,
    };
  }

  // Group contiguous hours into [start, endExclusive] ranges
  const ranges: Array<{ start: number; end: number }> = [];
  for (const h of numericHours) {
    const last = ranges[ranges.length - 1];
    if (last && last.end === h) {
      last.end = h + 1;
    } else if (!last || last.end < h) {
      ranges.push({ start: h, end: h + 1 });
    }
  }

  const pad2 = (n: number) => String(((n % 24) + 24) % 24).padStart(2, '0');

  const utcSegments = ranges.map(
    (r) => `${pad2(r.start)}:00–${pad2(r.end)}:00 UTC`
  );

  // Compute local timezone offset for visitor display
  const tzOffsetMinutes = -new Date().getTimezoneOffset();
  const sign = tzOffsetMinutes >= 0 ? '+' : '-';
  const absMins = Math.abs(tzOffsetMinutes);
  const offsetH = Math.floor(absMins / 60);
  const offsetM = absMins % 60;
  const tzLabel =
    offsetM === 0
      ? `UTC${sign}${offsetH}`
      : `UTC${sign}${offsetH}:${String(offsetM).padStart(2, '0')}`;

  const toLocalTimeStr = (utcHour: number) => {
    const totalMinutes = ((utcHour * 60 + tzOffsetMinutes) % 1440 + 1440) % 1440;
    const lh = Math.floor(totalMinutes / 60);
    const lm = totalMinutes % 60;
    return `${String(lh).padStart(2, '0')}:${String(lm).padStart(2, '0')}`;
  };

  const localSegments = ranges.map(
    (r) => `${toLocalTimeStr(r.start)}–${toLocalTimeStr(r.end)} (${tzLabel})`
  );

  return {
    utcHoursLabel: utcSegments.join(', '),
    localHoursLabel: localSegments.join(', '),
  };
}

/**
 * Formats weekdays array from pricing_offpeak.windows.
 * Keeps raw numbers with label "weekday index (convention unverified)" without converting to day names.
 */
export function formatOffpeakWeekdays(weekdays: unknown): string {
  if (!Array.isArray(weekdays) || weekdays.length === 0) {
    return 'Not specified — weekday index (convention unverified)';
  }
  return `[${weekdays.map((d) => String(d)).join(', ')}] — weekday index (convention unverified)`;
}

/**
 * Extracts all pricing details from a raw model object at render time without mutating the source object.
 */
export function extractModelPricingFromRaw(
  rawObject: Record<string, unknown>
): ExtractedModelPricing {
  const pricingObj =
    rawObject.pricing &&
    typeof rawObject.pricing === 'object' &&
    !Array.isArray(rawObject.pricing)
      ? (rawObject.pricing as Record<string, unknown>)
      : null;

  const promptRaw = pricingObj ? pricingObj.prompt : undefined;
  const completionRaw = pricingObj ? pricingObj.completion : undefined;
  const inputCacheReadRaw = pricingObj ? pricingObj.input_cache_read : undefined;

  const prompt = inspectTokenPrice(promptRaw);
  const completion = inspectTokenPrice(completionRaw);
  const inputCacheRead = inspectTokenPrice(inputCacheReadRaw);
  const isFree = isFreeModelPricing(promptRaw, completionRaw);

  let longContext: ExtractedLongContextPricing | null = null;
  if (
    rawObject.pricing_long_context &&
    typeof rawObject.pricing_long_context === 'object' &&
    !Array.isArray(rawObject.pricing_long_context)
  ) {
    const lcObj = rawObject.pricing_long_context as Record<string, unknown>;
    const thresholdTokens =
      typeof lcObj.threshold_tokens === 'number' &&
      Number.isFinite(lcObj.threshold_tokens)
        ? lcObj.threshold_tokens
        : null;
    const thresholdLabel =
      thresholdTokens !== null
        ? `Applies above ${thresholdTokens.toLocaleString('en-US')} tokens`
        : 'Threshold tokens not specified';

    longContext = {
      prompt: inspectTokenPrice(lcObj.prompt),
      completion: inspectTokenPrice(lcObj.completion),
      inputCacheRead: inspectTokenPrice(lcObj.input_cache_read),
      thresholdTokens,
      thresholdLabel,
      rawObject: lcObj,
    };
  }

  let offpeak: ExtractedOffpeakPricing | null = null;
  if (
    rawObject.pricing_offpeak &&
    typeof rawObject.pricing_offpeak === 'object' &&
    !Array.isArray(rawObject.pricing_offpeak)
  ) {
    const opObj = rawObject.pricing_offpeak as Record<string, unknown>;
    const rawWindows = Array.isArray(opObj.windows) ? opObj.windows : [];
    const windows: ExtractedOffpeakWindow[] = rawWindows
      .filter(
        (w): w is Record<string, unknown> =>
          Boolean(w) && typeof w === 'object' && !Array.isArray(w)
      )
      .map((w) => {
        const { utcHoursLabel, localHoursLabel } = formatOffpeakHoursUtc(
          w.hours_utc
        );
        return {
          rawHoursUtc: w.hours_utc,
          rawWeekdays: w.weekdays,
          utcHoursLabel,
          localHoursLabel,
          weekdaysLabel: formatOffpeakWeekdays(w.weekdays),
        };
      });

    offpeak = {
      prompt: inspectTokenPrice(opObj.prompt),
      completion: inspectTokenPrice(opObj.completion),
      inputCacheRead: inspectTokenPrice(opObj.input_cache_read),
      windows,
      rawObject: opObj,
    };
  }

  return {
    prompt,
    completion,
    inputCacheRead,
    isFree,
    longContext,
    offpeak,
  };
}
