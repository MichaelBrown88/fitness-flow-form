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

/**
 * Check if we've seen this text pattern before (Learning System)
 */
async function checkLearnedPatterns(rawText: string): Promise<Partial<FormData> | null> {
  try {
    const signature = rawText.substring(0, 500).replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
    
    const patternsRef = collection(db, COLLECTIONS.LEARNED_OCR_PATTERNS);
    const q = query(patternsRef, where('signature', '==', signature), limit(1));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
       // Found a learned pattern for this form layout
      return null; // Placeholder for future template-based extraction
    }
  } catch (err) {
    // Pattern check failed
  }
  return null;
}

/**
 * Save a successful AI result as a pattern for future local use
 */
async function learnPattern(rawText: string, fields: Partial<FormData>) {
  try {
    const signature = rawText.substring(0, 500).replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
    const patternsRef = collection(db, 'learned_ocr_patterns');
    
    await addDoc(patternsRef, {
      signature,
      fields,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    // Learning failed
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
 * Fast Gemini-only OCR (primary path now for speed)
 */
async function runGeminiOcr(imageSrc: string): Promise<OcrResult> {
  const coachUid = auth.currentUser?.uid || 'anonymous';
  
  // Running Gemini AI analysis
  await logAIUsage(coachUid, 'ocr_inbody', 'ai_fallback', 'gemini');

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
    
    FIELD GUIDANCE:
    - heightCm: Height in CM
    - inbodyScore: Total Body Comp Score (0-100)
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
    
    RULES:
    1. Return ONLY the JSON object.
    2. If a value is not found, use null.
    3. Numbers only (no units like "kg").
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
  
  // List of valid FormData fields for body composition
  const validBodyCompFields = [
    'heightCm', 'inbodyScore', 'inbodyWeightKg', 'skeletalMuscleMassKg',
    'bodyFatMassKg', 'inbodyBodyFatPct', 'inbodyBmi', 'totalBodyWaterL',
    'waistHipRatio', 'visceralFatLevel', 'bmrKcal', 'segmentalTrunkKg',
    'segmentalArmLeftKg', 'segmentalArmRightKg', 'segmentalLegLeftKg', 'segmentalLegRightKg'
  ];
  
  for (const [key, value] of Object.entries(data)) {
    // Only assign if value is not null and key is a valid body composition field
    if (value !== null && validBodyCompFields.includes(key)) {
      (cleanFields as Record<string, string>)[key] = String(value);
    }
  }

  await logAIUsage(coachUid, 'ocr_inbody', 'ai_success', 'gemini');

  return {
    fields: cleanFields,
    rawText: 'AI Analysis Complete',
    confidence: 1.0,
    provider: 'gemini'
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
  
  // Check if OCR feature is enabled (kill switch check)
  const ocrEnabled = await isFeatureEnabled('ocr_enabled');
  if (!ocrEnabled) {
    logger.warn('[OCR] Body composition OCR feature is disabled via kill switch');
    throw new FeatureDisabledError('Report Photo Import');
  }
  
  try {
    // Pre-crop image to focus on data table (removes logo/footer margins)
    // This reduces token usage and improves extraction accuracy
    logger.debug('[OCR] Pre-cropping body composition image...');
    const croppedImage = await cropBodyCompImage(imageSrc);
    
    // Primary: Use Gemini AI directly (fast and reliable)
    return await runGeminiOcr(croppedImage);
    
  } catch (err: unknown) {
    logger.error('[OCR] Gemini failed:', 'OCR', err);
    await logAIUsage(coachUid, 'ocr_inbody', 'error', 'gemini');
    
    // Return empty result with helpful message instead of throwing
    return {
      fields: {},
      rawText: '',
      confidence: 0,
      provider: 'gemini'
    };
  }
}
