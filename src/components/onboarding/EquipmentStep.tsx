import { Scale, Timer, Dumbbell, Check, Smartphone } from 'lucide-react';
import type { EquipmentConfig } from '@/types/onboarding';
import { useState } from 'react';

interface EquipmentStepProps {
  data?: Partial<EquipmentConfig>;
  onNext: (data: EquipmentConfig) => void;
  onBack: () => void;
}

export function EquipmentStep({ data, onNext, onBack }: EquipmentStepProps) {
  const [scanner, setScanner] = useState(data?.scanner ?? false);
  const [treadmill, setTreadmill] = useState(data?.treadmill ?? false);
  const [dynamometer, setDynamometer] = useState(data?.dynamometer ?? false);

  const handleSubmit = () => {
    // Map the simple toggles to our EquipmentConfig format
    const equipmentConfig: EquipmentConfig = {
      scanner,
      treadmill,
      dynamometer,
      // Map scanner to bodyCompositionMethod
      bodyCompositionMethod: scanner ? 'inbody' : 'measurements',
      // Map dynamometer to gripStrengthEnabled
      gripStrengthEnabled: dynamometer,
      gripStrengthMethod: dynamometer ? 'dynamometer' : 'none',
    };
    
    onNext(equipmentConfig);
  };

  return (
    <div className="space-y-8 animate-fade-in-up max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <h3 className="text-3xl font-bold text-slate-900 mb-2">Configure Protocols</h3>
        <p className="text-slate-500">Toggle what you have. We'll auto-enable alternative test logic for what you don't.</p>
      </div>

      {/* Equipment Cards Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Scanner Card */}
        <div
          onClick={() => setScanner(!scanner)}
          className={`relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 overflow-hidden ${
            scanner ? 'bg-white border-indigo-600 shadow-2xl shadow-indigo-100/50' : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-start mb-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${scanner ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
              <Scale size={28} />
            </div>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${scanner ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
              {scanner && <Check size={16} />}
            </div>
          </div>
          <h4 className="text-xl font-bold text-slate-900 mb-1">BIA Scanner</h4>
          <p className="text-sm text-slate-500 mb-6 min-h-[40px]">InBody, Evolt, Tanita or other connected scales.</p>

          <div className={`p-4 rounded-xl text-xs font-bold transition-colors ${scanner ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
            {scanner ? '✓ Digital Integration Active' : '✨ Enabling Tape & Skinfold UI'}
          </div>
        </div>

        {/* Treadmill Card */}
        <div
          onClick={() => setTreadmill(!treadmill)}
          className={`relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 overflow-hidden ${
            treadmill ? 'bg-white border-indigo-600 shadow-2xl shadow-indigo-100/50' : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-start mb-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${treadmill ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
              <Timer size={28} />
            </div>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${treadmill ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
              {treadmill && <Check size={16} />}
            </div>
          </div>
          <h4 className="text-xl font-bold text-slate-900 mb-1">Cardio Equip.</h4>
          <p className="text-sm text-slate-500 mb-6 min-h-[40px]">Treadmill, Bike or Rower with watt/speed readout.</p>

          <div className={`p-4 rounded-xl text-xs font-bold transition-colors ${treadmill ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
            {treadmill ? '✓ Protocol Library Active' : '✨ Enabling Step-Test UI'}
          </div>
        </div>

        {/* Dynamometer Card */}
        <div
          onClick={() => setDynamometer(!dynamometer)}
          className={`relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 overflow-hidden ${
            dynamometer ? 'bg-white border-indigo-600 shadow-2xl shadow-indigo-100/50' : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-start mb-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${dynamometer ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
              <Dumbbell size={28} />
            </div>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${dynamometer ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
              {dynamometer && <Check size={16} />}
            </div>
          </div>
          <h4 className="text-xl font-bold text-slate-900 mb-1">Dynamometer</h4>
          <p className="text-sm text-slate-500 mb-6 min-h-[40px]">Hand-grip strength testing device.</p>

          <div className={`p-4 rounded-xl text-xs font-bold transition-colors ${dynamometer ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
            {dynamometer ? '✓ Input Fields Active' : '✨ Enabling Dead-Hang UI'}
          </div>
        </div>
      </div>

      {/* Mobile Scanning Note */}
      <div className="bg-white/50 border border-indigo-100 p-6 rounded-2xl flex items-center gap-4 max-w-2xl mx-auto shadow-sm">
        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
          <Smartphone size={24} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-indigo-900">Mobile Scanning Engine</h4>
          <p className="text-sm text-slate-600">AI Posture Analysis, ROM testing, and Sit-and-Reach computer vision are <b>automatically enabled</b> for all devices.</p>
        </div>
      </div>

      {/* Mobile Scanning Note */}
      <div className="bg-white/50 border border-indigo-100 p-6 rounded-2xl flex items-center gap-4 max-w-2xl mx-auto shadow-sm">
        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
          <Smartphone size={24} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-indigo-900">Mobile Scanning Engine</h4>
          <p className="text-sm text-slate-600">
            Since you're on iOS/iPadOS, AI Posture Analysis, ROM testing, and Sit-and-Reach computer vision are <b>automatically enabled</b> for your build.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 h-12 rounded-2xl bg-white border border-slate-200 font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-slate-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 h-12 rounded-2xl bg-slate-900 text-white font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95"
        >
          Continue
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
