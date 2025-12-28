import { getAI, VertexAIBackend, getGenerativeModel } from "firebase/ai";
import { getApp } from "firebase/app";
import { FormData } from '../../contexts/FormContext';
import { CONFIG } from '@/config';

export interface OcrResult {
  fields: Partial<FormData>;
  rawText: string;
  confidence: number;
}

export const REQUIRED_SCAN_FIELDS: (keyof FormData)[] = [
  'inbodyWeightKg',
  'skeletalMuscleMassKg',
  'inbodyBodyFatPct',
  'visceralFatLevel',
  'inbodyScore'
];

export async function processInBodyScan(imageSrc: string): Promise<OcrResult> {
  try {
    const firebaseApp = getApp();
    const ai = getAI(firebaseApp, { 
      backend: new VertexAIBackend() 
    });

    // 2. Initialize Gemini 2.0 Flash (Fastest and most capable for OCR)
    console.log(`Initializing ${CONFIG.AI.GEMINI.MODEL_NAME}...`);
    const model = getGenerativeModel(ai, { 
      model: CONFIG.AI.GEMINI.MODEL_NAME,
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    // 3. Prepare the Master Prompt
    const prompt = `
      You are an expert medical data extractor specialized in InBody Composition Analysis reports.
      Analyze the provided image and extract all relevant data points into a JSON object.
      
      FIELD GUIDANCE:
      - heightCm: Height in CM (often at the top near Name/Age)
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

    // 4. Clean the base64 data
    const base64Data = imageSrc.split(',')[1] || imageSrc;

    // 5. Send to Gemini
    console.log('Sending to Vertex AI (Gemini 2.0)...');
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
    const text = response.text();
    console.log('AI Raw Response:', text);
    
    // Improved JSON extraction: find the first { and last }
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    
    if (startIdx === -1 || endIdx === -1) {
      throw new Error('No JSON found in AI response');
    }
    
    const jsonString = text.substring(startIdx, endIdx + 1);
    const data = JSON.parse(jsonString);

    // 6. Map to FormData (ensuring everything is a string for our form)
    const cleanFields: Partial<FormData> = {};
    const fieldMapping: Record<string, keyof FormData> = {
      heightCm: 'heightCm',
      inbodyScore: 'inbodyScore',
      inbodyWeightKg: 'inbodyWeightKg',
      skeletalMuscleMassKg: 'skeletalMuscleMassKg',
      bodyFatMassKg: 'bodyFatMassKg',
      inbodyBodyFatPct: 'inbodyBodyFatPct',
      inbodyBmi: 'inbodyBmi',
      totalBodyWaterL: 'totalBodyWaterL',
      waistHipRatio: 'waistHipRatio',
      visceralFatLevel: 'visceralFatLevel',
      bmrKcal: 'bmrKcal',
      segmentalTrunkKg: 'segmentalTrunkKg',
      segmentalArmLeftKg: 'segmentalArmLeftKg',
      segmentalArmRightKg: 'segmentalArmRightKg',
      segmentalLegLeftKg: 'segmentalLegLeftKg',
      segmentalLegRightKg: 'segmentalLegRightKg'
    };

    for (const [aiKey, value] of Object.entries(data)) {
      const formKey = fieldMapping[aiKey];
      if (formKey && value !== null && value !== undefined) {
        cleanFields[formKey] = String(value);
      }
    }

    return {
      fields: cleanFields,
      rawText: 'AI Analysis Complete',
      confidence: 1.0,
    };

  } catch (err: any) {
    console.error('Vertex AI Scan Error:', err);
    throw new Error('Failed to analyze scan with Gemini AI. Ensure you are on the Blaze plan.');
  }
}
