import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, ClipboardList, Share2, Check, X, Building2, Wrench, Sparkles, Palette } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

interface GettingStartedChecklistProps {
  hasClients: boolean;
  hasAssessments: boolean;
  hasSharedReport: boolean;
  /** Business name + region saved on the org */
  businessProfileComplete?: boolean;
  /** Coach has opened equipment settings at least once (best-effort; optional) */
  equipmentDetailsDone?: boolean;
  /** Show “subscribe” nudge for gym trial */
  showTrialSubscribeNudge?: boolean;
  /** Custom branding not purchased */
  showBrandingNudge?: boolean;
}

const DISMISSED_KEY = 'oa_checklist_dismissed';

export function GettingStartedChecklist({
  hasClients,
  hasAssessments,
  hasSharedReport,
  businessProfileComplete = false,
  equipmentDetailsDone = false,
  showTrialSubscribeNudge = false,
  showBrandingNudge = false,
}: GettingStartedChecklistProps) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const coreDone = hasClients && hasAssessments && hasSharedReport;
  const optionalAllDone =
    businessProfileComplete &&
    equipmentDetailsDone &&
    (!showTrialSubscribeNudge) &&
    (!showBrandingNudge);
  const allDone = coreDone && optionalAllDone;

  useEffect(() => {
    if (allDone) {
      try {
        localStorage.setItem(DISMISSED_KEY, '1');
      } catch {
        /* noop */
      }
    }
  }, [allDone]);

  if (dismissed || allDone) return null;

  const coreSteps = [
    {
      done: hasClients,
      icon: UserPlus,
      label: 'Add your first client',
      description: 'Start an assessment to automatically create a client profile.',
      href: ROUTES.ASSESSMENT,
    },
    {
      done: hasAssessments,
      icon: ClipboardList,
      label: 'Run their assessment',
      description: 'Complete a full or partial assessment to generate scores.',
      href: ROUTES.ASSESSMENT,
    },
    {
      done: hasSharedReport,
      icon: Share2,
      label: 'Share their report',
      description: 'Send an interactive report link to your client.',
      href: undefined,
    },
  ];

  const optionalSteps = [
    {
      done: businessProfileComplete,
      icon: Building2,
      label: 'Complete business details',
      description: 'Add your public name and region in Settings.',
      href: ROUTES.SETTINGS,
    },
    {
      done: equipmentDetailsDone,
      icon: Wrench,
      label: 'Refine equipment setup',
      description: 'Tune protocols under Organization → Equipment.',
      href: ROUTES.SETTINGS,
    },
    ...(showTrialSubscribeNudge
      ? [
          {
            done: false,
            icon: Sparkles,
            label: 'Subscribe before trial ends',
            description: 'Pick a capacity tier so your team keeps access.',
            href: ROUTES.BILLING,
          },
        ]
      : []),
    ...(showBrandingNudge
      ? [
          {
            done: false,
            icon: Palette,
            label: 'Custom branding (optional)',
            description: 'Preview in Settings; purchase when you want logo on reports.',
            href: `${ROUTES.CONTACT}?interest=custom-branding`,
          },
        ]
      : []),
  ];

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* noop */
    }
  };

  const renderStepRow = (
    step: {
      done: boolean;
      icon: typeof UserPlus;
      label: string;
      description: string;
      href?: string;
    },
    key: string,
  ) => {
    const content = (
      <div
        className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
          step.done
            ? 'bg-white/50 opacity-60'
            : 'bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-sm cursor-pointer'
        }`}
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            step.done ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
          }`}
        >
          {step.done ? <Check className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <p
            className={`text-sm font-semibold ${step.done ? 'line-through text-slate-400' : 'text-slate-900'}`}
          >
            {step.label}
          </p>
          <p className="text-xs text-slate-400">{step.description}</p>
        </div>
      </div>
    );

    if (step.done || !step.href) {
      return <div key={key}>{content}</div>;
    }

    return (
      <Link key={key} to={step.href}>
        {content}
      </Link>
    );
  };

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 sm:p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Getting Started</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete these steps to get the most out of One Assess.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          title="Don't show again"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">{coreSteps.map((s) => renderStepRow(s, s.label))}</div>

      {optionalSteps.length > 0 && (
        <div className="mt-6 pt-4 border-t border-indigo-100/80">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
            When you have time
          </p>
          <div className="space-y-3">
            {optionalSteps.map((s) => renderStepRow(s, `opt-${s.label}`))}
          </div>
        </div>
      )}
    </div>
  );
}
