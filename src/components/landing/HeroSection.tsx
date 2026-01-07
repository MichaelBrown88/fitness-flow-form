import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function HeroSection() {
  const { user } = useAuth();

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-indigo-100/40 to-purple-100/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-purple-100/30 to-pink-100/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/50 animate-fade-in-up">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium text-indigo-600">
              AI-Powered Fitness Assessments
            </span>
          </div>

          {/* Headline */}
          <h1 
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up"
            style={{ animationDelay: '100ms' }}
          >
            <span className="text-foreground">Transform Your</span>
            <br />
            <span className="gradient-text">Assessment Process</span>
          </h1>

          {/* Subheadline */}
          <p 
            className="text-lg sm:text-xl text-foreground-secondary max-w-2xl mx-auto mb-10 animate-fade-in-up"
            style={{ animationDelay: '200ms' }}
          >
            Professional posture analysis, movement assessments, and automated client reports. 
            Save hours on every assessment while delivering exceptional results.
          </p>

          {/* CTAs */}
          <div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in-up"
            style={{ animationDelay: '300ms' }}
          >
            {user ? (
              <Button asChild size="lg" className="gradient-bg text-white px-8 h-14 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all">
                <Link to="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="gradient-bg text-white px-8 h-14 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all">
                  <Link to="/signup">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="px-8 h-14 text-lg rounded-2xl border-2">
                  <a href="#demo">
                    <Play className="mr-2 h-5 w-5" />
                    See How It Works
                  </a>
                </Button>
              </>
            )}
          </div>

          {/* Social proof */}
          <div 
            className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-foreground-secondary animate-fade-in-up"
            style={{ animationDelay: '400ms' }}
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span>Trusted by 100+ coaches</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-border" />
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <svg key={i} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="ml-1">4.9/5 rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-foreground-tertiary flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-foreground-tertiary rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}

