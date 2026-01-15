import React from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface StrengthsFocusSectionProps {
  strengths: Array<{ category: string; strength: string }>;
  areasForImprovement: Array<{ category: string; weakness: string }>;
}

export const StrengthsFocusSection: React.FC<StrengthsFocusSectionProps> = ({
  strengths,
  areasForImprovement,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mb-4 sm:mb-5 md:mb-6 lg:mb-8">
      <Card className="p-4 sm:p-5 md:p-6 lg:p-7">
        <h4 className="text-sm font-bold text-zinc-900 mb-2 sm:mb-3 md:mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-gradient-dark" />
          Key Strengths
        </h4>
        <ul className="space-y-2 sm:space-y-3">
          {strengths.map((item, i) => (
            <li key={i} className="text-xs sm:text-sm text-zinc-600 flex items-start gap-2 sm:gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-gradient-from mt-2 shrink-0" style={{ backgroundColor: 'hsl(var(--gradient-from))' }} />
              {item.strength}
            </li>
          ))}
        </ul>
      </Card>
      
      <Card className="p-4 sm:p-5 md:p-6 lg:p-7">
        <h4 className="text-sm font-bold text-zinc-900 mb-2 sm:mb-3 md:mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
          Primary Focus Areas
        </h4>
        <ul className="space-y-2 sm:space-y-3">
          {areasForImprovement.map((item, i) => (
            <li key={i} className="text-xs sm:text-sm text-zinc-600 flex items-start gap-2 sm:gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-300 mt-2 shrink-0" />
              {item.weakness}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};
