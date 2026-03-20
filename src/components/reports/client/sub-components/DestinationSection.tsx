import React from 'react';
import { Card } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselDots } from '@/components/ui/carousel';
import { Target, CheckCircle2, Scale, Activity, Heart, Lock, Dumbbell } from 'lucide-react';
import type { FormData } from '@/contexts/FormContext';
import { getBodyFatRange, getTargetBodyFatFromLevel, calculateBodyRecomposition } from '@/lib/utils/bodyRecomposition';
import { getEffectiveGoalLevels } from '@/lib/goals/achievableLandmarks';
import { CardInfoDrawer } from '../../CardInfoDrawer';

/** Shorter labels for goal tabs on small screens */
const GOAL_SHORT_LABELS: Record<string, string> = {
  'weight-loss': 'Weight Loss',
  'build-muscle': 'Muscle',
  'body-recomposition': 'Recomp',
  'build-strength': 'Strength',
  'improve-fitness': 'Fitness',
};

interface DestinationSectionProps {
  goals?: string[];
  formData?: FormData;
  hideHeader?: boolean;
}

export const DestinationSection: React.FC<DestinationSectionProps> = ({
  goals,
  formData,
  hideHeader,
}) => {
  if (!goals || goals.length === 0) return null;

  const primaryGoal = goals[0] || 'general-health';
  const effectiveLevels = getEffectiveGoalLevels(primaryGoal, formData);

  const getLevelForGoal = (g: string): string => {
    if (g === 'weight-loss') return effectiveLevels.goalLevelWeightLoss;
    if (g === 'build-muscle') return effectiveLevels.goalLevelMuscle;
    if (g === 'body-recomposition') return effectiveLevels.goalLevelBodyRecomp;
    if (g === 'build-strength') return effectiveLevels.goalLevelStrength;
    if (g === 'improve-fitness') return effectiveLevels.goalLevelFitness;
    return '15';
  };

  return (
    <section className="w-full min-w-0 overflow-x-hidden">
      {!hideHeader && (
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3 md:mb-4 lg:mb-5 xl:mb-6">
          <div className="p-1 sm:p-1.5 md:p-2 bg-gradient-light text-zinc-900 rounded-lg">
            <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </div>
          <h3 className="text-xs md:text-sm lg:text-base font-semibold text-zinc-900">Your Destination</h3>
        </div>
      )}
      
      <Carousel opts={{ align: 'start', containScroll: 'trimSnaps' }} className="w-full">
        <CarouselContent className="-ml-3 items-stretch">
          {goals.map((goal, idx) => {
            const goalLevel = getLevelForGoal(goal);
            
            let explanation = '';
            let whatItEntails: string[] = [];
            
            if (goal === 'body-recomposition') {
              const recompLevel = (goalLevel || 'athletic') as 'healthy' | 'fit' | 'athletic' | 'shredded';
              const gender = (formData?.gender || 'male').toLowerCase() as 'male' | 'female';
              const weightKg = parseFloat(formData?.inbodyWeightKg || '0');
              const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
              const targetBFRange = getBodyFatRange(recompLevel, gender);
              const targetBodyFat = getTargetBodyFatFromLevel(recompLevel, gender);
              const currentMuscleMass = parseFloat(formData?.skeletalMuscleMassKg || '0');
              const recompResult = calculateBodyRecomposition(weightKg, bf, targetBodyFat, gender, currentMuscleMass > 0 ? currentMuscleMass : undefined);
              const levelLabel = recompLevel.charAt(0).toUpperCase() + recompLevel.slice(1);
              const muscleGain = gender === 'male' ? 1.5 : 0.75;
              explanation = `Your goal is body recomposition: achieve a ${levelLabel} look (${targetBFRange[0]}-${targetBFRange[1]}% body fat) while building ${muscleGain} kg of muscle. Target weight: ${recompResult.targetWeight.toFixed(1)} kg. This uses a slight calorie deficit to lose fat while gaining muscle.`;
              whatItEntails = [
                'Slight calorie deficit (200-500 kcal/day) with high-protein intake',
                'Progressive resistance training to build muscle',
                'Zone 2 cardio for metabolic health',
                'Adequate recovery and sleep (7-9 hours) to support muscle growth'
              ];
            } else if (goal === 'weight-loss') {
              const weightLossPct = parseFloat(goalLevel) || 15;
              const weightKg = parseFloat(formData?.inbodyWeightKg || '0');
              const targetWeightLossKg = weightKg > 0 ? (weightKg * weightLossPct) / 100 : 0;
              explanation = `Your goal is to lose ${weightLossPct}% of your body weight (${targetWeightLossKg.toFixed(1)} kg), targeting a sustainable reduction of ~0.5-1% body weight per week.`;
              whatItEntails = [
                'Controlled caloric deficit with high-protein intake',
                'Progressive resistance training to preserve muscle',
                'Zone 2 cardio for metabolic health',
                'Consistent lifestyle habits'
              ];
            } else if (goal === 'build-muscle') {
              const muscleGainKg = parseFloat(goalLevel) || 6;
              explanation = `Your goal is to build ${muscleGainKg} kg of muscle mass through dedicated hypertrophy training.`;
              whatItEntails = [
                'Slight caloric surplus with quality protein',
                'Progressive overload on compound movements',
                'Adequate recovery and sleep (7-9 hours)',
                'Consistent training frequency'
              ];
            } else if (goal === 'build-strength') {
              const strengthPct = parseFloat(goalLevel) || 30;
              explanation = `Your goal is to increase strength by ${strengthPct}%, focusing on improving force production across all major lifts.`;
              whatItEntails = [
                'Low-rep, high-intensity compound lifts',
                'Mastering technique on foundational movements',
                'Adequate rest between sets for CNS recovery',
                'Strategic accessory work to eliminate weak links'
              ];
            } else if (goal === 'improve-fitness') {
              const ambitionLabels = { health: 'Health Focus (50th percentile)', active: 'Active (75th percentile)', athletic: 'Athletic (85th percentile)', elite: 'Elite (95th percentile)' };
              const ambitionLabel = ambitionLabels[goalLevel as keyof typeof ambitionLabels] || 'Active (75th percentile)';
              explanation = `Your goal is to achieve ${ambitionLabel} cardiovascular fitness, targeting specific RHR and recovery HR improvements along with VO2 max gains.`;
              whatItEntails = [
                'Mix of Zone 2 and HIIT training',
                'Consistent conditioning 3+ times per week',
                'Monitoring heart rate recovery',
                'Focus on aerobic efficiency'
              ];
            } else {
              explanation = 'General health means improving overall wellbeing through balanced training.';
              whatItEntails = [
                'Mix of strength, cardio, and movement work',
                'Lifestyle habits that support recovery',
                'Sustainable routines',
                'Focus on feeling better day-to-day'
              ];
            }

            const addressingItems: Array<{ icon: React.ElementType; title: string; desc: string }> = [];
            if (goal === 'weight-loss' || goal === 'body-recomposition') {
              const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
              const restingHr = parseFloat(formData?.cardioRestingHr || '0');
              if (bf > 0) addressingItems.push({ icon: Scale, title: 'Metabolic Drag', desc: `Your ${bf}% body fat is acting as a limit on your daily energy.` });
              if (restingHr > 0) addressingItems.push({ icon: Activity, title: 'Recovery Capacity', desc: `Slow heart rate recovery (${restingHr} bpm) indicates a need for aerobic base building.` });
            } else if (goal === 'improve-fitness') {
              const restingHr = parseFloat(formData?.cardioRestingHr || '0');
              addressingItems.push({ icon: Heart, title: 'Aerobic Base', desc: `We need to lower your resting heart rate from ${restingHr} bpm to improve general stamina.` });
              addressingItems.push({ icon: Lock, title: 'Joint Integrity', desc: "Addressing 'Upper Crossed' patterns to prevent injury as volume increases." });
            } else if (goal === 'build-muscle') {
              const pushups = parseFloat(formData?.pushupsOneMinuteReps || formData?.pushupMaxReps || '0');
              addressingItems.push({ icon: Dumbbell, title: 'Strength Foundation', desc: `Your ${pushups} push-up reps show good endurance, but we need to build raw power.` });
              addressingItems.push({ icon: Activity, title: 'Structural Balance', desc: 'Ensuring core stability is solid before loading heavy compounds.' });
            } else if (goal === 'build-strength') {
              const gripStrength = Math.max(parseFloat(formData?.gripLeftKg || '0'), parseFloat(formData?.gripRightKg || '0'));
              if (gripStrength > 0) {
                addressingItems.push({ icon: Dumbbell, title: 'Neuromuscular Drive', desc: `Your grip strength of ${gripStrength} kg is a baseline we will improve through CNS adaptation.` });
              } else {
                addressingItems.push({ icon: Dumbbell, title: 'Neuromuscular Drive', desc: "Focusing on CNS adaptations to increase force production without excessive mass gain." });
              }
              addressingItems.push({ icon: Lock, title: 'Structural Integrity', desc: "Reinforcing joint stability to handle higher intensity loads safely." });
            }

            return (
              <CarouselItem key={idx} className="basis-[88%] pl-3">
                <Card className="rounded-xl h-full relative">
                  <CardInfoDrawer title={GOAL_SHORT_LABELS[goal] || 'Goal'}>
                    <p>This protocol is designed specifically for your <strong>{GOAL_SHORT_LABELS[goal] || goal}</strong> goal. It outlines the approach, key strategies, and the specific areas your training will address.</p>
                    <p>The &ldquo;What This Entails&rdquo; section breaks down the daily commitments required to reach your target.</p>
                  </CardInfoDrawer>
                  <div className="p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10">
                    <div className="flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-8 lg:gap-10">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base sm:text-lg font-bold text-zinc-900 mb-2 sm:mb-3">
                          {goal === 'body-recomposition' ? 'Body Recomposition Protocol' :
                           goal === 'weight-loss' ? 'Weight Loss Protocol' :
                           goal === 'build-muscle' ? 'Hypertrophy & Strength Protocol' :
                           goal === 'build-strength' ? 'Strength Development Protocol' :
                           goal === 'improve-fitness' ? 'Athletic Performance Protocol' :
                           'General Health Protocol'}
                        </h4>
                        <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed mb-4 sm:mb-6 md:mb-8">
                          {explanation}
                        </p>
                        <div className="bg-gradient-light/50 rounded-xl p-3 sm:p-4 md:p-5 lg:p-6 border border-gradient-medium/50">
                          <p className="text-[10px] font-black text-gradient-dark uppercase tracking-[0.15em] mb-3 sm:mb-4">What This Entails:</p>
                          <ul className="space-y-2 sm:space-y-3 md:space-y-4">
                            {whatItEntails.map((item, j) => (
                              <li key={j} className="flex items-start gap-2 sm:gap-3">
                                <div className="glass-label p-0.5 rounded-full mt-0.5 shrink-0">
                                  <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gradient-dark" />
                                </div>
                                <span className="text-xs sm:text-sm text-zinc-700 leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      {addressingItems.length > 0 && (
                        <div className="flex-1 border-t md:border-t-0 md:border-l border-zinc-100 pt-6 sm:pt-8 md:pt-0 md:pl-4 lg:pl-6 xl:pl-10 min-w-0">
                          <p className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.15em] mb-3 sm:mb-4 md:mb-6">What We'll Address</p>
                          <ul className="space-y-3 sm:space-y-4 md:space-y-6">
                            {addressingItems.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 sm:gap-3 md:gap-4 group">
                                <div className="p-1.5 sm:p-2 md:p-2.5 glass-label text-zinc-600 rounded-lg shrink-0 group-hover:bg-white/80 group-hover:text-gradient-dark transition-apple">
                                  <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="font-bold text-zinc-900 text-xs md:text-sm block mb-0.5 sm:mb-1">{item.title}</span>
                                  <span className="text-xs md:text-sm text-zinc-500 block leading-relaxed">{item.desc}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselDots count={goals.length} />
      </Carousel>
    </section>
  );
};
