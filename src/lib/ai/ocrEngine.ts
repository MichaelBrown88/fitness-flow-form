import { getAI, VertexAIBackend, getGenerativeModel } from "firebase/ai";
import { getApp } from "firebase/app";
import { FormData } from '../../contexts/FormContext';
import { CONFIG } from '@/config';
import { logAIUsage } from '@/services/aiUsage';
import { getFirebaseFunctions, auth, db } from '@/services/firebase';
import { collection, query, where, getDocs, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { logger } from '@/lib/utils/logger';
import { COLLECTIONS } from '@/constants/collections';
import { isFeatureEnabled } from '@/services/platform/platformConfig';
import { FeatureDisabledError } from './postureAnalysis';

export interface OcrResult {
  fields: Partial<FormData>;
  rawText: string;
  confidence: number;
  provider: 'local' | 'gemini' | 'pattern';
}

const MIN_PATTERN_HITS = 3; // Minimum successful uses before trusting a cached pattern

/**
 * Check if we've seen this report layout before.
 * Returns cached fields only when the pattern has been confirmed >= MIN_PATTERN_HITS times.
 */
async function checkLearnedPatterns(layoutSignature: string): Promise<Partial<FormData> | null> {
  try {
    const patternsRef = collection(db, COLLECTIONS.LEARNED_OCR_PATTERNS);
    const q = query(patternsRef, where('signature', '==', layoutSignature), limit(1));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const doc = snap.docs[0];
      const data = doc.data();
      const hitCount: number = typeof data.hitCount === 'number' ? data.hitCount : 0;

      if (hitCount >= MIN_PATTERN_HITS) {
        // Trusted pattern — return cached fields and update usage stats
        await import('firebase/firestore').then(({ updateDoc, increment }) =>
          updateDoc(doc.ref, {
            hitCount: increment(1),
            lastUsedAt: serverTimestamp(),
          })
        );
        return data.fields as Partial<FormData>;
      }

      // Pattern exists but not yet trusted — increment but don't use as cache
      await import('firebase/firestore').then(({ updateDoc, increment }) =>
        updateDoc(doc.ref, { hitCount: increment(1) })
      );
    }
  } catch (err) {
    logger.warn('[OCR] Pattern check failed (non-critical):', err);
  }
  return null;
}

/**
 * Save a successful Gemini result as a candidate pattern.
 * Patterns are trusted after MIN_PATTERN_HITS confirmed uses.
 */
async function learnPattern(layoutSignature: string, fields: Partial<FormData>) {
  try {
    const patternsRef = collection(db, COLLECTIONS.LEARNED_OCR_PATTERNS);

    // Check if this signature already exists — if so, don't add a duplicate
    const q = query(patternsRef, where('signature', '==', layoutSignature), limit(1));
    const existing = await getDocs(q);
    if (!existing.empty) return; // Already tracked; hitCount incremented by checkLearnedPatterns

    await addDoc(patternsRef, {
      signature: layoutSignature,
      fields,
      hitCount: 1,
      lastUsedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    logger.warn('[OCR] Pattern learning failed (non-critical):', err);
  }
}

export const REQUIRED_SCAN_FIELDS: (keyof FormData)[] = [
  'inbodyWeightKg',
  'skeletalMuscleMassKg',
  'inbodyBodyFatPct',
  'visceralFatLevel',
  'inbodyScore'
];

const OCR_MAX_WIDTH = 1200;
const OCR_JPEG_QUALITY = 0.85;

/**
 * Pre-crop and downscale body composition report image.
 * Crops to data table area (removes logo/footer), then caps width at 1200px.
 * Reduces multimodal token usage by ~50% without affecting text extraction.
 */
async function cropBodyCompImage(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(imageSrc);
          return;
        }
        
        const cropX = Math.floor(img.width * 0.05);
        const cropY = Math.floor(img.height * 0.10);
        const cropWidth = Math.floor(img.width * 0.90);
        const cropHeight = Math.floor(img.height * 0.75);
        
        let outWidth = cropWidth;
        let outHeight = cropHeight;
        if (outWidth > OCR_MAX_WIDTH) {
          const scale = OCR_MAX_WIDTH / outWidth;
          outWidth = OCR_MAX_WIDTH;
          outHeight = Math.floor(outHeight * scale);
        }
        
        canvas.width = outWidth;
        canvas.height = outHeight;
        
        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, outWidth, outHeight
        );
        
        const croppedImage = canvas.toDataURL('image/jpeg', OCR_JPEG_QUALITY);
        logger.debug(`[OCR] Cropped+resized: ${img.width}x${img.height} -> ${outWidth}x${outHeight}`);
        resolve(croppedImage);
      } catch (error) {
        logger.warn('[OCR] Crop failed, using original:', error);
        resolve(imageSrc);
      }
    };
    
    img.onerror = () => {
      logger.warn('[OCR] Image load failed for cropping, using original');
      resolve(imageSrc);
    };
    
    if (imageSrc.startsWith('data:')) {
      img.src = imageSrc;
    } else if (imageSrc.startsWith('http')) {
      img.src = imageSrc;
    } else {
      img.src = `data:image/jpeg;base64,${imageSrc}`;
    }
  });
}

/**
 * Fast Gemini-only OCR (primary path now for speed).
 * Also asks Gemini for a `_layout` field — a structural fingerprint of the
 * report's non-numeric labels — used to cache patterns for future local reuse.
 */
async function runGeminiOcr(imageSrc: string): Promise<OcrResult & { layoutSignature: string }> {
  const coachUid = auth.currentUser?.uid || 'anonymous';

  const firebaseApp = getApp();
  const ai = getAI(firebaseApp, { 
    backend: new VertexAIBackend() 
  });

  const model = getGenerativeModel(ai, { 
    model: CONFIG.AI.GEMINI.MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const prompt = `
    You are an expert medical data extractor specialized in body composition analysis reports.
    Analyze the provided image and extract all relevant data points into a JSON object.
    
    FIELD GUIDANCE (use these exact JSON keys — they match our assessment form):
    - heightCm: Height in CM
    - inbodyScore: Total body composition score from the report (0-100)
    - inbodyWeightKg: Weight in KG
    - skeletalMuscleMassKg: SMM in KG
    - bodyFatMassKg: BFM in KG
    - inbodyBodyFatPct: PBF %
    - inbodyBmi: BMI
    - totalBodyWaterL: Total Body Water (TBW) in Liters
    - waistHipRatio: Waist-Hip Ratio (WHR)
    - visceralFatLevel: Visceral Fat Level (VFL)
    - bmrKcal: Basal Metabolic Rate (BMR)
    - segmentalTrunkKg, segmentalArmLeftKg, segmentalArmRightKg, segmentalLegLeftKg, segmentalLegRightKg: Segmental Lean Analysis in KG
    - _layout: The first 300 visible non-numeric characters from the report (labels, headings, section names only — NO numbers). Used to identify the report template format.
    
    RULES:
    1. Return ONLY the JSON object.
    2. If a value is not found, use null.
    3. Numbers only for numeric fields (no units like "kg").
    4. Always include _layout.
  `;

  const base64Data = imageSrc.split(',')[1] || imageSrc;

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg",
      },
    },
  ]);

  const response = await result.response;
  const aiText = response.text();
  
  const startIdx = aiText.indexOf('{');
  const endIdx = aiText.lastIndexOf('}');
  if (startIdx === -1) throw new Error('No JSON found in AI response');
  
  const data = JSON.parse(aiText.substring(startIdx, endIdx + 1));
  const cleanFields: Partial<FormData> = {};
  
  const validBodyCompFields = [
    'heightCm', 'inbodyScore', 'inbodyWeightKg', 'skeletalMuscleMassKg',
    'bodyFatMassKg', 'inbodyBodyFatPct', 'inbodyBmi', 'totalBodyWaterL',
    'waistHipRatio', 'visceralFatLevel', 'bmrKcal', 'segmentalTrunkKg',
    'segmentalArmLeftKg', 'segmentalArmRightKg', 'segmentalLegLeftKg', 'segmentalLegRightKg'
  ];
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && validBodyCompFields.includes(key)) {
      (cleanFields as Record<string, string>)[key] = String(value);
    }
  }

  // Build a structural signature from the layout text — digits stripped so it
  // identifies the template, not the specific values on this scan.
  const rawLayout: string = typeof data._layout === 'string' ? data._layout : '';
  const layoutSignature = rawLayout.replace(/\d+/g, '').replace(/\s+/g, ' ').trim().substring(0, 300);

  await logAIUsage(coachUid, 'ocr_body_comp', 'ai_success', 'gemini');

  return {
    fields: cleanFields,
    rawText: rawLayout,
    confidence: 1.0,
    provider: 'gemini',
    layoutSignature,
  };
}

/**
 * Main OCR entry point - Gemini-first for speed, with robust error handling
 * 
 * Strategy: Go straight to Gemini for reliability. Tesseract was too slow
 * to load and often failed. We can revisit local OCR later with a pre-loaded
 * web worker if needed.
 * 
 * Optimization: Pre-crop image to focus on data table, reducing token usage
 */
export async function processBodyCompScan(imageSrc: string): Promise<OcrResult> {
  const coachUid = auth.currentUser?.uid || 'anonymous';
  
  const ocrEnabled = await isFeatureEnabled('ocr_enabled');
  if (!ocrEnabled) {
    logger.warn('[OCR] Body composition OCR feature is disabled via kill switch');
    throw new FeatureDisabledError('Report Photo Import');
  }
  
  try {
    logger.debug('[OCR] Pre-cropping body composition image...');
    const croppedImage = await cropBodyCompImage(imageSrc);

    // Build a lightweight image-level signature to do a quick cache lookup
    // before spending tokens on a Gemini call. The signature combines image
    // size (correlates with report resolution) with a sparse visual sample.
    const base64Body = croppedImage.split(',')[1] ?? croppedImage;
    const imageSignature = `${base64Body.length}:${[0, 500, 2000, 5000].map(i => base64Body[i] ?? '').join('')}`;

    const cachedFields = await checkLearnedPatterns(imageSignature);
    if (cachedFields && Object.keys(cachedFields).length > 0) {
      logger.debug('[OCR] Cache hit — returning learned pattern (Gemini skipped)');
      await logAIUsage(coachUid, 'ocr_body_comp', 'ai_success', 'pattern');
      return { fields: cachedFields, rawText: '', confidence: 0.9, provider: 'pattern' };
    }

    const geminiResult = await runGeminiOcr(croppedImage);

    // Persist the result as a candidate pattern for future cache hits.
    // Uses the layout signature from Gemini (structural labels, not values)
    // as the stable key so the same report template is recognised next time.
    const patternKey = geminiResult.layoutSignature || imageSignature;
    if (patternKey && Object.keys(geminiResult.fields).length > 0) {
      void learnPattern(patternKey, geminiResult.fields);
    }

    return { fields: geminiResult.fields, rawText: geminiResult.rawText, confidence: geminiResult.confidence, provider: geminiResult.provider };
    
  } catch (err: unknown) {
    logger.error('[OCR] Gemini failed:', 'OCR', err);
    await logAIUsage(coachUid, 'ocr_body_comp', 'error', 'gemini');
    return { fields: {}, rawText: '', confidence: 0, provider: 'gemini' };
  }
}
