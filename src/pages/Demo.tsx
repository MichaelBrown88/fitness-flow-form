import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar, Footer } from '@/components/landing';
import { DEMO_SCORES, DEMO_GOALS, DEMO_PLAN, DEMO_FORM_DATA } from '@/constants/demoData';
import { Seo } from '@/components/seo/Seo';
import { ROUTES } from '@/constants/routes';
import { requireSeoForPath } from '@/constants/seo';

const demoSeo = requireSeoForPath(ROUTES.DEMO);
import type { FormData } from '@/contexts/FormContext';

const ClientReport = lazy(() => import('@/components/reports/ClientReport'));

export default function Demo() {
  return (
    <div className="min-h-screen bg-white">
      <Seo
        pathname={ROUTES.DEMO}
        title={demoSeo.title}
        description={demoSeo.description}
        noindex={demoSeo.noindex}
      />
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all group"
          >
            Start Free Trial
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-[0.1em]">
              Interactive Demo
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            Sample Client Report
          </h1>
          <p className="text-slate-500 max-w-lg mx-auto">
            This is what your clients see after an assessment. Scroll through
            to explore the full report experience.
          </p>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xl bg-white">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-32">
                <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
              </div>
            }
          >
            <ClientReport
              scores={DEMO_SCORES}
              goals={DEMO_GOALS}
              formData={DEMO_FORM_DATA as unknown as FormData}
              plan={DEMO_PLAN}
              bodyComp={{ timeframeWeeks: '8-12' }}
              standalone={false}
            />
          </Suspense>
        </div>

        <div className="text-center mt-12 mb-8">
          <p className="text-sm text-slate-400 mb-4">
            Ready to create reports like this for your clients?
          </p>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all group"
          >
            Start Free Trial
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
