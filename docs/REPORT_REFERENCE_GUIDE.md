# One Fitness: Complete Report Reference Guide

This document is a comprehensive "Deep-Dive" into the logic, math, and data-mapping of the One Fitness system. It explains exactly how raw data from the assessment forms is transformed into a clinical-grade report for both clients and coaches.

---

## 1. Executive Summary: The "Global Brain"
The system's core logic resides in `scoring.ts`. Every time a form is saved, the "Brain" recalculates:
- **Overall Fitness Score (0-100)**: A simple average of the 5 pillar scores.
- **Pillar Scores**: Weighted averages of sub-metrics (explained below).
- **Roadmap Architecture**: A dynamic 12–24 week plan generated based on the lowest scores and highest health risks.

---

## 2. Pillar 1: Body Composition
**Goal**: Evaluate the "Foundation" (Muscle vs. Fat).

### Input Mapping & Scoring Math
- **Body Fat % (35% weight)**: 
    - *Ideal Range*: <15% (M), <22% (F). 
    - *Score Logic*: 100 points for ideal; -3 points for every 1% deviation.
- **Skeletal Muscle Mass (25% weight)**: 
    - *Score Logic*: A ratio of SMM to total Body Weight. Higher ratios = higher scores.
- **Visceral Fat Level (25% weight)**: 
    - *Score Logic*: Level 1-9 = 100 points. Level 10+ = -10 points per level (High Risk).
- **Waist-to-Hip Ratio (15% weight)**: 
    - *Score Logic*: 100 points for ratios <0.90 (M) or <0.85 (F). Penalties increase as ratio grows.

### Visual & Text Outputs
- **Limb Imbalance Flag**: Triggered if Segmental Lean Analysis (L vs. R) shows a >6% weight difference.
- **Health Risk Badge**: "Obesity Risk" or "Urgent" focus if BMI > 30 or BF% > 32% (F) / 25% (M).

---

## 3. Pillar 2: Muscular Strength
**Goal**: Measure muscular endurance and functional capacity.

### Input Mapping & Scoring Math
- **Pushups (1-min)**: 33 reps = 100 points.
- **Squats (1-min)**: 40 reps = 100 points.
- **Plank Hold (secs)**: 120 seconds = 100 points.
- **Grip Strength (kg)**: Average of Left/Right. ~50kg = 100 points.

### Dynamic Findings
- **Weakness Tags**: If Plank < 60s, "Core Endurance" is flagged. If Pushups < 15, "Upper Body Endurance" is flagged.

---

## 4. Pillar 3: Metabolic Fitness (Cardio)
**Goal**: Measure heart health and recovery efficiency.

### Scoring Logic (Additive 100-pt scale)
- **Resting HR (20 pts)**: <55 bpm = 20 pts; >85 bpm = 4 pts.
- **Recovery HR (40 pts)**: Based on the YMCA Step Test or Treadmill ratings (Excellent, Good, Fair, etc.).
- **VO2max Estimate (40 pts)**: Derived from the Max HR (208 - 0.7 * age) vs. 1-minute post-test recovery HR.

### Dynamic Findings
- **Cardio Class**: Categorizes client into "Aerobic Base Training" (Zone 2) or "Performance Training" (Intervals) based on total score.

---

## 5. Pillar 4: Movement Quality
**Goal**: Evaluate structural alignment (Posture) and functional patterns (Movement).

### A. Posture AI (The "Portal" View)
- **The "Portal" View**: A cropped image focusing on the head, neck, and shoulders.
- **Reference Lines**: 
    - **Green Line**: The "Ideal Plumb Line" (Target).
    - **Red Line**: The "Deviation Line," showing the exact angle of tilt or shift.
- **Scoliosis Badge**: A pulsing red indicator triggered if back-view spinal curvature > 5°.
- **Specific Deviations**:
    - *Front View*: Analyzes Head Tilt, Shoulder Asymmetry, and Pelvic Shift.
    - *Side View*: Analyzes Forward Head (FHP), Kyphosis, Lordosis, and Pelvic Tilt.

### B. Movement Patterns & Mobility
- **Overhead Squat**: Scored across 6 checkpoints (Knee tracking, Torso lean, Heels, etc.).
- **Mobility Screens**: Scored as Good (100), Fair (60), or Poor (30) for Hips, Shoulders, and Ankle joints.
- **Valgus/Varus Flags**: If "Knee Valgus" is selected in the OHS or Lunge test, it automatically triggers "Glute Medius Activation" recommendations in the training strategy.

---

## 6. Pillar 5: Lifestyle Factors
**Goal**: Evaluate the "Recovery Environment" that supports training.

### Scoring Categories
- **Sleep (30%)**: Weighted by Quality, Consistency, and Duration.
- **Stress (25%)**: Inverted (Low stress = High score).
- **Nutrition/Hydration (25%)**: Based on habit consistency.
- **Daily Activity (20%)**: Steps (10k target) minus Sedentary penalties (>8h).

### Lifestyle-Specific Outputs
- **Quick Wins Section**: Automatically generates the top 5 highest-leverage habits (e.g., "7-9h Sleep target" or "2-3L Hydration").
- **Nutrition Advice**: Generates a conversational block based on goals (e.g., "Weight Loss" goals trigger "Gentle calorie deficit & protein focus").

---

## 7. The Training Roadmap (The Plan)
Generated via `buildRoadmap` function. It is a dynamic, multi-phase timeline.

### Phase Sequencing Logic (Priority System):
1.  **Body Composition Phase**: Triggered first if BMI/BF% indicates a health risk.
2.  **Movement Quality Phase**: Triggered if Mobility is "Poor" or Posture is "Severe."
3.  **Performance Phases**: Strength and Cardio phases follow, ordered by the lowest score first.

### Timeline Calculations:
- **Rate of Change**: Uses conservative rates (0.5kg/week fat loss, 0.2kg/week muscle gain) to calculate the "Weeks" for each phase.
- **Session Factor**: If the client selects 5 sessions/week, the "Expected Delta" (improvement) increases by 25%.

---

## 8. Coach-Facing "Talking Points"
The coach report includes a "Scripted Strategy" to ensure a professional hand-off.
- **"What we found"**: Translates raw scores into plain-English findings.
- **"Why this matters"**: Explains the impact on the client's specific goal (e.g., "Poor hip mobility is blocking your squat depth").
- **"Outlook"**: Provides a 2-3 month realistic expectation.
- **"Your Commitment"**: A summary of what the client *must* do to see the roadmap come to life.

---

## 9. Understanding the Radar Graphs

### A. Overall Performance Radar (The "Capability Envelope")
- **Visual**: A 5-point radar covering the 5 Pillars.
- **Meaning**: The shape shows where the client is "lopsided." A large, symmetrical shape represents a well-rounded athlete. Deep "valleys" indicate critical weak links.

### B. Lifestyle Radar
- **Visual**: A 5-point radar covering Sleep, Stress, Hydration, Nutrition, and Activity.
- **Meaning**: Shows the client how their daily habits (the "Foundation") are supporting their fitness results.

### C. Movement Quality Radar
- **Visual**: A 3-point radar (Posture, Movement Patterns, Mobility).
- **Meaning**: Distinguishes between "Structural" issues (how they stand) and "Functional" issues (how they move).
