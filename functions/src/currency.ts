/**
 * AI cost logs store KWD fils; normalize to GBP pence for platform stats.
 * Same math as client `filsToGbpPence` via shared reporting rates.
 */
import {
  DEFAULT_CURRENCY_RATES,
  subscriptionSmallestUnitToGbpPence,
} from './shared/reportingFx';

export function filsToGbpPence(fils: number): number {
  return subscriptionSmallestUnitToGbpPence(Number(fils), 'KWD', DEFAULT_CURRENCY_RATES);
}
