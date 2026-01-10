import { Brain, BarChart3, Users, Shield, X, Check, ArrowRight } from 'lucide-react';

const GlassCard: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`backdrop-blur-2xl bg-white/60 border border-white/50 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:bg-white/80 transition-all duration-500 ${className}`}>
    {children}
  </div>
);

export function FeaturesSection() {
  const features = [
    { title: "Clinical Logic Engine", icon: Brain, desc: "Checks 360+ data points against 5,000+ clinical benchmarks automatically." },
    { title: "Gamified Progress", icon: BarChart3, desc: "Turn health data into a score your clients want to improve. Retention built-in." },
    { title: "Team Management", icon: Users, desc: "Standardize assessments across all your coaches. One method, one brand." },
    { title: "Secure & Private", icon: Shield, desc: "Enterprise-grade encryption. Your client data is safe and HIPAA/GDPR compliant." },
  ];

  return (
    <section id="features" className="py-32 px-6 relative bg-slate-50">
       <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900">Why Top Facilities Switch to <span className="text-indigo-600">FitnessFlow</span></h2>
            <p className="text-slate-500 text-lg mb-8 leading-relaxed">
              Disjointed tools lead to disjointed client experiences. By bringing assessment, reporting, and tracking into one platform, you save time and look more professional.
            </p>
            <div className="grid gap-6">
              {features.map((f, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0 text-indigo-600">
                    <f.icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{f.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Compliance Badges */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Certified Compliance</p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">HIPAA</div>
                  <span className="text-xs font-semibold text-blue-900">Compliant</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="w-7 h-7 rounded bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">GDPR</div>
                  <span className="text-xs font-semibold text-indigo-900">Compliant</span>
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
             <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-[40px] rotate-3 opacity-10"></div>
             <GlassCard className="p-8 bg-white border-white/60 shadow-xl relative z-10">
                <div className="space-y-6">
                   {/* Mock Comparison */}
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">The Old Way</span>
                        <X size={16} className="text-red-400" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>Take photo on phone</div>
                        <div className="flex items-center gap-2 text-sm text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>Upload to Drive</div>
                        <div className="flex items-center gap-2 text-sm text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>Type into Excel</div>
                        <div className="flex items-center gap-2 text-sm text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>Write email manually</div>
                      </div>
                   </div>
                   
                   <div className="flex justify-center">
                      <ArrowRight className="text-slate-300 rotate-90 md:rotate-0" />
                   </div>

                   <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">The FitnessFlow Way</span>
                        <Check size={16} className="text-emerald-500" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-indigo-900 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>Scan Client (AI Auto-Capture)</div>
                        <div className="flex items-center gap-2 text-sm text-indigo-900 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>Instant Analysis & Report</div>
                        <div className="flex items-center gap-2 text-sm text-indigo-900 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>Auto-sent to Client</div>
                      </div>
                   </div>
                </div>
             </GlassCard>
          </div>
        </div>
      </div>
    </section>
  );
}
