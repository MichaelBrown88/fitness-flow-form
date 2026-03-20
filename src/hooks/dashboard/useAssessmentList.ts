/**
 * Assessment List Hook
 *
 * Handles fetching, filtering, and pagination of assessments.
 */

import { useEffect, useState, useRef, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils/logger';
import type { CoachAssessmentSummary } from '@/services/coachAssessments';
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
import type { Analytics } from './types';

type UseAssessmentListParams = {
  user: User | null;
  profile?: { organizationId?: string } | null;
  loading: boolean;
  /** Effective org ID (supports impersonation - falls back to profile.organizationId) */
  effectiveOrgId?: string | null;
  /**
   * Filter assessments to a specific coach UID.
   * - string = filter to that coach (default: current user's UID)
   * - null = fetch ALL assessments in the org (admin team view)
   */
  coachUidFilter?: string | null;
};

export function useAssessmentList({
  user,
  profile,
  loading,
  effectiveOrgId,
  coachUidFilter,
}: UseAssessmentListParams) {
  // Use effectiveOrgId for reads (impersonation support), fallback to profile
  const readOrgId = effectiveOrgId || profile?.organizationId;
  // Resolve coach filter: undefined means "use current user"; null means "all coaches"
  const resolvedCoachFilter = coachUidFilter === undefined ? user?.uid ?? null : coachUidFilter;
  const { toast } = useToast();

  const [items, setItems] = useState<CoachAssessmentSummary[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [visibleAssessmentsCount, setVisibleAssessmentsCount] = useState(20);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (loading || !user || !readOrgId) return;

    const assessmentsRef = collection(getDb(), ORGANIZATION.clients.collection(readOrgId));

    // When resolvedCoachFilter is null, fetch ALL org assessments (admin view)
    const q = resolvedCoachFilter
      ? query(
          assessmentsRef,
          where('coachUid', '==', resolvedCoachFilter),
          orderBy('createdAt', 'desc'),
          limit(20)
        )
      : query(
          assessmentsRef,
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
          const score = typeof docData.overallScore === 'number'
            ? docData.overallScore
            : (docData.scores?.overall ?? 0);
          data.push({
            id: docSnap.id,
            clientName: docData.clientName || 'Unnamed client',
            createdAt: docData.createdAt || null,
            updatedAt: docData.updatedAt || null,
            overallScore: score,
            goals: Array.isArray(docData.goals) ? docData.goals : [],
            scoresSummary: docData.scoresSummary ?? docData.scores,
            coachUid: docData.coachUid || null,
            previousScore: docData.previousScore,
            trend: docData.trend,
            assessmentCount: docData.assessmentCount,
          });
          lastDocument = docSnap;
        });

        setItems(data);
        setLastDoc(lastDocument);
        setHasMore(snapshot.size === 20);
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
              if (resolvedCoachFilter && docData.coachUid !== resolvedCoachFilter) {
                return;
              }

              const score = typeof docData.overallScore === 'number'
                ? docData.overallScore
                : (docData.scores?.overall ?? 0);
              data.push({
                id: docSnap.id,
                clientName: docData.clientName || 'Unnamed client',
                createdAt: docData.createdAt || null,
                updatedAt: docData.updatedAt || null,
                overallScore: score,
                goals: Array.isArray(docData.goals) ? docData.goals : [],
                scoresSummary: docData.scoresSummary ?? docData.scores,
                coachUid: docData.coachUid || null,
                previousScore: docData.previousScore,
                trend: docData.trend,
                assessmentCount: docData.assessmentCount,
              });
              lastDocument = docSnap;
            });

            setItems(data.slice(0, 20));
            setLastDoc(lastDocument);
            setHasMore(data.length > 20);
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
  }, [user, readOrgId, loading, resolvedCoachFilter]);

  const loadMoreAssessments = async () => {
    if (hasMore && lastDoc && user && readOrgId) {
      setLoadingMore(true);
      try {
        const assessmentsRef = collection(getDb(), ORGANIZATION.clients.collection(readOrgId));
        const nextQuery = resolvedCoachFilter
          ? query(
              assessmentsRef,
              where('coachUid', '==', resolvedCoachFilter),
              orderBy('createdAt', 'desc'),
              startAfter(lastDoc),
              limit(20)
            )
          : query(
              assessmentsRef,
              orderBy('createdAt', 'desc'),
              startAfter(lastDoc),
              limit(20)
            );

        const nextSnapshot = await getDocs(nextQuery);
        const newData: CoachAssessmentSummary[] = [];
        let newLastDoc: QueryDocumentSnapshot<DocumentData> | null = null;

        nextSnapshot.forEach((docSnap) => {
          const docData = docSnap.data() as Record<string, unknown>;
          const scores = docData.scores as { overall?: number } | undefined;
          const score = typeof docData.overallScore === 'number'
            ? docData.overallScore
            : (scores?.overall ?? 0);
          newData.push({
            id: docSnap.id,
            clientName: (typeof docData.clientName === 'string' ? docData.clientName : 'Unnamed client'),
            createdAt: (docData.createdAt instanceof Timestamp ? docData.createdAt : null),
            updatedAt: (docData.updatedAt instanceof Timestamp ? docData.updatedAt : null),
            overallScore: score,
            goals: (Array.isArray(docData.goals) ? docData.goals : []) as string[],
            scoresSummary: (docData.scoresSummary ?? docData.scores) as CoachAssessmentSummary['scoresSummary'],
            coachUid: (typeof docData.coachUid === 'string' ? docData.coachUid : null),
            previousScore: docData.previousScore as number | undefined,
            trend: docData.trend as number | undefined,
            assessmentCount: docData.assessmentCount as number | undefined,
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

  /** Lightweight analytics derived from already-loaded items — no extra Firestore reads */
  const analytics: Analytics = useMemo(() => {
    const uniqueClients = new Set(items.map(a => a.clientName));
    const totalAssessments = items.reduce(
      (sum, a) => sum + ((a as Record<string, unknown>).assessmentCount as number || 1), 0
    );
    return { totalClients: uniqueClients.size, totalAssessments };
  }, [items]);

  return {
    items,
    loadingData,
    analytics,
    visibleAssessmentsCount,
    hasMore,
    loadingMore,
    loadMoreAssessments,
  };
}
