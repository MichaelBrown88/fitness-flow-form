import { Link } from 'react-router-dom';
import { ArrowRight, Play, FileText, Activity, Scale, Zap, Check, ScanLine, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function HeroSection() {
  const { user } = useAuth();

  return (
    <section className="relative pt-32 pb-20 px-6 min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Soft Pastel Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-blue-100/40 rounded-full blur-[120px] -z-10 animate-blob mix-blend-multiply" />
      <div className="absolute top-1/2 left-0 w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-[120px] -z-10 animate-blob animation-delay-2000 mix-blend-multiply" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-rose-100/40 rounded-full blur-[120px] -z-10 animate-blob animation-delay-4000 mix-blend-multiply" />

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          
          {/* Left: Copy */}
          <div className="text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/60 text-xs font-semibold text-indigo-600 mb-8 backdrop-blur-md shadow-sm animate-fade-in-up">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Clinical Logic Engine V2.0
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-8 text-slate-900 leading-[1.1] animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Turn Assessments into Your Biggest <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">Revenue Engine.</span>
            </h1>
            
            <p className="text-lg text-slate-600 max-w-xl mb-10 leading-relaxed font-medium animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Stop juggling spreadsheets, photos, and notes. Unify InBody scans, AI posture analysis, and lifestyle tracking into one gamified client experience that sells retention for you.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-16 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              {user ? (
                <Link 
                  to="/dashboard"
                  className="px-8 py-4 rounded-full bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 group"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <>
                  <Link 
                    to="/onboarding"
                    className="px-8 py-4 rounded-full bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 group"
                  >
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-8 py-4 rounded-full bg-white/70 border border-white/60 text-slate-900 font-semibold backdrop-blur-md hover:bg-white transition-all shadow-lg shadow-black/5 flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-slate-900" />
                    See Demo
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-6 text-sm font-medium text-slate-500 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200" />
                ))}
              </div>
              <p>Trusted by 100+ Elite Coaches</p>
            </div>
          </div>

          {/* Right: Interactive Report Visual */}
          <div className="relative animate-fade-in-up perspective-1000" style={{ animationDelay: '0.4s' }}>
             {/* Main Report Card */}
             <div 
               className="relative bg-white/60 backdrop-blur-xl border border-white/60 rounded-[40px] shadow-2xl p-8 transition-transform duration-700 hover:rotate-0"
               style={{ transform: 'rotateY(-5deg) rotateX(5deg)' }}
             >
                
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Fitness Score</h3>
                    <p className="text-slate-500 text-sm">Comprehensive Athlete Profile</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-bold text-slate-700">ACTIVE</span>
                  </div>
                </div>

                {/* Radar Chart Visual */}
                <div className="relative h-64 w-full flex items-center justify-center mb-8">
                   {/* Background Circles */}
                   <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-64 h-64 rounded-full border border-slate-200"></div>
                     <div className="w-48 h-48 rounded-full border border-slate-200 absolute"></div>
                     <div className="w-32 h-32 rounded-full border border-slate-200 absolute"></div>
                   </div>
                   
                   {/* The Radar Shape */}
                   <svg viewBox="0 0 100 100" className="w-full h-full absolute drop-shadow-xl">
                      <polygon points="50,15 85,35 75,80 25,80 15,35" fill="rgba(99, 102, 241, 0.2)" stroke="#6366f1" strokeWidth="2" />
                      <circle cx="50" cy="15" r="3" fill="#6366f1" />
                      <circle cx="85" cy="35" r="3" fill="#6366f1" />
                      <circle cx="75" cy="80" r="3" fill="#6366f1" />
                      <circle cx="25" cy="80" r="3" fill="#6366f1" />
                      <circle cx="15" cy="35" r="3" fill="#6366f1" />
                   </svg>

                   {/* Center Score */}
                   <div className="absolute flex flex-col items-center justify-center bg-white rounded-full w-24 h-24 shadow-lg border-4 border-slate-50">
                      <span className="text-3xl font-black text-slate-900">82</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall</span>
                   </div>
                </div>

                {/* Metrics Pills */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-emerald-800 uppercase">Body Comp</p>
                      <p className="text-sm font-bold text-slate-900">18.5% BF</p>
                    </div>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-amber-800 uppercase">Movement</p>
                      <p className="text-sm font-bold text-slate-900">85/100</p>
                    </div>
                  </div>
                </div>
             </div>

             {/* Floating Elements */}
             <div className="absolute -right-8 top-12 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 animate-float">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                      <ScanLine size={20} />
                   </div>
                   <div>
                      <p className="text-xs font-semibold text-slate-500">InBody Scan</p>
                      <p className="text-sm font-bold text-slate-900">Imported</p>
                   </div>
                   <Check className="text-emerald-500 ml-2" size={16} strokeWidth={3} />
                </div>
             </div>

             <div className="absolute -left-6 bottom-24 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                      <Activity size={20} />
                   </div>
                   <div>
                      <p className="text-xs font-semibold text-slate-500">Forward Head</p>
                      <p className="text-sm font-bold text-slate-900">Detected</p>
                   </div>
                   <AlertCircle className="text-amber-500 ml-2" size={16} />
                </div>
             </div>

          </div>
        </div>
      </div>
    </section>
  );
}
