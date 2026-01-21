import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/utils/logger';
import { 
  listCoachAssessments, 
  deleteCoachAssessment,
  getClientAssessments, 
  getAllClients,
  getCoachAssessment,
  type CoachAssessmentSummary 
} from '@/services/coachAssessments';
import { getChangeHistory } from '@/services/assessmentHistory';
import { computeScores } from '@/lib/scoring';
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp, startAfter, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { STORAGE_KEYS } from '@/constants/storageKeys';

export type Analytics = {
  totalClients: number;
  totalAssessments: number;
  averageScore: number;
  mostCommonIssues: { issue: string; count: number }[];
  highestCategory: { name: string; avgScore: number } | null;
  lowestCategory: { name: string; avgScore: number } | null;
  assessmentsThisMonth: number;
  clientsThisMonth: number;
};

export type ClientGroup = {
  name: string;
  assessments: CoachAssessmentSummary[];
  latestScore: number;
  latestDate: Date | null;
  scoreChange?: number;
};

export function useDashboardData() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [items, setItems] = useState<CoachAssessmentSummary[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'assessments' | 'clients'>('assessments');
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(null);
  const [clientHistoryDialog, setClientHistoryDialog] = useState<string | null>(null);
  const [clientHistory, setClientHistory] = useState<CoachAssessmentSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [visibleAssessmentsCount, setVisibleAssessmentsCount] = useState(20);
  const [visibleClientsCount, setVisibleClientsCount] = useState(12);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [recentChanges, setRecentChanges] = useState<Array<{
    clientName: string;
    category: string;
    date: Date;
    type: string;
  }>>([]);

  const computeAnalytics = useCallback(async (assessments: CoachAssessmentSummary[], coachUid: string): Promise<Analytics> => {
    if (assessments.length === 0) {
      return {
        totalClients: 0,
        totalAssessments: 0,
        averageScore: 0,
        mostCommonIssues: [],
        highestCategory: null,
        lowestCategory: null,
        assessmentsThisMonth: 0,
        clientsThisMonth: 0,
      };
    }

    const uniqueClients = new Set(assessments.map(a => a.clientName));
    const avgScore = Math.round(
      assessments.reduce((sum, a) => sum + (a.overallScore || 0), 0) / assessments.length
    );

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const assessmentsThisMonth = assessments.filter(a => 
      a.createdAt && a.createdAt.toDate() >= thisMonth
    ).length;
    
    const clientsThisMonth = new Set(
      assessments
        .filter(a => a.createdAt && a.createdAt.toDate() >= thisMonth)
        .map(a => a.clientName)
    ).size;

    const issueCounts: Record<string, number> = {};
    const categoryScores: Record<string, number[]> = {
      bodyComp: [],
      cardio: [],
      strength: [],
      movementQuality: [],
      lifestyle: [],
    };

    const sampleSize = Math.min(20, assessments.length);
    const samples = assessments.slice(0, sampleSize);
    
    for (const assessment of samples) {
      try {
        if (assessment.scoresSummary) {
          assessment.scoresSummary.categories.forEach(cat => {
            if (categoryScores[cat.id]) {
              categoryScores[cat.id].push(cat.score);
            }
            cat.weaknesses.forEach(weakness => {
              issueCounts[weakness] = (issueCounts[weakness] || 0) + 1;
            });
          });
          continue;
        }

        const full = await getCoachAssessment(coachUid, assessment.id);
        if (full?.formData) {
          const scores = computeScores(full.formData);
          scores.categories.forEach(cat => {
            if (categoryScores[cat.id]) {
              categoryScores[cat.id].push(cat.score);
            }
            cat.weaknesses.forEach(weakness => {
              issueCounts[weakness] = (issueCounts[weakness] || 0) + 1;
            });
          });
        }
      } catch (err) {
        logger.warn(`Failed to load assessment ${assessment.id} for analytics:`, err);
      }
    }

    const mostCommonIssues = Object.entries(issueCounts)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const categoryAverages = Object.entries(categoryScores)
      .map(([id, scores]) => ({
        id,
        name: id === 'bodyComp' ? 'Body Composition' :
              id === 'cardio' ? 'Cardiovascular' :
              id === 'strength' ? 'Strength' :
              id === 'movementQuality' ? 'Movement Quality' :
              'Lifestyle',
        avgScore: scores.length > 0 
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0
      }))
      .filter(c => c.avgScore > 0);

    const sortedCategories = [...categoryAverages].sort((a, b) => b.avgScore - a.avgScore);
    const highestCategory = sortedCategories[0] || null;
    const lowestCategory = sortedCategories[sortedCategories.length - 1] || null;

    return {
      totalClients: uniqueClients.size,
      totalAssessments: assessments.length,
      averageScore: avgScore,
      mostCommonIssues,
      highestCategory: highestCategory ? { name: highestCategory.name, avgScore: highestCategory.avgScore } : null,
      lowestCategory: lowestCategory ? { name: lowestCategory.name, avgScore: lowestCategory.avgScore } : null,
      assessmentsThisMonth,
      clientsThisMonth,
    };
  }, []);

  useEffect(() => {
    // Only redirect if explicitly not complete and NOT currently saving (to avoid flash during onboarding save)
    if (!loading && user && profile && profile.onboardingCompleted === false) {
      if (window.location.pathname === '/dashboard') {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [loading, user, profile, navigate]);

  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (loading || !profile || !user) return;

    const assessmentsRef = collection(getDb(), 'coaches', user.uid, 'assessments');
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
        
        if (user) {
          (async () => {
            try {
              const clients = await getAllClients(user.uid, profile?.organizationId);
              const changes: Array<{
                clientName: string;
                category: string;
                date: Date;
                type: string;
              }> = [];
              
              for (const clientName of clients.slice(0, 10)) {
                try {
                  const history = await getChangeHistory(user.uid, clientName, 5);
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
          unsubscribeRef.current(); // Unsubscribe from the initial query
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
            
            // Repeat recent changes logic...
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

  const clientGroups = useMemo(() => {
    const groups = new Map<string, CoachAssessmentSummary[]>();
    items.forEach(item => {
      const existing = groups.get(item.clientName) || [];
      groups.set(item.clientName, [...existing, item]);
    });
    
    const result: ClientGroup[] = Array.from(groups.entries()).map(([name, assessments]) => {
      const sorted = assessments.sort((a, b) => {
        const dateA = a.createdAt?.toDate().getTime() || 0;
        const dateB = b.createdAt?.toDate().getTime() || 0;
        return dateB - dateA;
      });
      const latest = sorted[0];
      const previous = sorted[1];
      
      return {
        name,
        assessments: sorted,
        latestScore: latest.overallScore || 0,
        latestDate: latest.createdAt?.toDate() || null,
        scoreChange: previous ? (latest.overallScore || 0) - (previous.overallScore || 0) : undefined,
      };
    });
    
    return result.sort((a, b) => {
      const dateA = a.latestDate?.getTime() || 0;
      const dateB = b.latestDate?.getTime() || 0;
      return dateB - dateA;
    });
  }, [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => item.clientName.toLowerCase().includes(term));
  }, [items, search]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clientGroups;
    return clientGroups.filter((group) => group.name.toLowerCase().includes(term));
  }, [clientGroups, search]);

  const handleDelete = async () => {
    if (!user || !deleteDialog) return;
    try {
      await deleteCoachAssessment(user.uid, deleteDialog.id, profile?.organizationId, profile);
      toast({
        title: "Assessment deleted",
        description: `Assessment for ${deleteDialog.name} has been removed.`,
      });
      setDeleteDialog(null);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete assessment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewHistory = async (clientName: string) => {
    if (!user) return;
    setClientHistoryDialog(clientName);
    setLoadingHistory(true);
    try {
      const history = await getClientAssessments(user.uid, clientName, profile?.organizationId);
      setClientHistory(history);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load client history.",
        variant: "destructive",
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleNewAssessmentForClient = async (clientName: string, category?: string) => {
    if (!user) return;
    if (category) {
      sessionStorage.setItem(STORAGE_KEYS.PARTIAL_ASSESSMENT, JSON.stringify({ category, clientName }));
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
    }
    sessionStorage.removeItem(STORAGE_KEYS.IS_DEMO);
    sessionStorage.removeItem(STORAGE_KEYS.PREFILL_CLIENT);
    try {
      const history = await getClientAssessments(user.uid, clientName, profile?.organizationId);
      if (history.length > 0) {
        const latest = await getCoachAssessment(user.uid, history[0].id);
        if (latest?.formData) {
          sessionStorage.setItem(STORAGE_KEYS.PREFILL_CLIENT, JSON.stringify({
            clientName: latest.formData.fullName,
            dateOfBirth: latest.formData.dateOfBirth,
            email: latest.formData.email,
            phone: latest.formData.phone,
          }));
        }
      }
    } catch (e) {
      logger.error('Failed to pre-fill data:', e);
    }
    navigate('/assessment');
  };

  const loadMoreAssessments = async () => {
    if (hasMore && lastDoc && user) {
      setLoadingMore(true);
      try {
        const assessmentsRef = collection(getDb(), 'coaches', user.uid, 'assessments');
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
          title: 'Error',
          description: 'Failed to load more assessments.',
          variant: 'destructive',
        });
      } finally {
        setLoadingMore(false);
      }
    } else {
      setVisibleAssessmentsCount(prev => prev + 20);
    }
  };

  return {
    user,
    profile,
    loading,
    loadingData,
    items,
    search,
    setSearch,
    view,
    setView,
    deleteDialog,
    setDeleteDialog,
    clientHistoryDialog,
    setClientHistoryDialog,
    clientHistory,
    loadingHistory,
    analytics,
    visibleAssessmentsCount,
    visibleClientsCount,
    setVisibleClientsCount,
    hasMore,
    loadingMore,
    recentChanges,
    filtered,
    filteredClients,
    handleDelete,
    handleViewHistory,
    handleNewAssessmentForClient,
    loadMoreAssessments,
  };
}
