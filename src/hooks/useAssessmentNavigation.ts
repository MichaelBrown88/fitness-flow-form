/**
 * Hook for managing assessment navigation state and logic
 * Extracted from MultiStepForm to improve performance and separation of concerns
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { phaseDefinitions, type PhaseSection, type PhaseId, type PhaseField } from '@/lib/phaseConfig';
import type { FormData } from '@/contexts/FormContext';
import type { OrgSettings } from '@/services/organizations';
import { shouldShowField } from '@/lib/utils/equipmentFieldFilter';
import { logger } from '@/lib/utils/logger';
import { STORAGE_KEYS } from '@/constants/storageKeys';

interface UseAssessmentNavigationProps {
  formData: FormData;
  orgSettings?: Partial<OrgSettings>;
}

export function useAssessmentNavigation({ formData, orgSettings }: UseAssessmentNavigationProps) {
  const getEditPartialCategory = (editType: string | undefined): string | null => {
    if (!editType) return null;
    if (editType.startsWith('partial-')) return editType.replace('partial-', '');
    if (editType === 'manual') return 'strength';
    return null;
  };

  // Partial assessment mode state (read from PARTIAL_ASSESSMENT or EDIT_ASSESSMENT for edit flow)
  const [isPartialAssessment, setIsPartialAssessment] = useState(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEYS.PARTIAL_ASSESSMENT)) return true;
      const editData = sessionStorage.getItem(STORAGE_KEYS.EDIT_ASSESSMENT);
      if (editData) {
        const parsed = JSON.parse(editData) as { editType?: string };
        if (getEditPartialCategory(parsed.editType)) return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  const [partialCategory, setPartialCategory] = useState<string | null>(() => {
    try {
      const partialData = sessionStorage.getItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
      if (partialData) {
        const { category } = JSON.parse(partialData);
        return category ?? null;
      }
      const editData = sessionStorage.getItem(STORAGE_KEYS.EDIT_ASSESSMENT);
      if (editData) {
        const parsed = JSON.parse(editData) as { editType?: string };
        return getEditPartialCategory(parsed.editType);
      }
    } catch {
      return null;
    }
    return null;
  });

  // Ensure partial mode is applied when editing a partial (EDIT_ASSESSMENT can be set before PARTIAL_ASSESSMENT)
  useEffect(() => {
    const editRaw = sessionStorage.getItem(STORAGE_KEYS.EDIT_ASSESSMENT);
    if (!editRaw) return;
    try {
      const parsed = JSON.parse(editRaw) as { editType?: string; formData?: { fullName?: string } };
      const category = getEditPartialCategory(parsed.editType);
      if (!category) return;
      sessionStorage.setItem(STORAGE_KEYS.PARTIAL_ASSESSMENT, JSON.stringify({
        category,
        clientName: parsed.formData?.fullName ?? '',
      }));
      setIsPartialAssessment(true);
      setPartialCategory(category);
    } catch {
      // non-fatal
    }
  }, []);

  const getInitialPhase = () => {
    try {
      const partialData = sessionStorage.getItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
      if (partialData) {
        return 1; // Jump to category phase in partial mode
      }
      const editData = sessionStorage.getItem(STORAGE_KEYS.EDIT_ASSESSMENT);
      if (editData) {
        const parsed = JSON.parse(editData) as { editType?: string };
        if (getEditPartialCategory(parsed.editType)) return 1;
      }
      const saved = sessionStorage.getItem(STORAGE_KEYS.ASSESSMENT_PHASE);
      if (saved !== null) {
        const idx = parseInt(saved, 10);
        if (Number.isFinite(idx) && idx >= 0) return Math.min(idx, 15);
      }
    } catch (e) {
      logger.warn('Failed to parse partial assessment data:', e);
    }
    return 0;
  };

  const [activePhaseIdx, setActivePhaseIdx] = useState(getInitialPhase);

  // Filter phases based on organization settings and partial assessment mode
  const visiblePhases = useMemo(() => {
    const assessmentToSectionMap: Record<string, string[]> = {
      parq: ['parq'],
      bodycomp: ['body-comp'],
      fitness: ['fitness-assessment'],
      posture: ['posture'],
      overheadSquat: ['overhead-squat'],
      hinge: ['hinge-assessment'],
      lunge: ['lunge-assessment'],
      mobility: ['mobility'],
      strength: ['strength-endurance'],
      lifestyle: ['lifestyle-overview'],
    };

    const modules = orgSettings?.modules;
    let phases = phaseDefinitions;

    // Filter phases and sections by granular assessment toggles
    if (modules) {
      phases = phaseDefinitions.map(phase => {
        if (phase.id === 'P0' || phase.id === 'P6' || phase.id === 'P7') {
          return phase;
        }

        const filteredSections = (phase.sections || []).filter(section => {
          const enabledAssessments = Object.entries(assessmentToSectionMap)
            .filter(([assessmentKey, sectionIds]) => sectionIds.includes(section.id))
            .map(([assessmentKey]) => assessmentKey);

          return enabledAssessments.some(assessmentKey => modules[assessmentKey as keyof typeof modules] === true);
        });

        if (filteredSections.length === 0) {
          return null;
        }

        return {
          ...phase,
          sections: filteredSections
        } as typeof phase;
      }).filter((p): p is NonNullable<typeof p> => p !== null);
    }

    // Filter further if in partial assessment mode
    if (!isPartialAssessment || !partialCategory) {
      return phases;
    }

    const categoryConfig: Record<string, { phaseIds: PhaseId[]; sectionIds?: string[] }> = {
      'bodycomp': { 
        phaseIds: ['P0', 'P2', 'P7'], 
        sectionIds: ['basic-client-info', 'parq', 'body-comp'] 
      },
      'posture': { 
        phaseIds: ['P0', 'P4', 'P7'], 
        sectionIds: ['basic-client-info', 'parq', 'posture', 'overhead-squat', 'hinge-assessment', 'lunge-assessment', 'mobility'] 
      },
      'fitness': { 
        phaseIds: ['P0', 'P3', 'P7'], 
        sectionIds: ['basic-client-info', 'parq', 'fitness-assessment'] 
      },
      'strength': { 
        phaseIds: ['P0', 'P5', 'P7'], 
        sectionIds: ['basic-client-info', 'parq', 'strength-endurance'] 
      },
      'lifestyle': { 
        phaseIds: ['P0', 'P1', 'P7'], 
        sectionIds: ['basic-client-info', 'parq', 'lifestyle-overview'] 
      },
    };

    const config = categoryConfig[partialCategory] || { phaseIds: ['P0'] };

    return phases
      .filter(phase => (config.phaseIds as string[]).includes(phase.id))
      .map(phase => {
        if (!config.sectionIds) return phase;

        const filteredSections = (phase.sections || []).filter(section => {
          if (!config.sectionIds) return true;
          if (!config.sectionIds.includes(section.id)) return false;

          if (modules) {
            const sectionAssessments = Object.entries(assessmentToSectionMap)
              .filter(([_, sectionIds]) => sectionIds.includes(section.id))
              .map(([assessmentKey]) => assessmentKey);

            if (sectionAssessments.length > 0 && !sectionAssessments.some(key => modules[key as keyof typeof modules])) {
              return false;
            }
          }

          return true;
        });
        if (filteredSections.length === 0 && phase.id !== 'P7') return null;
        return {
          ...phase,
          sections: filteredSections
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [isPartialAssessment, partialCategory, orgSettings?.modules]);

  const isFieldVisible = useCallback((field: { id?: string; conditional?: { showWhen?: Record<string, unknown> } }, customData?: FormData) => {
    const data = customData || formData;
    
    // First check equipment-based filtering (e.g., grip strength disabled)
    if (field.id && orgSettings?.equipmentConfig) {
      const shouldShow = shouldShowField(field as PhaseField, orgSettings.equipmentConfig, data);
      if (!shouldShow) return false;
    }
    
    // Then check conditional logic
    if (!('conditional' in field) || !field.conditional || !field.conditional.showWhen) return true;
    const { showWhen } = field.conditional;
    const dependentValue = data[showWhen.field as keyof FormData];
    let ok = true;
    if (showWhen.exists !== undefined) {
      ok = ok && (dependentValue !== undefined && dependentValue !== null && String(dependentValue).trim() !== '');
    }
    if (showWhen.value !== undefined) ok = ok && dependentValue === showWhen.value;
    if (showWhen.notValue !== undefined) ok = ok && dependentValue !== showWhen.notValue;
    if (showWhen.includes !== undefined) {
      if (Array.isArray(dependentValue)) {
        ok = ok && (dependentValue as string[]).includes(String(showWhen.includes));
      } else if (typeof dependentValue === 'string') {
        ok = ok && dependentValue === String(showWhen.includes);
      } else {
        ok = false;
      }
    }
    return ok;
  }, [formData, orgSettings?.equipmentConfig]);

  const isSectionCompleted = useCallback((section: PhaseSection) => {
    const visibleFields = (section.fields as Array<{ id: string; conditional?: { showWhen?: Record<string, unknown> }; required?: boolean }>).filter(f => isFieldVisible(f));
    if (visibleFields.length === 0) return true;

    const requiredFields = visibleFields.filter(f => f.required);

    if (requiredFields.length > 0) {
      return requiredFields.every(field => {
        const value = formData[field.id as keyof FormData];
        if (Array.isArray(value)) return value.length > 0;
        return value !== undefined && value !== null && value !== '';
      });
    }

    return visibleFields.every(field => {
      const value = formData[field.id as keyof FormData];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== '';
    });
  }, [formData, isFieldVisible]);

  const isPhaseCompleted = useCallback((phaseIdx: number) => {
    const phase = visiblePhases[phaseIdx];
    if (!phase) return false;
    const sections = phase.sections || [];
    if (sections.length === 0) return true;
    return sections.every(sec => isSectionCompleted(sec as PhaseSection));
  }, [visiblePhases, isSectionCompleted]);

  const totalPhases = visiblePhases.length;
  const activePhase = useMemo(() => {
    return visiblePhases[activePhaseIdx] || {
      id: 'empty' as const,
      title: 'No Phases Available',
      summary: 'Phase definitions are currently being loaded or configured.',
      sections: [] as PhaseSection[]
    };
  }, [activePhaseIdx, visiblePhases]);

  const isResultsPhase = activePhase?.id === 'P7';

  const progressValue = useMemo(() => {
    if (isPartialAssessment) return 0;
    const completed = visiblePhases.filter((_, i) => isPhaseCompleted(i)).length;
    return (completed / (totalPhases - 1)) * 100;
  }, [visiblePhases, totalPhases, isPhaseCompleted, isPartialAssessment]);

  return {
    activePhaseIdx,
    setActivePhaseIdx,
    visiblePhases,
    totalPhases,
    activePhase,
    isResultsPhase,
    isPartialAssessment,
    setIsPartialAssessment,
    partialCategory,
    setPartialCategory,
    isFieldVisible,
    isSectionCompleted,
    isPhaseCompleted,
    progressValue,
  };
}

