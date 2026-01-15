/**
 * Safe number parsing utility to prevent NaN propagation.
 * Always returns a valid number, defaulting to 0 or a specified fallback.
 */
export const safeParse = (val: string | number | undefined | null, fallback = 0): number => {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
};
