/**
 * Assessment List Hook
 *
 * Handles fetching, filtering, and pagination of assessments.
 */

import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
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
import {
  mapOrgClientDocToSummary,
  mergeClientSummaries,
} from '@/hooks/dashboard/mapOrgClientDocToSummary';

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
  const mainListRef = useRef<CoachAssessmentSummary[]>([]);
  const intakeAwaitingRef = useRef<CoachAssessmentSummary[]>([]);
  const intakePendingRef = useRef<CoachAssessmentSummary[]>([]);

  const publishMergedItems = useCallback(() => {
    const intakeRows = mergeClientSummaries(intakeAwaitingRef.current, intakePendingRef.current);
    setItems(mergeClientSummaries(mainListRef.current, intakeRows));
  }, []);

  useEffect(() => {
    if (loading || !user || !readOrgId) return;

    const orgClientsColRef = collection(getDb(), ORGANIZATION.clients.collection(readOrgId));
    const unsubs: Array<() => void> = [];
    let cancelled = false;

    const applyMainSnapshot = (snapshot: { forEach: (fn: (d: QueryDocumentSnapshot<DocumentData>) => void) => void; size: number }, lastDocument: QueryDocumentSnapshot<DocumentData> | null) => {
      if (cancelled) return;
      const data: CoachAssessmentSummary[] = [];
      snapshot.forEach((docSnap) => {
        data.push(mapOrgClientDocToSummary(docSnap));
      });
      mainListRef.current = data;
      setLastDoc(lastDocument);
      setHasMore(snapshot.size === 20);
      publishMergedItems();
      isInitialLoadRef.current = false;
      setLoadingData(false);
    };

    const attachIntakeListeners = () => {
      const awaitingQ = resolvedCoachFilter
        ? query(
            orgClientsColRef,
            where('coachUid', '==', resolvedCoachFilter),
            where('remoteIntakeAwaitingStudio', '==', true),
            limit(30),
          )
        : query(orgClientsColRef, where('remoteIntakeAwaitingStudio', '==', true), limit(30));

      const pendingQ = resolvedCoachFilter
        ? query(
            orgClientsColRef,
            where('coachUid', '==', resolvedCoachFilter),
            where('remoteIntakePending', '==', true),
            limit(30),
          )
        : query(orgClientsColRef, where('remoteIntakePending', '==', true), limit(30));

      unsubs.push(
        onSnapshot(
          awaitingQ,
          (snap) => {
            if (cancelled) return;
            const rows: CoachAssessmentSummary[] = [];
            snap.forEach((docSnap) => rows.push(mapOrgClientDocToSummary(docSnap)));
            intakeAwaitingRef.current = rows;
            publishMergedItems();
          },
          (err) => logger.warn('[useAssessmentList] intake awaiting listener failed', err),
        ),
      );
      unsubs.push(
        onSnapshot(
          pendingQ,
          (snap) => {
            if (cancelled) return;
            const rows: CoachAssessmentSummary[] = [];
            snap.forEach((docSnap) => rows.push(mapOrgClientDocToSummary(docSnap)));
            intakePendingRef.current = rows;
            publishMergedItems();
          },
          (err) => logger.warn('[useAssessmentList] intake pending listener failed', err),
        ),
      );
    };

    const mainQ = resolvedCoachFilter
      ? query(
          orgClientsColRef,
          where('coachUid', '==', resolvedCoachFilter),
          orderBy('createdAt', 'desc'),
          limit(20),
        )
      : query(orgClientsColRef, orderBy('createdAt', 'desc'), limit(20));

    if (isInitialLoadRef.current) {
      setLoadingData(true);
    }
    mainListRef.current = [];
    intakeAwaitingRef.current = [];
    intakePendingRef.current = [];

    unsubs.push(
      onSnapshot(
        mainQ,
        (snapshot) => {
          let lastDocument: QueryDocumentSnapshot<DocumentData> | null = null;
          snapshot.forEach((docSnap) => {
            lastDocument = docSnap;
          });
          applyMainSnapshot(snapshot, lastDocument);
        },
        (error) => {
          if (error.code === 'failed-precondition' && error.message.includes('index')) {
            logger.warn('Firestore index not ready, retrying with fallback query:', error);
            const fallbackLimit = resolvedCoachFilter ? 50 : 20;
            const fallbackQuery = query(orgClientsColRef, orderBy('createdAt', 'desc'), limit(fallbackLimit));
            unsubs.push(
              onSnapshot(fallbackQuery, (snapshot) => {
                if (cancelled) return;
                const data: CoachAssessmentSummary[] = [];
                let lastDocument: QueryDocumentSnapshot<DocumentData> | null = null;
                snapshot.forEach((docSnap) => {
                  const docData = docSnap.data();
                  if (resolvedCoachFilter && docData.coachUid !== resolvedCoachFilter) {
                    return;
                  }
                  data.push(mapOrgClientDocToSummary(docSnap));
                  lastDocument = docSnap;
                });
                mainListRef.current = data.slice(0, 20);
                setLastDoc(lastDocument);
                setHasMore(data.length > 20);
                publishMergedItems();
                isInitialLoadRef.current = false;
                setLoadingData(false);
              }),
            );
          } else {
            logger.error('onSnapshot error:', error);
            setLoadingData(false);
          }
        },
      ),
    );

    attachIntakeListeners();

    unsubscribeRef.current = () => {
      cancelled = true;
      for (const unsub of unsubs) unsub();
    };

    return () => {
      cancelled = true;
      for (const unsub of unsubs) unsub();
      unsubscribeRef.current = null;
    };
  }, [user, readOrgId, loading, resolvedCoachFilter, publishMergedItems]);

  const loadMoreAssessments = async () => {
    if (hasMore && lastDoc && user && readOrgId) {
      setLoadingMore(true);
      try {
        const orgClientsColRef = collection(getDb(), ORGANIZATION.clients.collection(readOrgId));
        const nextQuery = resolvedCoachFilter
          ? query(
              orgClientsColRef,
              where('coachUid', '==', resolvedCoachFilter),
              orderBy('createdAt', 'desc'),
              startAfter(lastDoc),
              limit(20)
            )
          : query(
              orgClientsColRef,
              orderBy('createdAt', 'desc'),
              startAfter(lastDoc),
              limit(20)
            );

        const nextSnapshot = await getDocs(nextQuery);
        const newData: CoachAssessmentSummary[] = [];
        let newLastDoc: QueryDocumentSnapshot<DocumentData> | null = null;

        nextSnapshot.forEach((docSnap) => {
          newData.push(mapOrgClientDocToSummary(docSnap));
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
