import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { ArrowRight, ArrowLeft, Scale, Grip } from 'lucide-react';
import {
  BODY_COMPOSITION_METHODS,
  SKINFOLD_METHODS,
  type EquipmentConfig,
} from '@/types/onboarding';
import { useState } from 'react';

interface EquipmentStepProps {
  data?: Partial<EquipmentConfig>;
  onNext: (data: EquipmentConfig) => void;
  onBack: () => void;
}

export function EquipmentStep({ data, onNext, onBack }: EquipmentStepProps) {
  const [bodyCompositionMethod, setBodyCompositionMethod] = useState<EquipmentConfig['bodyCompositionMethod']>(
    data?.bodyCompositionMethod || 'inbody'
  );
  const [skinfoldMethod, setSkinfoldMethod] = useState<EquipmentConfig['skinfoldMethod']>(
    data?.skinfoldMethod || 'jackson-pollock-7'
  );
  const [gripStrengthEnabled, setGripStrengthEnabled] = useState(
    data?.gripStrengthEnabled ?? true
  );

  const handleSubmit = () => {
    onNext({
      bodyCompositionMethod,
      skinfoldMethod: bodyCompositionMethod === 'skinfold' ? skinfoldMethod : undefined,
      gripStrengthEnabled,
      gripStrengthMethod: gripStrengthEnabled ? 'dynamometer' : 'none',
    });
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Configure your assessments
        </h1>
        <p className="text-foreground-secondary">
          Tell us what equipment you have. This customizes your assessment flow so you only see relevant fields.
        </p>
      </div>

      <div className="space-y-8">
        {/* Body Composition Method */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2 text-base">
            <Scale className="w-5 h-5" />
            Body Composition Method
          </Label>
          <p className="text-sm text-foreground-secondary">
            How do you measure body composition? This determines what data fields appear during assessments.
          </p>
          
          <RadioGroup
            value={bodyCompositionMethod}
            onValueChange={(value) => setBodyCompositionMethod(value as EquipmentConfig['bodyCompositionMethod'])}
            className="grid grid-cols-1 gap-2"
          >
            {BODY_COMPOSITION_METHODS.map((method) => (
              <label
                key={method.value}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  bodyCompositionMethod === method.value
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-border hover:border-indigo-200'
                }`}
              >
                <RadioGroupItem value={method.value} className="mt-1" />
                <div className="flex-1">
                  <span className={`font-medium ${
                    bodyCompositionMethod === method.value ? 'text-indigo-600' : 'text-foreground'
                  }`}>
                    {method.label}
                  </span>
                  <p className="text-xs text-foreground-tertiary mt-0.5">
                    {method.description}
                  </p>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Skinfold Method (conditional) */}
        {bodyCompositionMethod === 'skinfold' && (
          <div className="space-y-4 animate-fade-in-up">
            <Label className="text-base">Skinfold Protocol</Label>
            <p className="text-sm text-foreground-secondary">
              Which skinfold measurement protocol do you use?
            </p>
            
            <RadioGroup
              value={skinfoldMethod}
              onValueChange={(value) => setSkinfoldMethod(value as EquipmentConfig['skinfoldMethod'])}
              className="grid grid-cols-1 gap-2"
            >
              {SKINFOLD_METHODS.map((method) => (
                <label
                  key={method.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    skinfoldMethod === method.value
                      ? 'border-indigo-500 bg-indigo-50/50'
                      : 'border-border hover:border-indigo-200'
                  }`}
                >
                  <RadioGroupItem value={method.value} />
                  <span className={`text-sm ${
                    skinfoldMethod === method.value ? 'text-indigo-600 font-medium' : 'text-foreground'
                  }`}>
                    {method.label}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Grip Strength Toggle */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Grip className="w-5 h-5 text-foreground-secondary" />
              </div>
              <div>
                <Label className="text-base cursor-pointer">Grip Strength Testing</Label>
                <p className="text-sm text-foreground-secondary mt-0.5">
                  Do you have a hand dynamometer for grip strength testing?
                </p>
              </div>
            </div>
            <Switch
              checked={gripStrengthEnabled}
              onCheckedChange={setGripStrengthEnabled}
            />
          </div>
          
          {!gripStrengthEnabled && (
            <p className="text-xs text-foreground-tertiary px-4">
              Grip strength fields will be hidden from your assessments.
            </p>
          )}
        </div>

        {/* Summary */}
        <div className="p-4 rounded-xl bg-slate-50 border border-border">
          <h3 className="font-medium text-foreground mb-2">Your Assessment Configuration</h3>
          <ul className="text-sm text-foreground-secondary space-y-1">
            <li>• Body composition: <span className="font-medium text-foreground">
              {BODY_COMPOSITION_METHODS.find(m => m.value === bodyCompositionMethod)?.label}
            </span></li>
            {bodyCompositionMethod === 'skinfold' && (
              <li>• Skinfold protocol: <span className="font-medium text-foreground">
                {SKINFOLD_METHODS.find(m => m.value === skinfoldMethod)?.label}
              </span></li>
            )}
            <li>• Grip strength: <span className="font-medium text-foreground">
              {gripStrengthEnabled ? 'Enabled (dynamometer)' : 'Disabled'}
            </span></li>
          </ul>
          <p className="text-xs text-foreground-tertiary mt-3">
            You can change these settings anytime in Settings → Equipment.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1 h-12 rounded-xl"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="flex-1 h-12 gradient-bg text-white rounded-xl font-semibold"
          >
            Continue
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
