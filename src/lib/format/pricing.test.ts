import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  compareDecimalPrices,
  compareNullablePricesForSort,
  extractModelPricingFromRaw,
  formatOffpeakHoursUtc,
  formatOffpeakWeekdays,
  formatPerTokenPrice,
  formatRequestCost,
  formatUsd,
  inspectTokenPrice,
  isFreeModelPricing,
  isZeroPrice,
  perTokenToPerMillion,
} from './pricing.ts';

describe('src/lib/format/pricing.ts', () => {
  describe('perTokenToPerMillion & formatUsd conversions', () => {
    it('converts "0.000000400000" to "$0.40" without floating-point artifacts', () => {
      const perMillion = perTokenToPerMillion('0.000000400000');
      assert.equal(perMillion, '0.4');
      assert.equal(formatUsd(perMillion), '$0.40');
      assert.equal(formatPerTokenPrice('0.000000400000'), '$0.40');
    });

    it('converts "0.000000187500" to "$0.1875" without floating-point precision loss', () => {
      const perMillion = perTokenToPerMillion('0.000000187500');
      assert.equal(perMillion, '0.1875');
      assert.equal(formatUsd(perMillion), '$0.1875');
      assert.equal(formatPerTokenPrice('0.000000187500'), '$0.1875');
    });

    it('converts "0.000001250000" to "$1.25"', () => {
      const perMillion = perTokenToPerMillion('0.000001250000');
      assert.equal(perMillion, '1.25');
      assert.equal(formatUsd(perMillion), '$1.25');
      assert.equal(formatPerTokenPrice('0.000001250000'), '$1.25');
    });

    it('converts "0.000006250000" to "$6.25"', () => {
      const perMillion = perTokenToPerMillion('0.000006250000');
      assert.equal(perMillion, '6.25');
      assert.equal(formatUsd(perMillion), '$6.25');
      assert.equal(formatPerTokenPrice('0.000006250000'), '$6.25');
    });

    it('converts "0.000000125000" to "$0.125" without rounding away meaningful digits', () => {
      const perMillion = perTokenToPerMillion('0.000000125000');
      assert.equal(perMillion, '0.125');
      assert.equal(formatUsd(perMillion), '$0.125');
      assert.equal(formatPerTokenPrice('0.000000125000'), '$0.125');
    });

    it('converts "0.000000625000" to "$0.625" (claude-haiku-5-5 output)', () => {
      const perMillion = perTokenToPerMillion('0.000000625000');
      assert.equal(perMillion, '0.625');
      assert.equal(formatUsd(perMillion), '$0.625');
    });

    it('converts "0.000001600000" to "$1.60" (qwen3.7-plus output)', () => {
      const perMillion = perTokenToPerMillion('0.000001600000');
      assert.equal(perMillion, '1.6');
      assert.equal(formatUsd(perMillion), '$1.60');
    });

    it('formats large values with en-US thousands separators ($1,250.00)', () => {
      const perMillion = perTokenToPerMillion('0.001250000000');
      assert.equal(perMillion, '1250');
      assert.equal(formatUsd(perMillion), '$1,250.00');
      assert.equal(formatUsd('1250'), '$1,250.00');
    });
  });

  describe('zero / FREE detection', () => {
    it('detects "0.000000000000" as zero and FREE when both prompt and completion are zero', () => {
      assert.equal(isZeroPrice('0.000000000000'), true);
      assert.equal(isZeroPrice('0'), true);
      assert.equal(isZeroPrice('0.00'), true);
      assert.equal(perTokenToPerMillion('0.000000000000'), '0');
      assert.equal(formatUsd(perTokenToPerMillion('0.000000000000')), '$0.00');
      assert.equal(
        isFreeModelPricing('0.000000000000', '0.000000000000'),
        true
      );
    });

    it('does not detect non-zero or missing prices as zero or FREE', () => {
      assert.equal(isZeroPrice('0.000000125000'), false);
      assert.equal(isZeroPrice(null), false);
      assert.equal(isZeroPrice(undefined), false);
      assert.equal(isZeroPrice(''), false);
      assert.equal(isZeroPrice('abc'), false);
      assert.equal(
        isFreeModelPricing('0.000000187500', '0.000000000000'),
        false
      );
      assert.equal(isFreeModelPricing(null, null), false);
    });
  });

  describe('null, empty, and unparseable values', () => {
    it('returns null from perTokenToPerMillion and "—" from formatUsd without throwing for null, "", and "abc"', () => {
      assert.equal(perTokenToPerMillion(null), null);
      assert.equal(perTokenToPerMillion(undefined), null);
      assert.equal(perTokenToPerMillion(''), null);
      assert.equal(perTokenToPerMillion('   '), null);
      assert.equal(perTokenToPerMillion('abc'), null);

      assert.equal(formatUsd(null), '—');
      assert.equal(formatUsd(undefined), '—');
      assert.equal(formatUsd(''), '—');
      assert.equal(formatUsd('abc'), '—');

      assert.equal(formatPerTokenPrice(null), '—');
      assert.equal(formatPerTokenPrice(''), '—');
      assert.equal(formatPerTokenPrice('abc'), '—');
    });

    it('classifies missing vs unparseable in inspectTokenPrice with appropriate tooltips', () => {
      const missingNull = inspectTokenPrice(null);
      assert.equal(missingNull.status, 'missing');
      assert.equal(missingNull.formattedPer1M, '—');
      assert.equal(missingNull.hasParseWarning, false);
      assert.equal(missingNull.tooltip, 'Not provided by catalog');

      const missingEmpty = inspectTokenPrice('');
      assert.equal(missingEmpty.status, 'missing');
      assert.equal(missingEmpty.formattedPer1M, '—');
      assert.equal(missingEmpty.hasParseWarning, false);
      assert.equal(missingEmpty.tooltip, 'Not provided by catalog');

      const unparseable = inspectTokenPrice('abc');
      assert.equal(unparseable.status, 'unparseable');
      assert.equal(unparseable.formattedPer1M, '—');
      assert.equal(unparseable.hasParseWarning, true);
      assert.equal(unparseable.tooltip, 'Unparseable price value: abc');

      const valid = inspectTokenPrice('0.000000187500');
      assert.equal(valid.status, 'valid');
      assert.equal(valid.formattedPer1M, '$0.1875');
      assert.equal(valid.hasParseWarning, false);
      assert.equal(valid.tooltip, 'Raw: 0.000000187500 USD/token');
    });
  });

  describe('formatRequestCost (usage.cost)', () => {
    it('formats 0.0000315 as "$0.0000315" without multiplying by 1e6 or rounding to $0.00', () => {
      assert.equal(formatRequestCost(0.0000315), '$0.0000315');
      assert.equal(formatRequestCost('0.0000315'), '$0.0000315');
      assert.equal(formatRequestCost('0.0000315000'), '$0.0000315');
    });

    it('formats exact zero cost as "$0.00 (free)"', () => {
      assert.equal(formatRequestCost(0), '$0.00 (free)');
      assert.equal(formatRequestCost('0'), '$0.00 (free)');
      assert.equal(formatRequestCost('0.000000000000'), '$0.00 (free)');
    });

    it('formats absent usage.cost as "Not reported"', () => {
      assert.equal(formatRequestCost(undefined), 'Not reported');
      assert.equal(formatRequestCost(null), 'Not reported');
      assert.equal(formatRequestCost(''), 'Not reported');
    });
  });

  describe('numeric decimal sorting comparison', () => {
    it('compares decimal strings by numeric value rather than lexicographic string order', () => {
      assert.equal(compareDecimalPrices('0.000000125000', '0.000000400000'), -1);
      assert.equal(compareDecimalPrices('0.000000400000', '0.000001250000'), -1);
      assert.equal(compareDecimalPrices('0.000001250000', '0.000010000000'), -1);
      assert.equal(compareDecimalPrices('0.000000400000', '0.0000004'), 0);

      const list = [
        '0.000006250000',
        null,
        '0.000000125000',
        '0.000000000000',
        '0.000001250000',
        '0.000000400000',
      ];
      const asc = [...list].sort((a, b) =>
        compareNullablePricesForSort(a, b, 'asc')
      );
      assert.deepEqual(asc, [
        '0.000000000000',
        '0.000000125000',
        '0.000000400000',
        '0.000001250000',
        '0.000006250000',
        null,
      ]);
    });
  });

  describe('tiered pricing & raw model extraction', () => {
    it('extracts long-context and off-peak pricing without mutating raw model data', () => {
      const rawModel = {
        id: 'test-model',
        mode: 'chat',
        pricing: {
          prompt: '0.000000400000',
          completion: '0.000001600000',
          input_cache_read: '0.000000040000',
        },
        pricing_long_context: {
          prompt: '0.000000800000',
          completion: '0.000003200000',
          input_cache_read: '0.000000080000',
          threshold_tokens: 200000,
        },
        pricing_offpeak: {
          prompt: '0.000000200000',
          completion: '0.000000800000',
          input_cache_read: '0.000000020000',
          windows: [
            {
              hours_utc: [16],
              weekdays: [0, 1, 2, 3, 4],
            },
          ],
        },
      };

      const extracted = extractModelPricingFromRaw(rawModel);
      assert.equal(extracted.prompt.formattedPer1M, '$0.40');
      assert.equal(extracted.completion.formattedPer1M, '$1.60');
      assert.equal(extracted.inputCacheRead.formattedPer1M, '$0.04');
      assert.equal(extracted.isFree, false);

      assert.ok(extracted.longContext);
      assert.equal(
        extracted.longContext.thresholdLabel,
        'Applies above 200,000 tokens'
      );
      assert.equal(extracted.longContext.prompt.formattedPer1M, '$0.80');
      assert.equal(extracted.longContext.completion.formattedPer1M, '$3.20');
      assert.equal(extracted.longContext.inputCacheRead.formattedPer1M, '$0.08');

      assert.ok(extracted.offpeak);
      assert.equal(extracted.offpeak.prompt.formattedPer1M, '$0.20');
      assert.equal(extracted.offpeak.windows.length, 1);
      assert.equal(
        extracted.offpeak.windows[0].utcHoursLabel,
        '16:00–17:00 UTC'
      );
      assert.equal(
        extracted.offpeak.windows[0].weekdaysLabel,
        '[0, 1, 2, 3, 4] — weekday index (convention unverified)'
      );

      // Ensure raw object was not mutated
      assert.equal(rawModel.pricing.prompt, '0.000000400000');
    });

    it('formats contiguous off-peak UTC hours and keeps raw weekday indices', () => {
      const { utcHoursLabel } = formatOffpeakHoursUtc([16, 17, 18]);
      assert.equal(utcHoursLabel, '16:00–19:00 UTC');
      const strRanges = formatOffpeakHoursUtc([
        '00:00-01:00',
        '04:00-06:00',
        '10:00-00:00',
      ]);
      assert.equal(
        strRanges.utcHoursLabel,
        '00:00–01:00 UTC, 04:00–06:00 UTC, 10:00–00:00 UTC'
      );
      assert.equal(
        formatOffpeakWeekdays([5, 6]),
        '[5, 6] — weekday index (convention unverified)'
      );
    });
  });
});
