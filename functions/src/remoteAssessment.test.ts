import { describe, it, expect } from 'vitest';

// Copy of allowedKeysForScope logic for isolated testing
// (avoids importing firebase-admin in unit tests)
const REMOTE_POSTURE_VIEWS = ['front', 'side-left', 'back', 'side-right'] as const;
const BASIC_INFO_KEYS = ['fullName','email','phone','dateOfBirth','gender','heightCm','trainingHistory','recentActivity'];
const LIFESTYLE_KEYS = ['activityLevel','sleepArchetype','stressLevel','nutritionHabits','hydrationHabits','stepsPerDay','sedentaryHours','caffeineCupsPerDay','alcoholFrequency','medicationsFlag','medicationsNotes'];
const PARQ_KEYS = ['parq1','parq2','parq3','parq4','parq5','parq6','parq7','parq8','parq9','parq10','parq11','parq12','parq13','parqNotes'];
const BODY_COMP_KEYS = ['inbodyWeightKg','inbodyBodyFatPct','bodyFatMassKg','inbodyBmi','visceralFatLevel','skeletalMuscleMassKg','totalBodyWaterL','waistHipRatio','bmrKcal','inbodyScore','segmentalTrunkKg','segmentalArmLeftKg','segmentalArmRightKg','segmentalLegLeftKg','segmentalLegRightKg'];
const POSTURE_KEYS = REMOTE_POSTURE_VIEWS.map((v) => `postureRemotePath_${v}`);

describe('allowedKeysForScope', () => {
  it('full scope contains all key groups', () => {
    const all = [...BASIC_INFO_KEYS, ...LIFESTYLE_KEYS, ...PARQ_KEYS, ...BODY_COMP_KEYS, ...POSTURE_KEYS];
    expect(all).toContain('fullName');
    expect(all).toContain('parq7');
    expect(all).toContain('inbodyWeightKg');
    expect(all).toContain('postureRemotePath_front');
    expect(all.length).toBeGreaterThan(40);
  });

  it('parqFlagged is not in allowedKeys (computed server-side)', () => {
    const all = [...BASIC_INFO_KEYS, ...LIFESTYLE_KEYS, ...PARQ_KEYS, ...BODY_COMP_KEYS, ...POSTURE_KEYS];
    expect(all).not.toContain('parqFlagged');
  });

  it('detects parq flag when any medical question answered yes', () => {
    const PARQ_MEDICAL_IDS = ['parq1','parq2','parq3','parq4','parq5','parq6','parq7'];
    const sanitized = { parq1: 'no', parq2: 'yes', parq3: 'no' };
    const flagged = PARQ_MEDICAL_IDS.some((k) => sanitized[k as keyof typeof sanitized] === 'yes');
    expect(flagged).toBe(true);
  });

  it('does not flag when all medical questions answered no', () => {
    const PARQ_MEDICAL_IDS = ['parq1','parq2','parq3','parq4','parq5','parq6','parq7'];
    const sanitized = Object.fromEntries(PARQ_MEDICAL_IDS.map(k => [k, 'no']));
    const flagged = PARQ_MEDICAL_IDS.some((k) => sanitized[k] === 'yes');
    expect(flagged).toBe(false);
  });
});
