/**
 * Equipment Step (Step 3)
 *
 * Toggles for: BIA Scanner, Cardio Equipment, Dynamometer.
 * Fixed: duplicate Mobile Scanning Note removed.
 */

import { Scale, Timer, Dumbbell, Check, Smartphone } from 'lucide-react';
import type { EquipmentConfig } from '@/types/onboarding';
import { useState } from 'react';

interface EquipmentStepProps {
  data?: Partial<EquipmentConfig>;
  onNext: (data: EquipmentConfig) => void;
  onSkip?: () => void;
  onBack: () => void;
}

interface EquipmentCardProps {
  active: boolean;
  onToggle: () => void;
  icon: React.ElementType;
  title: string;
  description: string;
  activeLabel: string;
  inactiveLabel: string;
}

function EquipmentCard({ active, onToggle, icon: Icon, title, description, activeLabel, inactiveLabel }: EquipmentCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full text-left p-5 rounded-xl border-2 transition-colors ${
        active
          ? 'bg-white border-slate-900 shadow-sm'
          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          active ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'
        }`}>
          <Icon size={20} />
        </div>
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          active ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-300'
        }`}>
          {active && <Check size={14} />}
        </div>
      </div>
      <h4 className="text-sm font-bold text-slate-900 mb-0.5">{title}</h4>
      <p className="text-xs text-slate-500 mb-3">{description}</p>
      <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
        active ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700'
      }`}>
        {active ? activeLabel : inactiveLabel}
      </div>
    </button>
  );
}

export function EquipmentStep({ data, onNext, onSkip, onBack }: EquipmentStepProps) {
  const [scanner, setScanner] = useState(data?.scanner ?? false);
  const [treadmill, setTreadmill] = useState(data?.treadmill ?? false);
  const [dynamometer, setDynamometer] = useState(data?.dynamometer ?? false);

  const handleSubmit = () => {
    const equipmentConfig: EquipmentConfig = {
      scanner,
      treadmill,
      dynamometer,
      bodyCompositionMethod: scanner ? 'bioimpedance' : 'measurements',
      gripStrengthEnabled: dynamometer,
      gripStrengthMethod: dynamometer ? 'dynamometer' : 'none',
    };
    onNext(equipmentConfig);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Configure your protocols</h2>
        <p className="text-sm text-slate-500">Toggle what you have. We auto-enable alternatives for what you don't.</p>
      </div>

      <div className="space-y-3">
        <EquipmentCard
          active={scanner}
          onToggle={() => setScanner(!scanner)}
          icon={Scale}
          title="BIA Scanner"
          description="BIA analyser (e.g. InBody, Evolt, Tanita) or other connected scales."
          activeLabel="Digital integration active"
          inactiveLabel="Tape & skinfold UI enabled"
        />
        <EquipmentCard
          active={treadmill}
          onToggle={() => setTreadmill(!treadmill)}
          icon={Timer}
          title="Cardio Equipment"
          description="Treadmill, Bike or Rower with watt/speed readout."
          activeLabel="Protocol library active"
          inactiveLabel="Step-test UI enabled"
        />
        <EquipmentCard
          active={dynamometer}
          onToggle={() => setDynamometer(!dynamometer)}
          icon={Dumbbell}
          title="Dynamometer"
          description="Hand-grip strength testing device."
          activeLabel="Input fields active"
          inactiveLabel="Dead-hang UI enabled"
        />
      </div>

      {/* Mobile Scanning Note (single instance) */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
          <Smartphone size={16} />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-700">Mobile Scanning Engine</p>
          <p className="text-xs text-slate-500 mt-0.5">
            AI Posture Analysis, ROM testing, and Sit-and-Reach computer vision are automatically enabled for all devices.
          </p>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="h-12 px-6 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 h-12 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors"
        >
          Continue
        </button>
      </div>
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="w-full text-center text-xs text-slate-400 hover:text-slate-600 font-medium py-1 transition-colors"
        >
          I'll configure this later
        </button>
      )}
    </div>
  );
}
