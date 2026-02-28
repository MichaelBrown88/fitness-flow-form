import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, ClipboardList, Share2, Check, X } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

interface GettingStartedChecklistProps {
  hasClients: boolean;
  hasAssessments: boolean;
  hasSharedReport: boolean;
}

const DISMISSED_KEY = 'oa_checklist_dismissed';

export function GettingStartedChecklist({
  hasClients,
  hasAssessments,
  hasSharedReport,
}: GettingStartedChecklistProps) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === '1'; } catch { return false; }
  });

  const allDone = hasClients && hasAssessments && hasSharedReport;

  useEffect(() => {
    if (allDone) {
      try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* noop */ }
    }
  }, [allDone]);

  if (dismissed || allDone) return null;

  const steps = [
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

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* noop */ }
  };

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 sm:p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Getting Started</h3>
          <p className="text-xs text-slate-500 mt-0.5">Complete these steps to get the most out of One Assess.</p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          title="Don't show again"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {steps.map((step) => {
          const content = (
            <div
              className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                step.done
                  ? 'bg-white/50 opacity-60'
                  : 'bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-sm cursor-pointer'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                step.done ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
              }`}>
                {step.done ? <Check className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${step.done ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-slate-400">{step.description}</p>
              </div>
            </div>
          );

          if (step.done || !step.href) {
            return <div key={step.label}>{content}</div>;
          }

          return (
            <Link key={step.label} to={step.href}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
