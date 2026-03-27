import type { CoachPlan } from './types';
import type { CoachPlanNarrativeContext } from './coachPlanContext';
import { COACH_PLAN } from './coachPlanConstants';

type ClientScript = CoachPlan['clientScript'];

/**
 * First-pass client-facing narrative (body comp, movement, commitments).
 */
export function applyInitialClientScriptNarrative(
  ctx: CoachPlanNarrativeContext,
  clientScript: ClientScript,
): void {
  const { form, goals, gender, bf, visceral, smm, armDiff, legDiff, headPos, shoulderPos } = ctx;
  const t = COACH_PLAN;

  const bfHigh =
    gender === 'male' ? t.BODY_FAT_ABOVE_OPTIMAL_MALE : t.BODY_FAT_ABOVE_OPTIMAL_FEMALE;
  if (bf > bfHigh) {
    clientScript.findings.push(
      `Your current body fat percentage is above the optimal range for health, which acts as a "metabolic drag" on your energy.`,
    );
  } else if (bf > 0) {
    clientScript.findings.push(
      `Your body composition is in a healthy range, giving us a great "clean slate" to focus on performance.`,
    );
  }

  if (armDiff > t.LIMB_RELATIVE_ASYMMETRY || legDiff > t.LIMB_RELATIVE_ASYMMETRY) {
    const limb = armDiff > t.LIMB_RELATIVE_ASYMMETRY ? 'arms' : 'legs';
    clientScript.findings.push(
      `The body composition scan identified a noticeable muscle imbalance between your ${limb} (${(Math.max(armDiff, legDiff) * 100).toFixed(0)}% difference).`,
    );
  }

  const smmLow = gender === 'male' ? t.SMM_LOW_MALE : t.SMM_LOW_FEMALE;
  if (smm > 0 && smm < smmLow) {
    clientScript.findings.push(
      `Your total skeletal muscle mass is currently lower than ideal, which means your "engine" isn't as powerful as it could be yet.`,
    );
  }

  if (headPos.includes('forward-head') || shoulderPos.includes('rounded')) {
    clientScript.findings.push(
      `We've identified some "Upper Crossed" patterns—meaning tight chest/neck muscles are pulling your alignment out of its power position.`,
    );
  }

  if (
    form.ohsKneeAlignment === 'valgus' ||
    form.lungeLeftKneeAlignment === 'valgus' ||
    form.lungeRightKneeAlignment === 'valgus'
  ) {
    clientScript.findings.push(
      `Your knees show a tendency to "cave in" during movement, which is a common "energy leak" that can lead to joint strain over time.`,
    );
  }

  if (armDiff > t.LIMB_RELATIVE_ASYMMETRY || legDiff > t.LIMB_RELATIVE_ASYMMETRY) {
    clientScript.whyItMatters.push(
      `Limb imbalances mean one side is doing more work than the other. This eventually causes "overuse" issues on the strong side and "underuse" issues on the weak side.`,
    );
  }

  if (goals.includes('build-muscle') || goals.includes('build-strength')) {
    clientScript.whyItMatters.push(
      `Fixing your alignment isn't just about posture—it's about "lever efficiency." Better alignment means you can lift more weight with less risk.`,
    );
  }

  if (visceral >= t.VISCERAL_HIGH_WHY) {
    clientScript.whyItMatters.push(
      `Your internal (visceral) fat level is high enough that it's likely impacting your recovery and systemic inflammation levels.`,
    );
  }

  if (armDiff > t.LIMB_RELATIVE_ASYMMETRY || legDiff > t.LIMB_RELATIVE_ASYMMETRY) {
    clientScript.actionPlan.push(
      `Swap some barbell work for dumbbells: This forces your weaker side to carry its own weight and catch up to the strong side.`,
    );
  }

  if (goals.includes('weight-loss')) {
    clientScript.actionPlan.push(
      `Prioritize "Metabolic Resistance": We'll use compound movements with shorter rest periods to keep your heart rate elevated while building muscle.`,
    );
  }

  if (headPos.includes('forward-head') || shoulderPos.includes('rounded')) {
    clientScript.actionPlan.push(
      `"Open the chest": Every session will start with specific stretches to release the tight muscles pulling you forward.`,
    );
  }

  clientScript.actionPlan.push(
    `Progressive Overload: We'll systematically increase your training volume as your movement quality earns the right to more weight.`,
  );

  clientScript.threeMonthOutlook.push(
    `Weeks 1-4: You'll feel "tighter" and more controlled in your movement, and your energy levels will stabilize.`,
  );
  clientScript.threeMonthOutlook.push(
    `Weeks 5-12: This is where we see the "compounding effect"—visible changes in body shape and a significant jump in your strength numbers.`,
  );

  clientScript.clientCommitment.push(
    `Training Consistency: Hit your target session frequency week-in, week-out.`,
  );
  clientScript.clientCommitment.push(
    `Habit Anchors: Focus on 7-9 hours of sleep to ensure the work we do in the gym actually sticks.`,
  );
  clientScript.clientCommitment.push(
    `Open Feedback: Tell me when something feels "off" or "too easy"—it's how we fine-tune your path.`,
  );
}

/**
 * Second-pass storytelling blocks tied to scores and roadmap length.
 */
export function applyStorytellingClientScript(
  ctx: CoachPlanNarrativeContext,
  clientScript: ClientScript,
): void {
  const {
    hasAnyData,
    goalInSentence,
    primaryGoalRaw,
    gender,
    bf,
    visceral,
    smm,
    hasBodyCompData,
    hasMovementData,
    movementScore,
    totalWeeks,
  } = ctx;
  const t = COACH_PLAN;

  const bfMetabolic =
    gender === 'male' ? t.BODY_FAT_HEALTHY_MAX_MALE : t.BODY_FAT_HEALTHY_MAX_FEMALE;
  if (hasBodyCompData && (bf > bfMetabolic || visceral >= t.VISCERAL_ELEVATED)) {
    clientScript.findings.push(
      `Your body composition analysis reveals that while you have a solid foundation, your current metabolic markers are creating a "resistance" to your ${goalInSentence} progress.`,
    );
  }

  const smmLimiting = gender === 'male' ? t.SMM_LIMITING_MALE : t.SMM_LIMITING_FEMALE;
  if (smm > 0 && smm < smmLimiting) {
    clientScript.findings.push(
      `We've identified that your skeletal muscle mass is currently a limiting factor for your ${goalInSentence} goals—we need to build the "engine" to support your ambitions.`,
    );
  }

  if (hasMovementData && movementScore < t.MOVEMENT_SCORE_GREEN) {
    clientScript.findings.push(
      `Our movement screen found some specific restrictions that act like "speed bumps" on your journey, potentially leading to plateaus or discomfort if not addressed.`,
    );
  } else if (hasMovementData && movementScore >= t.MOVEMENT_SCORE_GREEN) {
    clientScript.findings.push(
      `You have strong movement integrity, which gives us a massive "green light" to pursue your ${goalInSentence} goals with higher intensity sooner.`,
    );
  }

  clientScript.whyItMatters.push(
    `By addressing these foundational pillars simultaneously with your ${goalInSentence} work, we aren't just getting you results—we're making sure they are permanent and that you stay injury-free.`,
  );
  clientScript.whyItMatters.push(
    `Think of it this way: fixing your movement and metabolic health is like tuning the engine and aligning the tires so you can finally put the pedal down on your ${goalInSentence} training.`,
  );

  clientScript.actionPlan.push(
    `Our immediate priority is to "clear the path" by integrating 5-10 minutes of targeted movement prep into every session. This isn't "physio"—it's performance tuning.`,
  );
  clientScript.actionPlan.push(
    `Your main training blocks will be 100% focused on your goal of ${primaryGoalRaw.replace('-', ' ')}, but we'll choose specific exercise variations (like unilateral work) that solve your issues while you build muscle and strength.`,
  );

  if (hasAnyData) {
    clientScript.threeMonthOutlook.push(
      `Over the next ${totalWeeks} weeks, we expect to see a profound transformation in how your body moves and how much energy you have.`,
    );
    clientScript.threeMonthOutlook.push(
      `By month 3, the movement patterns that feel challenging now will be automatic, allowing us to utilize progressive overload to truly drive your ${goalInSentence} results.`,
    );
  }

  clientScript.clientCommitment.push(
    `Trust the foundation: the small "pre-hab" wins in the first 4 weeks are what unlock the massive ${goalInSentence} wins in months 2 and 3.`,
  );
  clientScript.clientCommitment.push(
    'Consistency: hitting your session targets is the single biggest predictor of our success.',
  );
}
