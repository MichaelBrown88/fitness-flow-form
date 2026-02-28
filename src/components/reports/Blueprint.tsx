/**
 * Blueprint Component
 * Shows 3 Strategic Pillars for improvement (like the blueprint image)
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import type { CoachPlan } from '@/lib/recommendations';
import type { ScoreSummary } from '@/lib/scoring';
import type { FormData } from '@/contexts/FormContext';
import { generateBlueprint } from '@/lib/strategy/blueprintEngine';

interface BlueprintProps {
  scores: ScoreSummary;
  formData?: FormData;
  plan?: CoachPlan;
}

interface StrategicPillar {
  title: string;
  focus: string;
  timeframe: string;
  description: string;
  icon: string;
  color: string;
  sampleProtocol: {
    title: string;
    subtitle: string;
    exercises: Array<{ name: string; setsReps: string }>;
  };
}

export function Blueprint({ scores, formData, plan }: BlueprintProps) {
  // Use centralized strategy engine - ensure formData is valid
  const validFormData = formData && Object.keys(formData).length > 0 ? formData : undefined;
  const pillars = generateBlueprint(validFormData || ({} as FormData), scores);
  
  // Map to component format
  const sortedPillars = pillars.map(pillar => ({
    title: pillar.title,
    focus: pillar.focus,
    timeframe: pillar.timeframe,
    description: pillar.description,
    icon: pillar.color === 'blue' ? '🔒' : pillar.color === 'red' ? '🔥' : '🏆',
    color: pillar.color,
    sampleProtocol: {
      title: 'SAMPLE PROTOCOL',
      subtitle: pillar.category === 'movementQuality' ? 'Daily Correctives' :
                pillar.category === 'bodyComp' ? 'Metabolic Training' :
                pillar.category === 'strength' ? 'Strength Training' :
                pillar.category === 'cardio' ? 'Cardiovascular Training' :
                'Recovery Protocols',
      exercises: pillar.protocol
    }
  }));
  
  const getColorClasses = (color: string) => {
    // All cards now use the same styling for uniformity
    return {
      header: 'gradient-bg text-white',
      badge: 'glass-button-active text-white',
      playIcon: 'text-gradient-dark'
    };
  };
  
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-700">The Blueprint</h2>
        <p className="text-xs text-slate-600 mt-1">3 Strategic Pillars to bridge the gap.</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {sortedPillars.map((pillar, idx) => {
          const colors = getColorClasses(pillar.color);
          return (
            <Card key={idx} className="overflow-hidden">
              <div className={`${colors.header} p-4 flex items-center justify-between rounded-t-xl`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{pillar.icon}</span>
                  <h3 className="font-bold text-sm">{pillar.title}</h3>
                </div>
                <span className={colors.badge}>
                  {pillar.timeframe}
                </span>
              </div>
              
              <div className="p-4 space-y-4">
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-[0.15em] ${colors.playIcon} mb-2`}>
                    {pillar.focus}
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
                
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`${colors.playIcon} text-sm`}>▶</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-600">
                      {pillar.sampleProtocol.title}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mb-3">
                    {pillar.sampleProtocol.subtitle}
                  </p>
                  <div className="space-y-2">
                    {pillar.sampleProtocol.exercises.map((ex, exIdx) => (
                      <div key={exIdx} className="flex justify-between items-center text-sm">
                        <span className="text-slate-700">{ex.name}</span>
                        <span className="text-slate-500 font-medium">{ex.setsReps}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

