/**
 * Blueprint Component
 * Shows 3 Strategic Pillars for improvement (like the blueprint image)
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import type { CoachPlan } from '@/lib/recommendations';
import type { ScoreSummary } from '@/lib/scoring';
import type { FormData } from '@/contexts/FormContext';

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
  const movement = scores.categories.find(c => c.id === 'movementQuality') || { score: 0, weaknesses: [], strengths: [] };
  const bodyComp = scores.categories.find(c => c.id === 'bodyComp') || { score: 0, weaknesses: [], strengths: [] };
  const strength = scores.categories.find(c => c.id === 'strength') || { score: 0, weaknesses: [], strengths: [] };
  
  const headPos = Array.isArray(formData?.postureHeadOverall) ? formData.postureHeadOverall : [formData?.postureHeadOverall];
  const shoulderPos = Array.isArray(formData?.postureShouldersOverall) ? formData.postureShouldersOverall : [formData?.postureShouldersOverall];
  const kneeValgus = formData?.ohsKneeAlignment === 'valgus' || formData?.lungeLeftKneeAlignment === 'valgus' || formData?.lungeRightKneeAlignment === 'valgus';
  const visceral = parseFloat(formData?.visceralFatLevel || '0');
  const goals = formData?.clientGoals || [];
  const primaryGoal = goals[0] || 'general-health';
  
  // Determine pillars based on assessment findings
  const pillars: StrategicPillar[] = [];
  
  // Pillar 1: Structural Restoration (if movement issues)
  if (movement.score < 70 || headPos.includes('forward-head') || shoulderPos.includes('rounded') || kneeValgus) {
    let focus = '';
    let exercises: Array<{ name: string; setsReps: string }> = [];
    
    if (kneeValgus) {
      focus = 'FIXING THE VALGUS KNEE & TECH NECK';
      exercises = [
        { name: 'Knee Banded Walks', setsReps: '2 x 15 steps' },
        { name: 'Chin Tucks', setsReps: '2 x 10 reps' },
        { name: 'Single Leg Touchdowns', setsReps: '3 x 8/side' }
      ];
    } else if (headPos.includes('forward-head') || shoulderPos.includes('rounded')) {
      focus = 'FIXING TECH NECK & ROUNDED SHOULDERS';
      exercises = [
        { name: 'Chin Tucks', setsReps: '2 x 10 reps' },
        { name: 'Wall Angels', setsReps: '2 x 12 reps' },
        { name: 'Band Pull-Aparts', setsReps: '2 x 15 reps' }
      ];
    } else {
      focus = 'IMPROVING MOVEMENT QUALITY';
      exercises = [
        { name: 'Hip Mobility Drills', setsReps: '2 x 10 reps' },
        { name: 'Shoulder CARs', setsReps: '2 x 5 each direction' },
        { name: 'Ankle Mobility', setsReps: '2 x 8/side' }
      ];
    }
    
    pillars.push({
      title: 'Structural Restoration',
      focus,
      timeframe: 'Weeks 1-8',
      description: 'We cannot load a dysfunctional pattern. Phase 1 prioritizes joint stacking so you can train pain-free.',
      icon: '🔒',
      color: 'blue',
      sampleProtocol: {
        title: 'SAMPLE PROTOCOL',
        subtitle: 'Daily Correctives',
        exercises
      }
    });
  }
  
  // Pillar 2: Metabolic Fire (if body comp issues or weight loss goal)
  if (bodyComp.score < 70 || visceral >= 10 || primaryGoal === 'weight-loss') {
    pillars.push({
      title: 'Metabolic Fire',
      focus: 'TARGETING VISCERAL FAT',
      timeframe: 'Weeks 1-16',
      description: 'Shifting your body from sugar-burning to fat-burning through Zone 2 cardio and nutrient timing.',
      icon: '🔥',
      color: 'red',
      sampleProtocol: {
        title: 'SAMPLE PROTOCOL',
        subtitle: 'Engine Builder A',
        exercises: [
          { name: 'Incline Walk (12%)', setsReps: '30 mins' },
          { name: 'Nasal Breathing Only', setsReps: 'Continuous' },
          { name: 'Heart Rate Target', setsReps: '135-145 BPM' }
        ]
      }
    });
  }
  
  // Pillar 3: Strength Expression (if strength is good or goal is strength/muscle)
  if (strength.score >= 60 || primaryGoal === 'build-strength' || primaryGoal === 'build-muscle') {
    pillars.push({
      title: 'Strength Expression',
      focus: 'HEAVY COMPOUND MOVEMENTS',
      timeframe: 'Weeks 8-24',
      description: 'Once structure is stable, we unleash your potential on heavy lifts to build dense muscle.',
      icon: '🏆',
      color: 'green',
      sampleProtocol: {
        title: 'SAMPLE PROTOCOL',
        subtitle: 'Power Block B',
        exercises: [
          { name: 'Goblet Squats', setsReps: '4 x 6 (Heavy)' },
          { name: 'Weighted Pull-ups', setsReps: '3 x Failure' },
          { name: 'Landmine Press', setsReps: '3 x 10/side' }
        ]
      }
    });
  }
  
  // If we don't have 3 pillars, fill with defaults
  while (pillars.length < 3) {
    if (pillars.length === 0) {
      pillars.push({
        title: 'Structural Restoration',
        focus: 'MOVEMENT QUALITY',
        timeframe: 'Weeks 1-8',
        description: 'Building a solid foundation of movement patterns and joint stability.',
        icon: '🔒',
        color: 'blue',
        sampleProtocol: {
          title: 'SAMPLE PROTOCOL',
          subtitle: 'Daily Correctives',
          exercises: [
            { name: 'Hip Mobility', setsReps: '2 x 10 reps' },
            { name: 'Shoulder Mobility', setsReps: '2 x 10 reps' },
            { name: 'Core Activation', setsReps: '2 x 12 reps' }
          ]
        }
      });
    } else if (pillars.length === 1) {
      pillars.push({
        title: 'Metabolic Fire',
        focus: 'FAT LOSS & ENERGY',
        timeframe: 'Weeks 1-16',
        description: 'Optimizing metabolism through strategic training and nutrition.',
        icon: '🔥',
        color: 'red',
        sampleProtocol: {
          title: 'SAMPLE PROTOCOL',
          subtitle: 'Engine Builder',
          exercises: [
            { name: 'Zone 2 Cardio', setsReps: '30-45 mins' },
            { name: 'Metabolic Circuits', setsReps: '3-4 rounds' },
            { name: 'Recovery Walks', setsReps: 'Daily' }
          ]
        }
      });
    } else {
      pillars.push({
        title: 'Strength Expression',
        focus: 'BUILDING POWER',
        timeframe: 'Weeks 8-24',
        description: 'Progressive overload and strength development.',
        icon: '🏆',
        color: 'green',
        sampleProtocol: {
          title: 'SAMPLE PROTOCOL',
          subtitle: 'Strength Block',
          exercises: [
            { name: 'Compound Lifts', setsReps: '3-4 x 6-8' },
            { name: 'Accessory Work', setsReps: '3 x 10-12' },
            { name: 'Progressive Overload', setsReps: 'Weekly' }
          ]
        }
      });
    }
  }
  
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
        <h2 className="text-lg font-semibold text-slate-700 uppercase tracking-wide">The Blueprint</h2>
        <p className="text-xs text-slate-600 mt-1">3 Strategic Pillars to bridge the gap.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pillars.map((pillar, idx) => {
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
                  <p className={`text-xs font-bold uppercase tracking-wider ${colors.playIcon} mb-2`}>
                    {pillar.focus}
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
                
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`${colors.playIcon} text-sm`}>▶</span>
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
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

