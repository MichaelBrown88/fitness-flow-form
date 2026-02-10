import React from 'react';
import { type FormData } from '@/contexts/FormContext';
import { FormValue } from '@/services/assessmentHistory';
import { computeScores } from '@/lib/scoring';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AssessmentComparisonProps {
  oldData: FormData;
  newData: FormData;
  oldDate: Date;
  newDate: Date;
}

export const AssessmentComparison: React.FC<AssessmentComparisonProps> = ({
  oldData,
  newData,
  oldDate,
  newDate,
}) => {
  const oldScores = computeScores(oldData);
  const newScores = computeScores(newData);

  const compareValue = (oldVal: FormValue, newVal: FormValue, label: string, format?: (v: FormValue) => string) => {
    const formatted = format || ((v) => String(v ?? 'N/A'));
    const oldFormatted = formatted(oldVal);
    const newFormatted = formatted(newVal);
    const changed = oldFormatted !== newFormatted;
    
    return (
      <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-3">
          <span className={`text-sm ${changed ? 'text-slate-600' : 'text-slate-400'}`}>
            {oldFormatted}
          </span>
          <ArrowRight className="h-4 w-4 text-slate-400" />
          <span className={`text-sm font-semibold ${changed ? 'text-slate-900' : 'text-slate-400'}`}>
            {newFormatted}
          </span>
          {changed && (
            <Badge variant="secondary" className="ml-2">
              Changed
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const compareScore = (oldScore: number, newScore: number, label: string) => {
    const diff = newScore - oldScore;
    const improved = diff > 0;
    const declined = diff < 0;
    
    return (
      <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">{oldScore}</span>
          <ArrowRight className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-900">{newScore}</span>
          {diff !== 0 && (
            <div className={`flex items-center gap-1 ${improved ? 'text-score-green-fg' : 'text-score-red-fg'}`}>
              {improved ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="text-xs font-semibold">
                {diff > 0 ? '+' : ''}{diff}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Comparison Period
          </div>
          <div className="text-sm text-slate-700">
            {oldDate.toLocaleDateString()} → {newDate.toLocaleDateString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Overall Score
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-slate-900">{oldScores.overall}</span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <span className="text-lg font-semibold text-slate-900">{newScores.overall}</span>
            {newScores.overall !== oldScores.overall && (
              <span className={`text-sm font-semibold ${
                newScores.overall > oldScores.overall ? 'text-score-green-fg' : 'text-score-red-fg'
              }`}>
                ({newScores.overall > oldScores.overall ? '+' : ''}{newScores.overall - oldScores.overall})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Category Scores */}
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-3">Category Scores</h4>
        <div className="space-y-1">
          {oldScores.categories.map((oldCat) => {
            const newCat = newScores.categories.find(c => c.id === oldCat.id);
            if (!newCat) return null;
            return compareScore(oldCat.score, newCat.score, oldCat.title);
          })}
        </div>
      </div>

      {/* Key Metrics */}
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-3">Key Metrics</h4>
        <div className="space-y-1">
          {compareValue(
            oldData.inbodyWeightKg,
            newData.inbodyWeightKg,
            'Weight (kg)',
            (v) => {
              const num = parseFloat(String(v ?? ''));
              return !isNaN(num) ? `${num.toFixed(1)} kg` : 'N/A';
            }
          )}
          {compareValue(
            oldData.inbodyBodyFatPct,
            newData.inbodyBodyFatPct,
            'Body Fat %',
            (v) => {
              const num = parseFloat(String(v ?? ''));
              return !isNaN(num) ? `${num.toFixed(1)}%` : 'N/A';
            }
          )}
          {compareValue(
            oldData.inbodyBmi,
            newData.inbodyBmi,
            'BMI',
            (v) => {
              const num = parseFloat(String(v ?? ''));
              return !isNaN(num) ? num.toFixed(1) : 'N/A';
            }
          )}
          {compareValue(
            oldData.cardioVo2MaxEstimate,
            newData.cardioVo2MaxEstimate,
            'VO2 Max Estimate',
            (v) => {
              const num = parseFloat(String(v ?? ''));
              return !isNaN(num) ? `${num.toFixed(1)} ml/kg/min` : 'N/A';
            }
          )}
          {compareValue(
            oldData.inbodyScore,
            newData.inbodyScore,
            'Body Comp Score',
            (v) => {
              const num = parseFloat(String(v ?? ''));
              return !isNaN(num) ? num.toFixed(0) : 'N/A';
            }
          )}
          {compareValue(
            oldData.visceralFatLevel,
            newData.visceralFatLevel,
            'Visceral Fat Level',
            (v) => {
              const num = parseFloat(String(v ?? ''));
              return !isNaN(num) ? num.toFixed(0) : 'N/A';
            }
          )}
          {compareValue(
            oldData.skeletalMuscleMassKg,
            newData.skeletalMuscleMassKg,
            'Muscle Mass (kg)',
            (v) => {
              const num = parseFloat(String(v ?? ''));
              return !isNaN(num) ? `${num.toFixed(1)} kg` : 'N/A';
            }
          )}
          {compareValue(
            oldData.cardioRestingHr,
            newData.cardioRestingHr,
            'Resting HR',
            (v) => {
              const num = parseFloat(String(v ?? ''));
              return !isNaN(num) ? `${num} bpm` : 'N/A';
            }
          )}
          {compareValue(
            oldData.gripLeftKg,
            newData.gripLeftKg,
            'Grip Strength (L)',
            (v) => {
              const num = parseFloat(String(v ?? ''));
              return !isNaN(num) ? `${num.toFixed(1)} kg` : 'N/A';
            }
          )}
          {compareValue(
            oldData.pushupsOneMinuteReps,
            newData.pushupsOneMinuteReps,
            'Push-ups (1 min)',
            (v) => {
              const num = parseFloat(String(v ?? ''));
              return !isNaN(num) ? `${num} reps` : 'N/A';
            }
          )}
        </div>
      </div>
    </div>
  );
};


