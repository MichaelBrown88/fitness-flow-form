/**
 * Posture, Movement & Mobility Section
 * Clean, visual display of posture analysis, movement quality, and mobility findings
 */

import React, { useState, useMemo } from 'react';
import type { FormData } from '@/contexts/FormContext';
import { computeScores, type ScoreSummary } from '@/lib/scoring';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PostureClientPostureSection } from './posture/PostureClientPostureSection';
import { PostureTrainerPostureSection } from './posture/PostureTrainerPostureSection';
import { MuscleMap } from './MuscleMap';
import { combineMuscleImplications } from '@/lib/posture/findingMuscleMap';
import { deriveMovementMuscleSets } from '@/lib/scoring/movementMuscleMap';
import { resolveMobilityForScoring } from '@/lib/scoring/deriveMobilityFromPatterns';
import { Activity, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils/logger';
import { CardInfoDrawer } from './CardInfoDrawer';

interface MovementPostureMobilityProps {
  formData?: FormData;
  scores: ScoreSummary;
  standalone?: boolean;
  hideHeader?: boolean;
  previousFormData?: FormData;
  /** Org ID passed by coach pages for re-analysis; omitted on public/standalone views. */
  organizationId?: string;
  /**
   * 'both' (default): legacy combined render — muscle map (movement+mobility+posture) and posture analysis card.
   * 'movement': only the movement/mobility muscle map.
   * 'posture': only the posture view grid + expanded sheet + (coach-only) trainer detail.
   */
  mode?: 'both' | 'movement' | 'posture';
}

export function MovementPostureMobility({ formData, scores, standalone = false, hideHeader, previousFormData, organizationId, mode = 'both' }: MovementPostureMobilityProps) {
  const { toast } = useToast();
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const movementDelta = useMemo(() => {
    if (!formData || !previousFormData) return null;
    const currentMvmt = scores.categories.find(c => c.id === 'movementQuality');
    if (!currentMvmt) return null;
    try {
      const prevScores = computeScores(previousFormData);
      const prevMvmt = prevScores.categories.find(c => c.id === 'movementQuality');
      if (!prevMvmt) return null;
      const diff = currentMvmt.score - prevMvmt.score;
      if (diff > 0) return { direction: 'up' as const, value: diff };
      if (diff < 0) return { direction: 'down' as const, value: Math.abs(diff) };
    } catch { /* previous data may be malformed */ }
    return null;
  }, [scores, previousFormData, formData]);

  if (!formData) return null;

  const handleReanalyze = async () => {
    if (!formData.fullName) {
      toast({
        title: 'Client name missing',
        description: 'Cannot re-analyse without client name',
        variant: 'destructive',
      });
      return;
    }
    
    setIsReanalyzing(true);
    try {
      const { reanalyzeClientPosture } = await import('@/lib/utils/reanalyzePosture');
      const result = await reanalyzeClientPosture(formData.fullName, organizationId);
      
      if (result.success > 0) {
        toast({
          title: 'Re-analysis complete',
          description: `Successfully re-analysed ${result.success} view(s). Refreshing page...`,
        });
        
        // Auto-refresh after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error('No views were successfully re-analysed');
      }
    } catch (error) {
      logger.error('Re-analysis failed', 'MOVEMENT_POSTURE', error);
      toast({
        title: 'Re-analysis failed',
        description: error instanceof Error ? error.message : 'Could not re-analyse posture images',
        variant: 'destructive',
      });
    } finally {
      setIsReanalyzing(false);
    }
  };
  
  const movement = scores.categories.find(c => c.id === 'movementQuality') || { score: 0, strengths: [] as string[], weaknesses: [] as string[] };
  
  // Get posture images from various possible locations
  // Priority: postureImages (compressed with overlays) > postureImagesStorage (full size with overlays) > postureImagesFull_* (full size)
  const postureImages: Record<string, string> = {};
  
  // First, try postureImages (these have green + red overlays already applied)
  if (formData.postureImages && typeof formData.postureImages === 'object') {
    Object.entries(formData.postureImages).forEach(([key, value]) => {
      if (value && typeof value === 'string' && (value.startsWith('data:') || value.startsWith('http'))) {
        postureImages[key] = value;
      }
    });
  }
  
  // Then try postureImagesStorage (full size with overlays - Firebase Storage URLs)
  if (formData.postureImagesStorage && typeof formData.postureImagesStorage === 'object') {
    Object.entries(formData.postureImagesStorage).forEach(([key, value]) => {
      if (value && typeof value === 'string' && (value.startsWith('http') || value.startsWith('gs://')) && !postureImages[key]) {
        postureImages[key] = value;
      }
    });
  }
  
  // Finally, try postureImagesFull_* format (legacy format)
  Object.keys(formData).forEach(key => {
    if (key.startsWith('postureImagesFull_')) {
      const view = key.replace('postureImagesFull_', '');
      const value = (formData as unknown as Record<string, unknown>)[key];
      if (value && typeof value === 'string' && !postureImages[view]) {
        postureImages[view] = value;
      }
    }
    // Also check for postureImagesStorage_ format
    if (key.startsWith('postureImagesStorage_')) {
      const view = key.replace('postureImagesStorage_', '');
      const value = (formData as unknown as Record<string, unknown>)[key];
      if (value && typeof value === 'string' && !postureImages[view]) {
        postureImages[view] = value;
      }
    }
  });
  
  const hasPostureImages = Object.keys(postureImages).length > 0;
  const hasPostureAnalysis = formData.postureAiResults && typeof formData.postureAiResults === 'object' && Object.keys(formData.postureAiResults).length > 0;
  
  // Calculate movement pattern score only (not including posture or mobility)
  // Based on overhead squat, hinge, and lunge scores
  const calculateMovementPatternScore = () => {
    if (!formData) return 0;
    
    const scoreMap: Record<string, number> = {
      'excellent': 100,
      'good': 75,
      'fair': 50,
      'poor': 25,
      'full': 100,
      'parallel': 75,
      'quarter': 50,
      'minimal': 25,
      'upright': 100,
      'moderate': 75,
      'excessive': 50,
      'none': 100,
      'minor': 75,
      'severe': 25,
      'stable': 100,
      'compensated': 75,
      'limited': 50,
      'straight': 100,
      'caves inward': 50,
      'bows outward': 50,
      'neutral': 100,
      'anterior tilt': 60,
      'posterior tilt': 60,
    };
    
    const getScore = (v: string | undefined) => (v ? (scoreMap[v.toLowerCase()] ?? 0) : 0);
    
    // Overhead Squat Score
    const ohsFields = [formData.ohsShoulderMobility, formData.ohsTorsoLean, formData.ohsSquatDepth, formData.ohsHipShift, formData.ohsKneeAlignment, formData.ohsFeetPosition];
    const ohsScores = ohsFields.map(getScore).filter(s => s > 0);
    const ohsScore = ohsScores.length > 0 ? ohsScores.reduce((a, b) => a + b, 0) / ohsScores.length : 0;
    
    // Hinge Score
    const hingeFields = [formData.hingeDepth, formData.hingeBackRounding];
    const hingeScores = hingeFields.map(getScore).filter(s => s > 0);
    const hingeScore = hingeScores.length > 0 ? hingeScores.reduce((a, b) => a + b, 0) / hingeScores.length : 0;
    
    // Lunge Score
    const lungeFields = [formData.lungeLeftBalance, formData.lungeRightBalance, formData.lungeLeftKneeAlignment, formData.lungeRightKneeAlignment, formData.lungeLeftTorso, formData.lungeRightTorso];
    const lungeScores = lungeFields.map(getScore).filter(s => s > 0);
    const lungeScore = lungeScores.length > 0 ? lungeScores.reduce((a, b) => a + b, 0) / lungeScores.length : 0;
    
    const mvmntScores = [ohsScore, hingeScore, lungeScore].filter(s => s > 0);
    return mvmntScores.length > 0 
      ? Math.round(mvmntScores.reduce((a, b) => a + b, 0) / mvmntScores.length)
      : 0;
  };
  
  const movementPatternScore = calculateMovementPatternScore();

  // Build specific movement assessment findings from actual test data
  // Organize by assessment type to ensure we show at least 2 assessments
  const assessmentFindings: Array<{ assessment: string; strengths: string[]; focusAreas: string[] }> = [];
  
  // Overhead Squat Assessment - use latest data from formData
  // Check all possible OHS fields to detect if assessment was done
  const hasOHS = !!(
    formData.ohsSquatDepth || 
    formData.ohsShoulderMobility || 
    formData.ohsKneeAlignment || 
    formData.ohsTorsoLean || 
    formData.ohsHipShift ||
    formData.ohsFeetPosition ||
    formData.ohsLumbarControl ||
    formData.ohsHeelBehavior
  );
  if (hasOHS) {
    // Normalize values - handle both string and any case variations
    const normalizeValue = (val: string | undefined): string => {
      if (!val) return '';
      return String(val).trim().toLowerCase();
    };
    
    const squatDepth = normalizeValue(formData.ohsSquatDepth);
    const shoulderMobility = normalizeValue(formData.ohsShoulderMobility);
    const kneeAlignment = normalizeValue(formData.ohsKneeAlignment);
    const torsoLean = normalizeValue(formData.ohsTorsoLean);
    const hipShift = normalizeValue(formData.ohsHipShift);
    
    const ohsFindings = { assessment: 'Overhead Squat', strengths: [] as string[], focusAreas: [] as string[] };
    
    // Strengths - using actual form values
    if (squatDepth === 'full-depth' || squatDepth === 'parallel') {
      ohsFindings.strengths.push('Excellent squat depth with full range of motion');
    }
    if (shoulderMobility === 'full-range') {
      ohsFindings.strengths.push('Good shoulder mobility during overhead position');
    }
    if (kneeAlignment === 'stable') {
      ohsFindings.strengths.push('Stable knee alignment throughout squat');
    }
    if (torsoLean === 'upright') {
      ohsFindings.strengths.push('Maintains upright torso position during squat');
    }
    
    // Focus Areas - using actual form values
    if (squatDepth === 'quarter-depth' || squatDepth === 'no-depth') {
      ohsFindings.focusAreas.push('Limited squat depth. Focus on ankle and hip mobility to improve range of motion.');
    }
    if (shoulderMobility === 'compensated' || shoulderMobility === 'limited') {
      ohsFindings.focusAreas.push('Shoulder mobility limitations affecting overhead position. Include thoracic extension and shoulder mobility work.');
    }
    if (kneeAlignment === 'valgus' || kneeAlignment === 'varus') {
      ohsFindings.focusAreas.push('Knee alignment issues during squat. Strengthen glutes and improve hip stability.');
    }
    if (torsoLean === 'moderate-lean' || torsoLean === 'excessive-lean') {
      ohsFindings.focusAreas.push('Excessive forward lean during squat. Improve ankle mobility and core stability.');
    }
    if (hipShift && hipShift !== 'none' && (hipShift === 'left' || hipShift === 'right')) {
      ohsFindings.focusAreas.push('Hip shift detected. Address lateral hip strength imbalances.');
    }
    
    // Always add if assessment was done (even if no specific findings, show that assessment was completed)
    // But prioritize assessments with actual findings
    if (ohsFindings.strengths.length > 0 || ohsFindings.focusAreas.length > 0) {
      assessmentFindings.push(ohsFindings);
    }
  }
  
  // Hinge Assessment - use latest data from formData
  // Check all possible hinge fields
  const hasHinge = !!(
    formData.hingeDepth || 
    formData.hingeBackRounding ||
    formData.hingeQuality ||
    formData.hingeBalance
  );
  if (hasHinge) {
    const normalizeValue = (val: string | undefined): string => {
      if (!val) return '';
      return String(val).trim().toLowerCase();
    };
    
    const hingeDepth = normalizeValue(formData.hingeDepth);
    const backRounding = normalizeValue(formData.hingeBackRounding);
    
    const hingeFindings = { assessment: 'Hinge', strengths: [] as string[], focusAreas: [] as string[] };
    
    // Strengths
    if (hingeDepth === 'full' || hingeDepth === 'good' || hingeDepth === 'excellent') {
      hingeFindings.strengths.push('Good hip hinge depth and range of motion');
    }
    if (backRounding === 'none' || backRounding === 'minor') {
      hingeFindings.strengths.push('Maintains neutral spine during hinge movement');
    }
    
    // Focus Areas
    if (hingeDepth === 'limited' || hingeDepth === 'poor' || hingeDepth === 'fair') {
      hingeFindings.focusAreas.push('Limited hip hinge depth. Improve hamstring flexibility and hip mobility.');
    }
    if (backRounding === 'moderate' || backRounding === 'severe') {
      hingeFindings.focusAreas.push('Back rounding during hinge. Strengthen posterior chain and improve core stability.');
    }
    
    // Always add if assessment was done (even if no specific findings, show that assessment was completed)
    if (hingeFindings.strengths.length > 0 || hingeFindings.focusAreas.length > 0) {
      assessmentFindings.push(hingeFindings);
    }
  }
  
  // Lunge Assessment - use latest data from formData
  const hasLunge = !!(formData.lungeLeftBalance || formData.lungeRightBalance || formData.lungeLeftKneeAlignment || formData.lungeRightKneeAlignment || formData.lungeLeftTorso || formData.lungeRightTorso);
  if (hasLunge) {
    const normalizeValue = (val: string | undefined): string => {
      if (!val) return '';
      return String(val).trim().toLowerCase();
    };
    
    const leftBalance = normalizeValue(formData.lungeLeftBalance);
    const rightBalance = normalizeValue(formData.lungeRightBalance);
    const leftKnee = normalizeValue(formData.lungeLeftKneeAlignment);
    const rightKnee = normalizeValue(formData.lungeRightKneeAlignment);
    const leftTorso = normalizeValue(formData.lungeLeftTorso);
    const rightTorso = normalizeValue(formData.lungeRightTorso);
    
    const lungeFindings = { assessment: 'Lunge', strengths: [] as string[], focusAreas: [] as string[] };
    
    // Strengths - using actual form values
    if (leftBalance === 'excellent' || leftBalance === 'good' || rightBalance === 'excellent' || rightBalance === 'good') {
      if (leftBalance === 'excellent' && rightBalance === 'excellent') {
        lungeFindings.strengths.push('Excellent balance and stability during lunge movement');
      } else {
        lungeFindings.strengths.push('Good balance and stability during lunge movement');
      }
    }
    if ((leftKnee === 'tracks-straight' && rightKnee === 'tracks-straight') || leftKnee === 'tracks-straight' || rightKnee === 'tracks-straight') {
      lungeFindings.strengths.push('Maintains proper knee alignment during lunges');
    }
    // Note: lungeLeftTorso/lungeRightTorso are actually for "Hip shift" not torso
    if (leftTorso === 'neutral' && rightTorso === 'neutral') {
      lungeFindings.strengths.push('Stable hip position during lunge movement');
    }
    
    // Focus Areas - using actual form values
    if (leftBalance === 'fair' || rightBalance === 'fair' || leftBalance === 'poor' || rightBalance === 'poor') {
      lungeFindings.focusAreas.push('Balance challenges during lunge. Improve single-leg stability and proprioception.');
    }
    if (leftKnee === 'caves-inward' || rightKnee === 'caves-inward' || leftKnee === 'bows-outward' || rightKnee === 'bows-outward') {
      lungeFindings.focusAreas.push('Knee alignment issues in lunge. Address hip strength and mobility imbalances.');
    }
    if (leftTorso === 'shifts-left' || rightTorso === 'shifts-left' || leftTorso === 'shifts-right' || rightTorso === 'shifts-right') {
      lungeFindings.focusAreas.push('Hip shift detected during lunge. Address lateral hip strength imbalances and improve stability.');
    }
    
    // Always add if assessment was done (even if no specific findings, show that assessment was completed)
    if (lungeFindings.strengths.length > 0 || lungeFindings.focusAreas.length > 0) {
      assessmentFindings.push(lungeFindings);
    }
  }
  
  // Flatten findings from ALL movement assessments
  // Collect all strengths and focus areas from all 3 assessments (Overhead Squat, Hinge, Lunge)
  const allStrengths: string[] = [];
  const allFocusAreas: string[] = [];
  
  // Collect from ALL assessments - don't limit, show everything
  for (const assessment of assessmentFindings) {
    allStrengths.push(...assessment.strengths);
    allFocusAreas.push(...assessment.focusAreas);
  }
  
  logger.debug('Assessment findings', 'MOVEMENT_QUALITY', {
    assessmentCount: assessmentFindings.length,
    hasOHS,
    hasHinge,
    hasLunge,
    allStrengths: allStrengths.length,
    allFocusAreas: allFocusAreas.length,
  });
  
  // Show all findings, but limit to reasonable number for display (2-3 items each)
  // This ensures we show both positives and negatives from all 3 movement assessments
  const movementStrengths = allStrengths.slice(0, 3);
  const movementWeaknesses = allFocusAreas.slice(0, 3);
  
  const mobilityStrengths: string[] = [];
  const mobilityFocusAreas: string[] = [];
  const resolvedMobility = resolveMobilityForScoring(formData);
  const mobilityPrefix = resolvedMobility.inferred ? 'Inferred from movement: ' : '';

  const appendJointMobility = (quality: string, goodLine: string, fairLine: string, poorLine: string) => {
    if (!quality) return;
    if (quality === 'good') {
      mobilityStrengths.push(goodLine);
    } else if (quality === 'fair') {
      mobilityFocusAreas.push(`${mobilityPrefix}${fairLine}`);
    } else if (quality === 'poor') {
      mobilityFocusAreas.push(`${mobilityPrefix}${poorLine}`);
    }
  };

  appendJointMobility(
    resolvedMobility.hip,
    'Good hip mobility and range of motion',
    'Hip mobility is moderate. Focus on hip flexor stretches and hip mobility drills.',
    'Hip mobility is limited. Include hip flexor stretches, hip mobility drills, and glute activation work.',
  );
  appendJointMobility(
    resolvedMobility.shoulder,
    'Good shoulder mobility and range of motion',
    'Shoulder mobility is moderate. Include shoulder CARs and thoracic extension work.',
    'Shoulder mobility is limited. Add shoulder CARs, thoracic extension work, and posterior capsule stretches.',
  );

  const ankleQuality =
    resolvedMobility.ankleLeft && resolvedMobility.ankleRight
      ? resolvedMobility.ankleLeft === 'poor' || resolvedMobility.ankleRight === 'poor'
        ? 'poor'
        : resolvedMobility.ankleLeft === 'fair' || resolvedMobility.ankleRight === 'fair'
          ? 'fair'
          : 'good'
      : resolvedMobility.ankleLegacy || resolvedMobility.ankleLeft || resolvedMobility.ankleRight;

  appendJointMobility(
    ankleQuality,
    'Good ankle mobility and range of motion',
    'Ankle mobility is moderate. Add calf stretches and ankle mobility exercises.',
    'Ankle mobility is limited. Focus on calf stretches, ankle dorsiflexion drills, and plantar fascia release.',
  );
  
  // Show all findings from all 3 mobility assessments (Hip, Shoulder, Ankle)
  // Limit to reasonable number for display (up to 3 items each) to ensure both positives and negatives are shown
  const finalMobilityStrengths = mobilityStrengths.slice(0, 3);
  const finalMobilityFocusAreas = mobilityFocusAreas.slice(0, 3);

  // Muscle-map implications. We compute movement+mobility and posture
  // separately so 'movement' and 'posture' modes can render distinct maps.
  const postureFindingIds: string[] = [];
  if (formData.postureAiResults && typeof formData.postureAiResults === 'object') {
    for (const v of Object.values(formData.postureAiResults)) {
      const sf = (v as { structuredFindings?: Array<{ id: string; severity: string }> } | null | undefined)
        ?.structuredFindings;
      if (Array.isArray(sf)) {
        for (const f of sf) {
          if (f.severity !== 'aligned') postureFindingIds.push(f.id);
        }
      }
    }
  }
  const postureMuscles = combineMuscleImplications(postureFindingIds);
  const movementMuscles = deriveMovementMuscleSets([...allFocusAreas, ...mobilityFocusAreas]);

  // For 'movement' mode: only movement+mobility implications.
  const movementOnlyTight = movementMuscles.tight;
  const movementOnlyWeak = movementMuscles.weak.filter((m) => !movementOnlyTight.includes(m));

  // For 'both' (legacy): union of all sources.
  const unifiedTight = Array.from(new Set([...postureMuscles.tight, ...movementMuscles.tight]));
  const unifiedWeakRaw = Array.from(new Set([...postureMuscles.weak, ...movementMuscles.weak]));
  const unifiedWeak = unifiedWeakRaw.filter((m) => !unifiedTight.includes(m));

  const showMovementMap = mode === 'both' || mode === 'movement';
  const showPostureGrid = mode === 'both' || mode === 'posture';

  const mapTight = mode === 'movement' ? movementOnlyTight : unifiedTight;
  const mapWeak = mode === 'movement' ? movementOnlyWeak : unifiedWeak;

  return (
    <section className="space-y-6">
      {!hideHeader && (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted text-foreground rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-xs md:text-sm lg:text-base font-semibold text-foreground">
            Posture, Movement & Mobility
          </h3>
        </div>
      )}

      {showMovementMap && (mapTight.length > 0 || mapWeak.length > 0) && (
        <MuscleMap
          tight={mapTight}
          weak={mapWeak}
          title="Muscle groups in focus"
        />
      )}

      {showPostureGrid && hasPostureImages && hasPostureAnalysis && (
        <div>
          {mode === 'posture' && !standalone ? (
            <div className="mb-3 flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReanalyze}
                disabled={isReanalyzing}
                className="text-xs h-8"
              >
                <RefreshCw className={`w-3 h-3 mr-1.5 ${isReanalyzing ? 'animate-spin' : ''}`} />
                {isReanalyzing ? 'Re-analysing...' : 'Re-analyse'}
              </Button>
            </div>
          ) : null}
          {mode === 'both' ? (
            <Card className="p-4 sm:p-5 md:p-6 border-none bg-card ring-1 ring-border">
              <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
                <h4 className="text-xs sm:text-sm font-bold text-foreground">Posture Analysis</h4>
                {!standalone ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReanalyze}
                    disabled={isReanalyzing}
                    className="text-xs h-9 sm:h-8"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 sm:mr-1.5 ${isReanalyzing ? 'animate-spin' : ''}`} />
                    {isReanalyzing ? 'Re-analysing...' : 'Re-analyse'}
                  </Button>
                ) : (
                  <span className="w-4 shrink-0" aria-hidden />
                )}
              </div>
              <PostureClientPostureSection
                postureResults={formData.postureAiResults || {}}
                postureImages={postureImages}
              />
              {!standalone && (
                <PostureTrainerPostureSection
                  postureResults={formData.postureAiResults || {}}
                  postureImages={postureImages}
                />
              )}
            </Card>
          ) : (
            <>
              <PostureClientPostureSection
                postureResults={formData.postureAiResults || {}}
                postureImages={postureImages}
              />
              {!standalone && (
                <div className="mt-4">
                  <PostureTrainerPostureSection
                    postureResults={formData.postureAiResults || {}}
                    postureImages={postureImages}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
