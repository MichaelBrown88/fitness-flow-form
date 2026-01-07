import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAssessmentById, type AssessmentRecord } from '@/services/assessments';
import type { PriorityBand } from '@/lib/negativeOutcomes';

const priorityStyles: Record<PriorityBand, string> = {
  P1: 'border-red-200 bg-red-50 text-red-700',
  P2: 'border-amber-200 bg-amber-50 text-amber-700',
  P3: 'border-sky-200 bg-sky-50 text-sky-700',
};

const priorityLabels: Record<PriorityBand, string> = {
  P1: 'P1 • Health / Metabolic',
  P2: 'P2 • Movement Foundations',
  P3: 'P3 • Performance',
};

const trainingSessionCategories = {
  'leg-day': {
    title: 'Leg Day',
    exercises: ['squat', 'lunge', 'hinge', 'deadlift', 'glute', 'leg press', 'step-up', 'split squat', 'box squat'],
  },
  'upper-body-push': {
    title: 'Upper Body Push',
    exercises: ['pushup', 'press', 'bench', 'overhead'],
  },
  'upper-body-pull': {
    title: 'Upper Body Pull',
    exercises: ['pull', 'row', 'chin', 'lat'],
  },
  'core-stability': {
    title: 'Core & Stability',
    exercises: ['plank', 'bridge', 'balance', 'stability', 'core'],
  },
  'mobility-recovery': {
    title: 'Mobility & Recovery',
    exercises: ['stretch', 'foam roll', 'mobil', 'recovery', 'flexibility'],
  },
  'cardio-conditioning': {
    title: 'Cardio & Conditioning',
    exercises: ['cardio', 'treadmill', 'bike', 'run', 'conditioning'],
  },
};

const categorizeExercise = (action: string): string => {
  const lowerAction = action.toLowerCase();
  for (const [key, category] of Object.entries(trainingSessionCategories)) {
    if (category.exercises.some(exercise => lowerAction.includes(exercise))) {
      return key;
    }
  }
  return 'general-programming';
};

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<AssessmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        const data = await getAssessmentById(id);
        if (!data) {
          setError('No assessment found for the requested id.');
        }
        setRecord(data);
      } catch (err) {
        setError((err as Error)?.message ?? 'Unable to load the requested assessment.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const computedResult = record?.computedResult;
  const input = record?.input;

  const roadmapByPhase = useMemo(() => {
    if (!computedResult) {
      return [] as {
        phase: string;
        phaseTitle: string;
        timeframe: string;
        items: string[];
      }[];
    }

    const grouped: Record<
      string,
      { phaseTitle: string; timeframe: string; items: string[] }
    > = {};

    for (const item of computedResult.clientRoadmap) {
      if (!grouped[item.phase]) {
        grouped[item.phase] = {
          phaseTitle: item.phaseTitle,
          timeframe: item.timeframe,
          items: [],
        };
      }
      grouped[item.phase].items.push(item.focus);
    }

    return Object.entries(grouped)
      .map(([key, value]) => ({ phase: key, ...value }))
      .sort((a, b) => a.phase.localeCompare(b.phase));
  }, [computedResult]);

  const strengths = computedResult?.strengths ?? [];

  const coachGuideBySession = useMemo(() => {
    const list = computedResult?.coachGuide ?? [];
    if (!list.length) return {};

    const grouped: Record<string, typeof list> = {};

    for (const item of list) {
      const category = categorizeExercise(item.action);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    }

    // Sort each category by priority (P1 first)
    for (const category of Object.keys(grouped)) {
      grouped[category].sort((a, b) => {
        const priorityOrder = { P1: 0, P2: 1, P3: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    }

    return grouped;
  }, [computedResult?.coachGuide]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-16 text-slate-600">
        <div className="mx-auto max-w-xl text-center text-sm">Loading assessment…</div>
      </div>
    );
  }

  if (error || !record || !input || !computedResult) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-xl space-y-4 rounded-lg border border-slate-200 bg-white p-6 text-slate-700">
          <h1 className="text-lg font-semibold">Assessment unavailable</h1>
          <p className="text-sm text-slate-500">{error ?? 'Result not found. Please generate a new assessment.'}</p>
          <Button 
            onClick={() => {
              // Clear any partial assessment data to ensure full assessment
              sessionStorage.removeItem('partialAssessment');
              navigate('/assessment');
            }} 
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            Start New Assessment
          </Button>
        </div>
      </div>
    );
  }

  const handlePrint = () => window.print();

  return (
    <AppShell
      title={input.fullName || 'Client Results'}
      subtitle={`${input.assignedCoach || 'Coach'} · Assessment Summary`}
      actions={
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              // Clear any partial assessment data to ensure full assessment
              sessionStorage.removeItem('partialAssessment');
              navigate('/assessment');
            }}
          >
            New Assessment
          </Button>
          <Button onClick={handlePrint} className="bg-slate-900 text-white hover:bg-slate-800">
            Print
          </Button>
        </div>
      }
    >
      <Tabs defaultValue="client" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="client">Client Results</TabsTrigger>
          <TabsTrigger value="coach">Coach's Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="client" className="space-y-8 mt-6">
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Executive Summary</h2>
                <p className="text-sm text-slate-600">{computedResult.clientSummary}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                {computedResult.timelineNote}
              </div>
              <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <span className="font-medium text-slate-700">Coach Perspective:</span>{' '}
                  {computedResult.coachSummary}
                </div>
                <div className="grid gap-1">
                  <div>
                    <span className="font-medium text-slate-700">Sessions / Week:</span>{' '}
                    {computedResult.metadata.sessionsPerWeek || 'Not set'}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Primary Goals:</span>{' '}
                    {computedResult.metadata.clientGoals.length
                      ? computedResult.metadata.clientGoals.join(', ')
                      : 'Not specified'}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">PAR-Q+ Status:</span>{' '}
                    {computedResult.metadata.parqStatus === 'yes'
                      ? 'Positive response – clearance required'
                      : 'Clear'}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Client Roadmap</h2>
            <p className="mt-1 text-sm text-slate-500">
              Share this section with the client to outline focus areas by phase.
            </p>
            <div className="mt-4 space-y-4">
              {roadmapByPhase.length === 0 ? (
                <p className="text-sm text-slate-500">No adjustments required at this stage.</p>
              ) : (
                roadmapByPhase.map((group) => (
                  <div key={group.phase} className="rounded-md border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">{group.phaseTitle}</span>
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        {group.timeframe}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {group.items.map((focus, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                          <span>{focus}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Strength Highlights</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              {strengths.length === 0 ? (
                <p>
                  We will establish baseline strengths during the next training block. Re-test in 4–6
                  weeks to capture progress.
                </p>
              ) : (
                strengths.map((strength) => (
                  <div key={strength.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="font-medium text-slate-800">{strength.description}</p>
                    <p className="text-xs text-slate-500">{strength.phaseTitle}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <footer className="pb-8 text-xs text-slate-400">
            Rules engine version {computedResult.rulesVersion}. Generated on{' '}
            {new Date().toLocaleDateString()}.
          </footer>
        </TabsContent>

        <TabsContent value="coach" className="space-y-8 mt-6">
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Coach's Guide</h2>
              <p className="text-sm text-slate-500">
                Prioritized interventions organized by training session type.
              </p>
            </div>

            {Object.keys(coachGuideBySession).length === 0 ? (
              <p className="text-sm text-slate-500">
                No risk items flagged. Maintain current training progression and reassess quarterly.
              </p>
            ) : (
              <div className="space-y-6">
                {Object.entries(coachGuideBySession).map(([category, items]) => (
                  <div key={category} className="rounded-lg border border-slate-200 p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {trainingSessionCategories[category as keyof typeof trainingSessionCategories]?.title || 'General Programming'}
                      </h3>
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        {items.length} item{items.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {items.map((item) => (
                        <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{item.testName}</p>
                              <p className="text-xs text-slate-500">
                                {item.phaseTitle} · {priorityLabels[item.priority]}
                              </p>
                            </div>
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-medium ${priorityStyles[item.priority]}`}
                            >
                              {item.priority}
                            </span>
                          </div>
                          <div className="mt-3 space-y-2 text-sm text-slate-600">
                            <p className="font-medium text-slate-800">{item.finding}</p>
                            <p>{item.action}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

export default Results;
