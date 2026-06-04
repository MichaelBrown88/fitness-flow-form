import { describe, it, expect } from 'vitest';
import type { FormData } from '@/contexts/FormContext';
import {
  filterPhasesForStudioBaseline,
  isRemoteIntakeFormComplete,
  shouldShowRemoteIntakeReview,
  shouldShowStudioIntakeReview,
  sortStudioPhaseIds,
} from './studioSessionSteps';

const completeIntake = {
  fullName: 'Jane Doe',
  recentActivity: 'currently-training',
  trainingHistory: 'beginner',
  activityLevel: 'moderate',
  parq1: 'no',
} as FormData;

describe('studioSessionSteps', () => {
  it('sortStudioPhaseIds orders studio baseline phases', () => {
    expect(sortStudioPhaseIds(['P7', 'P3', 'P0', 'P2'])).toEqual(['P0', 'P3', 'P2', 'P7']);
  });

  it('isRemoteIntakeFormComplete requires core intake fields', () => {
    expect(isRemoteIntakeFormComplete({} as FormData)).toBe(false);
    expect(isRemoteIntakeFormComplete(completeIntake)).toBe(true);
  });

  it('shouldShowStudioIntakeReview only for partial remote pre-assessment', () => {
    expect(
      shouldShowStudioIntakeReview({ fullName: 'Jane' } as FormData, true),
    ).toBe(true);
    expect(shouldShowStudioIntakeReview(completeIntake, true)).toBe(false);
    expect(shouldShowStudioIntakeReview({} as FormData, false)).toBe(false);
  });

  it('shouldShowRemoteIntakeReview is false for empty walk-in form', () => {
    expect(shouldShowRemoteIntakeReview({} as FormData, false)).toBe(false);
    expect(shouldShowRemoteIntakeReview(completeIntake, true)).toBe(true);
  });

  it('filterPhasesForStudioBaseline keeps P0/P1 for studio walk-in', () => {
    const ids = filterPhasesForStudioBaseline(
      ['P0', 'P1', 'P3', 'P2', 'P5', 'P4', 'P7'],
      {} as FormData,
      false,
    );
    expect(ids).toContain('P0');
    expect(ids).toContain('P1');
  });

  it('filterPhasesForStudioBaseline drops P0/P1 when remote intake complete', () => {
    const ids = filterPhasesForStudioBaseline(
      ['P0', 'P1', 'P3', 'P2', 'P5', 'P4', 'P7'],
      completeIntake,
      true,
    );
    expect(ids).not.toContain('P0');
    expect(ids).not.toContain('P1');
    expect(ids[0]).toBe('P3');
  });
});
