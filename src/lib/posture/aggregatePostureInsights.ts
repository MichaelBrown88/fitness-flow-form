import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import type { PostureFindingRecord, PostureFindingSeverity, PostureFindingViewId } from '@/lib/types/postureFindings';

const SEV_ORDER: Record<PostureFindingSeverity, number> = {
  aligned: 0,
  mild: 1,
  moderate: 2,
  significant: 3,
};

const PRI_ORDER: Record<'high' | 'medium' | 'low', number> = { high: 3, medium: 2, low: 1 };

const VIEWS: PostureFindingViewId[] = ['front', 'back', 'side-left', 'side-right'];

export function aggregatePostureFindings(
  results: Partial<Record<PostureFindingViewId, PostureAnalysisResult>>
): PostureFindingRecord[] {
  const merged = new Map<string, PostureFindingRecord>();
  for (const view of VIEWS) {
    const r = results[view];
    const list = r?.structuredFindings ?? [];
    for (const f of list) {
      if (f.severity === 'aligned') continue;
      const prev = merged.get(f.id);
      if (!prev) {
        merged.set(f.id, f);
        continue;
      }
      if (SEV_ORDER[f.severity] > SEV_ORDER[prev.severity]) {
        merged.set(f.id, f);
      } else if (
        SEV_ORDER[f.severity] === SEV_ORDER[prev.severity] &&
        PRI_ORDER[f.priority] > PRI_ORDER[prev.priority]
      ) {
        merged.set(f.id, f);
      }
    }
  }
  return [...merged.values()];
}

export function computePostureScore(findings: PostureFindingRecord[]): number {
  let s = 100;
  for (const f of findings) {
    if (f.severity === 'mild') s -= 6;
    else if (f.severity === 'moderate') s -= 14;
    else if (f.severity === 'significant') s -= 24;
    if (f.priority === 'high') s -= 2;
  }
  return Math.max(0, Math.round(s));
}

export function sortFindingsForDisplay(findings: PostureFindingRecord[]): PostureFindingRecord[] {
  return [...findings].sort((a, b) => {
    const pd = PRI_ORDER[b.priority] - PRI_ORDER[a.priority];
    if (pd !== 0) return pd;
    return SEV_ORDER[b.severity] - SEV_ORDER[a.severity];
  });
}

export function postureScoreTone(score: number): 'green' | 'amber' | 'red' {
  if (score >= 80) return 'green';
  if (score >= 60) return 'amber';
  return 'red';
}

export function viewLabelUpper(view: PostureFindingViewId): string {
  switch (view) {
    case 'side-left':
      return 'SIDE LEFT';
    case 'side-right':
      return 'SIDE RIGHT';
    default:
      return view.toUpperCase();
  }
}

export function buildFocusBullets(findings: PostureFindingRecord[], max = 4): string[] {
  const sorted = sortFindingsForDisplay(findings);
  const bullets: string[] = [];
  const seen = new Set<string>();
  for (const f of sorted) {
    const t = f.whatWellDo.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    bullets.push(t);
    if (bullets.length >= max) break;
  }
  return bullets;
}
