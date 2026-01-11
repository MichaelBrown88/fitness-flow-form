/**
 * Equipment-based field filtering
 * Filters phase fields based on organization equipment configuration
 * Automatically adapts assessment flow based on available equipment
 */

import type { PhaseField } from '@/lib/phaseConfig';
import type { EquipmentConfig } from '@/services/organizations';
import type { FormData } from '@/contexts/FormContext';

/**
 * Check if a field should be shown based on equipment configuration
 */
export function shouldShowField(
  field: PhaseField,
  equipmentConfig: EquipmentConfig | undefined,
  formData?: Partial<FormData>
): boolean {
  if (!equipmentConfig) return true; // Default: show all fields if no config

  const fieldId = field.id as string;

  // ========================================
  // GRIP STRENGTH FIELDS
  // ========================================
  const isGripField = fieldId.startsWith('grip');
  if (isGripField) {
    if (equipmentConfig.gripStrength.enabled === true) {
      // Equipment enabled: show dynamometer fields only
      return fieldId === 'gripLeftKg' || fieldId === 'gripRightKg';
    } else {
      // Equipment disabled: show method selection first, then only the selected method's field
      if (fieldId === 'gripTestMethod') {
        // Always show the selection field when equipment is disabled
        return true;
      }
      
      // Get the selected method from formData
      const selectedMethod = formData?.gripTestMethod;
      
      // Show only the selected method's field (either/or, not both)
      if (selectedMethod === 'deadhang') {
        return fieldId === 'gripDeadhangSeconds';
      } else if (selectedMethod === 'pinch') {
        return fieldId === 'gripPlatePinchSeconds';
      }
      
      // If no method selected yet, don't show any test fields (only show selection)
      return false;
    }
  }

  // ========================================
  // BODY COMPOSITION FIELDS
  // ========================================
  // Note: inbodyWeightKg is always shown (needed for BMI calculations) - handled separately below
  const analyzerFields = [
    'inbodyBodyFatPct', 'bodyFatMassKg', 'inbodyBmi',
    'visceralFatLevel', 'skeletalMuscleMassKg', 'totalBodyWaterL',
    'waistHipRatio', 'segmentalArmRightKg', 'segmentalArmLeftKg',
    'segmentalLegRightKg', 'segmentalLegLeftKg', 'segmentalTrunkKg',
    'bmrKcal', 'inbodyScore'
  ];
  const manualMeasurementFields = [
    'shouldersCm', 'chestCm', 'armLeftCm', 'armRightCm', 
    'waistCm', 'neckCm', 'hipsCm', 'thighLeftCm', 'thighRightCm', 
    'calfLeftCm', 'calfRightCm'
  ];
  // Note: Skinfold fields are removed - not needed for basic body composition
  // Weight and height are always shown (needed for BMI) - handle separately
  if (fieldId === 'inbodyWeightKg' || fieldId === 'heightCm') {
    return true; // Always show weight and height fields (needed for BMI calculations)
  }
  const isBodyCompField = analyzerFields.includes(fieldId) || 
                          manualMeasurementFields.includes(fieldId);

  if (isBodyCompField) {
    // Get user's selected method
    const selectedMethod = formData?.bodyCompMethod;
    
    // If no method selected yet, hide all fields except height/weight (selection buttons will be shown)
    if (!selectedMethod) {
      // Height and weight are always shown (needed for BMI)
      return fieldId === 'heightCm' || fieldId === 'inbodyWeightKg';
    }
    
    // Show fields based on selected method (either/or, not both)
    if (selectedMethod === 'measurements') {
      // Only show body measurement fields (height/weight always shown)
      return manualMeasurementFields.includes(fieldId) || fieldId === 'heightCm' || fieldId === 'inbodyWeightKg';
    } else if (selectedMethod === 'analyzer') {
      // Only show analyzer fields (height/weight always shown)
      if (analyzerFields.includes(fieldId)) {
        if (equipmentConfig.bodyComposition.enabled === true) {
          // Equipment enabled: show analyzer fields
          return true;
        } else {
          // Equipment disabled: show analyzer fields if client brought report (button was used or data exists)
          const hasAnalyzerFlag = formData?.showAnalyzerFields === 'yes';
          const hasAnalyzerData = formData?.inbodyScore || formData?.inbodyBodyFatPct || formData?.skeletalMuscleMassKg;
          if (hasAnalyzerFlag || hasAnalyzerData) {
            return true;
          }
          return false; // Hide analyzer fields until scan button is used
        }
      }
      // Hide measurement fields when analyzer method is selected (but keep height/weight)
      return fieldId === 'heightCm' || fieldId === 'inbodyWeightKg';
    }
  }

  // ========================================
  // CARDIO EQUIPMENT FIELDS
  // ========================================
  // Cardio test selection field - filter options based on equipment
  if (fieldId === 'cardioTestSelected') {
    // Always show the selection field, but filter options based on equipment
    // Options filtering is handled in FieldControl component
    return true;
  }
  
  // Treadmill-specific fields (only show if cardio equipment is enabled)
  const treadmillFields = [
    'treadmillProtocol', 'treadmillIncline', 'treadmillSpeed', 
    'treadmillDurationMin', 'treadmillFinalHeartRate', 'treadmillRpe',
    'treadmillTerminationReason', 'treadmillNotes'
  ];
  if (treadmillFields.includes(fieldId)) {
    return equipmentConfig.cardioEquipment.enabled === true;
  }

  // Old YMCA step test fields (deprecated - now using generic fields)
  // Hide these old fields - both tests now use the same 3 heart rate readings
  const deprecatedStepTestFields = [
    'ymcaStepHeight', 'ymcaMetronomeBpm', 'ymcaPreTestHeartRate',
    'ymcaPost1MinHeartRate', 'ymcaRecoveryHeartRate1', 'ymcaRpe', 'ymcaNotes'
  ];
  if (deprecatedStepTestFields.includes(fieldId)) {
    return false; // Hide deprecated fields
  }

  // Generic cardio fields (used by BOTH treadmill and step test)
  // Both tests use the same 3 readings: resting HR, peak HR, and 1-min recovery HR
  const genericCardioFields = [
    'cardioRestingHr', 'cardioPeakHr', 'cardioPost1MinHr', 'cardioMedicationFlag',
    'cardioVo2MaxEstimate', 'cardioTestInstructions', 'cardioNotes'
  ];
  if (genericCardioFields.includes(fieldId)) {
    // Show generic fields regardless of equipment (both methods use these)
    return true;
  }

  // ========================================
  // HEART RATE SENSOR FIELDS
  // ========================================
  // HR sensor fields (manual pulse counting if no sensor)
  // Currently, HR fields work the same way - manual entry is always an option
  // The equipment toggle mainly affects UI hints/instructions
  // All HR fields are shown regardless of sensor status

  // ========================================
  // ALWAYS SHOWN FIELDS (needed for conversions/scoring)
  // ========================================
  // Height and weight are always needed for BMI and body composition calculations
  if (fieldId === 'heightCm' || fieldId === 'inbodyWeightKg' || fieldId === 'weightKg') {
    return true;
  }

  // ========================================
  // DEFAULT: Show field if no equipment-specific logic
  // ========================================
  return true;
}

