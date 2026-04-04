/**
 * ISO 4217 minor units for converting stored “smallest currency amounts” to display values.
 * Extend sets when adding regions (e.g. JPY, EUR with same storage convention).
 */

/** Currencies with no minor unit (whole-unit amounts in Firestore). */
const ZERO_DECIMAL = new Set<string>([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

/** Currencies with three decimal places (storage ×1000). */
const THREE_DECIMAL = new Set<string>(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);

export function getCurrencyMinorUnitMultiplier(iso4217: string): number {
  const c = iso4217.toUpperCase();
  if (ZERO_DECIMAL.has(c)) return 1;
  if (THREE_DECIMAL.has(c)) return 1000;
  return 100;
}
