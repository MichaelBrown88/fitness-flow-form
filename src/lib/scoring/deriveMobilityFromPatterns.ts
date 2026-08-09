import type { FormData } from '@/contexts/FormContext';

export type MobilityQuality = 'good' | 'fair' | 'poor' | '';

export interface DerivedMobility {
  hip: MobilityQuality;
  shoulder: MobilityQuality;
  ankleLeft: MobilityQuality;
  ankleRight: MobilityQuality;
  inferred: boolean;
}

const RANK: Record<Exclude<MobilityQuality, ''>, number> = {
  good: 0,
  fair: 1,
  poor: 2,
};

function worstOf(...qualities: MobilityQuality[]): MobilityQuality {
  const present = qualities.filter((q): q is Exclude<MobilityQuality, ''> => q !== '');
  if (present.length === 0) return '';
  return present.reduce((a, b) => (RANK[b] > RANK[a] ? b : a));
}

function qualityFromOhsDepth(depth: string | undefined): MobilityQuality {
  if (!depth?.trim()) return '';
  if (depth === 'full-depth') return 'good';
  if (depth === 'parallel') return 'fair';
  return 'poor';
}

function qualityFromHingeDepth(depth: string | undefined): MobilityQuality {
  if (!depth?.trim()) return '';
  if (depth === 'excellent' || depth === 'good') return 'good';
  if (depth === 'fair') return 'fair';
  return 'poor';
}

function qualityFromShoulderMobility(v: string | undefined): MobilityQuality {
  if (!v?.trim()) return '';
  if (v === 'full-range') return 'good';
  if (v === 'compensated') return 'fair';
  return 'poor';
}

function qualityFromFeet(v: string | undefined): MobilityQuality {
  // Empty means "not observed" — never infer quality from a blank field.
  if (!v?.trim()) return '';
  if (v === 'stable') return 'good';
  return 'fair';
}

function qualityFromKneeAlignment(v: string | undefined): MobilityQuality {
  if (!v?.trim()) return '';
  if (v === 'stable' || v === 'tracks-straight') return 'good';
  return 'poor';
}

function qualityFromBalance(v: string | undefined): MobilityQuality {
  if (!v?.trim()) return '';
  if (v === 'excellent' || v === 'good') return 'good';
  if (v === 'fair') return 'fair';
  return 'poor';
}

function hasExplicitMobility(form: FormData): boolean {
  return !!(
    (form.mobilityHip && form.mobilityHip.trim() !== '') ||
    (form.mobilityShoulder && form.mobilityShoulder.trim() !== '') ||
    (form.mobilityAnkleLeft && form.mobilityAnkleLeft.trim() !== '') ||
    (form.mobilityAnkleRight && form.mobilityAnkleRight.trim() !== '') ||
    (form.mobilityAnkle && form.mobilityAnkle.trim() !== '')
  );
}

/** Infer hip / shoulder / ankle mobility from movement pattern fields when legacy mobility screens were skipped. */
export function deriveMobilityFromPatterns(form: FormData): DerivedMobility {
  const hip = worstOf(
    qualityFromOhsDepth(form.ohsSquatDepth),
    qualityFromHingeDepth(form.hingeDepth),
    form.ohsTorsoLean === 'excessive-lean' ? 'poor' : form.ohsTorsoLean === 'moderate-lean' ? 'fair' : '',
    form.hingeBackRounding === 'severe' ? 'poor' : form.hingeBackRounding === 'moderate' ? 'fair' : '',
  );

  const shoulder = qualityFromShoulderMobility(form.ohsShoulderMobility);

  const ankleShared = worstOf(
    qualityFromOhsDepth(form.ohsSquatDepth),
    qualityFromFeet(form.ohsFeetPosition),
  );

  const ankleLeft = worstOf(
    ankleShared,
    qualityFromKneeAlignment(form.lungeLeftKneeAlignment),
    qualityFromBalance(form.lungeLeftBalance),
  );

  const ankleRight = worstOf(
    ankleShared,
    qualityFromKneeAlignment(form.lungeRightKneeAlignment),
    qualityFromBalance(form.lungeRightBalance),
  );

  return {
    hip,
    shoulder,
    ankleLeft,
    ankleRight,
    inferred: true,
  };
}

/** Resolved mobility for scoring — explicit legacy fields win; otherwise pattern-derived. */
export function resolveMobilityForScoring(form: FormData): {
  hip: MobilityQuality;
  shoulder: MobilityQuality;
  ankleLeft: MobilityQuality;
  ankleRight: MobilityQuality;
  ankleLegacy: MobilityQuality;
  inferred: boolean;
} {
  if (hasExplicitMobility(form)) {
    return {
      hip: (form.mobilityHip?.trim() as MobilityQuality) || '',
      shoulder: (form.mobilityShoulder?.trim() as MobilityQuality) || '',
      ankleLeft: (form.mobilityAnkleLeft?.trim() as MobilityQuality) || '',
      ankleRight: (form.mobilityAnkleRight?.trim() as MobilityQuality) || '',
      ankleLegacy: (form.mobilityAnkle?.trim() as MobilityQuality) || '',
      inferred: false,
    };
  }

  const derived = deriveMobilityFromPatterns(form);
  return {
    hip: derived.hip,
    shoulder: derived.shoulder,
    ankleLeft: derived.ankleLeft,
    ankleRight: derived.ankleRight,
    ankleLegacy: worstOf(derived.ankleLeft, derived.ankleRight),
    inferred: derived.inferred,
  };
}
