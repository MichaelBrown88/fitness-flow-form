import { Activity } from 'lucide-react';

export function UnderTheHood() {
  return (
    <section className="py-24 px-6 bg-slate-900 text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-xs font-semibold text-indigo-300 mb-6">
              <Activity size={12} />
              Clinical Logic Engine
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
              Data, not just <br /> <span className="text-indigo-400">pretty pictures.</span>
            </h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              We don't just capture images. We analyze over 360 distinct data points against 5,000+ clinical benchmarks to generate actionable insights for your clients.
            </p>
            
            <div className="space-y-6">
              {[
                { title: "Normative Comparison", desc: "Compare client metrics against age/gender matched population averages." },
                { title: "Risk Stratification", desc: "Identify musculoskeletal risks before they become injuries." },
                { title: "Trend Analysis", desc: "Detect micro-improvements that standard scales miss." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-indigo-400 font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">{item.title}</h4>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-600/20 blur-[100px] rounded-full"></div>
            <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-3xl p-8">
              <div className="flex items-center justify-between mb-8 border-b border-slate-700 pb-4">
                <span className="text-sm font-mono text-slate-400">PROCESSING_job_ID_8829</span>
                <span className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  LIVE
                </span>
              </div>
              
              <div className="space-y-4 font-mono text-sm">
                <div className="flex items-center gap-3 text-slate-300">
                  <span className="text-indigo-400">➜</span>
                  <span>Ingesting image data...</span>
                  <span className="ml-auto text-slate-500">Done</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <span className="text-indigo-400">➜</span>
                  <span>Extracting landmarks...</span>
                  <span className="ml-auto text-slate-500">32pts</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <span className="text-indigo-400">➜</span>
                  <span>Calculating craniovertebral angle...</span>
                  <span className="ml-auto text-amber-400">42° (Low)</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <span className="text-indigo-400">➜</span>
                  <span>Generating recommendations...</span>
                  <span className="ml-auto text-slate-500">3 items</span>
                </div>
              </div>

              <div className="mt-8 p-4 bg-indigo-900/30 border border-indigo-500/30 rounded-xl">
                 <p className="text-xs text-indigo-300 uppercase font-bold mb-2">Insight Generated</p>
                 <p className="text-white font-medium">"Forward head posture detected. Recommend chin tucks and thoracic extension exercises."</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
