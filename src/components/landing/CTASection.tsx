import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function CTASection() {
  const { user } = useAuth();

  return (
    <section className="py-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Assessment Process?
          </h2>
          <p className="text-lg text-indigo-100 mb-10 max-w-2xl mx-auto">
            Join hundreds of fitness professionals who are saving time and delivering better results 
            with evidence-based assessments powered by our Clinical Logic Engine.
          </p>
          
          {user ? (
            <Button asChild size="lg" className="bg-white text-indigo-600 hover:bg-indigo-50 px-8 h-14 text-lg rounded-2xl shadow-xl">
              <Link to="/dashboard">
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="bg-white text-indigo-600 hover:bg-indigo-50 px-8 h-14 text-lg rounded-2xl shadow-xl">
                <Link to="/onboarding">
                  Start Your Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <p className="text-indigo-200 text-sm">No credit card required</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

