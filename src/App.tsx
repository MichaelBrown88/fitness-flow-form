import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import React, { Suspense, lazy } from 'react';
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { ThemeManager } from "./components/layout/ThemeManager";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ImpersonationBanner } from "./components/ImpersonationBanner";
import { ReloadPrompt } from "./components/pwa/ReloadPrompt";
const InstallPrompt = lazy(() => import("./components/pwa/InstallPrompt").then(m => ({ default: m.InstallPrompt })));

// Lazy load heavy page components
const Landing = lazy(() => import("./pages/Landing"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const SignOut = lazy(() => import("./pages/SignOut"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AssessmentReport = lazy(() => import("./pages/AssessmentReport"));
const PublicReportViewer = lazy(() => import("./pages/PublicReportViewer"));
const Settings = lazy(() => import("./pages/Settings"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Companion = lazy(() => import("./pages/Companion"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const OrgAdmin = lazy(() => import("./pages/OrgAdmin"));

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

/** Redirect authenticated users straight to /dashboard; show Landing to visitors */
const AuthAwareLanding = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
};

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
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
    <TooltipProvider>
      <Toaster />
      <ReloadPrompt />
      <Suspense fallback={null}><InstallPrompt /></Suspense>
          <AuthProvider>
            <ThemeManager>
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
              <ErrorBoundary>
              <ImpersonationBanner />
              <Suspense fallback={
                <div className="flex min-h-screen items-center justify-center bg-slate-50">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-primary animate-spin" />
                    <p className="text-xs font-medium text-slate-400">Loading experience...</p>
                  </div>
                </div>
              }>
                  <Routes>
                    {/* Root: landing for visitors, dashboard redirect for authenticated */}
                    <Route path="/" element={<AuthAwareLanding />} />
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
                    {/* Public client-facing report (no auth) - Token-based secure sharing */}
                    <Route
                      path="/r/:token"
                      element={<PublicReportViewer />}
                    />
                    {/* Token-scoped achievements (no auth required) */}
                    <Route
                      path="/r/:token/achievements"
                      element={<Achievements />}
                    />
                    {/* Legacy share route redirects to token-based URL */}
                    <Route
                      path="/share/:coachUid/:assessmentId"
                      element={<Navigate to="/" replace />}
                    />
                    {/* Protected routes (auth required) */}
                    <Route
                      path="/dashboard"
                      element={
                        <RequireAuth>
                          <Dashboard />
                        </RequireAuth>
                      }
                    />
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
                      path="/coach/assessments/:id"
                      element={
                        <RequireAuth>
                          <AssessmentReport />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/client/:clientName"
                      element={
                        <RequireAuth>
                          <ClientDetail />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <RequireAuth>
                          <Settings />
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
                      path="/org/dashboard"
                      element={
                        <RequireAuth>
                          <OrgAdmin />
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
                    <Route path="/admin/setup" element={<PlatformSetup />} />
                    <Route path="/admin" element={<PlatformDashboard />} />
                    <Route path="/admin/organizations/:orgId" element={<OrganizationManage />} />
                    
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
              </BrowserRouter>
            </ThemeManager>
          </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
