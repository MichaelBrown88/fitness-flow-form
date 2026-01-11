import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import React, { Suspense, lazy } from 'react';
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { ThemeManager } from "./components/layout/ThemeManager";

// Lazy load heavy page components
const Landing = lazy(() => import("./pages/Landing"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Index = lazy(() => import("./pages/Index"));
const Results = lazy(() => import("./pages/Results"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const SignOut = lazy(() => import("./pages/SignOut"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AssessmentReport = lazy(() => import("./pages/AssessmentReport"));
const PublicClientReport = lazy(() => import("./pages/PublicClientReport"));
const PublicReportByToken = lazy(() => import("./pages/PublicReportByToken"));
const Settings = lazy(() => import("./pages/Settings"));
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

const queryClient = new QueryClient();

// ...

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
      <Sonner />
          <AuthProvider>
            <ThemeManager>
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
              <Suspense fallback={
                <div className="flex min-h-screen items-center justify-center bg-slate-50">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-primary animate-spin" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading experience...</p>
                  </div>
                </div>
              }>
                  <Routes>
                    {/* Public routes (no auth required) */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/signup" element={<Onboarding />} /> {/* Redirect signup to onboarding */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signout" element={<SignOut />} /> {/* Force sign out route */}
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    {/* Onboarding - allows unauthenticated access (will create account at step 1) */}
                    <Route path="/onboarding" element={<Onboarding />} />
                    {/* Public client-facing report (no auth) - Token-based secure sharing */}
                    <Route
                      path="/r/:token"
                      element={<PublicReportByToken />}
                    />
                    {/* Legacy route for backward compatibility */}
                    <Route
                      path="/share/:coachUid/:assessmentId"
                      element={<PublicClientReport />}
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
                    <Route
                      path="/results/:id"
                      element={
                        <RequireAuth>
                          <Results />
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
                      path="/org/dashboard"
                      element={
                        <RequireAuth>
                          <OrgAdmin />
                        </RequireAuth>
                      }
                    />
                    {/* Companion mode (Mobile view) - No RequireAuth because it uses a token */}
                    <Route path="/companion/:sessionId" element={<Companion />} />
                    
                    {/* Platform admin routes (separate from org admin) */}
                    <Route path="/admin/login" element={<PlatformLogin />} />
                    <Route path="/admin/setup" element={<PlatformSetup />} />
                    <Route path="/admin" element={<PlatformDashboard />} />
                    <Route path="/admin/organizations/:orgId" element={<OrganizationManage />} />
                    
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </ThemeManager>
          </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
