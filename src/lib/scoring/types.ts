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
  /** True when enough data was present to score this pillar (missing !== low score). */
  assessed: boolean;
  details: ScoreDetail[];
  strengths: string[];
  weaknesses: string[];
  stretches?: string[];
  activations?: string[];
  contraindications?: string[];
  lifestyleAdvice?: string[];
};

export type ScoreSummary = {
  /**
   * Session score: mean of assessed pillars only (0 if none assessed).
   * For dashboards and trends when the full five pillars were not measured.
   */
  overall: number;
  /**
   * Populated only when all five pillars are assessed; use for “full profile” milestones and headline.
   */
  fullProfileScore: number | null;
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
