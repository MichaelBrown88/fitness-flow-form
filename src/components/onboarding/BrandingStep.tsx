import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft, Palette, Users } from 'lucide-react';
import { CLIENT_SEAT_TIERS, type BrandingConfig } from '@/types/onboarding';
import { useState } from 'react';
import { GRADIENT_PALETTE, type GradientId } from '@/lib/design/gradients';

interface BrandingStepProps {
  data?: Partial<BrandingConfig>;
  onNext: (data: BrandingConfig) => void;
  onBack: () => void;
}

export function BrandingStep({ data, onNext, onBack }: BrandingStepProps) {
  const [selectedGradient, setSelectedGradient] = useState<GradientId>(
    (data?.gradientId as GradientId) || 'purple-indigo'
  );
  const [clientSeats, setClientSeats] = useState(data?.clientSeats || 10);

  const gradients = Object.values(GRADIENT_PALETTE);
  const currentGradient = GRADIENT_PALETTE[selectedGradient];

  // Find the tier for the selected seat count
  const selectedTier = CLIENT_SEAT_TIERS.find(t => t.seats === clientSeats) || CLIENT_SEAT_TIERS[0];
  const additionalCost = selectedTier.price;

  const handleSubmit = () => {
    onNext({
      gradientId: selectedGradient,
      clientSeats,
    });
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Customize your brand
        </h1>
        <p className="text-foreground-secondary">
          Choose your brand colors and client capacity. These will be used throughout your reports and client experience.
        </p>
      </div>

      <div className="space-y-8">
        {/* Gradient Selection */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Brand Theme
          </Label>
          
          {/* Gradient grid */}
          <div className="grid grid-cols-4 gap-3">
            {gradients.map((gradient) => (
              <button
                key={gradient.id}
                type="button"
                onClick={() => setSelectedGradient(gradient.id)}
                className={`aspect-square rounded-xl transition-all relative overflow-hidden ${
                  selectedGradient === gradient.id
                    ? 'ring-2 ring-offset-2 ring-slate-900 scale-105'
                    : 'hover:scale-105'
                }`}
                style={{
                  background: `linear-gradient(135deg, ${gradient.fromHex}, ${gradient.toHex})`,
                }}
                title={gradient.name}
              >
                {selectedGradient === gradient.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                      <svg className="w-4 h-4 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
          
          <p className="text-sm text-foreground-secondary">
            Selected: <span className="font-medium">{currentGradient.name}</span>
          </p>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <Label>Preview</Label>
          <div className="p-6 rounded-xl border border-border bg-slate-50/50">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                style={{
                  background: `linear-gradient(135deg, ${currentGradient.fromHex}, ${currentGradient.toHex})`,
                }}
              >
                FF
              </div>
              <div>
                <p className="font-semibold">Your Business Name</p>
                <p className="text-sm text-foreground-secondary">Professional Assessment Report</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{
                  background: `linear-gradient(135deg, ${currentGradient.fromHex}, ${currentGradient.toHex})`,
                }}
              >
                Primary Button
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm font-medium border-2"
                style={{ borderColor: currentGradient.fromHex, color: currentGradient.fromHex }}
              >
                Secondary Button
              </button>
            </div>
            <div className="mt-4 h-2 rounded-full bg-slate-200">
              <div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${currentGradient.fromHex}, ${currentGradient.toHex})`,
                  width: '65%',
                }}
              />
            </div>
          </div>
        </div>

        {/* Client Seats */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Client Capacity
          </Label>
          <p className="text-sm text-foreground-secondary">
            How many active clients do you expect to manage? You can always upgrade later.
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CLIENT_SEAT_TIERS.map((tier) => (
              <button
                key={tier.seats}
                type="button"
                onClick={() => setClientSeats(tier.seats)}
                className={`p-3 rounded-xl border-2 transition-all text-center ${
                  clientSeats === tier.seats
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-border hover:border-indigo-200'
                }`}
              >
                <span className={`font-semibold block ${
                  clientSeats === tier.seats ? 'text-indigo-600' : 'text-foreground'
                }`}>
                  {tier.label}
                </span>
                <span className="text-xs text-foreground-secondary">
                  {tier.included ? 'Included' : `+$${tier.price}/mo`}
                </span>
              </button>
            ))}
          </div>

          {additionalCost > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>+${additionalCost}/month</strong> for {selectedTier.label} capacity
              </p>
            </div>
          )}
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
            className="flex-1 h-12 text-white rounded-xl font-semibold"
            style={{
              background: `linear-gradient(135deg, ${currentGradient.fromHex}, ${currentGradient.toHex})`,
            }}
          >
            Continue
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
