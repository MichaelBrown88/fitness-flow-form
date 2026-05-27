import { describe, it, expect } from 'vitest';
import type { FormData } from '@/contexts/FormContext';
import {
  filterPhasesForStudioBaseline,
  isRemoteIntakeFormComplete,
  reconcileStudioSessionStep,
  resolveInitialStudioStep,
  shouldShowRemoteIntakeReview,
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

  it('resolveInitialStudioStep starts at consultation when intake done', () => {
    expect(
      resolveInitialStudioStep({
        formData: completeIntake,
        consultationComplete: false,
        remoteIntakeResume: true,
      }),
    ).toBe('consultation');
    expect(
      resolveInitialStudioStep({
        formData: completeIntake,
        consultationComplete: true,
        remoteIntakeResume: true,
      }),
    ).toBe('phase');
  });

  it('resolveInitialStudioStep starts at intake-review for partial remote intake', () => {
    expect(
      resolveInitialStudioStep({
        formData: { fullName: 'Jane' } as FormData,
        consultationComplete: false,
        remoteIntakeResume: true,
      }),
    ).toBe('intake-review');
  });

  it('resolveInitialStudioStep starts at consultation for all-in-studio walk-in', () => {
    expect(
      resolveInitialStudioStep({
        formData: {} as FormData,
        consultationComplete: false,
        remoteIntakeResume: false,
      }),
    ).toBe('consultation');
  });

  it('reconcileStudioSessionStep drops stale intake-review for studio walk-in', () => {
    expect(
      reconcileStudioSessionStep('intake-review', {
        formData: {} as FormData,
        consultationComplete: false,
        remoteIntakeResume: false,
      }),
    ).toBe('consultation');
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
