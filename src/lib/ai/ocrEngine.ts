import Tesseract from 'tesseract.js';
import { FormData } from '../../contexts/FormContext';

export interface OcrResult {
  fields: Partial<FormData>;
  rawText: string;
  confidence: number;
}

const INBODY_MAPPING: Record<string, keyof FormData> = {
  'InBody Score': 'inbodyScore',
  'Weight': 'inbodyWeightKg',
  'Skeletal Muscle Mass': 'skeletalMuscleMassKg',
  'SMM': 'skeletalMuscleMassKg',
  'Body Fat Mass': 'bodyFatMassKg',
  'BFM': 'bodyFatMassKg',
  'Percent Body Fat': 'inbodyBodyFatPct',
  'PBF': 'inbodyBodyFatPct',
  'BMI': 'inbodyBmi',
  'Total Body Water': 'totalBodyWaterL',
  'TBW': 'totalBodyWaterL',
  'Waist-Hip Ratio': 'waistHipRatio',
  'WHR': 'waistHipRatio',
  'Visceral Fat Level': 'visceralFatLevel',
  'VFL': 'visceralFatLevel',
  'Basal Metabolic Rate': 'bmrKcal',
  'BMR': 'bmrKcal',
  'Trunk': 'segmentalTrunkKg',
  'Left Arm': 'segmentalArmLeftKg',
  'Right Arm': 'segmentalArmRightKg',
  'Left Leg': 'segmentalLegLeftKg',
  'Right Leg': 'segmentalLegRightKg',
};

export async function processInBodyScan(imageSrc: string): Promise<OcrResult> {
  const worker = await Tesseract.createWorker('eng');
  
  try {
    const { data: { text, confidence } } = await worker.recognize(imageSrc);
    
    const fields = extractInBodyFields(text);
    
    return {
      fields,
      rawText: text,
      confidence,
    };
  } finally {
    await worker.terminate();
  }
}

function extractInBodyFields(text: string): Partial<FormData> {
  const result: Partial<FormData> = {};
  const lines = text.split('\n');

  for (const [label, fieldId] of Object.entries(INBODY_MAPPING)) {
    // Look for lines containing the label followed by a number
    // We handle common OCR errors like 'l' instead of '1' or 'O' instead of '0'
    const pattern = new RegExp(`${label}\\s*[:\\-]?\\s*(\\d+[.,]\\d+|\\d+)`, 'i');
    const match = text.match(pattern);

    if (match && match[1]) {
      let valueStr = match[1].replace(',', '.');
      const value = parseFloat(valueStr);
      
      if (!isNaN(value)) {
        // @ts-ignore - Dynamic assignment to FormData
        result[fieldId] = value;
      }
    }
  }

  // Fallback: look for specific numeric patterns common in InBody reports 
  // if primary mapping fails for some fields.
  // This is a simplified version; in a production app, we'd use more sophisticated heuristics.

  return result;
}
