import { getAI, VertexAIBackend, getGenerativeModel } from "firebase/ai";
import { getApp } from "firebase/app";
import { createWorker } from 'tesseract.js';
import { FormData } from '../../contexts/FormContext';
import { CONFIG } from '@/config';
import { logAIUsage } from '@/services/aiUsage';
import { auth, db } from '@/lib/firebase';
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
    // We create a "signature" of the text (first 200 chars, removing numbers to match templates)
    const signature = rawText.substring(0, 500).replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
    
    const patternsRef = collection(db, 'learned_ocr_patterns');
    const q = query(patternsRef, where('signature', '==', signature), limit(1));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      console.log('[OCR] Found a learned pattern for this form layout!');
      const data = snap.docs[0].data();
      // We still need to extract the ACTUAL numbers from the current text using the learned mapping
      // For now, if the pattern is a 100% match, we'd need a more complex "template extractor"
      // Let's keep it simple: if we have a pattern, it might help Tesseract's regex.
      return null; // Placeholder for future template-based extraction
    }
  } catch (err) {
    console.warn('[OCR] Pattern check failed:', err);
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
      fields, // Store the fields as a hint
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('[OCR] Learning failed:', err);
  }
}

// ... rest of the file

export const REQUIRED_SCAN_FIELDS: (keyof FormData)[] = [
  'inbodyWeightKg',
  'skeletalMuscleMassKg',
  'inbodyBodyFatPct',
  'visceralFatLevel',
  'inbodyScore'
];

/**
 * Main OCR entry point with automatic fallback
 */
export async function processInBodyScan(imageSrc: string): Promise<OcrResult> {
  const coachUid = auth.currentUser?.uid || 'anonymous';
  let tesseractText = '';
  
  try {
    // 1. ATTEMPT LOCAL OCR FIRST (Free)
    console.log('[OCR] Attempting local Tesseract scan...');
    const worker = await createWorker('eng');
    const { data: { text: localText } } = await worker.recognize(imageSrc);
    tesseractText = localText;
    await worker.terminate();

    // Check regex patterns
    const patterns = {
      inbodyWeightKg: /(?:Weight|WT)\s*:?\s*(\d+\.?\d*)\s*kg/i,
      skeletalMuscleMassKg: /(?:SMM|Muscle Mass)\s*:?\s*(\d+\.?\d*)\s*kg/i,
      inbodyBodyFatPct: /(?:PBF|Percent Body Fat|Body Fat %)\s*:?\s*(\d+\.?\d*)\s*%/i,
      visceralFatLevel: /(?:VFL|Visceral Fat Level)\s*:?\s*(\d+)/i,
      inbodyScore: /(?:InBody Score|Score)\s*:?\s*(\d+)/i,
      heightCm: /(?:Height|HT)\s*:?\s*(\d+\.?\d*)\s*cm/i,
      inbodyBmi: /(?:BMI)\s*:?\s*(\d+\.?\d*)/i,
    };

    const localFields: Partial<FormData> = {};
    let foundCount = 0;
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = localText.match(pattern);
      if (match && match[1]) {
        (localFields as any)[key] = match[1];
        foundCount++;
      }
    }
    
    if (foundCount >= 3) {
      console.log('[OCR] Local scan successful!');
      await logAIUsage(coachUid, 'ocr_inbody', 'local_success', 'tesseract');
      return {
        fields: localFields,
        rawText: 'Local analysis complete',
        confidence: 0.8,
        provider: 'local'
      };
    }

    // 2. FALLBACK TO GEMINI (Automatic)
    console.log('[OCR] Local scan insufficient. Falling back to Gemini AI...');
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
    if (startIdx === -1) throw new Error('No JSON found');
    
    const data = JSON.parse(aiText.substring(startIdx, endIdx + 1));
    const cleanFields: Partial<FormData> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== null) (cleanFields as any)[key] = String(value);
    }

    await logAIUsage(coachUid, 'ocr_inbody', 'ai_success', 'gemini');

    // LEARN: Save this pattern for future local use
    if (tesseractText) {
      await learnPattern(tesseractText, cleanFields);
    }

    return {
      fields: cleanFields,
      rawText: 'AI Analysis Complete',
      confidence: 1.0,
      provider: 'gemini'
    };

  } catch (err: any) {
    console.error('OCR Error:', err);
    await logAIUsage(coachUid, 'ocr_inbody', 'error', 'local');
    throw new Error('Failed to analyze scan. Please enter values manually.');
  }
}
