import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getCoachAssessment } from '@/services/coachAssessments';
import { publishPublicReport } from '@/services/publicReports';
import type { FormData } from '@/contexts/FormContext';
import { computeScores, buildRoadmap, type ScoreSummary, type RoadmapPhase } from '@/lib/scoring';
import { generateCoachPlan, type CoachPlan } from '@/lib/recommendations';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { logger } from '@/lib/utils/logger';
import type { SnapshotInput } from '@/hooks/useVersionSelector';

/**
 * Return type for useAssessmentLogic hook
 * Explicitly typed to prevent 'any' type bleed
 */
export interface AssessmentLogicState {
  formData: FormData | null;
  scores: ScoreSummary | null;
  roadmap: RoadmapPhase[];
  plan: CoachPlan | null;
  previousScores: ScoreSummary | null;
  previousFormData: FormData | null;
  loading: boolean;
  error: string | null;
  planError: boolean;
  allSnapshots: SnapshotInput[];
}

/**
 * @param assessmentId  - Firestore doc ID (slug) or 'latest'. If clientNameOverride is provided,
 *                        'latest' is used automatically for the lookup.
 * @param clientNameOverride - When provided, bypasses the assessmentId Firestore doc lookup and
 *                             fetches directly from current/state via the 'latest' path.
 */
export function useAssessmentLogic(assessmentId: string | undefined, clientNameOverride?: string): AssessmentLogicState {
  const { user, profile } = useAuth();
  
  const [state, setState] = useState<AssessmentLogicState>({
    formData: null,
    scores: null,
    roadmap: [],
    plan: null,
    previousScores: null,
    previousFormData: null,
    loading: true,
    error: null,
    planError: false,
    allSnapshots: []
  });

  const publishedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    // Wait for profile to load so we have the organizationId for Firestore lookups.
    // Without it, every org-scoped query returns null and the user sees a
    // brief "Assessment not found" flash before the profile arrives.
    if (!user || !profile?.organizationId) return;
    if (!clientNameOverride && !assessmentId) return;
    
    let isMounted = true;
    
    (async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        // 1. Fetch Assessment Data
        // clientNameOverride (from outlet context) takes priority over URL query param.
        // When present, we use 'latest' so getCoachAssessment reads current/state directly.
        const params = new URLSearchParams(window.location.search);
        const clientNameQuery = clientNameOverride || params.get('clientName') || undefined;
        const resolvedAssessmentId = clientNameOverride ? 'latest' : assessmentId!;
        
        const data = await getCoachAssessment(user.uid, resolvedAssessmentId, clientNameQuery, profile?.organizationId, profile);
        if (!data) {
          throw new Error("Assessment not found for this coach.");
        }
        
        let fd = data.formData;
        
        // 2. Posture Data Enrichment (Logic from original component)
        const hasPostureImages = fd.postureImages && typeof fd.postureImages === 'object' && Object.keys(fd.postureImages).length > 0;
        const hasPostureStorage = fd.postureImagesStorage && typeof fd.postureImagesStorage === 'object' && Object.keys(fd.postureImagesStorage).length > 0;
        const hasPostureAnalysis = fd.postureAiResults && typeof fd.postureAiResults === 'object' && Object.keys(fd.postureAiResults).length > 0;
        
        if ((!hasPostureImages && !hasPostureStorage) || !hasPostureAnalysis) {
          const clientNameForLookup = clientNameQuery || fd.fullName;
          if (clientNameForLookup) {
            try {
              // Try current assessment
              const { getCurrentAssessment } = await import('@/services/assessmentHistory');
              const current = await getCurrentAssessment(user.uid, clientNameForLookup, profile?.organizationId);
              
              if (current?.formData) {
                // ... (Logic to merge posture data - simplified for hook)
                 const currentPostureImages = current.formData.postureImagesStorage || current.formData.postureImages;
                 const currentPostureAnalysis = current.formData.postureAiResults;
                 
                  if ((!hasPostureImages && !hasPostureStorage) && currentPostureImages && typeof currentPostureImages === 'object') {
                    fd = { ...fd, postureImagesStorage: currentPostureImages };
                  }
                  if (!hasPostureAnalysis && currentPostureAnalysis && typeof currentPostureAnalysis === 'object') {
                    fd = { ...fd, postureAiResults: currentPostureAnalysis };
                  }
              }
              
              // If still missing, try live sessions (same clientId as createLiveSession)
              const orgId = profile?.organizationId;
              if (!fd.postureImagesStorage && !fd.postureAiResults && orgId) {
                 const { getClientPostureImages, LIVE_SESSION_PLACEHOLDER_CLIENT_ID } = await import('@/services/liveSessions');
                 const sessions = await getClientPostureImages(LIVE_SESSION_PLACEHOLDER_CLIENT_ID, orgId);
                 // ... (Simplified logic: grab best match)
                 const sessionsWithPosture = Object.values(sessions).filter(s => 
                   (s.images && Object.keys(s.images).length > 0) || (s.analysis && Object.keys(s.analysis).length > 0)
                 );
                 if (sessionsWithPosture.length > 0) {
                    const latest = sessionsWithPosture[0]; // Simplification
                    if (latest.images) fd = { ...fd, postureImagesStorage: { ...fd.postureImagesStorage, ...latest.images } };
                    if (latest.analysis) fd = { ...fd, postureAiResults: { ...fd.postureAiResults, ...latest.analysis } };
                 }
              }
            } catch (err) {
              logger.warn('[useAssessmentLogic] Failed to enrich posture data:', err);
            }
          }
        }

        // 3. Compute Scores
        const scores = computeScores(fd);
        const roadmap = buildRoadmap(scores, fd);
        
        if (isMounted) {
            setState(prev => ({ 
                ...prev, 
                formData: fd, 
                scores, 
                roadmap
            }));
        }

        // 4. Fetch All Snapshots (for version selector + previous scores)
        try {
             const clientNameForLookup = clientNameQuery || fd.fullName;
             if (clientNameForLookup) {
                const { getSnapshots } = await import('@/services/assessmentHistory');
                const snapshots = await getSnapshots(user.uid, clientNameForLookup, 50, profile?.organizationId);
                
                let mapped: SnapshotInput[] = snapshots.map(s => ({
                  id: s.id ?? '',
                  score: s.overallScore,
                  date: s.timestamp.toDate(),
                  type: s.type,
                  formData: s.formData,
                }));

                if (mapped.length === 0) {
                  mapped = [{
                    id: assessmentId,
                    score: scores.overall,
                    date: new Date(),
                    type: 'full-assessment',
                    formData: fd,
                  }];
                }
                
                if (isMounted) {
                  const prevFormData = snapshots.length > 1 && snapshots[1]?.formData ? snapshots[1].formData : null;
                  const prevScores = prevFormData ? computeScores(prevFormData) : null;
                  setState(prev => ({ ...prev, previousScores: prevScores, previousFormData: prevFormData, allSnapshots: mapped }));
                }
             }
        } catch (e) {
            logger.warn('Failed to fetch snapshots', e);
        }

        // 5. Generate Plan (Async)
        try {
            const plan = await generateCoachPlan(fd, scores);
            if (isMounted) setState(prev => ({ ...prev, plan, loading: false }));
        } catch (planErr) {
            logger.error('Plan generation failed', planErr);
            if (isMounted) setState(prev => ({ ...prev, planError: true, loading: false }));
        }
        
        // 6. Publish Public Report (Background)
        // When using the 'latest' lookup path, assessmentId may be undefined.
        // Fall back to the resolved slug so publishPublicReport always has a stable key.
        const publishId = assessmentId ?? resolvedAssessmentId;
        if (!publishId || publishId === 'latest') {
            // Skip publish — no stable ID to key the public report on
        } else {
            const publishKey = `${user.uid}__${publishId}`;
            if (publishedKeyRef.current !== publishKey) {
                publishedKeyRef.current = publishKey;
                publishPublicReport({
                    coachUid: user.uid,
                    assessmentId: publishId,
                    formData: fd,
                    organizationId: profile?.organizationId,
                    profile,
                }).catch(e => logger.error('Background publish failed', e));
            }
        }

      } catch (err) {
        if (isMounted) {
            setState(prev => ({ 
                ...prev, 
                loading: false, 
                error: err instanceof Error ? err.message : "Failed to load assessment" 
            }));
        }
      }
    })();

    return () => { isMounted = false; };
  }, [user, assessmentId, clientNameOverride, profile]);

  return state;
}
