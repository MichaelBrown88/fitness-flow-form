import { useSearchParams } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { useAssessmentLogic } from '@/hooks/useAssessmentLogic';
import { scoreGrade, SCORE_COLORS } from '@/lib/scoring/scoreColor';

const CATEGORY_IDS = ['bodyComp', 'cardio', 'strength', 'movementQuality', 'lifestyle'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  bodyComp: 'Body Composition',
  cardio: 'Cardio / Fitness',
  strength: 'Strength',
  movementQuality: 'Movement Quality',
  lifestyle: 'Lifestyle',
};

function ScoreCell({ score, compare }: { score: number; compare?: number }) {
  const grade = scoreGrade(score);
  const diff = compare !== undefined ? score - compare : undefined;
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${SCORE_COLORS[grade].badge}`}>
        {score || '—'}
      </span>
      {diff !== undefined && diff !== 0 && (
        <span className={`text-[10px] font-bold ${diff > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {diff > 0 ? '+' : ''}{diff}
        </span>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-3 py-16">
      <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-muted-foreground font-medium">Loading assessment…</span>
    </div>
  );
}

const AssessmentComparison = () => {
  const [params] = useSearchParams();
  const idA = params.get('a') ?? '';
  const idB = params.get('b') ?? '';

  const a = useAssessmentLogic(idA || undefined);
  const b = useAssessmentLogic(idB || undefined);

  if (!idA || !idB) {
    return (
      <AppShell title="Compare Assessments">
        <p className="text-sm text-muted-foreground text-center py-16">
          Two assessment IDs are required. Use <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/compare?a=ID1&b=ID2</code>
        </p>
      </AppShell>
    );
  }

  const nameA = a.formData?.fullName ?? 'Assessment A';
  const nameB = b.formData?.fullName ?? 'Assessment B';

  return (
    <AppShell title="Compare Assessments" subtitle={`${nameA} vs ${nameB}`}>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Overall Scores */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-background p-6 text-center space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
              {nameA}
            </p>
            {a.loading ? <LoadingState /> : (
              <p className="text-3xl font-bold text-foreground">{a.scores?.overall ?? '—'}</p>
            )}
          </div>
          <div className="rounded-xl border border-border bg-background p-6 text-center space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
              {nameB}
            </p>
            {b.loading ? <LoadingState /> : (
              <p className="text-3xl font-bold text-foreground">{b.scores?.overall ?? '—'}</p>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        {!a.loading && !b.loading && a.scores && b.scores && (
          <div className="rounded-xl border border-border bg-background overflow-hidden">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                    {nameA}
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                    {nameB}
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                    Diff
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {CATEGORY_IDS.map((id) => {
                  const catA = a.scores?.categories?.find((c) => c.id === id);
                  const catB = b.scores?.categories?.find((c) => c.id === id);
                  const scoreA = catA?.score ?? 0;
                  const scoreB = catB?.score ?? 0;
                  const diff = scoreB - scoreA;
                  return (
                    <tr key={id} className="hover:bg-muted/50/80">
                      <td className="px-6 py-4 font-semibold text-foreground">
                        {CATEGORY_LABELS[id]}
                      </td>
                      <td className="px-6 py-4">
                        <ScoreCell score={scoreA} />
                      </td>
                      <td className="px-6 py-4">
                        <ScoreCell score={scoreB} />
                      </td>
                      <td className="px-6 py-4">
                        {diff !== 0 ? (
                          <span className={`text-xs font-bold ${diff > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {diff > 0 ? '+' : ''}{diff}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {(a.error || b.error) && (
          <p className="text-sm text-red-500 text-center">
            {a.error ?? b.error}
          </p>
        )}
      </div>
    </AppShell>
  );
};

export default AssessmentComparison;
