import { Check, Loader2, AlertCircle } from 'lucide-react';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface SaveStatusProps {
  state: SaveState;
}

export function SaveStatus({ state }: SaveStatusProps) {
  if (state === 'idle') return null;

  const config = {
    saving: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      text: 'Saving...',
      className: 'text-slate-400',
    },
    saved: {
      icon: <Check className="h-3 w-3" />,
      text: 'All changes saved',
      className: 'text-emerald-500',
    },
    error: {
      icon: <AlertCircle className="h-3 w-3" />,
      text: 'Save failed',
      className: 'text-red-500',
    },
  }[state];

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${config.className} transition-opacity`}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}
