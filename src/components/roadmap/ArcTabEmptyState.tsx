import { Map } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ArcTabEmptyStateProps {
  reportToken: string;
}

/**
 * Friendly empty state when the client has a valid report but no published ARC yet.
 */
export function ArcTabEmptyState({ reportToken }: ArcTabEmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Map className="h-7 w-7 text-primary" aria-hidden />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-foreground">Your ARC™ is on the way</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your coach is preparing your personalised journey plan. Check back soon — you will see
          phases and milestones here once it is published.
        </p>
      </div>
      <Button variant="outline" size="sm" className="rounded-xl" asChild>
        <Link to={`/r/${reportToken}`}>Back to your AXIS report</Link>
      </Button>
    </div>
  );
}
