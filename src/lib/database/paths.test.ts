import { describe, expect, it } from 'vitest';
import { clientSlugFromName, sessionIdFromDate } from '@/lib/database/paths';

describe('clientSlugFromName', () => {
  it('slugifies a typical client name', () => {
    expect(clientSlugFromName('Michael James Brown')).toBe('michael-james-brown');
  });

  it('trims and lowercases', () => {
    expect(clientSlugFromName('  Jane  Doe  ')).toBe('jane-doe');
  });

  it('allows dots/underscores per slug regex and strips apostrophes/commas', () => {
    expect(clientSlugFromName("O'Brien, Jr.")).toBe('obrien-jr.');
  });

  it('uses unnamed-client only for falsy name; whitespace-only trims to empty slug', () => {
    expect(clientSlugFromName('')).toBe('unnamed-client');
    expect(clientSlugFromName('   ')).toBe('');
  });
});

describe('sessionIdFromDate', () => {
  it('uses ISO shape with colons and dots replaced for Firestore-safe ids', () => {
    const d = new Date('2026-03-16T14:30:22.000Z');
    expect(sessionIdFromDate(d)).toBe('2026-03-16T14-30-22-000Z');
  });
});
