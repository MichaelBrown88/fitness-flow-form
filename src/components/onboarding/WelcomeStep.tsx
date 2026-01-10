interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full max-w-2xl mx-auto animate-fade-in-up">
      <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-8 rotate-3 hover:rotate-6 transition-transform">
        <span className="text-white font-bold text-3xl">FF</span>
      </div>
      <h2 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
        Welcome to <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">FitnessFlow.</span>
      </h2>
      <p className="text-xl text-slate-500 mb-12 leading-relaxed">
        Let's build a custom version of the platform tailored specifically to your facility's equipment and business model.
      </p>
      <button 
        onClick={onNext}
        className="px-10 py-4 bg-slate-900 text-white rounded-full font-bold text-lg hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-xl"
      >
        Start Setup
      </button>
    </div>
  );
}
