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
import { COLLECTIONS } from '@/constants/collections';
import type { User } from 'firebase/auth';
import type { Analytics, RecentChange } from './types';

type UseAssessmentListParams = {
  user: User | null;
  profile?: { organizationId?: string } | null;
  loading: boolean;
  computeAnalytics: (assessments: CoachAssessmentSummary[], coachUid: string) => Promise<Analytics>;
};

export function useAssessmentList({
  user,
  profile,
  loading,
  computeAnalytics
}: UseAssessmentListParams) {
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
    if (loading || !profile || !user) return;

    const assessmentsRef = collection(getDb(), COLLECTIONS.COACHES, user.uid, COLLECTIONS.ASSESSMENTS);
    let q;
    let useOrgFilter = false;

    if (profile?.organizationId) {
      try {
        q = query(
          assessmentsRef,
          where('organizationId', '==', profile.organizationId),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        useOrgFilter = true;
      } catch (indexError) {
        logger.warn('Firestore index not ready, using fallback query:', indexError);
        q = query(assessmentsRef, orderBy('createdAt', 'desc'), limit(20));
        useOrgFilter = false;
      }
    } else {
      q = query(assessmentsRef, orderBy('createdAt', 'desc'), limit(20));
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        if (isInitialLoadRef.current) {
          setLoadingData(true);
        }
        const data: CoachAssessmentSummary[] = [];
        let lastDocument: QueryDocumentSnapshot<DocumentData> | null = null;

        snapshot.forEach((docSnap) => {
          const docData = docSnap.data();
          if (!useOrgFilter && profile?.organizationId) {
            if (docData.organizationId !== profile.organizationId) {
              return;
            }
          }

          data.push({
            id: docSnap.id,
            clientName: docData.clientName || 'Unnamed client',
            createdAt: docData.createdAt || null,
            overallScore: typeof docData.overallScore === 'number' ? docData.overallScore : 0,
            goals: Array.isArray(docData.goals) ? docData.goals : [],
            scoresSummary: docData.scoresSummary,
          });
          lastDocument = docSnap;
        });

        setItems(data);
        setLastDoc(lastDocument);
        setHasMore(snapshot.size === 20);

        // Load recent changes
        if (user) {
          (async () => {
            try {
              const clients = await getAllClients(user.uid, profile?.organizationId);
              const changes: RecentChange[] = [];

              for (const clientName of clients.slice(0, 10)) {
                try {
                  const history = await getChangeHistory(user.uid, clientName, 5, profile?.organizationId);
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
        const fallbackQuery = query(assessmentsRef, orderBy('createdAt', 'desc'), limit(20));
        const fallbackUnsubscribe = onSnapshot(fallbackQuery, async (snapshot) => {
          try {
            if (isInitialLoadRef.current) {
              setLoadingData(true);
            }
            const data: CoachAssessmentSummary[] = [];
            let lastDocument: QueryDocumentSnapshot<DocumentData> | null = null;

            snapshot.forEach((docSnap) => {
              const docData = docSnap.data();
              if (profile?.organizationId && docData.organizationId !== profile.organizationId) {
                return;
              }

              data.push({
                id: docSnap.id,
                clientName: docData.clientName || 'Unnamed client',
                createdAt: docData.createdAt || null,
                overallScore: typeof docData.overallScore === 'number' ? docData.overallScore : 0,
                goals: Array.isArray(docData.goals) ? docData.goals : [],
                scoresSummary: docData.scoresSummary,
              });
              lastDocument = docSnap;
            });

            setItems(data);
            setLastDoc(lastDocument);
            setHasMore(snapshot.size === 20);

            const analyticsData = await computeAnalytics(data, user.uid);
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
  }, [user, profile, loading, computeAnalytics]);

  const loadMoreAssessments = async () => {
    if (hasMore && lastDoc && user) {
      setLoadingMore(true);
      try {
        const assessmentsRef = collection(getDb(), COLLECTIONS.COACHES, user.uid, COLLECTIONS.ASSESSMENTS);
        let nextQuery;
        if (profile?.organizationId) {
          nextQuery = query(
            assessmentsRef,
            where('organizationId', '==', profile.organizationId),
            orderBy('createdAt', 'desc'),
            startAfter(lastDoc),
            limit(20)
          );
        } else {
          nextQuery = query(
            assessmentsRef,
            orderBy('createdAt', 'desc'),
            startAfter(lastDoc),
            limit(20)
          );
        }

        const nextSnapshot = await getDocs(nextQuery);
        const newData: CoachAssessmentSummary[] = [];
        let newLastDoc: QueryDocumentSnapshot<DocumentData> | null = null;

        nextSnapshot.forEach((docSnap) => {
          const docData = docSnap.data() as Record<string, unknown>;
          newData.push({
            id: docSnap.id,
            clientName: (typeof docData.clientName === 'string' ? docData.clientName : 'Unnamed client'),
            createdAt: (docData.createdAt instanceof Timestamp ? docData.createdAt : null),
            overallScore: (typeof docData.overallScore === 'number' ? docData.overallScore : 0),
            goals: (Array.isArray(docData.goals) ? docData.goals : []) as string[],
            scoresSummary: docData.scoresSummary as CoachAssessmentSummary['scoresSummary'],
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
