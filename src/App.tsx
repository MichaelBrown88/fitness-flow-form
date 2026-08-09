import { ROUTES } from "@/constants/routes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import React, { Suspense, lazy, type JSX } from 'react';
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { ThemeManager } from "./components/layout/ThemeManager";
import { ThemeModeProvider } from "./contexts/ThemeModeContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { RouteErrorBoundary } from "./components/ui/RouteErrorBoundary";
import { ImpersonationBanner } from "./components/ImpersonationBanner";
import { MaintenanceBanner } from "./components/MaintenanceBanner";
import { ReloadPrompt } from "./components/pwa/ReloadPrompt";
const InstallPrompt = lazy(() => import("./components/pwa/InstallPrompt").then(m => ({ default: m.InstallPrompt })));

// Lazy load heavy page components
const Landing = lazy(() => import("./pages/Landing"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const SignOut = lazy(() => import("./pages/SignOut"));
const DashboardLayout = lazy(() => import("./pages/dashboard/DashboardLayout"));
const DashboardClients = lazy(() => import("./pages/dashboard/DashboardClients"));
const DashboardTeam = lazy(() => import("./pages/dashboard/DashboardTeam"));
const AssessmentReport = lazy(() => import("./pages/AssessmentReport"));
const PublicReportViewer = lazy(() => import("./pages/PublicReportViewer"));
const ClientPortalEntry = lazy(() => import("./pages/ClientPortalEntry"));
const Settings = lazy(() => import("./pages/Settings"));
const Companion = lazy(() => import("./pages/Companion"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const ClientDetailLayout = lazy(() => import("./pages/client/ClientDetailLayout"));
const ClientTimelineTab = lazy(() => import("./pages/client/ClientTimelineTab"));
const ClientOverview = lazy(() => import("./pages/client/ClientOverview"));
const ClientHistory = lazy(() => import("./pages/client/ClientHistory"));
const ClientReportTab = lazy(() => import("./pages/client/ClientReportTab"));
const ClientCoachNotesTab = lazy(() => import("./pages/client/ClientCoachNotesTab"));
const ClientSettings = lazy(() => import("./pages/client/ClientSettings"));
const OrgAdminLayout = lazy(() => import("./pages/org/OrgAdminLayout"));
const OrgOverview = lazy(() => import("./pages/org/OrgOverview"));
const OrgTeam = lazy(() => import("./pages/org/OrgTeam"));
const OrgRetention = lazy(() => import("./pages/org/OrgRetention"));
// OrgBilling route now redirects to /billing — lazy import removed
const OrgIntegrations = lazy(() => import("./pages/org/OrgIntegrations"));
const Billing = lazy(() => import("./pages/Billing"));
const BillingSuccess = lazy(() => import("./pages/BillingSuccess"));
const Subscribe = lazy(() => import("./pages/Subscribe"));
const PublicRemoteAssessment = lazy(() => import("./pages/PublicRemoteAssessment"));
const RemoteIntakeEntry = lazy(() => import("./pages/RemoteIntakeEntry"));

const RequestErasure = lazy(() => import("./pages/RequestErasure"));
const SandboxTrial = lazy(() => import("./pages/SandboxTrial"));

// Platform admin pages (separate from org admin)
const PlatformLogin = lazy(() => import("./pages/admin/PlatformLogin"));
const PlatformDashboard = lazy(() => import("./pages/admin/PlatformDashboard"));
const PlatformSetup = lazy(() => import("./pages/admin/PlatformSetup"));
const OrganizationManage = lazy(() => import("./pages/admin/OrganizationManage"));

// Legal pages
const Terms = lazy(() => import("./pages/legal/Terms"));
const Privacy = lazy(() => import("./pages/legal/Privacy"));
const Cookies = lazy(() => import("./pages/legal/Cookies"));

// Static pages
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Blog = lazy(() => import("./pages/Blog"));
const Demo = lazy(() => import("./pages/Demo"));

// Internal design explorations
const AxisExplorations = lazy(() => import("./pages/AxisExplorations"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    },
  },
});

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-foreground-secondary">
        Checking coach session…
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
};

/**
 * Redirect /settings → /dashboard/settings, preserving query + hash so
 * deep links like /settings?tab=billing still land on the right tab.
 */
function SettingsRedirect() {
  const { search, hash } = useLocation();
  return <Navigate to={`/dashboard/settings${search}${hash}`} replace />;
}

/**
 * Redirect /client/:name/* → /dashboard/clients/:name/* (preserves sub-tab,
 * query, and hash). Lots of in-app navigation still uses the old literal
 * path; this catches them transparently while we migrate call sites over.
 */
function ClientDetailRedirect() {
  const { clientName } = useParams();
  const { pathname, search, hash } = useLocation();
  const subPath = clientName
    ? pathname.replace(/^\/client\/[^/]+/, '')
    : '';
  const target = `/dashboard/clients/${clientName ?? ''}${subPath}${search}${hash}`;
  return <Navigate to={target} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeModeProvider>
    <TooltipProvider>
      <Toaster />
      <ReloadPrompt />
          <AuthProvider>
            <ThemeManager>
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
              <ErrorBoundary>
              <MaintenanceBanner />
              <ImpersonationBanner />
              <Suspense
                fallback={
                  <div className="min-h-0 shrink-0" aria-hidden />
                }
              >
                <InstallPrompt />
              </Suspense>
              <Suspense
                fallback={
                  <div
                    className="flex min-h-screen items-center justify-center bg-background"
                    aria-busy="true"
                    aria-live="polite"
                    role="status"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <span className="sr-only">Loading One Assess</span>
                      <div className="h-12 w-12 rounded-full border-4 border-muted border-t-primary motion-safe:animate-spin" />
                      <p className="text-xs font-medium text-muted-foreground" aria-hidden>
                        Loading One Assess…
                      </p>
                    </div>
                  </div>
                }
              >
                  <Routes>
                    {/* Root: marketing landing for everyone; signed-in users use Navbar → Dashboard */}
                    <Route path="/" element={<Landing />} />
                    {/* Pricing: same marketing plans as landing #pricing */}
                    <Route path={ROUTES.PRICING} element={<Landing />} />
                    <Route path="/signup" element={<Onboarding />} /> {/* Redirect signup to onboarding */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signout" element={<SignOut />} /> {/* Force sign out route */}
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/cookies" element={<Cookies />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/demo" element={<Demo />} />
                    {/* Internal AXIS signature design comparison (no auth — sample data) */}
                    <Route path="/axis-explorations" element={<AxisExplorations />} />
                    {/* Onboarding - allows unauthenticated access (will create account at step 1) */}
                    <Route path="/onboarding" element={<Onboarding />} />
                    {/* Zero-friction sandbox trial — no sign-up required */}
                    <Route path="/try" element={<SandboxTrial />} />
                    {/* Client portal entry — PWA start_url lands here; redirects to last token */}
                    <Route path="/r" element={<ClientPortalEntry />} />
                    {/* Public client-facing report (no auth) - Token-based secure sharing */}
                    <Route
                      path="/r/:token"
                      element={<RouteErrorBoundary title="Report unavailable" body="This report couldn't be loaded. The link may be invalid or expired." homeTo="/"><PublicReportViewer /></RouteErrorBoundary>}
                    />
                    <Route path="/remote" element={<RemoteIntakeEntry />} />
                    <Route path="/remote/:token" element={<PublicRemoteAssessment />} />
                    <Route
                      path="/r/:token/erasure"
                      element={<RequestErasure />}
                    />

                    {/* Legacy share routes — feature removed */}
                    <Route
                      path="/share/*"
                      element={<Navigate to="/" replace />}
                    />
                    {/* Protected routes (auth required) */}
                    <Route path="/dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
                      <Route index element={<Navigate to="clients" replace />} />
                      <Route path="clients" element={<DashboardClients />} />
                      <Route path="clients/:clientName" element={<ClientDetailLayout />}>
                        <Route index element={<ClientOverview />} />
                        <Route path="overview" element={<Navigate to="." replace />} />
                        <Route path="report" element={<ClientReportTab />} />
                        <Route path="coach-notes" element={<Navigate to="../timeline#notes" replace />} />
                        <Route path="coaches-report" element={<Navigate to=".." replace />} />
                        <Route path="history" element={<Navigate to="../timeline" replace />} />
                        <Route path="timeline" element={<ClientTimelineTab />} />
                        <Route path="settings" element={<ClientSettings />} />
                      </Route>
                      <Route path="work" element={<Navigate to="../clients" replace />} />
                      <Route path="team" element={<DashboardTeam />} />
                      <Route path="settings" element={<Settings />} />
                    </Route>
                    <Route
                      path="/assessment"
                      element={
                        <RequireAuth>
                          <RouteErrorBoundary title="Assessment error" body="Something went wrong in the assessment flow. Your data is saved — return to the dashboard and try again." homeTo={ROUTES.DASHBOARD}>
                            <Index />
                          </RouteErrorBoundary>
                        </RequireAuth>
                      }
                    />
                    {/* Legacy /results/:id route - redirect to coach assessment view */}
                    <Route
                      path="/results/:id"
                      element={<Navigate to="/dashboard" replace />}
                    />
                    <Route
                      path="/coach/assessments/:id/client"
                      element={
                        <RequireAuth>
                          <AssessmentReport />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/coach/assessments/:id"
                      element={
                        <RequireAuth>
                          <AssessmentReport />
                        </RequireAuth>
                      }
                    />
                    {/* Legacy /client/:name → /dashboard/clients/:name (preserves sub-path + query). */}
                    <Route path="/client/:clientName/*" element={<ClientDetailRedirect />} />
                    {/* Legacy /settings → /dashboard/settings (preserves query string + hash). */}
                    <Route path="/settings" element={<SettingsRedirect />} />
                    <Route
                      path={ROUTES.SETTINGS_BILLING}
                      element={
                        <RequireAuth>
                          <Navigate to={ROUTES.BILLING} replace />
                        </RequireAuth>
                      }
                    />
                    <Route path="/org/dashboard" element={<RequireAuth><OrgAdminLayout /></RequireAuth>}>
                      <Route index element={<OrgOverview />} />
                      <Route path="team" element={<OrgTeam />} />
                      <Route path="retention" element={<OrgRetention />} />
                      <Route path="billing" element={<Navigate to={ROUTES.BILLING} replace />} />
                      <Route path="integrations" element={<OrgIntegrations />} />
                    </Route>
                    <Route
                      path="/billing"
                      element={
                        <RequireAuth>
                          <Billing />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/billing/success"
                      element={
                        <RequireAuth>
                          <BillingSuccess />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path={ROUTES.SUBSCRIBE}
                      element={
                        <RequireAuth>
                          <Subscribe />
                        </RequireAuth>
                      }
                    />
                    {/* Companion mode (Mobile view) - No RequireAuth because it uses a token */}
                    <Route path="/companion/:sessionId" element={<RouteErrorBoundary title="Session error" body="The companion session encountered an error. Close this window and rejoin from the assessment." homeTo="/"><Companion /></RouteErrorBoundary>} />
                    
                    {/* Legacy portal routes - clients now use /r/:token */}
                    <Route path="/portal/login" element={<Navigate to="/" replace />} />
                    <Route path="/portal" element={<Navigate to="/" replace />} />

                    {/* Platform admin routes (separate from org admin) */}
                    <Route path="/admin/login" element={<PlatformLogin />} />
                    <Route path="/admin/setup" element={<RequireAuth><PlatformSetup /></RequireAuth>} />
                    <Route path="/admin" element={<RequireAuth><PlatformDashboard /></RequireAuth>} />
                    <Route path="/admin/organizations/:orgId" element={<RequireAuth><OrganizationManage /></RequireAuth>} />
                    
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
              </BrowserRouter>
            </ThemeManager>
          </AuthProvider>
    </TooltipProvider>
    </ThemeModeProvider>
  </QueryClientProvider>
);

export default App;
