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
import { PostureAnalysisViewer } from './PostureAnalysisViewer';
import { Activity, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';
import { CardInfoDrawer } from './CardInfoDrawer';

interface MovementPostureMobilityProps {
  formData?: FormData;
  scores: ScoreSummary;
  standalone?: boolean;
  hideHeader?: boolean;
  previousFormData?: FormData;
}

export function MovementPostureMobility({ formData, scores, standalone = false, hideHeader, previousFormData }: MovementPostureMobilityProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
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
        description: 'Cannot re-analyze without client name',
        variant: 'destructive',
      });
      return;
    }
    
    setIsReanalyzing(true);
    try {
      const { reanalyzeClientPosture } = await import('@/lib/utils/reanalyzePosture');
      const result = await reanalyzeClientPosture(formData.fullName, profile?.organizationId);
      
      if (result.success > 0) {
        toast({
          title: 'Re-analysis complete',
          description: `Successfully re-analyzed ${result.success} view(s). Refreshing page...`,
        });
        
        // Auto-refresh after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error('No views were successfully re-analyzed');
      }
    } catch (error) {
      logger.error('Re-analysis failed', 'MOVEMENT_POSTURE', error);
      toast({
        title: 'Re-analysis failed',
        description: error instanceof Error ? error.message : 'Could not re-analyze posture images',
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
  
  // Mobility findings - separate from movement assessments
  // Mobility is about joint range of motion, not movement patterns
  const mobilityStrengths: string[] = [];
  const mobilityFocusAreas: string[] = [];
  
  // Check mobility fields (Hip, Shoulder, Ankle)
  const hipMobility = formData.mobilityHip?.toLowerCase() || '';
  const shoulderMobility = formData.mobilityShoulder?.toLowerCase() || '';
  const ankleMobility = formData.mobilityAnkle?.toLowerCase() || '';
  
  // Hip Mobility
  if (hipMobility) {
    if (hipMobility === 'good' || hipMobility === 'excellent') {
      mobilityStrengths.push('Good hip mobility and range of motion');
    } else if (hipMobility === 'fair') {
      mobilityFocusAreas.push('Hip mobility is moderate. Focus on hip flexor stretches and hip mobility drills.');
    } else if (hipMobility === 'poor' || hipMobility === 'limited') {
      mobilityFocusAreas.push('Hip mobility is limited. Include hip flexor stretches, hip mobility drills, and glute activation work.');
    }
  }
  
  // Shoulder Mobility
  if (shoulderMobility) {
    if (shoulderMobility === 'good' || shoulderMobility === 'excellent') {
      mobilityStrengths.push('Good shoulder mobility and range of motion');
    } else if (shoulderMobility === 'fair') {
      mobilityFocusAreas.push('Shoulder mobility is moderate. Include shoulder CARs and thoracic extension work.');
    } else if (shoulderMobility === 'poor' || shoulderMobility === 'limited') {
      mobilityFocusAreas.push('Shoulder mobility is limited. Add shoulder CARs, thoracic extension work, and posterior capsule stretches.');
    }
  }
  
  // Ankle Mobility
  if (ankleMobility) {
    if (ankleMobility === 'good' || ankleMobility === 'excellent') {
      mobilityStrengths.push('Good ankle mobility and range of motion');
    } else if (ankleMobility === 'fair') {
      mobilityFocusAreas.push('Ankle mobility is moderate. Add calf stretches and ankle mobility exercises.');
    } else if (ankleMobility === 'poor' || ankleMobility === 'limited') {
      mobilityFocusAreas.push('Ankle mobility is limited. Focus on calf stretches, ankle dorsiflexion drills, and plantar fascia release.');
    }
  }
  
  // Show all findings from all 3 mobility assessments (Hip, Shoulder, Ankle)
  // Limit to reasonable number for display (up to 3 items each) to ensure both positives and negatives are shown
  const finalMobilityStrengths = mobilityStrengths.slice(0, 3);
  const finalMobilityFocusAreas = mobilityFocusAreas.slice(0, 3);
  
  return (
    <section className="space-y-6">
      {!hideHeader && (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-light text-zinc-900 rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-xs md:text-sm lg:text-base font-semibold text-zinc-900">
            Posture, Movement & Mobility
          </h3>
        </div>
      )}
      
      {/* Posture Analysis - Full Width */}
            {hasPostureImages && hasPostureAnalysis && (
              <Card className="p-4 sm:p-5 md:p-6 border-none bg-white ring-1 ring-zinc-100">
                <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
                  <h4 className="text-xs sm:text-sm font-bold text-zinc-900">Posture Analysis</h4>
                  {/* Only show interactive buttons if not in standalone/public mode */}
                  {!standalone && (
                    <div className="flex items-center gap-2">
                      <Badge className="glass-button-active text-white text-xs">
                        {Object.keys(formData.postureAiResults || {}).length} Views
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReanalyze}
                        disabled={isReanalyzing}
                        className="text-xs h-9 sm:h-8"
                      >
                        <RefreshCw className={`w-3 h-3 mr-1 sm:mr-1.5 ${isReanalyzing ? 'animate-spin' : ''}`} />
                        {isReanalyzing ? 'Re-analyzing...' : 'Re-analyze'}
                      </Button>
                    </div>
                  )}
                  {/* Show view count badge in standalone mode */}
                  {standalone && (
                    <Badge className="glass-button-active text-white text-xs">
                      {Object.keys(formData.postureAiResults || {}).length} Views
                    </Badge>
                  )}
                </div>
                <PostureAnalysisViewer 
                  postureResults={formData.postureAiResults || {}}
                  postureImages={postureImages}
                  previousPostureResults={previousFormData?.postureAiResults}
                />
              </Card>
            )}
      
      {/* Movement & Mobility -- merged card on mobile, 2 columns on desktop */}

      {/* Mobile: single merged card */}
      <Card className="md:hidden p-4 border-none bg-white ring-1 ring-zinc-100 relative">
        <CardInfoDrawer title="Movement & Mobility">
          <p><strong>Movement quality</strong> is assessed via Overhead Squat, Hinge, and Lunge tests. These measure how well your body moves through fundamental patterns.</p>
          <p><strong>Joint mobility</strong> is assessed at the hip, shoulder, and ankle. Good mobility means your joints move freely through their full range without compensation.</p>
        </CardInfoDrawer>
        {/* Movement Quality */}
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gradient-dark" />
            Movement Quality
            {movementDelta && (
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${movementDelta.direction === 'up' ? 'text-score-green-fg' : 'text-score-red-fg'}`}>
                {movementDelta.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {movementDelta.direction === 'up' ? '+' : '-'}{movementDelta.value}
              </span>
            )}
          </h4>
          <Badge className="glass-button-active text-white text-[10px]">
            {movementWeaknesses.length === 0 ? 'Good' : 'Needs Work'}
          </Badge>
        </div>
        <div className="space-y-3">
          {movementStrengths.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-gradient-dark uppercase tracking-[0.15em] mb-1.5">Strengths</p>
              <ul className="space-y-1.5">
                {movementStrengths.map((s, i) => (
                  <li key={i} className="text-xs sm:text-sm text-zinc-600 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-gradient-dark mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {movementWeaknesses.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-score-amber-fg uppercase tracking-[0.15em] mb-1.5">Focus Areas</p>
              <ul className="space-y-1.5">
                {movementWeaknesses.map((w, i) => (
                  <li key={i} className="text-xs sm:text-sm text-zinc-600 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-score-amber mt-0.5 shrink-0" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {movementStrengths.length === 0 && movementWeaknesses.length === 0 && (
            <p className="text-xs text-zinc-500 italic">Complete movement assessments to see feedback.</p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-100 my-4" />

        {/* Mobility */}
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gradient-dark" />
            Mobility
          </h4>
          <Badge className="glass-button-active text-white text-[10px]">
            {finalMobilityFocusAreas.length === 0 ? 'Good' : 'Needs Work'}
          </Badge>
        </div>
        <div className="space-y-3">
          {finalMobilityStrengths.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-gradient-dark uppercase tracking-[0.15em] mb-1.5">Strengths</p>
              <ul className="space-y-1.5">
                {finalMobilityStrengths.map((s, i) => (
                  <li key={i} className="text-xs sm:text-sm text-zinc-600 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-gradient-dark mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {finalMobilityFocusAreas.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-score-amber-fg uppercase tracking-[0.15em] mb-1.5">Focus Areas</p>
              <ul className="space-y-1.5">
                {finalMobilityFocusAreas.map((f, i) => (
                  <li key={i} className="text-xs sm:text-sm text-zinc-600 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-score-amber mt-0.5 shrink-0" />
                    <span className="leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {finalMobilityStrengths.length === 0 && finalMobilityFocusAreas.length === 0 && (
            <p className="text-xs text-zinc-500 italic">Complete mobility assessments to see feedback.</p>
          )}
        </div>
      </Card>

      {/* Desktop: two separate cards */}
      <div className="hidden md:grid md:grid-cols-2 gap-5 md:gap-6">
        <Card className="p-5 md:p-6 border-none bg-white ring-1 ring-zinc-100 relative">
          <CardInfoDrawer title="Movement Quality">
            <p>Movement quality is assessed via Overhead Squat, Hinge, and Lunge tests. These measure how well your body moves through fundamental patterns that are essential for safe and effective training.</p>
          </CardInfoDrawer>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gradient-dark" />
              Movement Quality
              {movementDelta && (
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${movementDelta.direction === 'up' ? 'text-score-green-fg' : 'text-score-red-fg'}`}>
                  {movementDelta.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {movementDelta.direction === 'up' ? '+' : '-'}{movementDelta.value}
                </span>
              )}
            </h4>
            <Badge className="glass-button-active text-white mr-5">
              {movementWeaknesses.length === 0 ? 'Good' : 'Needs Work'}
            </Badge>
          </div>
          <div className="space-y-4">
            {movementStrengths.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-gradient-dark uppercase tracking-[0.15em] mb-2">Strengths</p>
                <ul className="space-y-2">
                  {movementStrengths.map((s, i) => (
                    <li key={i} className="text-sm text-zinc-600 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-gradient-dark mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {movementWeaknesses.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-score-amber-fg uppercase tracking-[0.15em] mb-2">Focus Areas</p>
                <ul className="space-y-2">
                  {movementWeaknesses.map((w, i) => (
                    <li key={i} className="text-sm text-zinc-600 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-score-amber mt-0.5 shrink-0" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {movementStrengths.length === 0 && movementWeaknesses.length === 0 && (
              <div className="text-sm text-zinc-500 italic">
                Complete movement pattern assessments (Overhead Squat, Hinge, Lunge) to see detailed feedback.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 md:p-6 border-none bg-white ring-1 ring-zinc-100 relative">
          <CardInfoDrawer title="Mobility">
            <p>Joint mobility is assessed at the hip, shoulder, and ankle. Good mobility means your joints can move freely through their full range of motion without compensation or pain.</p>
            <p>Limited mobility increases injury risk and reduces the effectiveness of your training.</p>
          </CardInfoDrawer>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-gradient-dark" />
              Mobility
            </h4>
            <Badge className="glass-button-active text-white mr-5">
              {finalMobilityFocusAreas.length === 0 ? 'Good' : 'Needs Work'}
            </Badge>
          </div>
          <div className="space-y-4">
            {finalMobilityStrengths.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-gradient-dark uppercase tracking-[0.15em] mb-2">Strengths</p>
                <ul className="space-y-2">
                  {finalMobilityStrengths.map((s, i) => (
                    <li key={i} className="text-sm text-zinc-600 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-gradient-dark mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {finalMobilityFocusAreas.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-score-amber-fg uppercase tracking-[0.15em] mb-2">Focus Areas</p>
                <ul className="space-y-2">
                  {finalMobilityFocusAreas.map((f, i) => (
                    <li key={i} className="text-sm text-zinc-600 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-score-amber mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {finalMobilityStrengths.length === 0 && finalMobilityFocusAreas.length === 0 && (
              <div className="text-sm text-zinc-500 italic">
                Complete mobility assessments (Hip, Shoulder, Ankle) to see detailed feedback.
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
