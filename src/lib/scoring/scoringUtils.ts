import { NORMATIVE_SCORING_DB } from '../clinical-data';
import { safeParse } from '../utils/numbers';

export const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

/**
 * Helper to lookup normative scores based on age and gender.
 */
export function lookupNormativeScore(testName: string, gender: string, age: number, value: number): number {
  const genderKey = (gender || 'any').toLowerCase() as 'male' | 'female' | 'any';

  // Find benchmarks for this test and gender
  const benchmarks = NORMATIVE_SCORING_DB.filter(b =>
    b.testName.toLowerCase() === testName.toLowerCase() &&
    (b.gender === 'any' || b.gender === genderKey)
  );

  if (benchmarks.length === 0) return 0;

  // Find the correct age bracket
  const benchmark = benchmarks.find(b => {
    if (b.ageBracket.includes('+')) {
      const minAge = safeParse(b.ageBracket.replace('+', ''));
      return age >= minAge;
    }
    const [min, max] = b.ageBracket.split('-').map(Number);
    return age >= min && age <= max;
  }) || benchmarks[0]; // Fallback to first if no exact match

  // Calculate score (0-100) based on thresholds
  const { poor, average, excellent } = benchmark.thresholds;

  // For HR, lower is better. For others, higher is better.
  const lowerIsBetter = testName.toLowerCase().includes('hr');

  if (lowerIsBetter) {
    if (value <= excellent) return 100;
    if (value >= poor) return 10;
    if (value <= average) {
      return 100 - ((value - excellent) / (average - excellent)) * 50;
    } else {
      return 50 - ((value - average) / (poor - average)) * 40;
    }
  } else {
    if (value >= excellent) return 100;
    if (value <= poor) return 10;
    if (value >= average) {
      return 50 + ((value - average) / (excellent - average)) * 50;
    } else {
      return 10 + ((value - poor) / (average - poor)) * 40;
    }
  }
}

/**
 * Calculates age from YYYY-MM-DD string
 */
export function calculateAge(dob: string): number {
  if (!dob) return 0;
  const dobDate = new Date(dob);
  if (isNaN(dobDate.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - dobDate.getFullYear();
  const m = today.getMonth() - dobDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
    age--;
  }
  return age;
}
