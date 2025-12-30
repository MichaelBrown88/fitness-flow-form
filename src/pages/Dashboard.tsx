import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { 
  listCoachAssessments, 
  deleteCoachAssessment,
  getClientAssessments,
  getAllClients,
  type CoachAssessmentSummary 
} from '@/services/coachAssessments';
import { getChangeHistory, getCurrentAssessment } from '@/services/assessmentHistory';
import { computeScores } from '@/lib/scoring';
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp, startAfter, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { 
  Trash2, 
  History, 
  UserPlus, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle,
  Users,
  Calendar,
  BarChart3,
  ChevronRight,
  X,
  ChevronDown
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { getCoachAssessment } from '@/services/coachAssessments';
import type { FormData } from '@/contexts/FormContext';

type ClientGroup = {
  name: string;
  assessments: CoachAssessmentSummary[];
  latestScore: number;
  latestDate: Date | null;
  scoreChange?: number;
};

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

const formatGoal = (goal: string) => {
  const map: Record<string, string> = {
    'build-muscle': 'Build Muscle',
    'weight-loss': 'Weight Loss',
    'build-strength': 'Build Strength',
    'improve-fitness': 'Improve Fitness',
    'general-health': 'General Health',
  };
  return map[goal] || goal.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const Dashboard = () => {
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

  useEffect(() => {
    if (!user) {
      return;
    }

    // Set up real-time listener for assessments
    const assessmentsRef = collection(getDb(), 'coaches', user.uid, 'assessments');
    
    // SaaS Readiness: Filter by organizationId at the query level for performance
    // Performance: Use limit(20) with cursor-based pagination to prevent large queries
    // This requires a Firestore composite index: organizationId (asc) + createdAt (desc)
    // If index is not ready, fallback to simple query without organizationId filter
    let q;
    let useOrgFilter = false;
    
    if (profile?.organizationId) {
      try {
        // Try to use organizationId filter (requires composite index)
        q = query(
          assessmentsRef,
          where('organizationId', '==', profile.organizationId),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        useOrgFilter = true;
      } catch (indexError) {
        // Index not ready - fallback to simple query and filter in memory
        console.warn('Firestore index not ready, using fallback query:', indexError);
        q = query(assessmentsRef, orderBy('createdAt', 'desc'), limit(20));
        useOrgFilter = false;
      }
    } else {
      // Fallback: No organizationId filter (legacy support)
      q = query(assessmentsRef, orderBy('createdAt', 'desc'), limit(20));
    }
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        setLoadingData(true);
        const data: CoachAssessmentSummary[] = [];
        let lastDocument: QueryDocumentSnapshot<DocumentData> | null = null;
        
        snapshot.forEach((docSnap) => {
          const docData = docSnap.data();
          
          // If we're using fallback query (no index), filter by organizationId in memory
          if (!useOrgFilter && profile?.organizationId) {
            if (docData.organizationId !== profile.organizationId) {
              return; // Skip documents that don't match organizationId
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
        setHasMore(snapshot.size === 20); // If we got 20, there might be more
        
        // Load recent changes from assessment history
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
              
              // Get recent changes for each client (limit to top 10 most recent)
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
                  // Skip if client doesn't have history yet
                }
              }
              
              // Sort by date, most recent first
              changes.sort((a, b) => b.date.getTime() - a.date.getTime());
              setRecentChanges(changes.slice(0, 10));
            } catch (err) {
              console.warn('Failed to load recent changes:', err);
            }
          })();
        }
        
        // Compute analytics
        const analyticsData = await computeAnalytics(data, user.uid);
        setAnalytics(analyticsData);
      } finally {
        setLoadingData(false);
      }
    }, (error) => {
      // If index error, try fallback query without organizationId filter
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.warn('Firestore index not ready, retrying with fallback query...');
        // Unsubscribe from failed query
        unsubscribe();
        // Retry with simple query (no organizationId filter)
        const fallbackQuery = query(assessmentsRef, orderBy('createdAt', 'desc'), limit(20));
        const fallbackUnsubscribe = onSnapshot(fallbackQuery, async (snapshot) => {
          try {
            setLoadingData(true);
            const data: CoachAssessmentSummary[] = [];
            let lastDocument: QueryDocumentSnapshot<DocumentData> | null = null;
            
            snapshot.forEach((docSnap) => {
              const docData = docSnap.data();
              
              // Filter by organizationId in memory if needed
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
            
            // Load recent changes from assessment history
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
                      // Skip if client doesn't have history yet
                    }
                  }
                  
                  changes.sort((a, b) => b.date.getTime() - a.date.getTime());
                  setRecentChanges(changes.slice(0, 10));
                } catch (err) {
                  console.warn('Failed to load recent changes:', err);
                }
              })();
            }
            
            // Compute analytics
            const analyticsData = await computeAnalytics(data, user.uid);
            setAnalytics(analyticsData);
          } finally {
            setLoadingData(false);
          }
        }, (fallbackError) => {
          console.error('Error with fallback query:', fallbackError);
          setLoadingData(false);
        });
        // Store fallback unsubscribe for cleanup
        unsubscribeRef.current = fallbackUnsubscribe;
      } else {
        console.error('Error listening to assessments:', error);
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
  }, [user, profile?.organizationId]);

  const computeAnalytics = async (assessments: CoachAssessmentSummary[], coachUid: string): Promise<Analytics> => {
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

    // Get unique clients
    const uniqueClients = new Set(assessments.map(a => a.clientName));
    
    // Calculate average score
    const avgScore = Math.round(
      assessments.reduce((sum, a) => sum + (a.overallScore || 0), 0) / assessments.length
    );

    // Get assessments this month
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

    // Analyze most common issues and category scores
    const issueCounts: Record<string, number> = {};
    const categoryScores: Record<string, number[]> = {
      bodyComp: [],
      cardio: [],
      strength: [],
      movementQuality: [],
      lifestyle: [],
    };

    // Sample assessments to analyze (limit to avoid too many reads)
    const sampleSize = Math.min(20, assessments.length);
    const samples = assessments.slice(0, sampleSize);
    
    for (const assessment of samples) {
      try {
        // High Performance Path: Use pre-calculated summary if available
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

        // Legacy Fallback Path: Fetch full data only if summary is missing
        const full = await getCoachAssessment(user.uid, assessment.id);
        if (full?.formData) {
          const scores = computeScores(full.formData);
          
          // Collect category scores
          scores.categories.forEach(cat => {
            if (categoryScores[cat.id]) {
              categoryScores[cat.id].push(cat.score);
            }
          });

          // Collect weaknesses (issues)
          scores.categories.forEach(cat => {
            cat.weaknesses.forEach(weakness => {
              issueCounts[weakness] = (issueCounts[weakness] || 0) + 1;
            });
          });
        }
      } catch (err) {
        console.warn(`Failed to load assessment ${assessment.id} for analytics:`, err);
      }
    }

    // Find most common issues
    const mostCommonIssues = Object.entries(issueCounts)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate average scores per category
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
  };

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
      await deleteCoachAssessment(user.uid, deleteDialog.id);
      // Note: State will update automatically via Firestore listener
      toast({
        title: "Assessment deleted",
        description: `Assessment for ${deleteDialog.name} has been removed.`,
      });
      setDeleteDialog(null);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete assessment. Please try again.",
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
    
    // Set up partial assessment immediately if category provided
    if (category) {
      sessionStorage.setItem('partialAssessment', JSON.stringify({
        category,
        clientName,
      }));
    } else {
      sessionStorage.removeItem('partialAssessment');
    }
    
    sessionStorage.removeItem('isDemoAssessment');
    sessionStorage.removeItem('prefillClientData');
    
    // Get the latest assessment to pre-fill data
    try {
      const history = await getClientAssessments(user.uid, clientName, profile?.organizationId);
      if (history.length > 0) {
        const latest = await getCoachAssessment(user.uid, history[0].id);
        if (latest?.formData) {
          // Store in sessionStorage to pre-fill form
          sessionStorage.setItem('prefillClientData', JSON.stringify({
            clientName: latest.formData.fullName,
            dateOfBirth: latest.formData.dateOfBirth,
            email: latest.formData.email,
            phone: latest.formData.phone,
          }));
        }
      }
    } catch (e) {
      console.error('Failed to pre-fill data:', e);
    }
    
    navigate('/assessment');
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Checking coach session…
      </div>
    );
  }

  const coachFirstName = user?.displayName ? user.displayName.split(' ')[0] : 'Coach';

  return (
    <AppShell
      title={`${coachFirstName}'s dashboard`}
      subtitle="Manage clients, view assessments, and track progress."
      actions={
        <Button asChild className="bg-slate-900 text-white hover:bg-slate-800">
          <Link to="/assessment">+ New assessment</Link>
        </Button>
      }
    >
      <div className="space-y-8">
        {/* Analytics Section */}
        <AnalyticsDashboard analytics={analytics} />

        {/* Recent Activity Section */}
        <RecentActivity recentChanges={recentChanges} />

        {/* View Toggle */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('assessments')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  view === 'assessments'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Assessments
              </button>
              <button
                onClick={() => setView('clients')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  view === 'clients'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                By Client
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder={view === 'assessments' ? "Search assessments…" : "Search clients…"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-56 text-sm"
              />
            </div>
          </div>

          {/* Assessments View */}
          {view === 'assessments' && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Client
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Overall
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Goals
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingData ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-sm text-slate-500"
                      >
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-sm text-slate-500"
                      >
                        {search
                          ? 'No assessments match that name.'
                          : 'No assessments saved yet. Run an assessment to see it here.'}
                      </td>
                    </tr>
                  ) : (
                    filtered.slice(0, visibleAssessmentsCount).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm text-slate-900">
                          {item.clientName}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-600">
                          {item.createdAt
                            ? item.createdAt.toDate().toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-800 font-medium">
                          {item.overallScore || '—'}
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-600">
                          {item.goals && item.goals.length
                            ? item.goals.map(formatGoal).slice(0, 2).join(', ')
                            : '—'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/coach/assessments/${item.id}`}>
                                Open
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteDialog({ id: item.id, name: item.clientName })}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {view === 'assessments' && (filtered.length > visibleAssessmentsCount || hasMore) && (
            <div className="flex justify-center pt-4">
              <Button 
                variant="outline" 
                onClick={async () => {
                  if (hasMore && lastDoc) {
                    // Load more from Firestore using cursor-based pagination
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
                        const scoresSummary = docData.scoresSummary;
                        newData.push({
                          id: docSnap.id,
                          clientName: (typeof docData.clientName === 'string' ? docData.clientName : 'Unnamed client'),
                          createdAt: (docData.createdAt instanceof Timestamp ? docData.createdAt : null),
                          overallScore: (typeof docData.overallScore === 'number' ? docData.overallScore : 0),
                          goals: (Array.isArray(docData.goals) ? docData.goals : []) as string[],
                          scoresSummary: (scoresSummary && typeof scoresSummary === 'object' && 'overall' in scoresSummary && 'categories' in scoresSummary) ? scoresSummary as CoachAssessmentSummary['scoresSummary'] : undefined,
                        });
                        newLastDoc = docSnap;
                      });
                      
                      setItems(prev => [...prev, ...newData]);
                      setLastDoc(newLastDoc);
                      setHasMore(nextSnapshot.size === 20);
                      setVisibleAssessmentsCount(prev => prev + newData.length);
                    } catch (err) {
                      console.error('Failed to load more assessments:', err);
                      toast({
                        title: 'Error',
                        description: 'Failed to load more assessments.',
                        variant: 'destructive',
                      });
                    } finally {
                      setLoadingMore(false);
                    }
                  } else {
                    // Just show more from already-loaded items
                    setVisibleAssessmentsCount(prev => prev + 20);
                  }
                }}
                disabled={loadingMore}
                className="text-slate-600"
              >
                {loadingMore ? 'Loading...' : hasMore ? 'Load More from Database' : 'Show More Assessments'}
              </Button>
            </div>
          )}

          {/* Clients View */}
          {view === 'clients' && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {loadingData ? (
                <div className="col-span-full text-center text-sm text-slate-500 py-8">
                  Loading clients…
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="col-span-full text-center text-sm text-slate-500 py-8">
                  {search ? 'No clients match that name.' : 'No clients found.'}
                </div>
              ) : (
                filteredClients.slice(0, visibleClientsCount).map((group) => (
                  <div
                    key={group.name}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{group.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {group.assessments.length} assessment{group.assessments.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {group.scoreChange !== undefined && (
                        <div className={`flex items-center gap-1 text-xs font-semibold ${
                          group.scoreChange >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {group.scoreChange >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {group.scoreChange > 0 ? '+' : ''}{group.scoreChange}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Latest Score</span>
                        <span className="font-semibold text-slate-900">{group.latestScore}</span>
                      </div>
                      {group.latestDate && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Last Assessment</span>
                          <span className="text-slate-500">
                            {group.latestDate.toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/client/${encodeURIComponent(group.name)}`)}
                        className="flex-1"
                      >
                        <History className="h-3 w-3 mr-1" />
                        View Dashboard
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            New Assessment
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Assessment Type</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleNewAssessmentForClient(group.name)}>
                            Full Assessment
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleNewAssessmentForClient(group.name, 'inbody')}>
                            InBody Only
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleNewAssessmentForClient(group.name, 'posture')}>
                            Posture Only
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleNewAssessmentForClient(group.name, 'fitness')}>
                            Fitness Only
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleNewAssessmentForClient(group.name, 'strength')}>
                            Strength Only
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleNewAssessmentForClient(group.name, 'lifestyle')}>
                            Lifestyle Only
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {view === 'clients' && filteredClients.length > visibleClientsCount && (
            <div className="flex justify-center pt-4">
              <Button 
                variant="outline" 
                onClick={() => setVisibleClientsCount(prev => prev + 12)}
                className="text-slate-600"
              >
                Show More Clients
              </Button>
            </div>
          )}
        </section>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Assessment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the assessment for {deleteDialog?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client History Dialog */}
      <Dialog open={!!clientHistoryDialog} onOpenChange={(open) => !open && setClientHistoryDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assessment History: {clientHistoryDialog}</DialogTitle>
            <DialogDescription>
              View all assessments for this client. Click to open any assessment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {loadingHistory ? (
              <div className="text-center text-sm text-slate-500 py-8">Loading history…</div>
            ) : clientHistory.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-8">No assessment history found.</div>
            ) : (
              clientHistory.map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-semibold text-slate-900">
                        Score: {assessment.overallScore}
                      </div>
                      {assessment.createdAt && (
                        <div className="text-xs text-slate-500">
                          {assessment.createdAt.toDate().toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    {assessment.goals && assessment.goals.length > 0 && (
                      <div className="text-xs text-slate-600 mt-1">
                        Goals: {assessment.goals.map(formatGoal).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/coach/assessments/${assessment.id}`}>
                        Open
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeleteDialog({ id: assessment.id, name: clientHistoryDialog || '' });
                        setClientHistoryDialog(null);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientHistoryDialog(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (clientHistoryDialog) {
                  handleNewAssessmentForClient(clientHistoryDialog);
                  setClientHistoryDialog(null);
                }
              }}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              New Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default Dashboard;
