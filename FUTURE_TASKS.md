# Future Roadmap: AI Cost Optimization & Reliability

## 1. OCR Migration (InBody Scans)
- **Current:** Gemini Pro Vision (Cloud/Paid)
- **Target:** Tesseract.js (Local/Free)
- **Reason:** InBody reports are structured; reading numbers doesn't require a generative LLM. Local processing is faster and free.

## 2. Posture Analysis Logic
- **Current:** Gemini 1.5 Flash (Cloud/Paid)
- **Target:** MediaPipe Landmarks + TypeScript Math
- **Reason:** MediaPipe already provides pixel-perfect coordinates. Calculating tilt, shift, and angles via math is 100% accurate and free. Gemini should only be used to "summarize" the findings, not calculate them.

## 3. Exercise & Correction Database
- **Current:** Gemini-generated mappings
- **Target:** Static JSON Mapping Table
- **Reason:** Prevents "hallucinations" and ensures consistent professional advice. Maps findings directly to specific corrective movements.

## 4. Roadmap & Timeline Calculations
- **Current:** AI-estimated timeframes
- **Target:** Physiological Math Formulas
- **Reason:** Calculations like weight loss (0.5kg/week) or muscle gain rates are deterministic. Code is more reliable than a "guess" from an LLM.

## 5. Client-Friendly Language
- **Current:** AI-translated summaries
- **Target:** Static Dictionary/Glossary
- **Reason:** Common postural issues have standard "layman" explanations. Storing these locally ensures instant reports and $0 cost.

## 6. Local LLM (The "Final Boss" of Free AI)
- **Concept:** Use WebLLM to run Llama 3 or Mistral directly in the user's browser.
- **Benefit:** Entirely private, offline-capable, and completely free for the business.


