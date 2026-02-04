export type ScoreDetail = {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  score: number; // 0-100
  notes?: string;
};

export type ScoreCategory = {
  id: 'bodyComp' | 'cardio' | 'strength' | 'movementQuality' | 'lifestyle';
  title: string;
  score: number; // 0-100
  details: ScoreDetail[];
  strengths: string[];
  weaknesses: string[];
  stretches?: string[];
  activations?: string[];
  contraindications?: string[];
  lifestyleAdvice?: string[];
};

export type ScoreSummary = {
  overall: number; // 0-100
  categories: ScoreCategory[];
  synthesis: {
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
};

export type RoadmapPhase = {
  title: string;
  weeks: number;
  focus: string[];
  rationale: string;
  expectedDelta: number; // projected improvement in related score (%)
};
