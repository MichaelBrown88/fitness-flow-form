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
import { getCurrentAssessment, reconstructAssessmentAtDate, getChangeHistory } from '@/services/assessmentHistory';
import { computeScores } from '@/lib/scoring';
import { AssessmentComparison } from '@/components/AssessmentComparison';
import {
  ArrowLeft,
  UserPlus,
  Edit2,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Target,
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
    // Get latest assessment to pre-fill
    if (assessments.length > 0) {
      const latest = await getCoachAssessment(user.uid, assessments[0].id);
      if (latest?.formData) {
        sessionStorage.setItem('prefillClientData', JSON.stringify({
          clientName: latest.formData.fullName,
          dateOfBirth: latest.formData.dateOfBirth,
          email: latest.formData.email,
          phone: latest.formData.phone,
        }));
      }
    }
    
    // Set partial assessment mode if category specified
    if (category) {
      sessionStorage.setItem('partialAssessment', JSON.stringify({
        category,
        clientName,
      }));
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
  const [currentAssessment, setCurrentAssessment] = useState<any>(null);
  
  useEffect(() => {
    if (!user || !clientName) return;
    (async () => {
      // Load current assessment using new system
      const current = await getCurrentAssessment(user.uid, clientName);
      if (current) {
        setCurrentAssessment(current);
        const scores = computeScores(current.formData);
        const breakdown: Record<string, number> = {};
        scores.categories.forEach(cat => {
          breakdown[cat.id] = cat.score;
        });
        setCategoryBreakdown(breakdown);
      } else if (assessments.length > 0) {
        // Fallback to old system
        const latest = await getCoachAssessment(user.uid, assessments[0].id);
        if (latest?.formData) {
          setCurrentAssessment({ formData: latest.formData, overallScore: latest.overallScore });
          const scores = computeScores(latest.formData);
          const breakdown: Record<string, number> = {};
          scores.categories.forEach(cat => {
            breakdown[cat.id] = cat.score;
          });
          setCategoryBreakdown(breakdown);
        }
      }
    })();
  }, [user, clientName, assessments]);

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
      <div className="space-y-6">
        {/* Profile Section */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2 mb-1">
                  <User className="h-3 w-3" />
                  Client Name
                </label>
                <div className="text-lg font-semibold text-slate-900">{clientName}</div>
              </div>
              {isEditing ? (
                <>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2 mb-1">
                      <Mail className="h-3 w-3" />
                      Email
                    </label>
                    <Input
                      value={editData.email || ''}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      placeholder="client@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2 mb-1">
                      <Phone className="h-3 w-3" />
                      Phone
                    </label>
                    <Input
                      value={editData.phone || ''}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2 mb-1">
                      <Cake className="h-3 w-3" />
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      value={editData.dateOfBirth || ''}
                      onChange={(e) => setEditData({ ...editData, dateOfBirth: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">
                      Notes
                    </label>
                    <Textarea
                      value={editData.notes || ''}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      placeholder="Add notes about this client..."
                      rows={4}
                    />
                  </div>
                </>
              ) : (
                <>
                  {profile?.email && (
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2 mb-1">
                        <Mail className="h-3 w-3" />
                        Email
                      </label>
                      <div className="text-sm text-slate-700">{profile.email}</div>
                    </div>
                  )}
                  {profile?.phone && (
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2 mb-1">
                        <Phone className="h-3 w-3" />
                        Phone
                      </label>
                      <div className="text-sm text-slate-700">{profile.phone}</div>
                    </div>
                  )}
                  {profile?.dateOfBirth && (
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2 mb-1">
                        <Cake className="h-3 w-3" />
                        Date of Birth
                      </label>
                      <div className="text-sm text-slate-700">{profile.dateOfBirth}</div>
                    </div>
                  )}
                  {profile?.notes && (
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">
                        Notes
                      </label>
                      <div className="text-sm text-slate-700 whitespace-pre-wrap">{profile.notes}</div>
                    </div>
                  )}
                </>
              )}
            </div>
            {isEditing && (
              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} className="bg-slate-900 text-white">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            )}
          </div>
          {profile?.tags && profile.tags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex flex-wrap gap-2">
                {profile.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Assessment Options */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Quick Assessments
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Update specific areas without completing a full assessment
          </p>
          <div className="grid gap-3 md:grid-cols-5">
            <Button
              variant="outline"
              onClick={() => handleNewAssessment('inbody')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Scan className="h-5 w-5 text-indigo-600" />
              <span className="text-xs font-semibold">InBody</span>
              {profile?.lastInBodyDate && (
                <span className="text-[10px] text-slate-500">
                  {profile.lastInBodyDate.toDate().toLocaleDateString()}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleNewAssessment('posture')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <UserCheck className="h-5 w-5 text-emerald-600" />
              <span className="text-xs font-semibold">Posture</span>
              {profile?.lastPostureDate && (
                <span className="text-[10px] text-slate-500">
                  {profile.lastPostureDate.toDate().toLocaleDateString()}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleNewAssessment('fitness')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Heart className="h-5 w-5 text-red-600" />
              <span className="text-xs font-semibold">Fitness</span>
              {profile?.lastFitnessDate && (
                <span className="text-[10px] text-slate-500">
                  {profile.lastFitnessDate.toDate().toLocaleDateString()}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleNewAssessment('strength')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Dumbbell className="h-5 w-5 text-amber-600" />
              <span className="text-xs font-semibold">Strength</span>
              {profile?.lastStrengthDate && (
                <span className="text-[10px] text-slate-500">
                  {profile.lastStrengthDate.toDate().toLocaleDateString()}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleNewAssessment('lifestyle')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Activity className="h-5 w-5 text-purple-600" />
              <span className="text-xs font-semibold">Lifestyle Factors</span>
              {profile?.lastLifestyleDate && (
                <span className="text-[10px] text-slate-500">
                  {profile.lastLifestyleDate.toDate().toLocaleDateString()}
                </span>
              )}
            </Button>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <Button
              onClick={() => handleNewAssessment()}
              className="w-full bg-slate-900 text-white hover:bg-slate-800"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Full Assessment
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Total Assessments
            </div>
            <div className="text-2xl font-semibold text-slate-900">{stats.totalAssessments}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Latest Score
            </div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-semibold text-slate-900">{stats.latestScore}</div>
              {stats.trend !== 'neutral' && (
                stats.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )
              )}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Average Score
            </div>
            <div className="text-2xl font-semibold text-slate-900">{stats.averageScore}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Score Change
            </div>
            <div className={`text-2xl font-semibold ${
              stats.scoreChange > 0 ? 'text-emerald-600' : stats.scoreChange < 0 ? 'text-red-600' : 'text-slate-900'
            }`}>
              {stats.scoreChange > 0 ? '+' : ''}{stats.scoreChange}
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        {Object.keys(categoryBreakdown).length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Latest Assessment Breakdown
            </h3>
            <div className="grid gap-4 md:grid-cols-5">
              {Object.entries(categoryBreakdown).map(([category, score]) => {
                const labels: Record<string, string> = {
                  bodyComp: 'Body Composition',
                  cardio: 'Metabolic Fitness',
                  strength: 'Muscular Strength',
                  movementQuality: 'Movement Quality',
                  lifestyle: 'Lifestyle Factors',
                };
                return (
                  <div key={category} className="text-center">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                      {labels[category] || category}
                    </div>
                    <div className="text-2xl font-semibold text-slate-900">{score}</div>
                    <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Assessment History */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Assessment History
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {assessments.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No assessments yet. Create the first assessment to get started.
              </div>
            ) : (
              assessments.map((assessment) => (
                <div key={assessment.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            Score: {assessment.overallScore}
                          </div>
                          {assessment.createdAt && (
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                              <CalendarIcon className="h-3 w-3" />
                              {assessment.createdAt.toDate().toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        {assessment.goals && assessment.goals.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-slate-400" />
                            <div className="text-xs text-slate-600">
                              {assessment.goals.slice(0, 2).join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/coach/assessments/${assessment.id}`}>View</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteDialog({
                          id: assessment.id,
                          date: assessment.createdAt?.toDate().toLocaleDateString() || 'unknown date',
                        })}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

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
            <DialogTitle>Assessment Comparison</DialogTitle>
            <DialogDescription>
              Compare assessment from {comparisonDate?.toLocaleDateString()} with current assessment
            </DialogDescription>
          </DialogHeader>
          {comparisonDate && currentAssessment && historicalAssessment && (
            <AssessmentComparison
              oldData={historicalAssessment.formData}
              newData={currentAssessment.formData}
              oldDate={comparisonDate}
              newDate={new Date()}
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

