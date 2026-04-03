/**
 * Shared contract: posture pipeline output and report/trainer UI input.
 * After library lookup, rows include display copy; severity `aligned` is omitted from client cards.
 */

export type PostureFindingViewId = 'front' | 'back' | 'side-left' | 'side-right';

export type PostureFindingSeverity = 'mild' | 'moderate' | 'significant' | 'aligned';

export type PostureFindingUnit = 'degrees' | 'pixels';

export interface PostureFindingRecord {
  id: string;
  view: PostureFindingViewId;
  measuredValue: number;
  unit: PostureFindingUnit;
  severity: PostureFindingSeverity;
  name: string;
  whatItMeans: string;
  whatWellDo: string;
  priority: 'high' | 'medium' | 'low';
}

export type PostureFindings = PostureFindingRecord[];
