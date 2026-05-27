import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ASSESSMENT_COPY } from '@/constants/assessmentCopy';
import { ROUTES } from '@/constants/routes';

/**
 * `/remote` without a token — coaches often open this URL expecting the app.
 * Clients must use the full link from their coach (`/remote/{token}`).
 */
export default function RemoteIntakeEntry() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="shrink-0 border-b border-border/60 px-4 py-3">
        <div className="mx-auto flex max-w-md items-center gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
            aria-hidden
          >
            OA
          </div>
          <span className="text-sm font-semibold tracking-tight">One Assess</span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-10">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {ASSESSMENT_COPY.REMOTE_ENTRY_TITLE}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {ASSESSMENT_COPY.REMOTE_ENTRY_CLIENT_HINT}
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-5">
          <p className="text-sm font-semibold text-foreground">
            {ASSESSMENT_COPY.REMOTE_ENTRY_COACH_TITLE}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {ASSESSMENT_COPY.REMOTE_ENTRY_COACH_BODY}
          </p>
          <Button asChild className="h-12 w-full rounded-2xl text-base font-semibold">
            <Link to={ROUTES.LOGIN}>Log in to One Assess</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full rounded-2xl">
            <Link to={ROUTES.DASHBOARD}>Go to dashboard</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
