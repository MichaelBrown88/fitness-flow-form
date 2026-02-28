/**
 * Gap Analysis Component
 * Shows Current → Goal for 3 main pillars: Body Composition, Strength, Cardio
 */

import React from 'react';
import type { ScoreSummary } from '@/lib/scoring';
import type { FormData } from '@/contexts/FormContext';
import { calculateAge } from '@/lib/scoring';
import { NORMATIVE_SCORING_DB } from '@/lib/clinical-data';
import { SCORE_COLORS } from '@/lib/scoring/scoreColor';

interface GapAnalysisProps {
  scores: ScoreSummary;
  formData?: FormData;
}

interface PillarGap {
  title: string;
  icon: string;
  current: {
    value: string;
    label: string;
    color: string;
  };
  goal: {
    value: string;
    label: string;
    color: string;
  };
  note: string;
}

export function GapAnalysis({ scores, formData }: GapAnalysisProps) {
  const bodyComp = scores.categories.find(c => c.id === 'bodyComp') || { score: 0, weaknesses: [] as string[], strengths: [] as string[] };
  const strength = scores.categories.find(c => c.id === 'strength') || { score: 0, weaknesses: [] as string[], strengths: [] as string[] };
  const cardio = scores.categories.find(c => c.id === 'cardio') || { score: 0, weaknesses: [] as string[], strengths: [] as string[] };
  
  const gender = (formData?.gender || '').toLowerCase();
  const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
  const visceral = parseFloat(formData?.visceralFatLevel || '0');
  const pushups = parseFloat(formData?.pushupsOneMinuteReps || formData?.pushupMaxReps || '0');
  const restingHr = parseFloat(formData?.cardioRestingHr || '0');
  
  // Body Composition Gap
  const getBodyCompGap = (): PillarGap => {
    let currentValue = `${bf}%`;
    let currentLabel = 'Body Fat';
    let currentColor = 'red';
    
    if (bf === 0) {
      currentValue = 'N/A';
      currentLabel = 'Not measured';
      currentColor = 'gray';
    } else if ((gender === 'male' && bf <= 15) || (gender === 'female' && bf <= 22)) {
      currentColor = 'green';
    } else if ((gender === 'male' && bf <= 20) || (gender === 'female' && bf <= 28)) {
      currentColor = 'yellow';
    }
    
    // Get goal level from form data
    const goals = formData?.clientGoals || [];
    const primaryGoal = goals[0] || 'general-health';
    const goalLevel = primaryGoal === 'weight-loss' 
      ? (formData?.goalLevelWeightLoss || 'average')
      : primaryGoal === 'build-muscle'
      ? (formData?.goalLevelMuscle || 'average')
      : 'average';
    
    // Calculate realistic target based on goal level and current BF
    let goalValue = '';
    let goalLabel = '';
    
    if (bf === 0) {
      goalValue = 'N/A';
      goalLabel = 'Assessment needed';
    } else {
      const currentBF = bf;
      let targetBF = 0;
      
      if (gender === 'male') {
        if (goalLevel === 'health-minimum') {
          targetBF = Math.max(20, currentBF - 5); // Realistic 5% reduction
          goalLabel = 'Health Range';
        } else if (goalLevel === 'average') {
          targetBF = Math.max(18, currentBF - 7); // Realistic 7% reduction
          goalLabel = 'Average Target';
        } else if (goalLevel === 'above-average') {
          targetBF = Math.max(15, currentBF - 10); // Realistic 10% reduction
          goalLabel = 'Above Average';
        } else { // elite
          targetBF = Math.max(12, currentBF - 12); // Realistic 12% reduction
          goalLabel = 'Elite Target';
        }
      } else { // female
        if (goalLevel === 'health-minimum') {
          targetBF = Math.max(28, currentBF - 5);
          goalLabel = 'Health Range';
        } else if (goalLevel === 'average') {
          targetBF = Math.max(25, currentBF - 7);
          goalLabel = 'Average Target';
        } else if (goalLevel === 'above-average') {
          targetBF = Math.max(22, currentBF - 10);
          goalLabel = 'Above Average';
        } else { // elite
          targetBF = Math.max(18, currentBF - 12);
          goalLabel = 'Elite Target';
        }
      }
      
      goalValue = `${Math.round(targetBF)}%`;
    }
    
    let note = '';
    if (visceral >= 12) {
      note = `Visceral Fat Lvl ${visceral} indicates metabolic stress.`;
    } else if (bf > 0) {
      note = `Focus on reducing body fat while preserving muscle mass.`;
    } else {
      note = `Body composition assessment needed to set specific targets.`;
    }
    
    return {
      title: 'BODY COMPOSITION',
      icon: '⚖️',
      current: { value: currentValue, label: currentLabel, color: currentColor },
      goal: { value: goalValue, label: goalLabel, color: 'green' },
      note
    };
  };
  
  // Strength Gap
  const getStrengthGap = (): PillarGap => {
    let currentValue = 'N/A';
    let currentLabel = 'Not measured';
    let currentColor = 'gray';
    const currentPushups = pushups;
    
    // Get age for normative comparison
    const age = formData?.dateOfBirth ? calculateAge(formData.dateOfBirth) : 0;
    const genderKey = (gender || 'male') as 'male' | 'female';
    
    // Find normative benchmark for pushups
    const pushupBenchmark = NORMATIVE_SCORING_DB.find(b => {
      if (b.testName !== 'Push-up' || b.gender !== genderKey) return false;
      if (b.ageBracket.includes('+')) {
        const minAge = parseInt(b.ageBracket.replace('+', ''));
        return age >= minAge;
      }
      const [min, max] = b.ageBracket.split('-').map(Number);
      return age >= min && age <= max;
    });
    
    if (pushups > 0 && pushupBenchmark) {
      const { poor, average, excellent } = pushupBenchmark.thresholds;
      
      if (pushups >= excellent) {
        currentValue = `${pushups} reps`;
        currentLabel = 'Excellent';
        currentColor = 'green';
      } else if (pushups >= average) {
        currentValue = `${pushups} reps`;
        currentLabel = 'Above Average';
        currentColor = 'green';
      } else if (pushups >= poor) {
        currentValue = `${pushups} reps`;
        currentLabel = 'Average';
        currentColor = 'yellow';
      } else {
        currentValue = `${pushups} reps`;
        currentLabel = 'Below Average';
        currentColor = 'red';
      }
    } else if (pushups > 0) {
      // Fallback if no benchmark found
      currentValue = `${pushups} reps`;
      currentLabel = 'Push Strength';
      currentColor = 'yellow';
    }
    
    // Get goal level from form data
    const goals = formData?.clientGoals || [];
    const primaryGoal = goals[0] || 'general-health';
    const goalLevel = primaryGoal === 'build-strength' 
      ? (formData?.goalLevelStrength || 'average')
      : primaryGoal === 'build-muscle'
      ? (formData?.goalLevelMuscle || 'average')
      : 'average';
    
    let goalValue = '';
    let goalLabel = '';
    
    if (pushups === 0 || !pushupBenchmark) {
      goalValue = 'N/A';
      goalLabel = 'Assessment needed';
    } else {
      const { average, excellent } = pushupBenchmark.thresholds;
      let targetReps = pushups;
      
      // Determine current level
      const isAboveAverage = pushups >= average;
      const isExcellent = pushups >= excellent;
      
      if (goalLevel === 'health-minimum') {
        // Target: reach average if below, or improve by 3-5 if already above
        if (isAboveAverage) {
          targetReps = pushups + 5; // Still improve even if above average
        } else {
          targetReps = Math.max(pushups + 5, average);
        }
        goalValue = `${targetReps} reps`;
        goalLabel = 'Health Baseline';
      } else if (goalLevel === 'average') {
        // Target: always improve, but realistic based on current level
        if (isExcellent) {
          targetReps = pushups + 5; // Small improvement if already excellent
        } else if (isAboveAverage) {
          targetReps = pushups + 8; // Moderate improvement
        } else {
          targetReps = Math.max(pushups + 8, average);
        }
        goalValue = `${targetReps} reps`;
        goalLabel = 'Average Target';
      } else if (goalLevel === 'above-average') {
        // Target: move toward excellent
        if (isExcellent) {
          targetReps = pushups + 10;
        } else {
          targetReps = Math.max(pushups + 12, Math.floor(average + (excellent - average) * 0.7));
        }
        goalValue = `${targetReps} reps`;
        goalLabel = 'Above Average';
      } else { // elite
        // Target: approach excellent
        if (isExcellent) {
          targetReps = pushups + 15;
        } else {
          targetReps = Math.max(pushups + 15, Math.floor(average + (excellent - average) * 0.85));
        }
        goalValue = `${targetReps} reps`;
        goalLabel = 'Elite Target';
      }
    }
    
    let note = '';
    if (pushups > 0 && pushupBenchmark && pushups >= pushupBenchmark.thresholds.excellent) {
      note = `Upper body strength is your superpower. We will leverage this.`;
    } else if (pushups > 0) {
      note = `Building strength will support all your goals and daily activities.`;
    } else {
      note = `Strength assessment needed to establish baseline.`;
    }
    
    return {
      title: 'STRENGTH',
      icon: '💪',
      current: { value: currentValue, label: currentLabel, color: currentColor },
      goal: { value: goalValue, label: goalLabel, color: 'green' },
      note
    };
  };
  
  // Cardio Gap
  const getCardioGap = (): PillarGap => {
    let currentValue = 'N/A';
    let currentLabel = 'Not measured';
    let currentColor = 'gray';
    
    if (restingHr > 0) {
      if (restingHr <= 60) {
        currentValue = `${restingHr} bpm`;
        currentLabel = 'Athlete Level';
        currentColor = 'green';
      } else if (restingHr <= 70) {
        currentValue = `${restingHr} bpm`;
        currentLabel = 'Active';
        currentColor = 'green';
      } else if (restingHr <= 80) {
        currentValue = `${restingHr} bpm`;
        currentLabel = 'Sedentary';
        currentColor = 'yellow';
      } else {
        currentValue = `${restingHr} bpm`;
        currentLabel = 'Needs Improvement';
        currentColor = 'red';
      }
    }
    
    // Get goal level from form data
    const goals = formData?.clientGoals || [];
    const primaryGoal = goals[0] || 'general-health';
    const goalLevel = primaryGoal === 'improve-fitness' 
      ? (formData?.goalLevelFitness || 'average')
      : 'average';
    
    let goalValue = '';
    let goalLabel = '';
    
    if (restingHr === 0) {
      goalValue = 'N/A';
      goalLabel = 'Assessment needed';
    } else {
      let targetHR = restingHr;
      
      if (goalLevel === 'health-minimum') {
        targetHR = Math.min(restingHr - 5, 70);
        goalValue = `${targetHR} bpm`;
        goalLabel = 'Active Lifestyle';
      } else if (goalLevel === 'average') {
        targetHR = Math.min(restingHr - 10, 65);
        goalValue = `${targetHR} bpm`;
        goalLabel = 'Recreational Runner';
      } else if (goalLevel === 'above-average') {
        targetHR = Math.min(restingHr - 15, 60);
        goalValue = `${targetHR} bpm`;
        goalLabel = 'Trained Athlete';
      } else { // elite
        targetHR = Math.min(restingHr - 20, 55);
        goalValue = `${targetHR} bpm`;
        goalLabel = 'Elite Athlete';
      }
    }
    
    let note = '';
    if (restingHr > 0 && restingHr > 70) {
      note = `Improving cardiovascular fitness will boost energy and recovery.`;
    } else if (restingHr > 0) {
      note = `Strong cardiovascular base. We'll optimize for peak performance.`;
    } else {
      note = `Cardio assessment needed to establish baseline.`;
    }
    
    return {
      title: 'CARDIO',
      icon: '❤️',
      current: { value: currentValue, label: currentLabel, color: currentColor },
      goal: { value: goalValue, label: goalLabel, color: 'green' },
      note
    };
  };
  
  const pillars: PillarGap[] = [
    getBodyCompGap(),
    getStrengthGap(),
    getCardioGap()
  ];
  
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red':
        return `${SCORE_COLORS.red.text} font-bold`;
      case 'green':
        return `${SCORE_COLORS.green.text} font-bold`;
      case 'yellow':
        return `${SCORE_COLORS.amber.text} font-bold`;
      case 'black':
        return 'text-slate-900 font-bold';
      default:
        return 'text-slate-500 font-bold';
    }
  };
  
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-700">Where You Are → Where You're Going</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pillars.map((pillar, idx) => (
          <div key={idx} className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{pillar.icon}</span>
              <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                {pillar.title}
              </h3>
            </div>
            
            <div className="space-y-2">
              <div>
                <div className={`text-2xl font-bold ${getColorClasses(pillar.current.color)}`}>
                  {pillar.current.value}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">{pillar.current.label}</div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-slate-300 text-lg">→</span>
                <div>
                  <div className={`text-2xl font-bold ${getColorClasses(pillar.goal.color)}`}>
                    {pillar.goal.value}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">{pillar.goal.label}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded p-2.5 mt-3 border border-slate-100">
              <p className="text-xs text-slate-700 leading-relaxed">{pillar.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

