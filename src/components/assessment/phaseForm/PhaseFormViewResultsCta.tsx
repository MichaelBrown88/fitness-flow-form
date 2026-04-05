import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PhaseFormViewResultsCtaProps {
  visible: boolean;
  buttonText: string;
  /** Opens pre-results review (primary action may still be disabled inside the dialog). */
  onClick: () => void;
}

export function PhaseFormViewResultsCta({ visible, buttonText, onClick }: PhaseFormViewResultsCtaProps) {
  if (!visible) return null;
  return (
    <div className="flex items-center justify-center border-t border-border pt-8">
      <Button
        type="button"
        variant="default"
        size="lg"
        onClick={onClick}
        className={cn('h-14 min-h-11 rounded-lg px-10 font-bold shadow-none')}
      >
        {buttonText}
      </Button>
    </div>
  );
}
