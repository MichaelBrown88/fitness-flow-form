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
    <div className="flex items-start gap-3 rounded-xl border border-gradient-medium/50 bg-gradient-light/70 px-4 py-3 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-on-brand-tint" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded-lg p-1 text-on-brand-tint transition-colors hover:bg-primary/10 hover:opacity-90"
        aria-label="Dismiss hint"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default InlineHint;
