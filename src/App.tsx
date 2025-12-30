import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeManager } from "./components/layout/ThemeManager";

// Lazy load heavy page components
const Index = lazy(() => import("./pages/Index"));
const Results = lazy(() => import("./pages/Results"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AssessmentReport = lazy(() => import("./pages/AssessmentReport"));
const PublicClientReport = lazy(() => import("./pages/PublicClientReport"));
const Settings = lazy(() => import("./pages/Settings"));
const Companion = lazy(() => import("./pages/Companion"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));

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
                    <Route path="/login" element={<Login />} />
                    {/* Public client-facing report (no auth) */}
                    <Route
                      path="/share/:coachUid/:assessmentId"
                      element={<PublicClientReport />}
                    />
                    <Route
                      path="/"
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
                    {/* Companion mode (Mobile view) - No RequireAuth because it uses a token */}
                    <Route path="/companion/:sessionId" element={<Companion />} />
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
