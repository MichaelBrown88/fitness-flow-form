import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { sendEmailVerification } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import { useOrgAdminNavVisibility } from '@/hooks/useOrgAdminNavVisibility';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronDown, Menu, Building2, LayoutDashboard, Settings, LogOut, Mail, X, Globe, CreditCard } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ClientProfileDropdown } from '@/components/client/ClientProfileDropdown';
import { CommandMenu } from '@/components/ui/CommandMenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AppShell({
  title,
  subtitle,
  actions,
  children,
  onDemoFill,
  showDemoFill,
  variant = 'default',
  onMenuToggle,
  mode = 'coach',
  // New opt-in branding props for public/unauthenticated views
  publicLogoUrl,
  publicOrgName,
  /** Show client nav bar (notifications + profile dropdown) without requiring auth */
  showClientNav,
  /** Share token for token-scoped features (notifications, achievements) */
  shareToken,
  /** Client name for the profile dropdown */
  clientName,
  /** Hide the built-in page title (for pages with custom headers) */
  hideTitle,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  onDemoFill?: () => void;
  showDemoFill?: boolean;
  variant?: 'default' | 'full-width';
  onMenuToggle?: () => void;
  mode?: 'coach' | 'public';
  publicLogoUrl?: string | null;
  publicOrgName?: string;
  /** Show client nav bar (NotificationBell + ClientProfileDropdown) */
  showClientNav?: boolean;
  /** Token for token-scoped notifications/achievements */
  shareToken?: string;
  /** Client display name for public mode */
  clientName?: string;
  /** Hide the built-in page title (for pages with custom headers) */
  hideTitle?: boolean;
}) {
  const { user, loading, signOut, orgSettings, profile } = useAuth();
  const showOrgAdminNav = useOrgAdminNavVisibility();
  const initials =
    user?.displayName?.split(' ').map((n) => n[0]).join('').toUpperCase() ||
    (user?.email ? user.email[0]?.toUpperCase() : 'C');

  const [emailBannerDismissed, setEmailBannerDismissed] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sent' | 'error'>('idle');
  const handleResendVerification = useCallback(async () => {
    if (!user || resendState === 'sent') return;
    try {
      await sendEmailVerification(user);
      setResendState('sent');
    } catch {
      setResendState('error');
    }
  }, [user, resendState]);

  // Paid custom branding, or legacy orgs with no flag set (grandfathered).
  const customBrandingEnabled =
    orgSettings?.customBrandingEnabled === true || orgSettings?.customBrandingEnabled === undefined;
  // Use public branding if provided (for unauthenticated routes), otherwise fallback to auth context. Gate on custom branding.
  const hasOrgLogo = customBrandingEnabled && (publicLogoUrl || (orgSettings?.logoUrl && orgSettings.logoUrl.trim() !== ''));
  const logoUrl = !customBrandingEnabled ? null : (publicLogoUrl !== undefined ? publicLogoUrl : (hasOrgLogo ? orgSettings?.logoUrl : null));
  const orgName = !customBrandingEnabled ? 'One Assess' : (publicOrgName || orgSettings?.name || 'Your Organization');

  if (mode === 'public') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* Header: logo + client nav — semantic tokens for light/dark (DESIGN_SYSTEM) */}
        <header className="bg-card border-b border-border py-3 px-4 sm:px-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {/* Logo */}
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={orgName}
                  className="h-8 w-auto max-w-[150px] object-contain"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full bg-gradient-to-tr from-[hsl(var(--gradient-from))] to-[hsl(var(--gradient-to))] flex items-center justify-center text-primary-foreground font-bold text-sm shadow-md"
                    aria-hidden
                  >
                    OA
                  </div>
                  <span className="font-bold text-foreground">One Assess</span>
                </div>
              )}
            </div>

            {/* Client nav: notification bell + profile dropdown (token-based, no auth required) */}
            {showClientNav && shareToken && (
              <div className="flex items-center gap-1.5">
                <ThemeToggle className="h-9 w-9 text-muted-foreground" />
                <NotificationBell shareToken={shareToken} />
                <ClientProfileDropdown
                  clientName={clientName || 'Client'}
                  shareToken={shareToken}
                />
              </div>
            )}
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto py-8 px-4">
          {children}
        </main>

        <footer className="text-center py-8 text-xs text-muted-foreground border-t border-border/60">
          Powered by One Assess
        </footer>
      </div>
    );
  }

  // Coach mode: full layout with navigation (semantic tokens — aligns with public AppShell + dark mode)
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card sticky top-0 z-50 w-full shrink-0">
        <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 md:px-6 lg:px-10">
          {/* Left side: Logo */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
            {variant === 'full-width' && onMenuToggle && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onMenuToggle}
                className="lg:hidden h-10 w-10 sm:h-9 sm:w-9 text-muted-foreground"
              >
                <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}
            <Link to={ROUTES.DASHBOARD} className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
              {logoUrl ? (
                // Organization custom logo
                <img
                  src={logoUrl}
                  alt={orgName}
                  className="h-6 w-auto sm:h-8 max-w-[120px] sm:max-w-[150px] object-contain"
                />
              ) : (
                // SaaS default logo (One Assess)
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-[hsl(var(--gradient-from))] to-[hsl(var(--gradient-to))] flex items-center justify-center text-primary-foreground font-bold text-[10px] sm:text-sm shadow-md">
                    OA
                  </div>
                  <span className="text-base sm:text-lg font-bold tracking-tight text-foreground hidden sm:inline">One Assess</span>
                </div>
              )}
              {customBrandingEnabled && (
                <div className="hidden leading-tight md:block border-l border-border pl-3 md:pl-4">
                  <p className="text-[10px] sm:text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    {orgName}
                  </p>
                  <p className="text-[10px] sm:text-xs font-semibold text-foreground-secondary">
                    Professional Intake
                  </p>
                </div>
              )}
            </Link>
          </div>

          {/* Right side: actions/user */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
            <ThemeToggle className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground" />
            {showDemoFill && onDemoFill && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDemoFill}
                className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-primary hover:bg-brand-light"
                title="Auto-fill demo data"
              >
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}
            
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
              {actions ? <div className="flex gap-1 sm:gap-2">{actions}</div> : null}

              {user && <NotificationBell />}
              {!loading && (
                user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1 sm:gap-2 rounded-full p-0.5 sm:p-1 hover:bg-muted/60 transition-colors"
                      >
                        <span 
                          className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs sm:text-xs font-bold text-white gradient-bg"
                        >
                          {initials}
                        </span>
                        <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mr-0.5 sm:mr-1" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{user.displayName || 'Coach Account'}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to={ROUTES.DASHBOARD} className="flex items-center gap-2">
                          <LayoutDashboard className="h-4 w-4" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      {showOrgAdminNav && (
                        <DropdownMenuItem asChild>
                          <Link to={ROUTES.ORG_DASHBOARD} className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Org admin
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {showOrgAdminNav && (
                        <DropdownMenuItem asChild>
                          <Link to={ROUTES.BILLING} className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Billing & plans
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link to={ROUTES.SETTINGS} className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={ROUTES.HOME} className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Website
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 flex items-center gap-2"
                        onClick={() => {
                          void signOut();
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <Link to="/login">Coach login</Link>
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Email verification banner */}
      {user && !user.emailVerified && !emailBannerDismissed && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-3 text-sm">
          <Mail className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-amber-800 font-medium">Verify your email — check your inbox</span>
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resendState === 'sent'}
            className="text-xs font-semibold text-amber-700 underline hover:text-amber-900 disabled:opacity-50 disabled:no-underline disabled:cursor-default"
          >
            {resendState === 'sent' ? 'Sent!' : resendState === 'error' ? 'Try again' : 'Resend'}
          </button>
          <button
            type="button"
            onClick={() => setEmailBannerDismissed(true)}
            className="ml-auto text-amber-400 hover:text-amber-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <main className={`flex-1 ${variant === 'default' ? 'mx-auto max-w-7xl w-full px-3 sm:px-4 md:px-6 lg:px-10 py-4 sm:py-6 md:py-8 lg:py-12' : ''}`}>
        {variant === 'default' && !hideTitle && (
          <div className="mb-4 sm:mb-6 space-y-0.5">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground font-medium">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
      <CommandMenu />
    </div>
  );
}
