# Posture Assessment – Industry Standards

This app aligns posture scoring with common physiotherapy and clinical practice so results are defensible and consistent with what professionals expect.

## Forward Head Posture (FHP) – CVA

- **Craniovertebral Angle (CVA)** is the standard measure for forward head posture.
- We derive an approximate CVA from ear and shoulder landmarks (MediaPipe) and map to severity:
  - **Neutral**: CVA ≥ 50°
  - **Mild**: 40°–50°
  - **Moderate**: 30°–40°
  - **Severe**: &lt;30°
- These bands match common clinical use. See `POSTURE_STANDARD` in `src/lib/utils/postureAlignment.ts`.

## Shoulder Height

- **Normal** when the height difference between left and right shoulder is **&lt;1 cm**.
- Aligns with typical physio practice. Used in movement quality scoring and front/back view metrics.

## Pelvic Tilt / Kyphosis / Lordosis

- Severity levels (Normal, Mild, Moderate, Severe) for pelvic tilt, kyphosis, and lordosis are consistent with standard clinical ranges.
- Numeric bands are defined in posture templates and scoring; pelvic tilt uses degree-based thresholds.

## Body Composition, Cardio & Strength

- Body composition: US Navy method, WHO for WHR, normative references where applicable.
- Cardio: ACSM-style metabolic equations, normative HR/HRR.
- Strength: NASM/ACSM-style normative data and age/gender adjustments.

These standards are referenced in code and in this doc so professionals can verify alignment with their practice.
