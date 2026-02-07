/**
 * Assessment List Hook
 *
 * Handles fetching, filtering, and pagination of assessments.
 */

import { useEffect, useState, useRef, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/utils/logger';
import { getAllClients, type CoachAssessmentSummary } from '@/services/coachAssessments';
import { getChangeHistory } from '@/services/assessmentHistory';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  Timestamp,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { UI_TOASTS } from '@/constants/ui';
import { ORGANIZATION } from '@/lib/database/paths';
import type { User } from 'firebase/auth';
import type { Analytics, RecentChange } from './types';

type UseAssessmentListParams = {
  user: User | null;
  profile?: { organizationId?: string } | null;
  loading: boolean;
  computeAnalytics: (assessments: CoachAssessmentSummary[], coachUid: string) => Promise<Analytics>;
  /** Effective org ID (supports impersonation - falls back to profile.organizationId) */
  effectiveOrgId?: string | null;
};

export function useAssessmentList({
  user,
  profile,
  loading,
  computeAnalytics,
  effectiveOrgId,
}: UseAssessmentListParams) {
  // Use effectiveOrgId for reads (impersonation support), fallback to profile
  const readOrgId = effectiveOrgId || profile?.organizationId;
  const { toast } = useToast();

  const [items, setItems] = useState<CoachAssessmentSummary[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [visibleAssessmentsCount, setVisibleAssessmentsCount] = useState(20);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recentChanges, setRecentChanges] = useState<RecentChange[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (loading || !user || !readOrgId) return;

    // Use organization-centric path for assessments (effectiveOrgId for impersonation)
    const assessmentsRef = collection(getDb(), ORGANIZATION.assessments.collection(readOrgId));

    // Filter by coachUid to show only current coach's assessments
    const q = query(
      assessmentsRef,
      where('coachUid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        if (isInitialLoadRef.current) {
          setLoadingData(true);
        }
        const data: CoachAssessmentSummary[] = [];
        let lastDocument: QueryDocumentSnapshot<DocumentData> | null = null;

        snapshot.forEach((docSnap) => {
          const docData = docSnap.data();
          // Handle both legacy (overallScore) and migrated (scores.overall) formats
          const score = typeof docData.overallScore === 'number'
            ? docData.overallScore
            : (docData.scores?.overall ?? 0);
          data.push({
            id: docSnap.id,
            clientName: docData.clientName || 'Unnamed client',
            createdAt: docData.createdAt || null,
            overallScore: score,
            goals: Array.isArray(docData.goals) ? docData.goals : [],
            scoresSummary: docData.scoresSummary ?? docData.scores,
          });
          lastDocument = docSnap;
        });

        setItems(data);
        setLastDoc(lastDocument);
        setHasMore(snapshot.size === 20);

        // Load recent changes
        if (user && readOrgId) {
          (async () => {
            try {
              const clients = await getAllClients(user.uid, readOrgId);
              const changes: RecentChange[] = [];

              for (const clientName of clients.slice(0, 10)) {
                try {
                  const history = await getChangeHistory(user.uid, clientName, 5, readOrgId);
                  history.forEach(change => {
                    changes.push({
                      clientName,
                      category: change.category,
                      date: change.timestamp.toDate(),
                      type: change.type,
                    });
                  });
                } catch (err) {
                  logger.warn('Failed to load history for client:', clientName, err);
                }
              }

              changes.sort((a, b) => b.date.getTime() - a.date.getTime());
              setRecentChanges(changes.slice(0, 10));
            } catch (err) {
              logger.warn('Failed to load recent changes:', err);
            }
          })();
        }

        const analyticsData = await computeAnalytics(data, user.uid);
        setAnalytics(analyticsData);
      } finally {
        isInitialLoadRef.current = false;
        setLoadingData(false);
      }
    }, (error) => {
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        logger.warn('Firestore index not ready, retrying with fallback query:', error);
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
        // Fallback: query without coachUid filter, filter in memory
        const fallbackQuery = query(assessmentsRef, orderBy('createdAt', 'desc'), limit(50));
        const fallbackUnsubscribe = onSnapshot(fallbackQuery, async (snapshot) => {
          try {
            if (isInitialLoadRef.current) {
              setLoadingData(true);
            }
            const data: CoachAssessmentSummary[] = [];
            let lastDocument: QueryDocumentSnapshot<DocumentData> | null = null;

            snapshot.forEach((docSnap) => {
              const docData = docSnap.data();
              // Filter by coachUid in memory
              if (docData.coachUid !== user.uid) {
                return;
              }

              // Handle both legacy (overallScore) and migrated (scores.overall) formats
              const score = typeof docData.overallScore === 'number'
                ? docData.overallScore
                : (docData.scores?.overall ?? 0);
              data.push({
                id: docSnap.id,
                clientName: docData.clientName || 'Unnamed client',
                createdAt: docData.createdAt || null,
                overallScore: score,
                goals: Array.isArray(docData.goals) ? docData.goals : [],
                scoresSummary: docData.scoresSummary ?? docData.scores,
              });
              lastDocument = docSnap;
            });

            setItems(data.slice(0, 20));
            setLastDoc(lastDocument);
            setHasMore(data.length > 20);

            const analyticsData = await computeAnalytics(data.slice(0, 20), user.uid);
            setAnalytics(analyticsData);
          } finally {
            isInitialLoadRef.current = false;
            setLoadingData(false);
          }
        });
        unsubscribeRef.current = fallbackUnsubscribe;
        setLoadingData(false);
      } else {
        logger.error('onSnapshot error:', error);
        setLoadingData(false);
      }
    });

    unsubscribeRef.current = unsubscribe;
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user, readOrgId, loading, computeAnalytics]);

  const loadMoreAssessments = async () => {
    if (hasMore && lastDoc && user && readOrgId) {
      setLoadingMore(true);
      try {
        // Use organization-centric path (effectiveOrgId for impersonation)
        const assessmentsRef = collection(getDb(), ORGANIZATION.assessments.collection(readOrgId));
        const nextQuery = query(
          assessmentsRef,
          where('coachUid', '==', user.uid),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(20)
        );

        const nextSnapshot = await getDocs(nextQuery);
        const newData: CoachAssessmentSummary[] = [];
        let newLastDoc: QueryDocumentSnapshot<DocumentData> | null = null;

        nextSnapshot.forEach((docSnap) => {
          const docData = docSnap.data() as Record<string, unknown>;
          // Handle both legacy (overallScore) and migrated (scores.overall) formats
          const scores = docData.scores as { overall?: number } | undefined;
          const score = typeof docData.overallScore === 'number'
            ? docData.overallScore
            : (scores?.overall ?? 0);
          newData.push({
            id: docSnap.id,
            clientName: (typeof docData.clientName === 'string' ? docData.clientName : 'Unnamed client'),
            createdAt: (docData.createdAt instanceof Timestamp ? docData.createdAt : null),
            overallScore: score,
            goals: (Array.isArray(docData.goals) ? docData.goals : []) as string[],
            scoresSummary: (docData.scoresSummary ?? docData.scores) as CoachAssessmentSummary['scoresSummary'],
          });
          newLastDoc = docSnap;
        });

        setItems(prev => [...prev, ...newData]);
        setLastDoc(newLastDoc);
        setHasMore(nextSnapshot.size === 20);
        setVisibleAssessmentsCount(prev => prev + newData.length);
      } catch (err) {
        logger.error('Failed to load more assessments:', err);
        toast({
          title: UI_TOASTS.ERROR.GENERIC,
          description: UI_TOASTS.ERROR.FAILED_TO_LOAD_MORE,
          variant: 'destructive',
        });
      } finally {
        setLoadingMore(false);
      }
    } else {
      setVisibleAssessmentsCount(prev => prev + 20);
    }
  };

  const filtered = useMemo(() => {
    return items;
  }, [items]);

  return {
    items,
    loadingData,
    analytics,
    visibleAssessmentsCount,
    hasMore,
    loadingMore,
    recentChanges,
    filtered,
    loadMoreAssessments,
  };
}
