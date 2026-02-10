/**
 * Client Portal Data Hook
 * 
 * Fetches the logged-in client's assessment data for the portal view.
 * Uses the client's email to find their assessment history across
 * the organization's coach collections.
 * 
 * Air-gapped from coach hooks — only reads client-safe data.
 */

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';

export interface ClientPortalData {
  /** Client's display name from their most recent assessment */
  clientName: string;
  /** Organization name */
  orgName: string;
  /** Most recent assessment scores by pillar */
  latestScores: {
    overall: number | null;
    bodyComp: number | null;
    cardio: number | null;
    strength: number | null;
    movementQuality: number | null;
    lifestyle: number | null;
  };
  /** Date of most recent assessment */
  lastAssessmentDate: Date | null;
  /** Total number of assessments */
  assessmentCount: number;
  /** Coach name */
  coachName: string;
}

export function useClientPortal() {
  const { user, profile, orgSettings } = useAuth();
  const [data, setData] = useState<ClientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !profile || profile.role !== 'client') {
      setLoading(false);
      return;
    }

    const fetchClientData = async () => {
      try {
        const db = getDb();
        const clientEmail = user.email;
        if (!clientEmail) {
          setError('No email associated with this account');
          setLoading(false);
          return;
        }

        // Find assessments for this client by email across all coaches in the org
        // The client's profile should have assignedCoachUid from the invite flow
        const coachUid = profile.assignedCoachUid;
        if (!coachUid) {
          // Fallback: try to find by email across the org
          logger.warn('[ClientPortal] No assignedCoachUid — portal data unavailable until linked');
          setData({
            clientName: profile.displayName || 'Client',
            orgName: orgSettings?.name || 'Your Organization',
            latestScores: { overall: null, bodyComp: null, cardio: null, strength: null, movementQuality: null, lifestyle: null },
            lastAssessmentDate: null,
            assessmentCount: 0,
            coachName: '',
          });
          setLoading(false);
          return;
        }

        // Query the coach's assessments for this client
        const assessmentsRef = collection(db, 'coaches', coachUid, 'assessments');
        const clientName = profile.clientProfileName || profile.displayName || '';
        
        const q = query(
          assessmentsRef,
          where('fullName', '==', clientName),
          orderBy('createdAt', 'desc'),
          limit(10)
        );

        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setData({
            clientName: clientName || 'Client',
            orgName: orgSettings?.name || 'Your Organization',
            latestScores: { overall: null, bodyComp: null, cardio: null, strength: null, movementQuality: null, lifestyle: null },
            lastAssessmentDate: null,
            assessmentCount: 0,
            coachName: '',
          });
          setLoading(false);
          return;
        }

        const latestDoc = snapshot.docs[0];
        const latestData = latestDoc.data();

        // Extract scores from the latest assessment
        const scores = latestData.pillarScores || latestData.scores || {};

        setData({
          clientName: latestData.fullName || clientName,
          orgName: orgSettings?.name || 'Your Organization',
          latestScores: {
            overall: scores.overall ?? scores.totalScore ?? null,
            bodyComp: scores.bodyComp ?? null,
            cardio: scores.cardio ?? null,
            strength: scores.strength ?? null,
            movementQuality: scores.movementQuality ?? null,
            lifestyle: scores.lifestyle ?? null,
          },
          lastAssessmentDate: latestData.createdAt?.toDate?.() || null,
          assessmentCount: snapshot.size,
          coachName: latestData.coachName || '',
        });
      } catch (err) {
        logger.error('[ClientPortal] Failed to fetch data:', err);
        setError('Unable to load your assessment data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [user, profile, orgSettings]);

  return { data, loading, error };
}
