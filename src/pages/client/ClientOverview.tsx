import { useState, type ReactNode } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PILLAR_DISPLAY } from '@/constants/pillars';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Dumbbell,
  Heart,
  Scan,
  UserCheck,
  Target as TargetIcon,
  UserPlus,
  ChevronDown,
} from 'lucide-react';
import type { ClientDetailOutletContext } from './ClientDetailLayout';

function CollapsibleSection({
  title,
  icon,
  badge,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 p-4 sm:p-6 hover:bg-slate-50/50 transition-colors"
      >
        <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 min-w-0 truncate">
          <span className="shrink-0">{icon}</span>
          <span className="truncate">{title}</span>
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          {badge}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && <div className="px-4 sm:px-6 pb-4 sm:pb-6">{children}</div>}
    </div>
  );
}

export default function ClientOverview() {
  const ctx = useOutletContext<ClientDetailOutletContext>();
  const {
    currentAssessment,
    categoryBreakdown,
    categoryChanges,
    stats,
    handleNewAssessment,
  } = ctx;

  return (
    <div className="space-y-8">
      <CollapsibleSection title="Overview" icon={<TrendingUp className="h-5 w-5 text-primary" />}>
        <div className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">Total</div>
            <div className="text-2xl font-bold text-slate-900">{stats.totalAssessments}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">Latest</div>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold text-slate-900">{stats.latestScore}</div>
              {stats.trend !== 'neutral' && (
                <div className={`flex items-center mb-0.5 ${stats.trend === 'up' ? 'text-score-green' : 'text-score-red'}`}>
                  {stats.trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
              )}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">Average</div>
            <div className="text-2xl font-bold text-slate-900">{stats.averageScore}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">Change</div>
            <div className={`text-2xl font-bold ${stats.scoreChange > 0 ? 'text-score-green-fg' : stats.scoreChange < 0 ? 'text-score-red-fg' : 'text-slate-900'}`}>
              {stats.scoreChange > 0 ? '+' : ''}{stats.scoreChange}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Pillar Scores" icon={<Activity className="h-5 w-5 text-primary" />}>
        {!currentAssessment ? (
          <div className="py-12 text-center bg-slate-50 rounded-xl">
            <p className="text-sm text-slate-500 mb-6">No assessment data found for this client.</p>
            <Button onClick={() => handleNewAssessment()} className="bg-slate-900 text-white rounded-xl h-12 px-8">
              <UserPlus className="h-4 w-4 mr-2" />
              Start First Assessment
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { id: 'lifestyle', label: 'Lifestyle Factors', bg: 'bg-primary', icon: Activity },
              { id: 'bodyComp', label: 'Body Composition', bg: 'bg-primary', icon: Scan },
              { id: 'movementQuality', label: 'Movement Quality', bg: 'bg-primary', icon: UserCheck },
              { id: 'strength', label: 'Functional Strength', bg: 'bg-primary', icon: Dumbbell },
              { id: 'cardio', label: 'Metabolic Fitness', bg: 'bg-primary', icon: Heart },
            ].map((cat) => (
              <div key={cat.id} className="text-center p-4 sm:p-5 rounded-xl bg-slate-50 transition-all hover:bg-slate-100">
                <div className="flex justify-center mb-3">
                  <cat.icon className="h-6 w-6 text-primary opacity-80" />
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">{cat.label}</div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{categoryBreakdown[cat.id] || 0}</div>
                {categoryChanges[cat.id] !== undefined && categoryChanges[cat.id] !== 0 && (
                  <div className={`text-[10px] font-bold ${categoryChanges[cat.id]! > 0 ? 'text-score-green-fg' : 'text-score-red-fg'}`}>
                    {categoryChanges[cat.id]! > 0 ? '+' : ''}{categoryChanges[cat.id]}
                  </div>
                )}
                <div className="h-2 w-full bg-slate-200/60 rounded-full overflow-hidden mt-2">
                  <div className={`h-full ${cat.bg}`} style={{ width: `${categoryBreakdown[cat.id] || 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Quick Assessments" icon={<TargetIcon className="h-5 w-5 text-primary" />}>
        <div className="grid gap-2 sm:gap-3 grid-cols-3 sm:grid-cols-5">
          {[
            { id: 'lifestyle', label: PILLAR_DISPLAY.lifestyle.short, icon: Activity },
            { id: 'bodycomp', label: PILLAR_DISPLAY.bodyComp.short, icon: Scan },
            { id: 'posture', label: PILLAR_DISPLAY.movementQuality.short, icon: UserCheck },
            { id: 'strength', label: PILLAR_DISPLAY.strength.short, icon: Dumbbell },
            { id: 'fitness', label: PILLAR_DISPLAY.cardio.short, icon: Heart },
          ].map((action) => (
            <Button
              key={action.id}
              variant="outline"
              onClick={() => handleNewAssessment(action.id as 'lifestyle' | 'bodycomp' | 'posture' | 'strength' | 'fitness')}
              className="flex flex-col items-center gap-2 h-auto py-3 sm:py-4 rounded-xl border-slate-100 hover:border-primary/20 hover:bg-brand-light"
            >
              <action.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em]">{action.label}</span>
            </Button>
          ))}
        </div>
      </CollapsibleSection>

    </div>
  );
}
