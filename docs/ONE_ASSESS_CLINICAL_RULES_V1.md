# One Assess – Clinical Rules V1

> **Purpose:** When Claude (or any Chief of Staff / CTO / CMO agent) reloads, you can upload this doc to the project. It ensures the CTO Agent writes code that matches your coaching philosophy, and the CMO Agent writes marketing that actually explains the science.

---

## 1. What anatomical landmarks are we tracking?

We use **MediaPipe Pose** (33 landmarks). The ones that drive our posture logic are listed below in anatomical terms where they map clearly. MediaPipe does not expose ASIS/PSIS by name; we use joint-center proxies.

| Region | MediaPipe index | Anatomical proxy / use |
|--------|-----------------|-------------------------|
| **Head** | 0 Nose, 2 L eye, 5 R eye, 7 L ear, 8 R ear | Head position, Frankfurt plane (ear–eye), lateral tilt |
| **Shoulders** | 11 L shoulder, 12 R shoulder | Acromion region; shoulder height, symmetry, plumb line |
| **Torso** | 11–12, 23–24 | Shoulder–hip relationship for spinal/plumb |
| **Hips** | 23 L hip, 24 R hip | Hip joint center; level, shift, pelvic tilt proxy |
| **Knees** | 25 L knee, 26 R knee | Valgus/varus vs hip–ankle line |
| **Ankles** | 27 L ankle, 28 R ankle | Plumb-line anchor, leg alignment |
| **Feet** | 31 L foot index, 32 R foot index | Base of support, center of mass |

We do **not** track ASIS/PSIS directly; pelvic tilt is inferred from hip–knee–shoulder geometry and angle bands (see Red Flags).

---

## 2. What constitutes a "red flag" in our logic?

### Posture (from landmark-derived metrics)

- **Forward Head Posture (CVA):**  
  - **Severe** = CVA &lt; 30° → red flag (prioritise chin tucks, no load on pattern until improved).  
  - Bands: Neutral ≥50°, Mild 40–50°, Moderate 30–40°, Severe &lt;30°.

- **Forward head deviation (side view):**  
  **&gt; 15°** deviation → critical; must be addressed before loading.

- **Shoulder height:**  
  **&gt; 1 cm** difference L/R → asymmetric; used in movement quality and front/back severity.

- **Head tilt (frontal):**  
  **&gt; 10°** tilt → severe; high neck/shoulder injury risk, prioritise isolation/stabilisation.

- **Kyphosis (thoracic curve):**  
  **&gt; 60°** curve → severe; high injury risk, prioritise thoracic extension and professional assessment.

- **Spinal curvature / scoliosis:**  
  **&gt; 20°** curve → severe; immediate attention, side-specific core stabilisation, no loading through the pattern until addressed.

- **Pelvic tilt (side view):**  
  - Neutral band: ~160°–185° (hip–knee–shoulder angle).  
  - Anterior tilt &lt; 160°, Posterior &gt; 185°.  
  - Severity: Mild &lt; 8° deviation, Moderate &lt; 15°, **Severe ≥ 15°** → red flag for loading and programming.

### Movement and safety

- **Pain on screening:**  
  Any **"yes"** to pain during **Overhead Squat**, **Hip Hinge**, or **Lunge** → **red flag**. Do not apply external load; recommend referral for clinical assessment if needed, then pain-free alternatives and gradual return.

- **PAR-Q+:**  
  Any **positive** answer → **halt Phase 4–5 (high-intensity testing)** until medical clearance. Message: *"Pause Phase 4–5 testing until medical clearance confirms PAR-Q+ risks are resolved."*

### Body composition / health

- **Very high body fat / obesity:**  
  BF &gt; 30% (male) or &gt; 38% (female), or BMI &gt; 35, or visceral ≥ 15 → critical health risk; prioritise Zone 2 cardio and daily movement before aggressive loading.

- **Very low strength:**  
  Strength score &lt; 30 → high injury risk with loading; prioritise bodyweight foundation.

---

## 3. What is the "vibe" of the reports?

- **Clinical but coach-like:** Evidence-based and precise, but **encouraging and actionable**. Not cold or purely diagnostic.

- **Concise:** Short descriptions (e.g. under ~12 words); one-sentence recommendations. No raw numbers (cm, degrees, %) in client-facing copy—interpretation only.

- **Consistent language:** Use exact status values (Neutral, Mild, Moderate, Severe; Tilted Left/Right; etc.) so reports are auditable and aligned with the logic above.

- **Coach-first:** The coach is the expert; the app supports with clear findings and clear "what to do next." Roadmap and plan language is about addressing critical items first, movement quality before load, and long-term sustainability.

- **Safety-first:** Red flags (pain, PAR-Q+, severe posture) are clearly called out and drive prioritisation (e.g. critical block in roadmap, no load on painful patterns). Marketing and in-app copy should explain that we flag risk and prioritise safety, not just scores.

---

## 4. Why this doc?

- **CTO Agent:** Implements and refines posture logic, severity bands, and red-flag behaviour so they stay aligned with these rules and your coaching philosophy.
- **CMO Agent:** Writes landing pages, FAQs, and product copy that accurately describe the science (landmarks, thresholds, safety) and the tone (clinical + coach-like, safety-first), without overselling or sounding generic.

*Last updated: March 2025. Aligns with `postureAlignment.ts`, `postureMath.ts`, `criticalHealthFilter.ts`, `postureTemplates.ts`, and `POSTURE_INDUSTRY_STANDARDS.md`.*
