/**
 * Dynamic Tooltip Generator
 * Generates equipment-aware tooltips based on organization's equipment configuration
 */

import type { EquipmentConfig } from '@/services/organizations';
import type { PhaseField } from '@/lib/phaseConfig';
import type { FormData } from '@/contexts/FormContext';
import { isBodyCompositionPhaseFieldId } from '@/lib/utils/partialAssessmentBodyCompFieldKeys';

/**
 * Generate equipment-aware tooltip for a field
 */
export function getDynamicTooltip(
  field: PhaseField,
  equipmentConfig: EquipmentConfig | undefined,
  baseTooltip?: string,
  formData?: Partial<FormData>
): string {
  if (!equipmentConfig) {
    return baseTooltip || field.tooltip || '';
  }

  const fieldId = field.id as string;
  let tooltip = baseTooltip || field.tooltip || '';
  
  // Get selected test type if available
  const selectedTest = formData?.cardioTestSelected?.toLowerCase() || '';
  const isTreadmillTest = selectedTest === 'treadmill';
  const isStepTest = selectedTest === 'ymca-step';

  // ========================================
  // HEART RATE SENSOR INSTRUCTIONS
  // ========================================
  const hasHeartRateSensor = equipmentConfig.heartRateSensor?.enabled === true;
  
  // Add HR sensor instructions to relevant fields
  if (fieldId === 'cardioRestingHr' || fieldId === 'cardioPeakHr' || fieldId === 'cardioPost1MinHr') {
    if (hasHeartRateSensor) {
      tooltip += '\n\n📊 Heart Rate Sensor (Enabled):\n• Connect your heart rate sensor/chest strap before starting the test.\n• Ensure the sensor is properly positioned (chest strap: below the chest muscles, moistened for better contact).\n• The sensor will automatically record readings at the required intervals.\n• Verify the connection is stable before beginning the test.\n• If the sensor disconnects during the test, switch to manual measurement immediately.';
    } else {
      tooltip += '\n\n📊 Manual Heart Rate Measurement:\n• Use a heart rate monitor, fitness tracker, or manual pulse check.\n• For manual pulse: Count beats for 15 seconds and multiply by 4, or count for 60 seconds for better accuracy.\n• Find pulse at wrist (radial artery) or neck (carotid artery).\n• Record the reading immediately at the specified time - timing is critical for accurate recovery measurement.';
    }
  }

  // ========================================
  // GRIP STRENGTH INSTRUCTIONS
  // ========================================
  if (fieldId === 'gripTestMethod') {
    const hasGripEquipment = equipmentConfig.gripStrength?.enabled === true;
    if (!hasGripEquipment) {
      tooltip += '\n\n💡 Choose based on:\n• Dead Hang: Best for clients with access to a pull-up bar.\n• Plate Pinch: Best for clients in a gym with weight plates.';
    }
  }

  if (fieldId === 'gripLeftKg' || fieldId === 'gripRightKg') {
    const hasGripEquipment = equipmentConfig.gripStrength?.enabled === true;
    if (hasGripEquipment) {
      tooltip += '\n\n💪 Equipment: Use your dynamometer. Ensure it\'s calibrated and the client uses proper form.';
    }
  }

  if (fieldId === 'gripDeadhangSeconds') {
    tooltip += '\n\n💪 Equipment-Free Method:\n• Use a standard pull-up bar or any secure overhead bar.\n• Ensure the bar can safely support the client\'s bodyweight.';
  }

  if (fieldId === 'gripPlatePinchSeconds') {
    const genderLower = formData?.gender?.toLowerCase() || 'male';
    const standardizedWeight = genderLower === 'female' ? '10kg' : '15kg';
    tooltip += `\n\n💪 Equipment-Free Method:\n• Use a standardized ${standardizedWeight} weight plate.\n• Client should pinch the plate between thumb and fingers, not use a full grip.\n• Record the maximum time (in seconds) they can hold the plate.`;
  }

  // ========================================
  // BODY COMPOSITION INSTRUCTIONS
  // ========================================
  const tapeMeasureOnlyFields = new Set([
    'shouldersCm',
    'chestCm',
    'armLeftCm',
    'armRightCm',
    'waistCm',
    'neckCm',
    'hipsCm',
    'thighLeftCm',
    'thighRightCm',
    'calfLeftCm',
    'calfRightCm',
  ]);
  const isAnalyserOrSegmentalBodyCompField =
    isBodyCompositionPhaseFieldId(fieldId) &&
    fieldId !== 'heightCm' &&
    !tapeMeasureOnlyFields.has(fieldId);

  if (isAnalyserOrSegmentalBodyCompField) {
    const hasBodyCompEquipment = equipmentConfig.bodyComposition?.enabled === true;
    if (hasBodyCompEquipment) {
      tooltip += '\n\n📊 Equipment: Use your body composition analyser (DEXA, BIA, etc.). Ensure the client follows pre-test guidelines (fasted, hydrated, no exercise).';
    } else {
      tooltip += '\n\n📊 Note: This data is from a client-provided analyzer report. Enter the values from their report.';
    }
  }

  // ========================================
  // CARDIO TEST INSTRUCTIONS
  // ========================================
  if (fieldId === 'cardioTestSelected') {
    const hasCardioEquipment = equipmentConfig.cardioEquipment?.enabled === true;
    if (hasCardioEquipment) {
      tooltip += '\n\n🏃 Equipment Available:\n• Treadmill Test: Use your treadmill for controlled testing.\n• Step Test: Portable alternative if preferred.';
    } else {
      tooltip += '\n\n🏃 Equipment-Free Method:\n• Step Test: Use a 12-inch step or platform. Follow the 96bpm metronome pace for 3 minutes.';
    }
  }

  if (fieldId === 'cardioPeakHr') {
    const hasCardioEquipment = equipmentConfig.cardioEquipment?.enabled === true;
    if (isTreadmillTest || (hasCardioEquipment && !isStepTest)) {
      tooltip += '\n\n⏱️ Treadmill Test:\n• Record HR right before stopping the treadmill at exactly the 3-minute mark.\n• This is the peak heart rate achieved during the test.\n• If using a HR sensor, note the reading from the display.';
    } else if (isStepTest || !hasCardioEquipment) {
      tooltip += '\n\n⏱️ Step Test:\n• Record HR immediately after the client steps down from the platform at the 3-minute mark.\n• This is the peak heart rate achieved during the stepping protocol.\n• Have the client sit down immediately after stepping down to prepare for recovery measurement.';
    }
  }
  
  if (fieldId === 'cardioPost1MinHr') {
    const hasCardioEquipment = equipmentConfig.cardioEquipment?.enabled === true;
    if (isTreadmillTest || (hasCardioEquipment && !isStepTest)) {
      tooltip += '\n\n⏱️ Treadmill Test Recovery:\n• After stopping at 3:00, have the client sit down immediately.\n• Wait exactly 60 seconds from when the treadmill stopped.\n• Record HR at the 1-minute mark - timing is critical for accurate recovery assessment.';
    } else if (isStepTest || !hasCardioEquipment) {
      tooltip += '\n\n⏱️ Step Test Recovery:\n• After stepping down at 3:00, have the client sit down immediately.\n• Wait exactly 60 seconds from when they stepped down.\n• Record HR at the 1-minute mark - timing is critical for accurate recovery assessment.';
    }
  }

  // ========================================
  // BODY MEASUREMENT INSTRUCTIONS
  // ========================================
  const bodyMeasurementFields = [
    'shouldersCm', 'chestCm', 'armLeftCm', 'armRightCm', 
    'waistCm', 'neckCm', 'hipsCm', 'thighLeftCm', 'thighRightCm', 
    'calfLeftCm', 'calfRightCm'
  ];
  
  if (bodyMeasurementFields.includes(fieldId)) {
    const hasBodyCompEquipment = equipmentConfig.bodyComposition?.enabled === true;
    if (!hasBodyCompEquipment) {
      tooltip += '\n\n📏 Measurement Method:\n• Use a flexible measuring tape.\n• Measure at the same anatomical landmarks each time for consistency.\n• Keep the tape parallel to the floor and snug but not tight.';
    }
  }

  // ========================================
  // WEIGHT/HEIGHT INSTRUCTIONS
  // ========================================
  if (fieldId === 'inbodyWeightKg' || fieldId === 'weightKg') {
    const hasBodyCompEquipment = equipmentConfig.bodyComposition?.enabled === true;
    if (hasBodyCompEquipment) {
      tooltip += '\n\n⚖️ Equipment: Use your body composition analyzer\'s built-in scale.';
    } else {
      tooltip += '\n\n⚖️ Equipment: Use a calibrated digital scale. Ensure the client is in light clothing and has emptied pockets.';
    }
  }

  if (fieldId === 'heightCm') {
    tooltip += '\n\n📏 Measurement:\n• Use a stadiometer or wall-mounted measuring device.\n• Client should stand straight, heels together, looking straight ahead.\n• Measure without shoes.';
  }

  return tooltip.trim();
}
