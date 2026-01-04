import type { FormData } from '@/contexts/FormContext';
import { phaseDefinitions, type PhaseField } from '@/lib/phaseConfig';

/**
 * Generates unique, realistic demo data for all form fields using AI-like algorithms.
 * Each call produces a different, coherent persona profile.
 */
export async function generateDemoData(): Promise<Partial<FormData>> {
  // Generate a unique seed based on timestamp and random
  const seed = Date.now() + Math.random();
  const rng = seededRandom(seed);

  // Generate a persona archetype (but with variation)
  const archetypes = ['weight-loss', 'muscle-gain', 'fitness-improvement', 'general-health', 'strength-focused'];
  const archetype = pickRandom(archetypes, rng);
  
  // Generate demographics
  const gender = pickRandom(['male', 'female'], rng);
  const age = Math.floor(rng() * 40) + 25; // 25-64
  const birthYear = new Date().getFullYear() - age;
  const birthMonth = Math.floor(rng() * 12) + 1;
  const birthDay = Math.floor(rng() * 28) + 1;
  const dateOfBirth = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
  
  // Generate realistic names
  const firstNames = gender === 'male' 
    ? ['Alex', 'Jordan', 'Sam', 'Chris', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Drew', 'Blake', 'Jamie', 'Quinn', 'Cameron', 'Avery', 'Reese']
    : ['Alex', 'Jordan', 'Sam', 'Chris', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Drew', 'Blake', 'Jamie', 'Quinn', 'Cameron', 'Avery', 'Reese'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas'];
  const firstName = pickRandom(firstNames, rng);
  const lastName = pickRandom(lastNames, rng);
  const fullName = `${firstName} ${lastName}`;
  
  // Generate email
  const emailDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(rng() * 100)}@${pickRandom(emailDomains, rng)}`;
  
  // Generate phone (UK format)
  const phone = `+44${Math.floor(7000000000 + rng() * 999999999)}`;
  
  // Generate height (cm) - realistic ranges
  const heightCm = gender === 'male' 
    ? Math.floor(165 + rng() * 25) // 165-190cm
    : Math.floor(155 + rng() * 20); // 155-175cm
  
  // Generate body composition based on archetype
  let weightKg: number;
  let bodyFatPct: number;
  let skeletalMuscleMassKg: number;
  let visceralFatLevel: number;
  let inbodyScore: number;
  
  if (archetype === 'weight-loss') {
    // Higher body fat, lower muscle
    bodyFatPct = gender === 'male' ? 28 + rng() * 12 : 32 + rng() * 10; // 28-40% (M), 32-42% (F)
    weightKg = Math.round((heightCm / 100) ** 2 * (22 + rng() * 8)); // BMI 22-30
    skeletalMuscleMassKg = weightKg * (1 - bodyFatPct / 100) * 0.5; // Approximate SMM
    visceralFatLevel = Math.floor(10 + rng() * 6); // 10-16
    inbodyScore = Math.floor(55 + rng() * 15); // 55-70
  } else if (archetype === 'muscle-gain') {
    // Lower body fat, higher muscle
    bodyFatPct = gender === 'male' ? 12 + rng() * 8 : 18 + rng() * 8; // 12-20% (M), 18-26% (F)
    weightKg = Math.round((heightCm / 100) ** 2 * (22 + rng() * 4)); // BMI 22-26
    skeletalMuscleMassKg = weightKg * (1 - bodyFatPct / 100) * 0.55; // Higher SMM ratio
    visceralFatLevel = Math.floor(4 + rng() * 4); // 4-8
    inbodyScore = Math.floor(75 + rng() * 10); // 75-85
  } else if (archetype === 'fitness-improvement') {
    // Moderate body fat, good muscle
    bodyFatPct = gender === 'male' ? 18 + rng() * 7 : 24 + rng() * 6; // 18-25% (M), 24-30% (F)
    weightKg = Math.round((heightCm / 100) ** 2 * (22 + rng() * 3)); // BMI 22-25
    skeletalMuscleMassKg = weightKg * (1 - bodyFatPct / 100) * 0.52;
    visceralFatLevel = Math.floor(6 + rng() * 4); // 6-10
    inbodyScore = Math.floor(70 + rng() * 12); // 70-82
  } else {
    // General health - varied
    bodyFatPct = gender === 'male' ? 20 + rng() * 10 : 26 + rng() * 10; // 20-30% (M), 26-36% (F)
    weightKg = Math.round((heightCm / 100) ** 2 * (22 + rng() * 5)); // BMI 22-27
    skeletalMuscleMassKg = weightKg * (1 - bodyFatPct / 100) * 0.5;
    visceralFatLevel = Math.floor(7 + rng() * 5); // 7-12
    inbodyScore = Math.floor(65 + rng() * 15); // 65-80
  }
  
  const bodyFatMassKg = Math.round(weightKg * (bodyFatPct / 100) * 10) / 10;
  const bmi = Math.round((weightKg / ((heightCm / 100) ** 2)) * 10) / 10;
  const waistHipRatio = gender === 'male' 
    ? Math.round((0.85 + rng() * 0.15) * 100) / 100 // 0.85-1.00
    : Math.round((0.75 + rng() * 0.15) * 100) / 100; // 0.75-0.90
  const totalBodyWaterL = Math.round((weightKg * 0.55 + rng() * 5) * 10) / 10;
  const bmrKcal = Math.floor(1800 + (weightKg * 10) + (heightCm * 6.25) - (age * 5) + (gender === 'male' ? 5 : -161));
  
  // Segmental lean mass (kg) - realistic distribution
  const trunkRatio = 0.45;
  const armRatio = 0.08;
  const legRatio = 0.47;
  const segmentalTrunkKg = Math.round(skeletalMuscleMassKg * trunkRatio * 10) / 10;
  const segmentalArmLeftKg = Math.round(skeletalMuscleMassKg * armRatio * 10) / 10;
  const segmentalArmRightKg = Math.round((segmentalArmLeftKg + (rng() - 0.5) * 0.5) * 10) / 10;
  const segmentalLegLeftKg = Math.round(skeletalMuscleMassKg * legRatio * 0.5 * 10) / 10;
  const segmentalLegRightKg = Math.round((segmentalLegLeftKg + (rng() - 0.5) * 0.5) * 10) / 10;
  
  // Lifestyle factors - coherent with archetype
  const activityLevels = ['sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extremely-active'];
  let activityLevel: string;
  let stepsPerDay: number;
  let sedentaryHours: number;
  let workHoursPerDay: number;
  let sleepQuality: string;
  let sleepDuration: string;
  let sleepConsistency: string;
  let stressLevel: string;
  let nutritionHabits: string;
  let hydrationHabits: string;
  let caffeineCupsPerDay: number;
  let lastCaffeineIntake: string | undefined;
  
  if (archetype === 'weight-loss') {
    activityLevel = pickRandom(['sedentary', 'lightly-active'], rng);
    stepsPerDay = Math.floor(3000 + rng() * 4000); // 3000-7000
    sedentaryHours = Math.floor(8 + rng() * 4); // 8-12
    workHoursPerDay = Math.floor(8 + rng() * 3); // 8-11
    sleepQuality = pickRandom(['poor', 'fair', 'good'], rng);
    sleepDuration = 'less-than-7';
    sleepConsistency = pickRandom(['very-inconsistent', 'inconsistent', 'consistent'], rng);
    stressLevel = pickRandom(['moderate', 'high', 'very-high'], rng);
    nutritionHabits = pickRandom(['poor', 'fair', 'good'], rng);
    hydrationHabits = pickRandom(['poor', 'fair', 'good'], rng);
    caffeineCupsPerDay = Math.floor(2 + rng() * 4); // 2-5
    if (caffeineCupsPerDay > 0) {
      const hour = Math.floor(8 + rng() * 10); // 8-18
      const minute = pickRandom([0, 15, 30, 45], rng);
      lastCaffeineIntake = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
  } else if (archetype === 'muscle-gain') {
    activityLevel = pickRandom(['moderately-active', 'very-active'], rng);
    stepsPerDay = Math.floor(7000 + rng() * 5000); // 7000-12000
    sedentaryHours = Math.floor(5 + rng() * 3); // 5-8
    workHoursPerDay = Math.floor(7 + rng() * 3); // 7-10
    sleepQuality = pickRandom(['good', 'excellent'], rng);
    sleepDuration = '7-9';
    sleepConsistency = pickRandom(['consistent', 'very-consistent'], rng);
    stressLevel = pickRandom(['low', 'moderate'], rng);
    nutritionHabits = pickRandom(['good', 'excellent'], rng);
    hydrationHabits = pickRandom(['good', 'excellent'], rng);
    caffeineCupsPerDay = Math.floor(1 + rng() * 2); // 1-2
    if (caffeineCupsPerDay > 0) {
      const hour = Math.floor(6 + rng() * 6); // 6-12
      const minute = pickRandom([0, 15, 30], rng);
      lastCaffeineIntake = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
  } else if (archetype === 'fitness-improvement') {
    activityLevel = pickRandom(['moderately-active', 'very-active'], rng);
    stepsPerDay = Math.floor(8000 + rng() * 4000); // 8000-12000
    sedentaryHours = Math.floor(5 + rng() * 3); // 5-8
    workHoursPerDay = Math.floor(8 + rng() * 2); // 8-10
    sleepQuality = pickRandom(['good', 'excellent'], rng);
    sleepDuration = '7-9';
    sleepConsistency = pickRandom(['consistent', 'very-consistent'], rng);
    stressLevel = pickRandom(['low', 'moderate'], rng);
    nutritionHabits = pickRandom(['good', 'excellent'], rng);
    hydrationHabits = pickRandom(['good', 'excellent'], rng);
    caffeineCupsPerDay = Math.floor(1 + rng() * 3); // 1-3
    if (caffeineCupsPerDay > 0) {
      const hour = Math.floor(7 + rng() * 8); // 7-15
      const minute = pickRandom([0, 15, 30, 45], rng);
      lastCaffeineIntake = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
  } else {
    // General health - varied
    activityLevel = pickRandom(activityLevels, rng);
    stepsPerDay = Math.floor(5000 + rng() * 7000); // 5000-12000
    sedentaryHours = Math.floor(6 + rng() * 5); // 6-11
    workHoursPerDay = Math.floor(7 + rng() * 4); // 7-11
    sleepQuality = pickRandom(['fair', 'good', 'excellent'], rng);
    sleepDuration = pickRandom(['less-than-7', '7-9', 'more-than-9'], rng);
    sleepConsistency = pickRandom(['inconsistent', 'consistent', 'very-consistent'], rng);
    stressLevel = pickRandom(['low', 'moderate', 'high'], rng);
    nutritionHabits = pickRandom(['fair', 'good', 'excellent'], rng);
    hydrationHabits = pickRandom(['fair', 'good', 'excellent'], rng);
    caffeineCupsPerDay = Math.floor(0 + rng() * 4); // 0-3
    if (caffeineCupsPerDay > 0) {
      const hour = Math.floor(7 + rng() * 10); // 7-17
      const minute = pickRandom([0, 15, 30, 45], rng);
      lastCaffeineIntake = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
  }
  
  // Movement assessment - coherent with body comp and lifestyle
  const postureOptions = {
    head: ['neutral', 'forward-head', 'tilted', 'chin-tucked'],
    shoulders: ['neutral', 'rounded', 'elevated', 'winged-scapula'],
    back: ['neutral', 'increased-kyphosis', 'increased-lordosis', 'scoliosis', 'flat-back'],
    hips: ['neutral', 'anterior-tilt', 'posterior-tilt'],
    knees: ['neutral', 'valgus-knee', 'varus-knee'],
  };
  
  // More issues if higher body fat / lower activity
  const hasPostureIssues = bodyFatPct > 25 || activityLevel === 'sedentary' || activityLevel === 'lightly-active';
  const postureHeadOverall = hasPostureIssues && rng() > 0.3 
    ? pickRandom(['forward-head', 'tilted'], rng)
    : 'neutral';
  const postureShouldersOverall = hasPostureIssues && rng() > 0.4
    ? pickRandom(['rounded', 'elevated'], rng)
    : 'neutral';
  const postureBackOverall = hasPostureIssues && rng() > 0.5
    ? pickRandom(['increased-kyphosis', 'increased-lordosis'], rng)
    : 'neutral';
  const postureHipsOverall = hasPostureIssues && rng() > 0.4
    ? pickRandom(['anterior-tilt', 'posterior-tilt'], rng)
    : 'neutral';
  const postureKneesOverall = hasPostureIssues && rng() > 0.5
    ? pickRandom(['valgus-knee', 'varus-knee'], rng)
    : 'neutral';
  
  // Overhead squat - correlates with posture and mobility
  const ohsShoulderMobility = postureShouldersOverall !== 'neutral' || rng() > 0.6
    ? pickRandom(['compensated', 'limited'], rng)
    : pickRandom(['full-range', 'compensated'], rng);
  const ohsTorsoLean = postureBackOverall !== 'neutral' || rng() > 0.5
    ? pickRandom(['moderate-lean', 'excessive-lean'], rng)
    : pickRandom(['upright', 'moderate-lean'], rng);
  const ohsSquatDepth = hasPostureIssues || rng() > 0.5
    ? pickRandom(['parallel', 'quarter-depth', 'no-depth'], rng)
    : pickRandom(['full-depth', 'parallel'], rng);
  const ohsHipShift = rng() > 0.7 ? pickRandom(['left', 'right'], rng) : 'none';
  const ohsKneeAlignment = postureKneesOverall !== 'neutral' || rng() > 0.6
    ? pickRandom(['valgus', 'varus'], rng)
    : 'stable';
  const ohsFeetPosition = rng() > 0.6
    ? pickRandom(['pronation', 'supination'], rng)
    : 'stable';
  
  // Hinge
  const hingeDepth = hasPostureIssues || rng() > 0.5
    ? pickRandom(['fair', 'poor'], rng)
    : pickRandom(['excellent', 'good', 'fair'], rng);
  const hingeBackRounding = postureBackOverall !== 'neutral' || rng() > 0.5
    ? pickRandom(['moderate', 'severe'], rng)
    : pickRandom(['none', 'minor', 'moderate'], rng);
  
  // Lunge
  const lungeBalance = hasPostureIssues || rng() > 0.5
    ? pickRandom(['fair', 'poor'], rng)
    : pickRandom(['excellent', 'good', 'fair'], rng);
  const lungeKneeAlignment = postureKneesOverall !== 'neutral' || rng() > 0.6
    ? pickRandom(['caves-inward', 'bows-outward'], rng)
    : 'tracks-straight';
  const lungeTorso = postureHipsOverall !== 'neutral' || rng() > 0.5
    ? pickRandom(['anterior-tilt', 'posterior-tilt'], rng)
    : 'neutral';
  
  // Mobility
  const mobilityHip = hasPostureIssues || rng() > 0.5
    ? pickRandom(['fair', 'poor'], rng)
    : pickRandom(['good', 'fair'], rng);
  const mobilityShoulder = postureShouldersOverall !== 'neutral' || rng() > 0.5
    ? pickRandom(['fair', 'poor'], rng)
    : pickRandom(['good', 'fair'], rng);
  const mobilityAnkle = hasPostureIssues || rng() > 0.5
    ? pickRandom(['fair', 'poor'], rng)
    : pickRandom(['good', 'fair'], rng);
  
  // Strength/endurance - correlates with muscle mass and activity
  const strengthBase = skeletalMuscleMassKg / weightKg;
  const isStrong = strengthBase > 0.45 || activityLevel === 'very-active' || activityLevel === 'extremely-active';
  
  const squatsOneMinuteReps = isStrong
    ? Math.floor(35 + rng() * 20) // 35-55
    : Math.floor(15 + rng() * 20); // 15-35
  const pushupsOneMinuteReps = isStrong
    ? Math.floor(20 + rng() * 20) // 20-40
    : Math.floor(8 + rng() * 15); // 8-23
  const plankDurationSeconds = isStrong
    ? Math.floor(60 + rng() * 70) // 60-130
    : Math.floor(25 + rng() * 40); // 25-65
  
  // Grip strength - correlates with muscle mass
  const gripBase = gender === 'male' ? 30 : 22;
  const gripLeftKg = Math.floor(gripBase + (skeletalMuscleMassKg - 25) * 0.5 + (rng() - 0.5) * 6);
  const gripRightKg = Math.floor(gripLeftKg + (rng() - 0.5) * 4);
  
  // Cardio - correlates with activity and fitness
  const isFit = activityLevel === 'very-active' || activityLevel === 'extremely-active' || stepsPerDay > 10000;
  const cardioTestSelected = pickRandom(['ymca-step', 'treadmill'], rng);
  const cardioRestingHr = isFit
    ? Math.floor(55 + rng() * 10) // 55-65
    : Math.floor(65 + rng() * 15); // 65-80
  const cardioPost1MinHr = isFit
    ? Math.floor(95 + rng() * 20) // 95-115
    : Math.floor(115 + rng() * 25); // 115-140
  
  // Goals - based on archetype
  let clientGoals: string[];
  let goalLevelWeightLoss: string | undefined;
  let goalLevelMuscle: string | undefined;
  let goalLevelBodyRecomp: string | undefined;
  let goalLevelStrength: string | undefined;
  let goalLevelFitness: string | undefined;
  
  if (archetype === 'weight-loss') {
    // Sometimes use body recomposition instead of pure weight loss
    if (rng() > 0.5) {
      clientGoals = ['body-recomposition'];
      goalLevelBodyRecomp = pickRandom(['healthy', 'fit', 'athletic', 'shredded'], rng);
    } else {
      clientGoals = ['weight-loss'];
      goalLevelWeightLoss = pickRandom(['5', '10', '15', '20'], rng);
    }
  } else if (archetype === 'muscle-gain') {
    clientGoals = pickRandom([['build-muscle'], ['build-muscle', 'build-strength'], ['body-recomposition']], rng);
    if (clientGoals.includes('body-recomposition')) {
      goalLevelBodyRecomp = pickRandom(['healthy', 'fit', 'athletic', 'shredded'], rng);
    } else {
      goalLevelMuscle = pickRandom(['2', '4', '6', '8'], rng);
      if (clientGoals.includes('build-strength')) {
        goalLevelStrength = pickRandom(['10', '20', '30', '40'], rng);
      }
    }
  } else if (archetype === 'fitness-improvement') {
    clientGoals = ['improve-fitness'];
    goalLevelFitness = pickRandom(['health', 'active', 'athletic', 'elite'], rng);
  } else if (archetype === 'strength-focused') {
    clientGoals = ['build-strength'];
    goalLevelStrength = pickRandom(['10', '20', '30', '40'], rng);
  } else {
    clientGoals = pickRandom([['general-health'], ['weight-loss', 'general-health'], ['body-recomposition', 'general-health'], ['improve-fitness', 'general-health']], rng);
    if (clientGoals.includes('weight-loss')) {
      goalLevelWeightLoss = pickRandom(['5', '10', '15'], rng);
    }
    if (clientGoals.includes('body-recomposition')) {
      goalLevelBodyRecomp = pickRandom(['healthy', 'fit', 'athletic'], rng);
    }
    if (clientGoals.includes('improve-fitness')) {
      goalLevelFitness = pickRandom(['health', 'active', 'athletic'], rng);
    }
  }
  
  // PAR-Q - mostly "no" for demo, but occasional "yes" for realism
  const parqAnswers = rng() > 0.85 ? 'yes' : 'no';
  const parq1 = parqAnswers;
  const parq2 = rng() > 0.9 ? 'yes' : 'no';
  const parq3 = rng() > 0.92 ? 'yes' : 'no';
  const parq4 = rng() > 0.9 ? 'yes' : 'no';
  const parq5 = rng() > 0.92 ? 'yes' : 'no';
  const parq6 = rng() > 0.9 ? 'yes' : 'no';
  const parq7 = rng() > 0.92 ? 'yes' : 'no';
  const parq8 = rng() > 0.9 ? 'yes' : 'no';
  const parq9 = rng() > 0.92 ? 'yes' : 'no';
  const parq10 = rng() > 0.9 ? 'yes' : 'no';
  const parq11 = rng() > 0.92 ? 'yes' : 'no';
  const parq12 = rng() > 0.9 ? 'yes' : 'no';
  const parq13 = gender === 'female' && rng() > 0.85 ? 'yes' : 'no';
  
  // Coach assignment
  const assignedCoach = pickRandom(['coach-mike', 'coach-selina'], rng);
  
  // Build the payload
  const payload: Partial<FormData> = {
    fullName,
    email,
    phone,
    dateOfBirth,
    gender,
    assignedCoach,
    heightCm: String(heightCm),
    activityLevel,
    stepsPerDay: String(stepsPerDay),
    sedentaryHours: String(sedentaryHours),
    workHoursPerDay: String(workHoursPerDay),
    sleepQuality,
    sleepDuration,
    sleepConsistency,
    stressLevel,
    nutritionHabits,
    hydrationHabits,
    caffeineCupsPerDay: String(caffeineCupsPerDay),
    ...(lastCaffeineIntake ? { lastCaffeineIntake } : {}),
    parqQuestionnaire: 'completed',
    parq1,
    parq2,
    parq3,
    parq4,
    parq5,
    parq6,
    parq7,
    parq8,
    parq9,
    parq10,
    parq11,
    parq12,
    parq13,
    inbodyScore: String(inbodyScore),
    inbodyWeightKg: String(Math.round(weightKg * 10) / 10),
    inbodyBodyFatPct: String(Math.round(bodyFatPct * 10) / 10),
    bodyFatMassKg: String(bodyFatMassKg),
    inbodyBmi: String(bmi),
    visceralFatLevel: String(visceralFatLevel),
    skeletalMuscleMassKg: String(Math.round(skeletalMuscleMassKg * 10) / 10),
    waistHipRatio: String(waistHipRatio),
    totalBodyWaterL: String(totalBodyWaterL),
    segmentalTrunkKg: String(segmentalTrunkKg),
    segmentalArmLeftKg: String(segmentalArmLeftKg),
    segmentalArmRightKg: String(segmentalArmRightKg),
    segmentalLegLeftKg: String(segmentalLegLeftKg),
    segmentalLegRightKg: String(segmentalLegRightKg),
    bmrKcal: String(bmrKcal),
    postureHeadOverall: [postureHeadOverall],
    postureShouldersOverall: [postureShouldersOverall],
    postureBackOverall: [postureBackOverall],
    postureHipsOverall: [postureHipsOverall],
    postureKneesOverall: [postureKneesOverall],
    ohsShoulderMobility,
    ohsTorsoLean,
    ohsSquatDepth,
    ohsHipShift,
    ohsKneeAlignment,
    ohsFeetPosition,
    hingeDepth,
    hingeBackRounding,
    lungeLeftBalance: lungeBalance,
    lungeLeftKneeAlignment: lungeKneeAlignment,
    lungeLeftTorso: lungeTorso,
    lungeRightBalance: lungeBalance,
    lungeRightKneeAlignment: lungeKneeAlignment,
    lungeRightTorso: lungeTorso,
    mobilityHip,
    mobilityShoulder,
    mobilityAnkle,
    squatsOneMinuteReps: String(squatsOneMinuteReps),
    pushupsOneMinuteReps: String(pushupsOneMinuteReps),
    plankDurationSeconds: String(plankDurationSeconds),
    gripLeftKg: String(gripLeftKg),
    gripRightKg: String(gripRightKg),
    cardioTestSelected,
    cardioRestingHr: String(cardioRestingHr),
    cardioPost1MinHr: String(cardioPost1MinHr),
    clientGoals,
    ...(goalLevelWeightLoss ? { goalLevelWeightLoss } : {}),
    ...(goalLevelMuscle ? { goalLevelMuscle } : {}),
    ...(goalLevelBodyRecomp ? { goalLevelBodyRecomp } : {}),
    ...(goalLevelStrength ? { goalLevelStrength } : {}),
    ...(goalLevelFitness ? { goalLevelFitness } : {}),
  };
  
  return payload;
}

/**
 * Helper: Seeded random number generator for reproducible results
 */
function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

/**
 * Helper: Pick random element from array
 */
function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

