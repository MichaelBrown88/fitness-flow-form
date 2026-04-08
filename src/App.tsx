import { ROUTES } from "@/constants/routes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import React, { Suspense, lazy } from 'react';
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { ThemeManager } from "./components/layout/ThemeManager";
import { ThemeModeProvider } from "./contexts/ThemeModeContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
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
const DashboardAssistant = lazy(() => import("./pages/dashboard/DashboardAssistant"));
const DashboardWork = lazy(() => import("./pages/dashboard/DashboardWork"));
const DashboardArtifacts = lazy(() => import("./pages/dashboard/DashboardArtifacts"));
const DashboardSchedule = lazy(() => import("./pages/dashboard/DashboardSchedule"));
const DashboardCalendar = lazy(() => import("./pages/dashboard/DashboardCalendar"));
const DashboardTeam = lazy(() => import("./pages/dashboard/DashboardTeam"));
const AssessmentReport = lazy(() => import("./pages/AssessmentReport"));
const PublicReportViewer = lazy(() => import("./pages/PublicReportViewer"));
const Settings = lazy(() => import("./pages/Settings"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Companion = lazy(() => import("./pages/Companion"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const ClientDetailLayout = lazy(() => import("./pages/client/ClientDetailLayout"));
const ClientOverview = lazy(() => import("./pages/client/ClientOverview"));
const ClientHistory = lazy(() => import("./pages/client/ClientHistory"));
const ClientRoadmapTab = lazy(() => import("./pages/client/ClientRoadmapTab"));
const ClientReportTab = lazy(() => import("./pages/client/ClientReportTab"));
const ClientAchievementsTab = lazy(() => import("./pages/client/ClientAchievementsTab"));
const ClientSettings = lazy(() => import("./pages/client/ClientSettings"));
const OrgAdminLayout = lazy(() => import("./pages/org/OrgAdminLayout"));
const OrgOverview = lazy(() => import("./pages/org/OrgOverview"));
const OrgTeam = lazy(() => import("./pages/org/OrgTeam"));
const OrgRetention = lazy(() => import("./pages/org/OrgRetention"));
const OrgBilling = lazy(() => import("./pages/org/OrgBilling"));
const OrgIntegrations = lazy(() => import("./pages/org/OrgIntegrations"));
const AssessmentComparison = lazy(() => import("./pages/AssessmentComparison"));
const Billing = lazy(() => import("./pages/Billing"));
const BillingSuccess = lazy(() => import("./pages/BillingSuccess"));
const Subscribe = lazy(() => import("./pages/Subscribe"));
const ClientRoadmap = lazy(() => import("./pages/ClientRoadmap"));
const PublicRoadmapViewer = lazy(() => import("./pages/PublicRoadmapViewer"));
const PublicLifestyleCheckin = lazy(() => import("./pages/PublicLifestyleCheckin"));
const PublicRemoteAssessment = lazy(() => import("./pages/PublicRemoteAssessment"));

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeModeProvider>
    <TooltipProvider>
      <Toaster />
      <ReloadPrompt />
      <Suspense
        fallback={
          <div className="min-h-0 shrink-0" aria-hidden />
        }
      >
        <InstallPrompt />
      </Suspense>
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
                    {/* Onboarding - allows unauthenticated access (will create account at step 1) */}
                    <Route path="/onboarding" element={<Onboarding />} />
                    {/* Zero-friction sandbox trial — no sign-up required */}
                    <Route path="/try" element={<SandboxTrial />} />
                    {/* Public client-facing report (no auth) - Token-based secure sharing */}
                    <Route
                      path="/r/:token"
                      element={<PublicReportViewer />}
                    />
                    <Route
                      path="/r/:token/roadmap"
                      element={<PublicRoadmapViewer />}
                    />
                    {/* Token-scoped achievements (no auth required) */}
                    <Route
                      path="/r/:token/achievements"
                      element={<Achievements />}
                    />
                    <Route
                      path="/r/:token/lifestyle"
                      element={<PublicLifestyleCheckin />}
                    />
                    <Route path="/remote/:token" element={<PublicRemoteAssessment />} />
                    <Route
                      path="/r/:token/erasure"
                      element={<RequestErasure />}
                    />

                    {/* Legacy share route redirects to token-based URL */}
                    <Route
                      path="/share/:coachUid/:assessmentId"
                      element={<Navigate to="/" replace />}
                    />
                    {/* Protected routes (auth required) */}
                    <Route path="/dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
                      <Route index element={<DashboardClients />} />
                      <Route path="clients" element={<DashboardClients />} />
                      <Route path="assistant" element={<DashboardAssistant />} />
                      <Route path="work" element={<DashboardWork />} />
                      <Route path="artifacts" element={<DashboardArtifacts />} />
                      <Route path="schedule" element={<DashboardSchedule />} />
                      <Route path="calendar" element={<DashboardCalendar />} />
                      <Route path="team" element={<DashboardTeam />} />
                    </Route>
                    <Route
                      path="/assessment"
                      element={
                        <RequireAuth>
                          <Index />
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
                    <Route path="/client/:clientName" element={<RequireAuth><ClientDetailLayout /></RequireAuth>}>
                      <Route index element={<ClientOverview />} />
                      <Route path="report" element={<ClientReportTab />} />
                      <Route path="roadmap" element={<ClientRoadmapTab />} />
                      <Route path="achievements" element={<ClientAchievementsTab />} />
                      <Route path="coaches-report" element={<Navigate to=".." replace />} />
                      <Route path="history" element={<ClientHistory />} />
                      <Route path="settings" element={<ClientSettings />} />
                    </Route>
                    <Route
                      path="/settings"
                      element={
                        <RequireAuth>
                          <Settings />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path={ROUTES.SETTINGS_BILLING}
                      element={
                        <RequireAuth>
                          <Navigate to={ROUTES.BILLING} replace />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/achievements"
                      element={
                        <RequireAuth>
                          <Achievements />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/compare"
                      element={
                        <RequireAuth>
                          <AssessmentComparison />
                        </RequireAuth>
                      }
                    />
                    <Route path="/org/dashboard" element={<RequireAuth><OrgAdminLayout /></RequireAuth>}>
                      <Route index element={<OrgOverview />} />
                      <Route path="team" element={<OrgTeam />} />
                      <Route path="retention" element={<OrgRetention />} />
                      <Route path="billing" element={<OrgBilling />} />
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
                    <Route
                      path="/coach/clients/:name/roadmap"
                      element={
                        <RequireAuth>
                          <ClientRoadmap />
                        </RequireAuth>
                      }
                    />
                    {/* Companion mode (Mobile view) - No RequireAuth because it uses a token */}
                    <Route path="/companion/:sessionId" element={<Companion />} />
                    
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
