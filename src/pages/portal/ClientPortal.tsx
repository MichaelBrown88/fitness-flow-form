/**
 * Client Portal
 * 
 * Air-gapped client-facing dashboard showing their assessment scores,
 * upcoming assessments, and history.
 * 
 * Completely separate from coach/admin UI per .cursorrules Air-Gap principle.
 */

import { useState, lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useClientPortal } from '@/hooks/useClientPortal';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { 
  LogOut, Activity, Scale, Heart, Dumbbell, 
  Brain, Leaf, Calendar, TrendingUp, User,
  Camera, FileText
} from 'lucide-react';

// Lazy load capture components (heavy: webcam + OCR)
const ClientBodyCompScan = lazy(() => import('@/components/portal/ClientBodyCompScan').then(m => ({ default: m.ClientBodyCompScan })));
const ClientPostureCapture = lazy(() => import('@/components/portal/ClientPostureCapture').then(m => ({ default: m.ClientPostureCapture })));
import { getPillarLabel } from '@/constants/pillars';

function ScoreCard({ 
  label, 
  score, 
  icon: Icon, 
  color 
}: { 
  label: string; 
  score: number | null; 
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      {score !== null ? (
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-slate-900">{Math.round(score)}</span>
          <span className="text-xs text-slate-400">/100</span>
        </div>
      ) : (
        <span className="text-sm text-slate-400">Not assessed</span>
      )}
    </div>
  );
}

export default function ClientPortal() {
  const { profile, signOut, orgSettings } = useAuth();
  const { data, loading, error } = useClientPortal();
  const [activeCapture, setActiveCapture] = useState<'bodycomp' | 'posture' | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm mx-auto mb-3 animate-pulse">
            FF
          </div>
          <p className="text-sm text-slate-500">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const pillarCards = [
    { label: getPillarLabel('bodyComp', 'full'), score: data?.latestScores.bodyComp ?? null, icon: Scale, color: 'bg-blue-50 text-blue-600' },
    { label: getPillarLabel('cardio', 'full'), score: data?.latestScores.cardio ?? null, icon: Heart, color: 'bg-red-50 text-red-500' },
    { label: getPillarLabel('strength', 'full'), score: data?.latestScores.strength ?? null, icon: Dumbbell, color: 'bg-amber-50 text-amber-600' },
    { label: getPillarLabel('movementQuality', 'full'), score: data?.latestScores.movementQuality ?? null, icon: Brain, color: 'bg-purple-50 text-purple-600' },
    { label: getPillarLabel('lifestyle', 'full'), score: data?.latestScores.lifestyle ?? null, icon: Leaf, color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              FF
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 leading-none">
                {orgSettings?.name || 'FitnessFlow'}
              </p>
              <p className="text-[10px] text-slate-400">Client Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-slate-500 h-9"
            >
              <LogOut className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">
                Welcome, {data?.clientName || profile?.displayName || 'Client'}
              </h1>
              {data?.coachName && (
                <p className="text-xs text-white/70">Coach: {data.coachName}</p>
              )}
            </div>
          </div>
          
          {/* Overall score */}
          {data?.latestScores.overall !== null && data?.latestScores.overall !== undefined && (
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-black">{Math.round(data.latestScores.overall)}</span>
              <span className="text-sm text-white/60">/100 overall score</span>
            </div>
          )}

          <div className="flex items-center gap-4 mt-4 text-xs text-white/70">
            {data?.lastAssessmentDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Last assessed: {data.lastAssessmentDate.toLocaleDateString()}
              </div>
            )}
            {data?.assessmentCount !== undefined && data.assessmentCount > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {data.assessmentCount} assessment{data.assessmentCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Pillar Scores */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Your Scores
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {pillarCards.map((card) => (
              <ScoreCard
                key={card.label}
                label={card.label}
                score={card.score}
                icon={card.icon}
                color={card.color}
              />
            ))}
          </div>
        </div>

        {/* Self-Service Capture */}
        {activeCapture ? (
          <Suspense fallback={
            <div className="bg-white rounded-2xl border p-8 text-center">
              <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-violet-500 animate-spin mx-auto" />
            </div>
          }>
            {activeCapture === 'bodycomp' && (
              <ClientBodyCompScan
                onComplete={() => setActiveCapture(null)}
                onCancel={() => setActiveCapture(null)}
              />
            )}
            {activeCapture === 'posture' && (
              <ClientPostureCapture
                onComplete={() => setActiveCapture(null)}
                onCancel={() => setActiveCapture(null)}
              />
            )}
          </Suspense>
        ) : (
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Submit to Your Coach
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveCapture('bodycomp')}
                className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm text-left hover:border-violet-300 hover:shadow-md transition-all active:scale-[0.98] min-h-[80px]"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mb-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-xs font-semibold text-slate-700">Body Comp Scan</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Photo your report</p>
              </button>
              <button
                onClick={() => setActiveCapture('posture')}
                className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm text-left hover:border-violet-300 hover:shadow-md transition-all active:scale-[0.98] min-h-[80px]"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center mb-2">
                  <Camera className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-xs font-semibold text-slate-700">Posture Photos</p>
                <p className="text-[10px] text-slate-400 mt-0.5">4-view capture</p>
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {(!data || data.assessmentCount === 0) && !activeCapture && (
          <div className="bg-white rounded-2xl border border-slate-200/60 p-8 text-center shadow-sm">
            <div className="w-14 h-14 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <Activity className="w-6 h-6 text-violet-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-2">No assessments yet</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              Your coach will schedule your first assessment. You&apos;ll see your results here once it&apos;s complete.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
