import { getAI, VertexAIBackend, getGenerativeModel } from "firebase/ai";
import { getApp } from "firebase/app";
import { FormData } from '../../contexts/FormContext';
import { CONFIG } from '@/config';
import { logAIUsage } from '@/services/aiUsage';
import { getFirebaseFunctions, auth, db } from '@/services/firebase';
import { collection, query, where, getDocs, limit, addDoc, serverTimestamp } from 'firebase/firestore';

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
    
    const patternsRef = collection(db, 'learned_ocr_patterns');
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
    You are an expert medical data extractor specialized in InBody Composition Analysis reports.
    Analyze the provided image and extract all relevant data points into a JSON object.
    
    FIELD GUIDANCE:
    - heightCm: Height in CM
    - inbodyScore: Total InBody Score (0-100)
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
  
  // List of valid FormData fields for InBody
  const validInBodyFields = [
    'heightCm', 'inbodyScore', 'inbodyWeightKg', 'skeletalMuscleMassKg',
    'bodyFatMassKg', 'inbodyBodyFatPct', 'inbodyBmi', 'totalBodyWaterL',
    'waistHipRatio', 'visceralFatLevel', 'bmrKcal', 'segmentalTrunkKg',
    'segmentalArmLeftKg', 'segmentalArmRightKg', 'segmentalLegLeftKg', 'segmentalLegRightKg'
  ];
  
  for (const [key, value] of Object.entries(data)) {
    // Only assign if value is not null and key is a valid InBody field
    if (value !== null && validInBodyFields.includes(key)) {
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
 */
export async function processInBodyScan(imageSrc: string): Promise<OcrResult> {
  const coachUid = auth.currentUser?.uid || 'anonymous';
  
  try {
    // Primary: Use Gemini AI directly (fast and reliable)
    return await runGeminiOcr(imageSrc);
    
  } catch (err: unknown) {
    console.error('[OCR] Gemini failed:', err);
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
