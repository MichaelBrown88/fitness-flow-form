import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as UICalendar } from '@/components/ui/calendar';
import { useClientDetail } from '@/hooks/useClientDetail';
import { scoreGrade } from '@/lib/scoring/scoreColor';
import { PILLAR_DISPLAY } from '@/constants/pillars';
import { AssessmentComparison } from '@/components/AssessmentComparison';
import { RetestScheduleCard } from '@/components/RetestScheduleCard';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  UserPlus,
  Edit2,
  X,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Target as TargetIcon,
  FileText,
  Mail,
  Phone,
  Cake,
  Activity,
  Dumbbell,
  Heart,
  Scan,
  UserCheck,
  Clock,
  GitCompare,
  History,
  ChevronDown,
} from 'lucide-react';

// Collapsible section wrapper
const CollapsibleSection = ({ title, icon, badge, children, defaultOpen = true }: {
  title: string; icon: ReactNode; badge?: ReactNode; children: ReactNode; defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors"
      >
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {badge}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
};
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { TransferClientDialog } from '@/components/client/TransferClientDialog';
import { ArrowRightLeft } from 'lucide-react';

const ClientDetail = () => {
  const { profile: authProfile } = useAuth();
  const {
    // URL and Auth
    clientName,
    user,
    
    // Loading states
    loading,
    
    // Data
    assessments,
    profile,
    snapshots,
    currentAssessment,
    categoryBreakdown,
    categoryChanges,
    stats,
    
    // UI State
    isEditing,
    editData,
    deleteDialog,
    selectedDate,
    showComparison,
    comparisonTarget,
    isComparisonMode,
    
    // Setters
    setIsEditing,
    setEditData,
    setDeleteDialog,
    setShowComparison,
    setIsComparisonMode,
    
    // Handlers
    handleDateSelection,
    handleQuickJump,
    handleSaveProfile,
    handleNewAssessment,
    handleDeleteAssessment,
    handleTransferClient,
    navigateBack,
  } = useClientDetail();

  const [transferOpen, setTransferOpen] = useState(false);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Loading…
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
            onClick={navigateBack}
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
            {(authProfile?.role === 'org_admin' || profile?.assignedCoachUid === user?.uid) && (
              <Button
                variant="outline"
                onClick={() => setTransferOpen(true)}
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transfer
              </Button>
            )}
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
        <CollapsibleSection
          title="Current Live Report"
          icon={<Activity className="h-5 w-5 text-primary" />}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <p className="text-sm text-slate-500">Real-time aggregate of the most recent assessment data across all pillars.</p>
            
            <div className="flex items-center gap-2">
              <Button
                variant={isComparisonMode ? 'default' : 'outline'}
                onClick={() => setIsComparisonMode(!isComparisonMode)}
                className={`gap-2 h-11 text-sm font-bold ${isComparisonMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <GitCompare className="h-4 w-4" />
                Compare
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 h-11 border-slate-200 text-slate-600 hover:bg-slate-50">
                    <CalendarIcon className="h-4 w-4" />
                    {selectedDate ? selectedDate.toLocaleDateString() : 'View Past Results'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 overflow-hidden rounded-2xl" align="end">
                  {isComparisonMode && (
                    <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Comparison mode: select a date to compare vs. current</p>
                    </div>
                  )}
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

              {currentAssessment && assessments.length > 0 && (
                <Button 
                  className="h-11 px-6 rounded-xl bg-primary text-white font-bold hover:brightness-110 shadow-md shadow-primary/10 transition-all gap-2"
                  asChild
                >
                  <Link to={`/coach/assessments/${assessments[0].id}?clientName=${encodeURIComponent(clientName)}`}>
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
                { id: 'lifestyle', label: 'Lifestyle Factors', color: 'text-primary', bg: 'bg-primary', icon: Activity },
                { id: 'bodyComp', label: 'Body Composition', color: 'text-primary', bg: 'bg-primary', icon: Scan },
                { id: 'movementQuality', label: 'Movement Quality', color: 'text-primary', bg: 'bg-primary', icon: UserCheck },
                { id: 'strength', label: 'Functional Strength', color: 'text-primary', bg: 'bg-primary', icon: Dumbbell },
                { id: 'cardio', label: 'Metabolic Fitness', color: 'text-primary', bg: 'bg-primary', icon: Heart },
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
        </CollapsibleSection>

        {/* Quick Assessment Options */}
        <CollapsibleSection
          title="Quick Assessments"
          icon={<TargetIcon className="h-5 w-5 text-primary" />}
          badge={<span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pillar Updates</span>}
        >
          <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
            {[
              { id: 'lifestyle', label: PILLAR_DISPLAY.lifestyle.short, icon: Activity, color: 'text-primary', bg: 'bg-brand-light' },
              { id: 'inbody', label: PILLAR_DISPLAY.bodyComp.short, icon: Scan, color: 'text-primary', bg: 'bg-brand-light' },
              { id: 'posture', label: PILLAR_DISPLAY.movementQuality.short, icon: UserCheck, color: 'text-primary', bg: 'bg-brand-light' },
              { id: 'strength', label: PILLAR_DISPLAY.strength.short, icon: Dumbbell, color: 'text-primary', bg: 'bg-brand-light' },
              { id: 'fitness', label: PILLAR_DISPLAY.cardio.short, icon: Heart, color: 'text-primary', bg: 'bg-brand-light' },
            ].map((action) => (
              <Button
                key={action.id}
                variant="outline"
                onClick={() => handleNewAssessment(action.id as 'lifestyle' | 'inbody' | 'posture' | 'strength' | 'fitness')}
                className="flex flex-col items-center gap-3 h-auto py-6 rounded-2xl border-slate-100 hover:border-primary/20 hover:bg-brand-light transition-all group shadow-sm"
              >
                <div className={`h-12 w-12 rounded-xl ${action.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                </div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{action.label}</span>
              </Button>
            ))}
          </div>
        </CollapsibleSection>

        {/* Re-Test Schedule Card */}
        {authProfile?.organizationId && (
          <RetestScheduleCard
            profile={profile}
            clientName={clientName}
            organizationId={authProfile.organizationId}
          />
        )}

        {/* Stats Cards */}
        <CollapsibleSection
          title="Overview Stats"
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
          defaultOpen={false}
        >
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Total Assessments</div>
              <div className="text-3xl font-black text-slate-900">{stats.totalAssessments}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Latest Score</div>
              <div className="flex items-end justify-between">
                <div className="text-3xl font-black text-slate-900">{stats.latestScore}</div>
                {stats.trend !== 'neutral' && (
                  <div className={`flex items-center gap-1 mb-1 ${stats.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {stats.trend === 'up' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Average Score</div>
              <div className="text-3xl font-black text-slate-900">{stats.averageScore}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Score Change</div>
              <div className={`text-3xl font-black ${
                stats.scoreChange > 0 ? 'text-emerald-600' : stats.scoreChange < 0 ? 'text-rose-600' : 'text-slate-900'
              }`}>
                {stats.scoreChange > 0 ? '+' : ''}{stats.scoreChange}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Assessment History Section */}
        <CollapsibleSection
          title="Assessment History"
          icon={<Clock className="h-5 w-5 text-primary" />}
          badge={<Badge variant="outline" className="border-slate-200 text-slate-500 font-bold bg-white uppercase tracking-widest text-[9px]">{assessments.length} assessments</Badge>}
        >
          <div className="divide-y divide-slate-100 -mx-6 px-6">
            {assessments.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 font-medium italic">
                No historical records found for this client.
              </div>
            ) : (
              assessments.map((assessment) => (
                <div key={assessment.id} className="p-5 hover:bg-slate-50/80 transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-6">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-black text-sm border-2 ${
                      scoreGrade(assessment.overallScore) === 'green' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 
                      scoreGrade(assessment.overallScore) === 'amber' ? 'bg-amber-50 border-amber-100 text-amber-600' : 
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
        </CollapsibleSection>
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
                <UserCheck className="h-3.5 w-3.5" /> Client Name
              </label>
              <Input
                value={editData.clientName ?? clientName ?? ''}
                onChange={(e) => setEditData({ ...editData, clientName: e.target.value })}
                placeholder="Full name"
                className="h-11 rounded-xl"
              />
            </div>

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
              <GitCompare className="h-5 w-5 text-primary" />
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
      {/* Transfer Client Dialog (Phase E) */}
      {clientName && user && authProfile?.organizationId && (
        <TransferClientDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          clientName={clientName}
          currentCoachUid={profile?.assignedCoachUid ?? user.uid}
          organizationId={authProfile.organizationId}
          onConfirm={handleTransferClient}
        />
      )}
    </AppShell>
  );
};

export default ClientDetail;
