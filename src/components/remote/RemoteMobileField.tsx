import { Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const mobileInputClass =
  'h-14 rounded-2xl border-border bg-muted/50 px-4 text-lg focus-visible:ring-2 focus-visible:ring-primary/30';

export function RemoteMobileTextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  inputMode,
  readOnly,
  showLabel = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  readOnly?: boolean;
  /** When false, question is shown only in the shell header (one-question flow). */
  showLabel?: boolean;
}) {
  return (
    <div className="space-y-2">
      {showLabel ? (
        <Label className="text-sm font-medium text-foreground">{label}</Label>
      ) : null}
      <Input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className={cn(mobileInputClass, readOnly && 'opacity-80')}
      />
    </div>
  );
}

/** Full-width tappable options with wrapped text (native mobile pattern). */
export function RemoteMobileChoiceField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2" role="listbox" aria-label="Choose one option">
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-base leading-snug transition-colors',
              selected
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-foreground active:bg-muted',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
              )}
              aria-hidden
            >
              {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
            </span>
            <span className="min-w-0 flex-1 break-words">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** @deprecated Use RemoteMobileChoiceField — kept as alias for imports. */
export const RemoteMobileSelectField = RemoteMobileChoiceField;

export function RemoteMobileYesNoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: 'yes' | 'no') => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-base font-medium leading-snug text-foreground">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        {(['no', 'yes'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              'h-14 rounded-2xl border-2 text-base font-semibold capitalize transition-colors',
              value === opt
                ? opt === 'yes'
                  ? 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground active:bg-muted',
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
