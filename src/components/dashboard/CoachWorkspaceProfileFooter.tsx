import { Link } from 'react-router-dom';
import {
  Building2,
  ChevronUp,
  CreditCard,
  Gift,
  Globe,
  Languages,
  LifeBuoy,
  LogOut,
  BarChart3,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOrgAdminNavVisibility } from '@/hooks/useOrgAdminNavVisibility';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROUTES } from '@/constants/routes';
import {
  COACH_WORKSPACE_PROFILE_COPY,
  COACH_WORKSPACE_SUPPORT_EMAIL,
} from '@/constants/coachWorkspaceProfileCopy';
import { coachPlanSubtitle } from '@/lib/utils/coachPlanSubtitle';
import { cn } from '@/lib/utils';

interface CoachWorkspaceProfileFooterProps {
  variant: 'sidebar' | 'floating';
  showTeamTab: boolean;
}

export function CoachWorkspaceProfileFooter({ variant, showTeamTab }: CoachWorkspaceProfileFooterProps) {
  const { user, loading, signOut, orgSettings, profile } = useAuth();
  const showOrgAdminNav = useOrgAdminNavVisibility();

  const customBrandingEnabled =
    orgSettings?.customBrandingEnabled === true || orgSettings?.customBrandingEnabled === undefined;
  const rawLogo = orgSettings?.logoUrl?.trim();
  const logoUrl =
    customBrandingEnabled && rawLogo && rawLogo.length > 0 ? rawLogo : null;

  const displayName = user?.displayName || profile?.displayName || 'Coach';
  const planLine = coachPlanSubtitle(orgSettings?.subscription);

  const plansLabel = showOrgAdminNav
    ? COACH_WORKSPACE_PROFILE_COPY.PLANS_BILLING
    : COACH_WORKSPACE_PROFILE_COPY.PLANS_PRICING;
  const plansTo = showOrgAdminNav ? ROUTES.BILLING : ROUTES.PRICING;

  const giftMailto = `mailto:${COACH_WORKSPACE_SUPPORT_EMAIL}?subject=${encodeURIComponent(
    COACH_WORKSPACE_PROFILE_COPY.GIFT_EMAIL_SUBJECT,
  )}`;

  if (loading || !user) {
    return null;
  }

  const mark = (
    <img
      src={logoUrl ?? '/favicon.svg'}
      alt=""
      className="h-8 w-8 shrink-0 rounded-md object-contain"
      width={32}
      height={32}
      decoding="async"
    />
  );

  const triggerInner = (
    <>
      {mark}
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-semibold text-foreground leading-tight">{displayName}</p>
        <p className="truncate text-xs text-muted-foreground leading-tight">{planLine}</p>
      </div>
      <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'h-auto gap-2 px-2 py-2 font-normal hover:bg-muted/80',
            variant === 'sidebar' && 'w-full justify-start rounded-lg',
            variant === 'floating' &&
              'fixed bottom-3 left-3 z-40 w-[min(100vw-1.5rem,260px)] justify-start rounded-xl border border-border bg-card shadow-md',
          )}
          aria-label={COACH_WORKSPACE_PROFILE_COPY.MENU_TRIGGER_ARIA}
        >
          {triggerInner}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align={variant === 'floating' ? 'start' : 'start'}
        className="w-56"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={ROUTES.SETTINGS} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {COACH_WORKSPACE_PROFILE_COPY.SETTINGS}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={plansTo} className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {plansLabel}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={ROUTES.CONTACT} className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4" />
            {COACH_WORKSPACE_PROFILE_COPY.HELP}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={giftMailto} className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            {COACH_WORKSPACE_PROFILE_COPY.GIFT}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`${ROUTES.SETTINGS}?tab=profile`} className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            {COACH_WORKSPACE_PROFILE_COPY.LANGUAGE}
          </Link>
        </DropdownMenuItem>
        {showTeamTab ? (
          <DropdownMenuItem asChild>
            <Link to={ROUTES.DASHBOARD_TEAM} className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {COACH_WORKSPACE_PROFILE_COPY.TEAM}
            </Link>
          </DropdownMenuItem>
        ) : null}
        {showOrgAdminNav ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={ROUTES.ORG_DASHBOARD} className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {COACH_WORKSPACE_PROFILE_COPY.ORG_ADMIN}
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={ROUTES.HOME} className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {COACH_WORKSPACE_PROFILE_COPY.WEBSITE}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive flex items-center gap-2"
          onClick={() => {
            void signOut();
          }}
        >
          <LogOut className="h-4 w-4" />
          {COACH_WORKSPACE_PROFILE_COPY.SIGN_OUT}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
