import { describe, expect, it } from 'vitest';
import { buildMovementFindings, toneForMovementValue } from './clientMovementFindings';
import { sanitizeClientReportCopy } from './sanitizeClientReportCopy';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreCategory } from '@/lib/scoring';

describe('toneForMovementValue', () => {
  it('marks stable patterns as good', () => {
    expect(toneForMovementValue('full-depth')).toBe('good');
    expect(toneForMovementValue('stable')).toBe('good');
  });

  it('marks clear compensations as concern or critical', () => {
    expect(toneForMovementValue('valgus')).toBe('critical');
    expect(toneForMovementValue('fair')).toBe('concern');
  });
});

describe('buildMovementFindings', () => {
  it('groups OHS fields with per-row tones', () => {
    const formData = {
      ohsSquatDepth: 'full-depth',
      ohsKneeAlignment: 'valgus',
    } as FormData;
    const cat = { assessed: true, score: 70, id: 'movementQuality' } as ScoreCategory;
    const { groups } = buildMovementFindings(formData, cat);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.title).toBe('Overhead squat');
    expect(groups[0]?.rows).toHaveLength(2);
    expect(groups[0]?.tone).toBe('critical');
  });

  it('renders clinical labels in plain language after sanitising', () => {
    const formData = { ohsKneeAlignment: 'valgus' } as FormData;
    const cat = { assessed: true, score: 70, id: 'movementQuality' } as ScoreCategory;
    const { groups } = buildMovementFindings(formData, cat);
    const value = groups[0]?.rows[0]?.value ?? '';
    expect(sanitizeClientReportCopy(value)).toBe('Knees cave inward');
  });
});

describe('sanitizeClientReportCopy', () => {
  it('translates clinical movement labels to plain language', () => {
    expect(sanitizeClientReportCopy('Valgus (knees cave in)')).toBe('Knees cave inward');
    expect(sanitizeClientReportCopy('Varus (knees bow out)')).toBe('Knees bow outward');
    expect(sanitizeClientReportCopy('Knee valgus (knees cave inward)')).toBe('Knees cave inward');
  });

  it('strips lab units from progression lines', () => {
    expect(sanitizeClientReportCopy('Fitness level 43.2 ml/kg/min')).toBe('Fitness level 43.2');
  });

  it('still strips legacy placeholder prefixes', () => {
    expect(sanitizeClientReportCopy('Placeholder: some line')).toBe('some line');
  });
});
