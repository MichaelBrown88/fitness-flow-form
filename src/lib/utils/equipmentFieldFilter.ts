/**
 * Equipment-based field filtering
 * Filters phase fields based on organization equipment configuration
 */

import type { PhaseField } from '@/lib/phaseConfig';
import type { EquipmentConfig } from '@/services/organizations';

/**
 * Check if a field should be shown based on equipment configuration
 */
export function shouldShowField(
  field: PhaseField,
  equipmentConfig: EquipmentConfig | undefined
): boolean {
  if (!equipmentConfig) return true; // Default: show all fields if no config

  const fieldId = field.id as string;

  // Grip strength fields - first check if grip testing is enabled
  const isGripField = fieldId.startsWith('grip');
  if (isGripField) {
    // If grip testing is disabled, hide all grip fields
    if (equipmentConfig.gripStrength.enabled === false) {
      return false;
    }
    // Otherwise, show fields based on selected method
    if (fieldId === 'gripLeftKg' || fieldId === 'gripRightKg') {
      return equipmentConfig.gripStrength.method === 'dynamometer';
    }
    if (fieldId === 'gripDeadhangSeconds') {
      return equipmentConfig.gripStrength.method === 'deadhang';
    }
    if (fieldId === 'gripFarmersWalkDistanceM' || fieldId === 'gripFarmersWalkTimeS' || fieldId === 'gripFarmersWalkLoadKg') {
      return equipmentConfig.gripStrength.method === 'farmerswalk';
    }
    if (fieldId === 'gripPlatePinchKg') {
      return equipmentConfig.gripStrength.method === 'platepinch';
    }
  }

  // Body composition fields - InBody/DEXA/BodPod/Bioimpedance (all use same fields)
  const directBodyCompMethods = ['inbody', 'dexa', 'bodpod', 'bioimpedance'];
  if (directBodyCompMethods.includes(equipmentConfig.bodyComposition.method)) {
    // Show standard InBody fields
    const inbodyFields = [
      'inbodyWeightKg', 'inbodyBodyFatPct', 'bodyFatMassKg', 'inbodyBmi',
      'visceralFatLevel', 'skeletalMuscleMassKg', 'totalBodyWaterL',
      'waistHipRatio', 'segmentalArmRightKg', 'segmentalArmLeftKg',
      'segmentalLegRightKg', 'segmentalLegLeftKg', 'segmentalTrunkKg',
      'bmrKcal', 'inbodyScore'
    ];
    if (inbodyFields.includes(fieldId)) return true;
    // Hide skinfold and measurement fields
    if (fieldId.startsWith('skinfold') || fieldId === 'waistCm' || fieldId === 'neckCm' || fieldId === 'hipCm') {
      return false;
    }
  }

  // Skinfold fields
  if (fieldId.startsWith('skinfold')) {
    return equipmentConfig.bodyComposition.method === 'skinfold';
  }

  // Body measurement fields (US Navy method)
  if (fieldId === 'waistCm' || fieldId === 'neckCm' || fieldId === 'hipCm') {
    return equipmentConfig.bodyComposition.method === 'measurements';
  }

  // Height and weight are always shown (needed for conversions)
  if (fieldId === 'heightCm' || fieldId === 'inbodyWeightKg') {
    return true;
  }

  // Default: show field if no equipment-specific logic
  return true;
}

