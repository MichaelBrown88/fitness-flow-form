import { useState, useMemo, useEffect, useCallback } from 'react';
import { FormProvider, useFormContext, type FormData } from '@/contexts/FormContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon, Info } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { phaseDefinitions, type PhaseField, type PhaseSection } from '@/lib/phaseConfig';
import ParQQuestionnaire from './ParQQuestionnaire';

type FieldValue = string | string[];

type IntakeSection = {
  id: string;
  title: string;
  fields: PhaseField[];
};

type SectionType = PhaseSection | IntakeSection;

const labelTextClasses = 'text-sm font-medium text-slate-700';
const supportTextClasses = 'text-xs text-slate-500 mt-1';

const FieldControl = ({ field }: { field: PhaseField }) => {
  const { formData, updateFormData } = useFormContext();

  // Check conditional logic
  const shouldShow = () => {
    if (!('conditional' in field) || !field.conditional || !field.conditional.showWhen) return true;

    const { showWhen } = field.conditional;
    const dependentValue = formData[showWhen.field as keyof FormData];
    return dependentValue === showWhen.value;
  };

  if (!shouldShow()) {
    return null;
  }

  const handleChange = (value: FieldValue) => {
    updateFormData({ [field.id]: value } as Partial<FormData>);
  };

  const renderLabel = () => (
    <div className="flex items-start gap-2">
      <div className="flex flex-col">
        <label className={labelTextClasses}>{field.label}</label>
        {field.description && <p className={supportTextClasses}>{field.description}</p>}
      </div>
      {field.tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="mt-0.5 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={`More information about ${field.label}`}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs leading-relaxed">{field.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );

  const renderInput = () => {
    const value = formData[field.id];
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            placeholder={field.placeholder}
            value={(value as string) ?? ''}
            onChange={(event) => handleChange(event.target.value)}
            rows={4}
            className="mt-3"
          />
        );
      case 'select':
        return (
          <div className="mt-3">
            <Select
              value={(value as string) ?? ''}
              onValueChange={(next) => handleChange(next)}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder ?? 'Select option'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'multiselect': {
        const selected = Array.isArray(value) ? (value as string[]) : [];
        const selectedLabels = field.options
          ?.filter(option => selected.includes(option.value))
          .map(option => option.label)
          .join(', ') || field.placeholder || 'Select goals';

        return (
          <div className="mt-3">
            <Select
              value=""
              onValueChange={(next) => {
                if (selected.includes(next)) {
                  // Remove if already selected
                  handleChange(selected.filter((item) => item !== next));
                      } else {
                  // Add if not selected
                  handleChange([...selected, next]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedLabels} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => {
                  const isSelected = selected.includes(option.value);
                  return (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className={isSelected ? 'bg-blue-50 text-blue-700' : ''}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <span className="text-white text-xs">✓</span>}
                        </div>
                        {option.label}
                      </div>
                    </SelectItem>
              );
            })}
              </SelectContent>
            </Select>
            {selected.length > 0 && (
              <div className="mt-2 text-sm text-slate-600">
                Selected: {selectedLabels}
              </div>
            )}
          </div>
        );
      }
      case 'parq':
        return <ParQQuestionnaire />;
      case 'number':
      case 'text':
      default:
        return (
          <Input
            type={field.type === 'number' ? 'number' : 'text'}
            placeholder={field.placeholder}
            value={(value as string) ?? ''}
            onChange={(event) => handleChange(event.target.value)}
            className="mt-3"
          />
        );
    }
  };

  return (
    <div className="space-y-3">
      {renderLabel()}
      {renderInput()}
    </div>
  );
};

const PhaseFormContent = () => {
  const { formData } = useFormContext();
  const [activePhaseIdx, setActivePhaseIdx] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [recentlyCompletedSections, setRecentlyCompletedSections] = useState<Set<string>>(new Set());

  const totalPhases = phaseDefinitions.length;
  const activePhase = useMemo(() => {
    return phaseDefinitions[activePhaseIdx] || {
      id: 'empty',
      title: 'No Phases Available',
      summary: 'Phase definitions are currently being loaded or configured.',
      sections: []
    };
  }, [activePhaseIdx]);

  // Debug: verify the phases loaded at runtime
  useEffect(() => {
    console.log('[Assessment] phases loaded:', phaseDefinitions.map(p => ({ id: p.id, title: p.title })));
  }, []);
  useEffect(() => {
    console.log('[Assessment] activePhaseIdx:', activePhaseIdx, 'activePhase:', activePhase?.id, activePhase?.title);
  }, [activePhaseIdx, activePhase]);

  // Check if intake fields are completed (all fields filled)
  const isIntakeCompleted = useCallback(() => {
    const p0Sections = phaseDefinitions[0]?.sections ?? [];
    const p0Fields = p0Sections.flatMap(section => section.fields ?? []);
    if (p0Fields.length === 0) return false;

    return p0Fields.every(field => {
      const value = formData[field.id];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== '';
    });
  }, [formData]);

  // Check if a section is completed (all fields filled, not just required)
  const isSectionCompleted = useCallback((section: PhaseSection) => {
    return section.fields.every(field => {
      const value = formData[field.id];
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== undefined && value !== null && value !== '';
    });
  }, [formData]);

  // Determine if a given phase is completed (all fields in all sections filled).
  const isPhaseCompleted = useCallback((phaseIdx: number) => {
    const phase = phaseDefinitions[phaseIdx];
    if (!phase) return false;
    const sections = phase.sections ?? [];
    if (sections.length === 0) return true; // empty phase counts as completed/unlocked
    return sections.every(section =>
      section.fields.every(field => {
        const value = formData[field.id];
        if (Array.isArray(value)) return value.length > 0;
        return value !== undefined && value !== null && value !== '';
      })
    );
  }, [formData]);

  // Compute the furthest phase index the user can navigate to (completed chain unlocks next).
  const maxUnlockedPhaseIdx = useMemo(() => {
    let idx = 0;
    while (idx < totalPhases - 1 && isPhaseCompleted(idx)) {
      idx += 1;
    }
    return idx;
  }, [totalPhases, isPhaseCompleted]);

  // Get all sections for current phase (no longer including intake globally)
  const getAllSections = useCallback(() => {
    const sections: SectionType[] = [];

    if (activePhase.sections && activePhase.sections.length > 0) {
      // Phase has sections
      sections.push(...activePhase.sections);
    }

    return sections;
  }, [activePhase]);

  // Initialize sections - first section of each phase starts expanded
  useEffect(() => {
    const allSections = getAllSections();
    const newExpandedSections: Record<string, boolean> = {};

    allSections.forEach((section, index) => {
      // First section of each phase starts expanded
      newExpandedSections[section.id] = index === 0;
    });

    setExpandedSections(newExpandedSections);
  }, [activePhaseIdx, getAllSections]);

  // Auto-skip phases that have no sections (e.g., placeholder phases)
  useEffect(() => {
    if ((activePhase.sections?.length ?? 0) === 0 && activePhaseIdx < totalPhases - 1) {
      const timeout = setTimeout(() => setActivePhaseIdx(prev => prev + 1), 250);
      return () => clearTimeout(timeout);
    }
  }, [activePhase, activePhaseIdx, totalPhases]);

  // Auto-advance sections and phases when completed (only for real-time completion)
  useEffect(() => {
    // Special handling for Phase 0 (Client Profile) completion - advance to Phase 1
    const p0FirstSectionId = phaseDefinitions[0]?.sections?.[0]?.id ?? 'phase0';
    if (activePhaseIdx === 0 && isIntakeCompleted() && !recentlyCompletedSections.has(p0FirstSectionId)) {
      setRecentlyCompletedSections(prev => new Set(prev).add(p0FirstSectionId));
      setTimeout(() => setActivePhaseIdx(1), 1500);
      return;
    }

    const allSections = getAllSections();
    const expandedSectionId = Object.keys(expandedSections).find(id => expandedSections[id]);

    if (!expandedSectionId) return;

    const currentSection = allSections.find(section => section.id === expandedSectionId);
    if (!currentSection) return;

    // Check if current section is completed and wasn't recently completed
    const isSectionCompleted = currentSection.fields?.every(field =>
      formData[field.id as keyof FormData] !== '' && formData[field.id as keyof FormData] !== undefined
    ) ?? false;

    const wasRecentlyCompleted = recentlyCompletedSections.has(expandedSectionId);

    if (isSectionCompleted && !wasRecentlyCompleted) {
      setRecentlyCompletedSections(prev => new Set(prev).add(expandedSectionId));

      const currentIndex = allSections.findIndex(section => section.id === expandedSectionId);

      // Add delay before auto-advancing so user can see their input
      setTimeout(() => {
        // Only expand next section, don't force collapse current section
        if (currentIndex < allSections.length - 1) {
          const nextSection = allSections[currentIndex + 1];
          setExpandedSections(prev => ({
            ...prev,
            [nextSection.id]: true
          }));
        } else {
          // Last section of phase - advance to next phase (but not to final results automatically)
          if (activePhaseIdx < totalPhases - 2) { // -2 to prevent auto-advancing to results
            setActivePhaseIdx(prev => prev + 1);
          }
        }
      }, 1500); // 1.5 second delay
    }

    // Special handling for PAR-Q completion - advance to next section or next phase
    if (currentSection.id === 'health-screening' && formData.parqQuestionnaire === 'completed' && !wasRecentlyCompleted) {
      setRecentlyCompletedSections(prev => new Set(prev).add('health-screening'));
      setTimeout(() => {
        const currentIndex = allSections.findIndex(section => section.id === expandedSectionId);
        if (currentIndex < allSections.length - 1) {
          const nextSection = allSections[currentIndex + 1];
          setExpandedSections(prev => ({
            ...prev,
            [nextSection.id]: true
          }));
        } else {
          // No next section in this phase; move to the next phase
          if (activePhaseIdx < totalPhases - 1) {
            setActivePhaseIdx(prev => prev + 1);
          }
        }
      }, 1500);
    }
  }, [formData, expandedSections, activePhaseIdx, totalPhases, getAllSections, isIntakeCompleted, recentlyCompletedSections]);

  // Check if all assessment phases (P1-P5) are completed
  const allAssessmentsCompleted = useMemo(() => {
    // Check if we have data for key assessment fields
    const requiredFields = [
      'parqQuestionnaire', // PAR-Q
      'postureSeverity', // Posture assessment
      'pushupTest', // Strength assessment
      'plankHoldSeconds', // Core assessment
      'cardioTestType', // Cardio assessment
    ];

    return requiredFields.every(field =>
      formData[field as keyof FormData] !== '' && formData[field as keyof FormData] !== undefined
    );
  }, [formData]);

  const progressValue = useMemo(
    () => ((activePhaseIdx + 1) / totalPhases) * 100,
    [activePhaseIdx, totalPhases]
  );

  const handleNext = () => {
    const allSections = getAllSections();

    // Find the currently expanded section
    const expandedSectionId = Object.keys(expandedSections).find(id => expandedSections[id]);
    if (!expandedSectionId) return;

    const currentSectionIndex = allSections.findIndex(section => section.id === expandedSectionId);
    if (currentSectionIndex === -1) return;

    // If there's a next section in the current phase, expand it and collapse current
    if (currentSectionIndex < allSections.length - 1) {
      const nextSection = allSections[currentSectionIndex + 1];
      setExpandedSections(prev => ({
        ...prev,
        [expandedSectionId]: false,
        [nextSection.id]: true
      }));
    } else {
      // No more sections in current phase, move to next phase
    if (activePhaseIdx < totalPhases - 1) {
      setActivePhaseIdx((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    const allSections = getAllSections();

    // Find the currently expanded section
    const expandedSectionId = Object.keys(expandedSections).find(id => expandedSections[id]);
    if (!expandedSectionId) {
      // No expanded section, go to previous phase
      if (activePhaseIdx > 0) {
        setActivePhaseIdx((prev) => prev - 1);
      }
      return;
    }

    const currentSectionIndex = allSections.findIndex(section => section.id === expandedSectionId);
    if (currentSectionIndex === -1) return;

    // If there's a previous section in the current phase, expand it and collapse current
    if (currentSectionIndex > 0) {
      const prevSection = allSections[currentSectionIndex - 1];
      setExpandedSections(prev => ({
        ...prev,
        [expandedSectionId]: false,
        [prevSection.id]: true
      }));
    } else {
      // No previous section in current phase, move to previous phase
    if (activePhaseIdx > 0) {
        setActivePhaseIdx((prev) => prev - 1);
      }
    }
  };

  const handleViewResults = () => {
    if (allAssessmentsCompleted) {
      setActivePhaseIdx(6); // Go to results phase (P7)
    }
  };

  const handleStartNewAssessment = () => {
    // Reset all form data and state
    window.location.reload(); // Simple reset for now - could be more sophisticated
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const renderSection = (section: SectionType, index: number, allSections: SectionType[]) => {
    const isExpanded = expandedSections[section.id] || false;
    const isCompleted = isSectionCompleted(section);

      return (
      <Collapsible
        key={section.id}
        open={isExpanded}
        onOpenChange={() => toggleSection(section.id)}
      >
        <div className={`rounded-xl border transition-all duration-200 ${
          isCompleted
            ? 'border-green-200 bg-green-50/50'
            : isExpanded
            ? 'border-slate-300 bg-white shadow-sm'
            : 'border-slate-200 bg-slate-50'
        }`}>
          <CollapsibleTrigger asChild>
            <button className="w-full px-6 py-4 text-left hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
                      {isCompleted && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Check className="h-4 w-4" />
                          <span className="text-xs font-medium">Completed</span>
                        </div>
                      )}
                    </div>
                    {'description' in section && section.description && (
                      <p className="text-sm text-slate-600">{section.description}</p>
                    )}
                  </div>
                <div className="flex items-center gap-2">
                  {!isExpanded && section.fields.length > 0 && (
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5 text-slate-400" />
                  )}
                  </div>
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-6 pb-6">
              {'instructions' in section && section.instructions && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 mb-6">
                  <div className="font-semibold mb-1">Client Instructions</div>
                  <p className="text-blue-800 mb-3">{(section as PhaseSection).instructions!.clientInstructions}</p>
                  <div className="font-semibold mb-1">Coach Notes</div>
                  <p className="text-blue-800">{(section as PhaseSection).instructions!.coachNotes}</p>
                </div>
              )}
              <div className="space-y-6">
                {(() => {
                  const parqField = section.fields.find(field => field.type === 'parq');
                  const otherFields = section.fields.filter(field => field.type !== 'parq');

                  // Special handling for lunge assessment - organize in left/right columns
                  if (section.id === 'lunge-assessment') {
                    const leftFields = otherFields.filter(field =>
                      field.id.includes('Left') || field.id.includes('left')
                    );
                    const rightFields = otherFields.filter(field =>
                      field.id.includes('Right') || field.id.includes('right')
                    );
                    const otherLungeFields = otherFields.filter(field =>
                      !field.id.includes('Left') && !field.id.includes('left') &&
                      !field.id.includes('Right') && !field.id.includes('right')
                    );

                    return (
                      <>
                        {/* PAR-Q questionnaire takes full width */}
                        {parqField && (
                          <div className="w-full">
                            <FieldControl field={parqField} />
                          </div>
                        )}

                        {/* Lunge assessment - left and right columns */}
                        <div className="grid gap-6 md:grid-cols-2">
                          <div className="space-y-4">
                            <h4 className="font-medium text-slate-900 border-b border-slate-200 pb-2">Left Leg Assessment</h4>
                            {leftFields.map((field: PhaseField) => (
                              <FieldControl key={field.id} field={field} />
                            ))}
                          </div>
                          <div className="space-y-4">
                            <h4 className="font-medium text-slate-900 border-b border-slate-200 pb-2">Right Leg Assessment</h4>
                            {rightFields.map((field: PhaseField) => (
                              <FieldControl key={field.id} field={field} />
                            ))}
                          </div>
                        </div>

                        {/* Any remaining fields */}
                        {otherLungeFields.length > 0 && (
                          <div className="grid gap-6 md:grid-cols-2">
                            {otherLungeFields.map((field: PhaseField) => (
                              <FieldControl key={field.id} field={field} />
                            ))}
                          </div>
                        )}
                      </>
                    );
                  }

                  return (
                    <>
                      {/* PAR-Q questionnaire takes full width */}
                      {parqField && (
                        <div className="w-full">
                          <FieldControl field={parqField} />
                        </div>
                      )}

                      {/* Other fields use grid layout */}
                      {otherFields.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2">
                          {otherFields.map((field: PhaseField) => (
                  <FieldControl key={field.id} field={field} />
                ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  const renderAllSections = () => {
    const allSections = getAllSections();

    return (
      <div className="space-y-4">
        {allSections.map((section, index) => renderSection(section, index, allSections))}
      </div>
    );
  };


  // Show configuration message if no phases are defined
  if (totalPhases === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center">
        <div className="rounded-full bg-slate-100 p-4">
          <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Assessment Configuration</h2>
        <p className="text-slate-600 max-w-md">
          Phase definitions are currently being configured. The assessment phases will be available once the configuration is complete.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Phase navigation */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-slate-900">{activePhase.title}</h2>
            <p className="text-sm text-slate-600">{activePhase.summary}</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
            Phase {activePhaseIdx + 1} of {totalPhases}
          </div>
        </div>
        <Progress value={progressValue} className="h-2 bg-slate-100 rounded-full" />

        <nav className="flex flex-wrap gap-2">
          {phaseDefinitions.map((phase, idx) => {
            const isActive = idx === activePhaseIdx;
            const isCompleted = isPhaseCompleted(idx) && idx <= maxUnlockedPhaseIdx;
            const isDisabled = idx > maxUnlockedPhaseIdx;

            return (
              <button
                key={phase.id}
                onClick={() => !isDisabled && setActivePhaseIdx(idx)}
                disabled={isDisabled}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : isCompleted
                    ? 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100'
                    : isDisabled
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-semibold">{phase.id}</span>
                <span
                  className={`truncate max-w-32 ${
                    isActive
                      ? 'text-white'
                      : isCompleted
                      ? 'text-green-800'
                      : isDisabled
                      ? 'text-slate-400'
                      : 'text-slate-700'
                  }`}
                >
                  {phase.title}
                </span>
                {isCompleted && (
                  <div className="mt-1 flex items-center gap-1">
                    <Check className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-600">Completed</span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </section>

      {/* All sections content */}
      <section className="space-y-6">
        {renderAllSections()}

        {/* Show navigation buttons when the phase has content and we are not on the final phase */}
        {(activePhase.sections?.length ?? 0) > 0 && activePhaseIdx < totalPhases - 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={activePhaseIdx === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={activePhaseIdx === totalPhases - 1}
              className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              Next Phase
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Show "View Results" button when all assessments are completed (anywhere in phases 1-5) */}
        {activePhaseIdx >= 1 && activePhaseIdx < totalPhases - 1 && allAssessmentsCompleted && (
          <div className="flex items-center justify-center border-t border-slate-100 pt-6">
            <Button
              onClick={handleViewResults}
              className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700"
            >
              📊 View Results
            </Button>
          </div>
        )}

        {/* Final phase - Assessment Complete */}
        {activePhaseIdx === totalPhases - 1 && (
          <div className="flex items-center justify-center gap-4 border-t border-slate-100 pt-6">
            <Button
              onClick={handleStartNewAssessment}
              variant="outline"
              className="flex items-center gap-2"
            >
              🔄 Start New Assessment
            </Button>
            <Button
              onClick={() => {
                // Could trigger report generation or completion action here
                alert('Assessment Complete! Reports can be generated from this data.');
              }}
              className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700"
            >
              📊 Generate Reports
            </Button>
          </div>
        )}
      </section>

      <footer className="pb-8 text-center text-xs text-slate-400">Assessment Engine v2.0</footer>
    </div>
  );
};

const MultiStepForm = () => (
  <FormProvider>
    <AppShell title="Fitness Assessment">
      <PhaseFormContent />
    </AppShell>
  </FormProvider>
);

export default MultiStepForm;