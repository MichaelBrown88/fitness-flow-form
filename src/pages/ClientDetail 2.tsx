import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as UICalendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/AuthContext';
import { getClientAssessments, type CoachAssessmentSummary } from '@/services/coachAssessments';
import { getClientProfile, createOrUpdateClientProfile, subscribeToClientProfile, type ClientProfile } from '@/services/clientProfiles';
import { getCoachAssessment } from '@/services/coachAssessments';
import { 
  getCurrentAssessment, 
  reconstructAssessmentAtDate, 
  getChangeHistory,
  getSnapshots,
  type AssessmentSnapshot
} from '@/services/assessmentHistory';
import { computeScores } from '@/lib/scoring';
import { AssessmentComparison } from '@/components/AssessmentComparison';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  UserPlus,
  Edit2,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Target as TargetIcon,
  BarChart3,
  FileText,
  Tag,
  User,
  Mail,
  Phone,
  Cake,
  AlertCircle,
  Activity,
  Dumbbell,
  Heart,
  Scan,
  UserCheck,
  Clock,
  GitCompare,
  History,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const ClientDetail = () => {
  const { clientName: encodedClientName } = useParams<{ clientName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const clientName = encodedClientName ? decodeURIComponent(encodedClientName) : '';
  const [assessments, setAssessments] = useState<CoachAssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ClientProfile>>({});
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; date: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [historicalAssessment, setHistoricalAssessment] = useState<{ formData: any; overallScore: number } | null>(null);
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonDate, setComparisonDate] = useState<Date | undefined>(undefined);
  const [snapshots, setSnapshots] = useState<AssessmentSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [comparisonTarget, setComparisonTarget] = useState<{ old: any; new: any; oldDate: Date; newDate: Date } | null>(null);
  const [isComparisonMode, setIsComparisonMode] = useState(true);

  // Helper to find nearest snapshot at or before target date
  const handleDateSelection = async (date: Date) => {
    if (!user || !clientName || !snapshots.length) return;
    
    setSelectedDate(date);
    
    // Find nearest snapshot that is <= selected date
    const sortedSnapshots = [...snapshots].sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime());
    const nearest = sortedSnapshots.find(s => s.timestamp.toDate().getTime() <= date.getTime()) || sortedSnapshots[sortedSnapshots.length - 1];
    
    if (nearest) {
      if (isComparisonMode) {
        if (currentAssessment) {
          setComparisonTarget({
            old: nearest.formData,
            new: currentAssessment.formData,
            oldDate: nearest.timestamp.toDate(),
            newDate: new Date()
          });
          setShowComparison(true);
        } else {
          toast({ title: "Current data not loaded", variant: "destructive" });
        }
      } else {
        navigate(`/coach/assessments/${nearest.id}?clientName=${encodeURIComponent(clientName)}`);
      }
    }
  };

  const handleQuickJump = (months: number | 'first' | 'last') => {
    if (!snapshots.length) return;
    
    let targetDate = new Date();
    if (months === 'first') {
      const sorted = [...snapshots].sort((a, b) => a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime());
      targetDate = sorted[0].timestamp.toDate();
    } else if (months === 'last') {
      const sorted = [...snapshots].sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime());
      targetDate = sorted[0].timestamp.toDate();
    } else {
      targetDate.setMonth(targetDate.getMonth() - months);
    }
    
    handleDateSelection(targetDate);
  };

  useEffect(() => {
    if (!user || !clientName) return;

    // Load snapshots
    (async () => {
      try {
        setLoadingSnapshots(true);
        const data = await getSnapshots(user.uid, clientName);
        setSnapshots(data);
      } catch (err) {
        console.error('Failed to load snapshots:', err);
      } finally {
        setLoadingSnapshots(false);
      }
    })();
  }, [user, clientName]);

  useEffect(() => {
    if (!user || !clientName) return;

    // Subscribe to profile updates
    const unsubscribeProfile = subscribeToClientProfile(user.uid, clientName, (p) => {
      setProfile(p);
      if (p) {
        setEditData({
          email: p.email || '',
          phone: p.phone || '',
          dateOfBirth: p.dateOfBirth || '',
          gender: p.gender || '',
          notes: p.notes || '',
          tags: p.tags || [],
          status: p.status || 'active',
        });
      }
    });

    // Load assessments
    (async () => {
      try {
        setLoading(true);
        const data = await getClientAssessments(user.uid, clientName);
        setAssessments(data);
        
        // Update profile with latest assessment date
        if (data.length > 0 && data[0].createdAt) {
          await createOrUpdateClientProfile(user.uid, clientName, {
            lastAssessmentDate: data[0].createdAt,
          });
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      unsubscribeProfile();
    };
  }, [user, clientName]);

  const handleSaveProfile = async () => {
    if (!user || !clientName) return;
    try {
      await createOrUpdateClientProfile(user.uid, clientName, editData);
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Client profile has been saved.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    }
  };

  const handleNewAssessment = async (category?: 'inbody' | 'posture' | 'fitness' | 'strength' | 'lifestyle') => {
    if (!user) return;
    
    // Set partial assessment mode immediately if category specified
    // This must happen before any awaits to ensure it's ready for the next page
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

    // Get latest assessment to pre-fill
    if (assessments.length > 0) {
      try {
        const latest = await getCoachAssessment(user.uid, assessments[0].id);
        if (latest?.formData) {
          sessionStorage.setItem('prefillClientData', JSON.stringify({
            clientName: latest.formData.fullName,
            dateOfBirth: latest.formData.dateOfBirth,
            email: latest.formData.email,
            phone: latest.formData.phone,
          }));
        }
      } catch (e) {
        console.error('Failed to pre-fill data:', e);
      }
    }
    
    navigate('/assessment');
  };

  const handleDeleteAssessment = async (id: string) => {
    if (!user) return;
    try {
      const { deleteCoachAssessment } = await import('@/services/coachAssessments');
      await deleteCoachAssessment(user.uid, id);
      setAssessments(assessments.filter(a => a.id !== id));
      toast({
        title: "Assessment deleted",
        description: "The assessment has been removed.",
      });
      setDeleteDialog(null);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete assessment.",
        variant: "destructive",
      });
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (assessments.length === 0) {
      return {
        totalAssessments: 0,
        averageScore: 0,
        latestScore: 0,
        scoreChange: 0,
        trend: 'neutral' as const,
        categoryScores: {} as Record<string, number[]>,
      };
    }

    const latest = assessments[0];
    const previous = assessments[1];
    const scoreChange = previous ? (latest.overallScore || 0) - (previous.overallScore || 0) : 0;
    
    const avgScore = Math.round(
      assessments.reduce((sum, a) => sum + (a.overallScore || 0), 0) / assessments.length
    );

    return {
      totalAssessments: assessments.length,
      averageScore: avgScore,
      latestScore: latest.overallScore || 0,
      scoreChange,
      trend: scoreChange > 0 ? 'up' as const : scoreChange < 0 ? 'down' as const : 'neutral' as const,
      categoryScores: {} as Record<string, number[]>,
    };
  }, [assessments]);

  // Load category scores for latest assessment
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({});
  const [categoryChanges, setCategoryChanges] = useState<Record<string, number>>({});
  const [currentAssessment, setCurrentAssessment] = useState<any>(null);
  
  useEffect(() => {
    if (!user || !clientName) return;
    (async () => {
      // Load current assessment using new system
      const current = await getCurrentAssessment(user.uid, clientName);
      let currentBreakdown: Record<string, number> = {};
      
      if (current) {
        setCurrentAssessment(current);
        const scores = computeScores(current.formData);
        scores.categories.forEach(cat => {
          currentBreakdown[cat.id] = cat.score;
        });
        setCategoryBreakdown(currentBreakdown);
      } else if (assessments.length > 0) {
        // Fallback to old system
        const latest = await getCoachAssessment(user.uid, assessments[0].id);
        if (latest?.formData) {
          setCurrentAssessment({ formData: latest.formData, overallScore: latest.overallScore });
          const scores = computeScores(latest.formData);
          scores.categories.forEach(cat => {
            currentBreakdown[cat.id] = cat.score;
          });
          setCategoryBreakdown(currentBreakdown);
        }
      }

      // Calculate changes from previous snapshot
      if (currentBreakdown && snapshots.length > 0) {
        const prevSnapshot = snapshots[0]; // Most recent snapshot (could be the same as current if just saved)
        // If the most recent snapshot is from "now" (last 5 mins), look at the one before it
        const latestSnapshot = snapshots.find(s => {
          const diff = Date.now() - s.timestamp.toDate().getTime();
          return diff > 5 * 60 * 1000; // More than 5 minutes ago
        }) || snapshots[1]; // Or just the second one if available

        if (latestSnapshot) {
          const prevScores = computeScores(latestSnapshot.formData);
          const changes: Record<string, number> = {};
          prevScores.categories.forEach(cat => {
            const currentScore = currentBreakdown[cat.id] || 0;
            changes[cat.id] = currentScore - cat.score;
          });
          setCategoryChanges(changes);
        }
      }
    })();
  }, [user, clientName, assessments, snapshots]);

  // Load historical assessment when date is selected
  useEffect(() => {
    if (!user || !clientName || !selectedDate) {
      setHistoricalAssessment(null);
      return;
    }
    
    setLoadingHistorical(true);
    (async () => {
      try {
        const historical = await reconstructAssessmentAtDate(user.uid, clientName, selectedDate);
        setHistoricalAssessment(historical);
      } catch (err) {
        console.error('Failed to load historical assessment:', err);
        setHistoricalAssessment(null);
      } finally {
        setLoadingHistorical(false);
      }
    })();
  }, [user, clientName, selectedDate]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Checking coach session…
      </div>
    );
  }

  if (loading) {
    return (
      <AppShell 
        title={`${clientName}'s Dashboard`}
        subtitle="Comprehensive view of client progress, history, and profile."
      >
        <div className="py-10 text-sm text-slate-600">Loading client data…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`${clientName}'s Dashboard`}
      subtitle="Comprehensive view of client progress, history, and profile."
      actions={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {profile?.status && (
            <Badge variant={profile.status === 'active' ? 'default' : 'secondary'}>
              {profile.status}
            </Badge>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? <X className="h-4 w-4 mr-2" /> : <Edit2 className="h-4 w-4 mr-2" />}
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
            <Button onClick={() => handleNewAssessment()} className="bg-slate-900 text-white hover:bg-slate-800">
              <UserPlus className="h-4 w-4 mr-2" />
              New Assessment
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-8">
        
        {/* Current Live Report Section */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Activity className="h-6 w-6 text-indigo-600" />
                Current Live Report
              </h3>
              <p className="text-sm text-slate-500 mt-1">Real-time aggregate of the most recent assessment data across all pillars.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 h-11 border-slate-200 text-slate-600 hover:bg-slate-50">
                    <CalendarIcon className="h-4 w-4" />
                    {selectedDate ? selectedDate.toLocaleDateString() : 'Historical Snapshots...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 overflow-hidden rounded-2xl" align="end">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="compare-mode" className="text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer">Comparison Mode</Label>
                      <Switch 
                        id="compare-mode" 
                        checked={isComparisonMode} 
                        onCheckedChange={setIsComparisonMode}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {isComparisonMode ? 'Compare selection vs. Current Live Report' : 'Open selected report snapshot'}
                    </p>
                  </div>
                  
                  <div className="p-2">
                    <div className="grid grid-cols-2 gap-1 mb-2">
                      <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-tight justify-start" onClick={() => handleQuickJump('last')}>
                        <Clock className="h-3 w-3 mr-1.5 text-slate-400" /> Last Assessment
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-tight justify-start" onClick={() => handleQuickJump('first')}>
                        <History className="h-3 w-3 mr-1.5 text-slate-400" /> First Assessment
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-tight justify-start" onClick={() => handleQuickJump(1)}>
                        1 Month Ago
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-tight justify-start" onClick={() => handleQuickJump(3)}>
                        3 Months Ago
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-tight justify-start" onClick={() => handleQuickJump(6)}>
                        6 Months Ago
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-tight justify-start" onClick={() => handleQuickJump(12)}>
                        1 Year Ago
                      </Button>
                    </div>
                    <div className="border-t border-slate-100 pt-2">
                      <UICalendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && handleDateSelection(date)}
                        disabled={(date) => date > new Date() || date < new Date('2024-01-01')}
                        initialFocus
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {currentAssessment && (
                <Button 
                  className="h-11 px-6 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all gap-2"
                  asChild
                >
                  <Link to={`/coach/assessments/latest?clientName=${encodeURIComponent(clientName)}`}>
                    <FileText className="h-4 w-4" />
                    Open Full Report
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {!currentAssessment ? (
            <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-sm text-slate-500 mb-6">No assessment data found for this client.</p>
              <Button onClick={() => handleNewAssessment()} className="bg-slate-900 text-white rounded-xl h-12 px-8">
                <UserPlus className="h-4 w-4 mr-2" />
                Start First Assessment
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-5">
              {[
                { id: 'lifestyle', label: 'Lifestyle Factors', color: 'text-purple-600', bg: 'bg-purple-500', icon: Activity },
                { id: 'bodyComp', label: 'Body Composition', color: 'text-emerald-600', bg: 'bg-emerald-500', icon: Scan },
                { id: 'movementQuality', label: 'Movement Quality', color: 'text-amber-600', bg: 'bg-amber-500', icon: UserCheck },
                { id: 'strength', label: 'Muscular Strength', color: 'text-indigo-600', bg: 'bg-indigo-500', icon: Dumbbell },
                { id: 'cardio', label: 'Metabolic Fitness', color: 'text-red-600', bg: 'bg-red-500', icon: Heart },
              ].map((cat) => (
                <div key={cat.id} className="text-center p-5 rounded-2xl bg-slate-50/50 border border-slate-100/50 transition-all hover:bg-white hover:shadow-md">
                  <div className="flex justify-center mb-3">
                    <cat.icon className={`h-6 w-6 ${cat.color} opacity-80`} />
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">
                    {cat.label}
                  </div>
                  <div className="text-3xl font-black text-slate-900 mb-1">
                    {categoryBreakdown[cat.id] || 0}
                  </div>
                  {categoryChanges[cat.id] !== undefined && categoryChanges[cat.id] !== 0 && (
                    <div className={`text-[10px] font-bold flex items-center justify-center gap-0.5 mb-2 ${categoryChanges[cat.id] > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {categoryChanges[cat.id] > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                      {categoryChanges[cat.id] > 0 ? '+' : ''}{categoryChanges[cat.id]}
                    </div>
                  )}
                  {(!categoryChanges[cat.id] || categoryChanges[cat.id] === 0) && <div className="h-4 mb-2" />}
                  <div className="h-2 w-full bg-slate-200/60 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${cat.bg} transition-all duration-1000`}
                      style={{ width: `${categoryBreakdown[cat.id] || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Assessment Options */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TargetIcon className="h-5 w-5 text-indigo-600" />
              Quick Assessments
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pillar Updates</span>
          </div>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
            {[
              { id: 'lifestyle', label: 'Lifestyle', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
              { id: 'inbody', label: 'InBody', icon: Scan, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { id: 'posture', label: 'Movement', icon: UserCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
              { id: 'strength', label: 'Strength', icon: Dumbbell, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { id: 'fitness', label: 'Fitness', icon: Heart, color: 'text-red-600', bg: 'bg-red-50' },
            ].map((action) => (
              <Button
                key={action.id}
                variant="outline"
                onClick={() => handleNewAssessment(action.id as any)}
                className="flex flex-col items-center gap-3 h-auto py-6 rounded-2xl border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group shadow-sm"
              >
                <div className={`h-12 w-12 rounded-xl ${action.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                </div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
              Total Assessments
            </div>
            <div className="text-4xl font-black text-slate-900">{stats.totalAssessments}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
              Latest Score
            </div>
            <div className="flex items-end justify-between">
              <div className="text-4xl font-black text-slate-900">{stats.latestScore}</div>
              {stats.trend !== 'neutral' && (
                <div className={`flex items-center gap-1 mb-1 ${stats.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {stats.trend === 'up' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                </div>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
              Average Score
            </div>
            <div className="text-4xl font-black text-slate-900">{stats.averageScore}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
              Score Change
            </div>
            <div className={`text-4xl font-black ${
              stats.scoreChange > 0 ? 'text-emerald-600' : stats.scoreChange < 0 ? 'text-rose-600' : 'text-slate-900'
            }`}>
              {stats.scoreChange > 0 ? '+' : ''}{stats.scoreChange}
            </div>
          </div>
        </div>

        {/* Assessment History Section */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              Complete Data Logs
            </h3>
            <Badge variant="outline" className="border-slate-200 text-slate-500 font-bold bg-white uppercase tracking-widest text-[9px]">
              {assessments.length} Records Found
            </Badge>
          </div>
          <div className="divide-y divide-slate-100">
            {assessments.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-medium italic">
                No historical records found for this client.
              </div>
            ) : (
              assessments.map((assessment) => (
                <div key={assessment.id} className="p-5 hover:bg-slate-50/80 transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-6">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-black text-sm border-2 ${
                      assessment.overallScore >= 75 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 
                      assessment.overallScore >= 50 ? 'bg-amber-50 border-amber-100 text-amber-600' : 
                      'bg-rose-50 border-rose-100 text-rose-600'
                    }`}>
                      {assessment.overallScore}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 mb-1">Assessment Snapshot</div>
                      <div className="flex items-center gap-4">
                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                          <CalendarIcon className="h-3 w-3" />
                          {assessment.createdAt?.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                        {assessment.goals && assessment.goals.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <TargetIcon className="h-3 w-3 text-slate-300" />
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                              {assessment.goals[0].replace('-', ' ')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" asChild className="h-9 rounded-xl font-bold text-xs border-slate-200 hover:bg-slate-900 hover:text-white transition-all px-4 shadow-sm">
                      <Link to={`/coach/assessments/${assessment.id}?clientName=${encodeURIComponent(clientName)}`}>View Report</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteDialog({
                        id: assessment.id,
                        date: assessment.createdAt?.toDate().toLocaleDateString() || 'unknown date',
                      })}
                      className="h-9 w-9 p-0 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Client Profile Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Client Profile: {clientName}</DialogTitle>
            <DialogDescription>
              Update contact information and internal notes for this client.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" /> Email Address
              </label>
              <Input
                value={editData.email || ''}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                placeholder="client@example.com"
                className="h-11 rounded-xl"
              />
            </div>
            
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" /> Phone Number
              </label>
              <Input
                value={editData.phone || ''}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="h-11 rounded-xl"
              />
            </div>
            
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Cake className="h-3.5 w-3.5" /> Date of Birth
              </label>
              <Input
                type="date"
                value={editData.dateOfBirth || ''}
                onChange={(e) => setEditData({ ...editData, dateOfBirth: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
            
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Internal Coaching Notes</label>
              <Textarea
                value={editData.notes || ''}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                placeholder="Add medical history, training preferences, or other important details..."
                rows={5}
                className="rounded-xl resize-none"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditing(false)} className="rounded-xl h-11 px-6 font-bold">
              Discard
            </Button>
            <Button onClick={handleSaveProfile} className="bg-slate-900 text-white rounded-xl h-11 px-6 font-bold">
              Save Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Assessment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the assessment from {deleteDialog?.date}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog && handleDeleteAssessment(deleteDialog.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comparison Dialog */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-indigo-600" />
              Assessment Comparison
            </DialogTitle>
            <DialogDescription>
              {comparisonTarget && (
                <>Comparing {comparisonTarget.oldDate.toLocaleDateString()} vs {comparisonTarget.newDate.toLocaleDateString()}</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {comparisonTarget && (
            <AssessmentComparison
              oldData={comparisonTarget.old}
              newData={comparisonTarget.new}
              oldDate={comparisonTarget.oldDate}
              newDate={comparisonTarget.newDate}
            />
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowComparison(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default ClientDetail;
