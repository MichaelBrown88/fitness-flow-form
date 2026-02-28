import { useState } from 'react';
import { Info, X } from 'lucide-react';

interface InlineHintProps {
  id: string;
  title: string;
  description: string;
}

const STORAGE_PREFIX = 'hint_dismissed_';

function isHintDismissed(id: string): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${id}`) === '1';
  } catch {
    return false;
  }
}

function dismissHint(id: string): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${id}`, '1');
  } catch {
    // localStorage unavailable — silently ignore
  }
}

const InlineHint = ({ id, title, description }: InlineHintProps) => {
  const [visible, setVisible] = useState(() => !isHintDismissed(id));

  if (!visible) return null;

  const handleDismiss = () => {
    dismissHint(id);
    setVisible(false);
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-indigo-900">{title}</p>
        <p className="mt-0.5 text-indigo-700/80">{description}</p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded-lg p-1 text-indigo-400 transition-colors hover:bg-indigo-100 hover:text-indigo-600"
        aria-label="Dismiss hint"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default InlineHint;
