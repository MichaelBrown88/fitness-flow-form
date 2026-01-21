import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getCoachAssessment } from '@/services/coachAssessments';
import { publishPublicReport } from '@/services/publicReports';
import type { FormData } from '@/contexts/FormContext';
import { computeScores, buildRoadmap, type ScoreSummary, type RoadmapPhase } from '@/lib/scoring';
import { generateCoachPlan } from '@/lib/recommendations';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { logger } from '@/lib/utils/logger';

export function useAssessmentLogic(assessmentId: string | undefined) {
  const { user, profile } = useAuth();
  
  const [state, setState] = useState({
    formData: null as FormData | null,
    scores: null as ScoreSummary | null,
    roadmap: [] as RoadmapPhase[],
    plan: null as import('@/lib/recommendations').CoachPlan | null,
    previousScores: null as ScoreSummary | null,
    loading: true,
    error: null as string | null,
    planError: false
  });

  const publishedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !assessmentId) return;
    
    let isMounted = true;
    
    (async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        // 1. Fetch Assessment Data
        // Get clientName from query params if available (for efficient lookup)
        const params = new URLSearchParams(window.location.search);
        const clientNameQuery = params.get('clientName');
        
        const data = await getCoachAssessment(user.uid, assessmentId, clientNameQuery || undefined);
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
              
              // If still missing, try live sessions
              if (!fd.postureImagesStorage && !fd.postureAiResults) {
                 const { getClientPostureImages } = await import('@/services/liveSessions');
                 const sessions = await getClientPostureImages(clientNameForLookup, profile?.organizationId);
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

        // 4. Fetch Previous Scores (Async, non-blocking)
        try {
             const clientNameForLookup = clientNameQuery || fd.fullName;
             if (clientNameForLookup) {
                const { getSnapshots } = await import('@/services/assessmentHistory');
                const snapshots = await getSnapshots(user.uid, clientNameForLookup, 2, profile?.organizationId);
                if (snapshots.length > 1 && snapshots[1]?.formData) {
                    const prevScores = computeScores(snapshots[1].formData);
                    if (isMounted) setState(prev => ({ ...prev, previousScores: prevScores }));
                }
             }
        } catch (e) {
            logger.warn('Failed to fetch previous scores', e);
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
        const publishKey = `${user.uid}__${assessmentId}`;
        if (publishedKeyRef.current !== publishKey) {
            publishedKeyRef.current = publishKey;
            publishPublicReport({
                coachUid: user.uid,
                assessmentId,
                formData: fd,
                organizationId: profile?.organizationId,
                profile,
            }).catch(e => logger.error('Background publish failed', e));
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
  }, [user, assessmentId, profile?.organizationId]);

  return state;
}
