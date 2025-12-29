# One Fitness Assessment Structure

This document provides a high-level view of all the clinical data, questions, and input options collected from each client during the assessment process.

---

## Phase 0: Basic Client Info
**Summary:** Core identity and physiological baseline.

- **Client Name** (Text)
- **Email Address** (Email)
- **Phone Number** (Tel)
- **Date of Birth** (Date)
- **Height (cm)** (Number)
- **Gender** (Select)
  - Male, Female
- **Assigned Coach** (Select)
  - Coach Mike, Coach Selina

---

## Phase 1: Lifestyle Factors
**Summary:** Daily habits that impact training volume, recovery, and results.

- **Activity Level** (Select)
  - Sedentary, Lightly Active, Moderately Active, Very Active, Extremely Active
- **Average Steps Per Day** (Number)
- **Sedentary Hours** (Number)
- **Work Hours** (Number)
- **Sleep Quality** (Select)
  - Poor, Fair, Good, Excellent
- **Sleep Duration** (Select)
  - <5h, 5-6h, 6-7h, 7-8h, 8-9h, >9h
- **Sleep Schedule Consistency** (Select)
  - Very inconsistent, Inconsistent, Consistent, Very consistent
- **Stress Levels** (Select)
  - Very low, Low, Moderate, High, Very high
- **Nutrition Habits** (Select)
  - Poor, Fair, Good, Excellent
- **Hydration Habits** (Select)
  - Poor, Fair, Good, Excellent
- **Caffeine Intake** (Number of cups per day)
- **Time of Last Caffeine Intake** (Time) - *Conditional: shown if caffeine > 0*

---

## Phase 2: Body Composition
**Summary:** Health screening (PAR-Q) and physiological metrics via InBody scan.

### PAR-Q (Physical Activity Readiness Questionnaire)
- **13 Standard Health/Safety Questions** (Yes/No)
  - *Note: Any "YES" requires medical clearance before physical testing.*

### InBody Metrics
- **InBody Score** (Overall 0-100)
- **Weight (kg)**
- **Skeletal Muscle Mass (kg)**
- **Body Fat Mass (kg)**
- **Body Fat (%)**
- **BMI**
- **Total Body Water (L)**
- **Waist-to-Hip Ratio (WHR)**
- **Visceral Fat Level** (Goal < 10)
- **BMR (kcal)**

### Segmental Lean Analysis (Muscle balance)
- **Trunk lean (kg)**
- **Left Arm (kg)**
- **Right Arm (kg)**
- **Left Leg (kg)**
- **Right Leg (kg)**

---

## Phase 3: Movement Quality
**Summary:** Posture analysis, movement patterns (Squat, Hinge, Lunge), and joint mobility.

### Posture Assessment (AI or Manual)
- **Assessment Method** (Manual Observation / AI Posture Scan)
- **Head and Neck Alignment**
  - Neutral, Forward head, Tilted, Chin tucked
- **Shoulder and Upper Back**
  - Neutral, Rounded, Elevated, Winged scapula
- **Back and Spine**
  - Neutral, Kyphosis, Lordosis, Scoliosis, Flat back
- **Hips Alignment**
  - Neutral, Anterior tilt, Posterior tilt
- **Knees Alignment**
  - Neutral, Valgus (inward), Varus (outward)

### Overhead Squat Pattern
- **Shoulder Mobility** (Full range, Compensated, Limited)
- **Torso Lean** (Upright, Moderate, Excessive)
- **Squat Depth** (Full, Parallel, Quarter, Minimal)
- **Hip Shift** (None, Left, Right)
- **Knee Alignment** (Stable, Valgus, Varus)
- **Foot Behaviour** (Stable, Pronation, Supination)

### Hinge Pattern
- **Depth** (Excellent, Good, Fair, Poor)
- **Back Rounding** (None, Minor, Moderate, Severe)

### Lunge Pattern (Left & Right Side)
- **Balance** (Excellent, Good, Fair, Poor)
- **Knee Tracking** (Straight, Caves inward, Bows outward)
- **Hips Position** (Neutral, Anterior tilt, Posterior tilt)

### Mobility Screens
- **Hip Mobility** (Good, Fair, Poor)
- **Shoulder Mobility** (Good, Fair, Poor)
- **Ankle Mobility** (Good, Fair, Poor)

---

## Phase 4: Muscular Strength
**Summary:** Foundational strength and local muscular endurance tests.

- **Squats in One Minute** (Reps)
- **Pushups in One Minute** (Reps)
- **Plank Duration** (Seconds)
- **Grip Strength - Left Hand** (kg)
- **Grip Strength - Right Hand** (kg)

---

## Phase 5: Metabolic Fitness
**Summary:** Cardiovascular efficiency and VO2 Max estimation.

- **Test Selection** (YMCA Step Test / Treadmill Test)
- **Resting Heart Rate (bpm)**
- **1-min Post-Test HR (bpm)** (Recovery heart rate)

---

## Phase 6: Goals & Planning
**Summary:** Long-term targets and roadmap calibration.

- **Primary Goals** (Multi-select)
  - Build muscle, Weight loss, Build strength, Improve fitness, General health
- **Goal Specificity** (Select target level for each selected goal)
  - Health minimum, Average, Above average, Elite

