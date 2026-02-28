import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useClientDetail } from '@/hooks/useClientDetail';
import { PILLAR_DISPLAY } from '@/constants/pillars';
import { RetestScheduleCard } from '@/components/RetestScheduleCard';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  UserPlus,
  Edit2,
  X,
  TrendingUp,
  TrendingDown,
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
  ChevronDown,
  MoreVertical,
  ArrowRightLeft as ArrowRightLeftIcon,
  PauseCircle,
  PlayCircle,
  Archive,
  RotateCcw,
  Trophy,
  CalendarClock,
} from 'lucide-react';
import { useTokenAchievements } from '@/hooks/useTokenAchievements';
import { ACHIEVEMENT_DEFINITIONS } from '@/constants/achievements';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Collapsible section wrapper
const CollapsibleSection = ({ title, icon, badge, children, defaultOpen = true }: {
  title: string; icon: ReactNode; badge?: ReactNode; children: ReactNode; defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 p-4 sm:p-6 hover:bg-slate-50/50 transition-colors"
      >
        <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 min-w-0 truncate">
          <span className="shrink-0">{icon}</span>
          <span className="truncate">{title}</span>
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          {badge}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && <div className="px-4 sm:px-6 pb-4 sm:pb-6">{children}</div>}
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

import { TransferClientDialog } from '@/components/client/TransferClientDialog';
import { PauseClientDialog } from '@/components/client/PauseClientDialog';
import { ArchiveClientDialog } from '@/components/client/ArchiveClientDialog';

/** Inline achievements summary for the coach's client detail page */
function ClientAchievementsSummary({ shareToken }: { shareToken: string }) {
  const { achievements, unlockedCount, isLoading } = useTokenAchievements(shareToken);
  
  if (isLoading) {
    return <p className="text-sm text-slate-400 py-4 text-center">Loading achievements...</p>;
  }
  
  if (achievements.length === 0) {
    return (
      <div className="py-6 text-center">
        <Trophy className="h-8 w-8 text-slate-200 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No achievements yet</p>
        <p className="text-xs text-slate-300 mt-1">Achievements will appear after assessments are evaluated</p>
      </div>
    );
  }

  const unlocked = achievements.filter(a => a.unlockedAt !== null);
  const totalDefs = ACHIEVEMENT_DEFINITIONS.length;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{unlockedCount}</span> of {totalDefs} unlocked
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {unlocked.map(a => (
          <div key={a.id} className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200/60 px-3 py-2">
            <span className="text-base">{a.icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-900 truncate">{a.title}</p>
              <p className="text-[10px] text-amber-600 truncate">{a.description}</p>
            </div>
          </div>
        ))}
      </div>
      {achievements.filter(a => !a.unlockedAt).length > 0 && (
        <p className="text-[10px] text-slate-400 pt-1">
          {achievements.filter(a => !a.unlockedAt).length} more achievements in progress
        </p>
      )}
    </div>
  );
}

const ClientDetail = () => {
  const { profile: authProfile, orgSettings } = useAuth();
  const {
    clientName,
    user,
    loading,
    assessments,
    profile,
    currentAssessment,
    categoryBreakdown,
    categoryChanges,
    stats,
    isEditing,
    editData,
    deleteDialog,
    setIsEditing,
    setEditData,
    setDeleteDialog,
    handleSaveProfile,
    handleNewAssessment,
    handleDeleteAssessment,
    handleTransferClient,
    handlePauseClient,
    handleUnpauseClient,
    handleArchiveClient,
    handleReactivateClient,
    navigateBack,
  } = useClientDetail();

  const [transferOpen, setTransferOpen] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const isPaused = profile?.status === 'paused';
  const isArchived = profile?.status === 'archived';

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
        title={clientName}
      >
        <div className="py-10 text-sm text-slate-600">Loading client data…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={clientName}
      hideTitle
      actions={
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={navigateBack} className="h-9 w-9 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <DropdownMenuItem onClick={() => handleNewAssessment()} className="py-3 text-sm font-medium">
                <UserPlus className="mr-2 h-4 w-4" />
                New Assessment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsEditing(!isEditing)} className="py-3 text-sm font-medium">
                {isEditing ? <X className="mr-2 h-4 w-4" /> : <Edit2 className="mr-2 h-4 w-4" />}
                {isEditing ? 'Cancel Edit' : 'Edit Profile'}
              </DropdownMenuItem>
              {(authProfile?.role === 'org_admin' || profile?.assignedCoachUid === user?.uid) && (
                <DropdownMenuItem onClick={() => setTransferOpen(true)} className="py-3 text-sm font-medium">
                  <ArrowRightLeftIcon className="mr-2 h-4 w-4" />
                  Transfer Client
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setPauseDialogOpen(true)} className="py-3 text-sm font-medium">
                {isPaused ? (
                  <><PlayCircle className="mr-2 h-4 w-4 text-emerald-500" /> Unpause Account</>
                ) : (
                  <><PauseCircle className="mr-2 h-4 w-4 text-amber-500" /> Pause Account</>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setArchiveDialogOpen(true)} className="py-3 text-sm font-medium">
                {isArchived ? (
                  <><RotateCcw className="mr-2 h-4 w-4 text-emerald-500" /> Reactivate Client</>
                ) : (
                  <><Archive className="mr-2 h-4 w-4 text-amber-500" /> Archive Client</>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      {/* Custom header row: client name + Report button */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 truncate">
          {clientName}
        </h1>
        {currentAssessment && assessments.length > 0 && (
          <Button
            size="sm"
            className="h-8 px-3 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 gap-1.5 text-xs shrink-0"
            asChild
          >
            <Link to={`/coach/assessments/${assessments[0].id}?clientName=${encodeURIComponent(clientName)}`}>
              <FileText className="h-3.5 w-3.5" />
              Report
            </Link>
          </Button>
        )}
      </div>

      <div className="space-y-8">

        {/* 1. Overview Stats */}
        <CollapsibleSection
          title="Overview"
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
        >
          <div className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">Total</div>
              <div className="text-2xl font-bold text-slate-900">{stats.totalAssessments}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">Latest</div>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-bold text-slate-900">{stats.latestScore}</div>
                {stats.trend !== 'neutral' && (
                  <div className={`flex items-center mb-0.5 ${stats.trend === 'up' ? 'text-score-green' : 'text-score-red'}`}>
                    {stats.trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">Average</div>
              <div className="text-2xl font-bold text-slate-900">{stats.averageScore}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">Change</div>
              <div className={`text-2xl font-bold ${
                stats.scoreChange > 0 ? 'text-score-green-fg' : stats.scoreChange < 0 ? 'text-score-red-fg' : 'text-slate-900'
              }`}>
                {stats.scoreChange > 0 ? '+' : ''}{stats.scoreChange}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* 2. Current Live Scores (pillar breakdown + overall) */}
        <CollapsibleSection
          title="Pillar Scores"
          icon={<Activity className="h-5 w-5 text-primary" />}
        >
          {!currentAssessment ? (
            <div className="py-12 text-center bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500 mb-6">No assessment data found for this client.</p>
              <Button onClick={() => handleNewAssessment()} className="bg-slate-900 text-white rounded-xl h-12 px-8">
                <UserPlus className="h-4 w-4 mr-2" />
                Start First Assessment
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { id: 'lifestyle', label: 'Lifestyle Factors', color: 'text-primary', bg: 'bg-primary', icon: Activity },
                { id: 'bodyComp', label: 'Body Composition', color: 'text-primary', bg: 'bg-primary', icon: Scan },
                { id: 'movementQuality', label: 'Movement Quality', color: 'text-primary', bg: 'bg-primary', icon: UserCheck },
                { id: 'strength', label: 'Functional Strength', color: 'text-primary', bg: 'bg-primary', icon: Dumbbell },
                { id: 'cardio', label: 'Metabolic Fitness', color: 'text-primary', bg: 'bg-primary', icon: Heart },
              ].map((cat, idx, arr) => (
                <div key={cat.id} className={`text-center p-4 sm:p-5 rounded-xl bg-slate-50 transition-all hover:bg-slate-100 ${
                  idx === arr.length - 1 && arr.length % 2 !== 0 ? 'col-span-2 sm:col-span-1' : ''
                }`}>
                  <div className="flex justify-center mb-3">
                    <cat.icon className={`h-6 w-6 ${cat.color} opacity-80`} />
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">
                    {cat.label}
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    {categoryBreakdown[cat.id] || 0}
                  </div>
                  {categoryChanges[cat.id] !== undefined && categoryChanges[cat.id] !== 0 && (
                    <div className={`text-[10px] font-bold flex items-center justify-center gap-0.5 mb-2 ${categoryChanges[cat.id] > 0 ? 'text-score-green-fg' : 'text-score-red-fg'}`}>
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

        {/* 3. Quick Assessments */}
        <CollapsibleSection
          title="Quick Assessments"
          icon={<TargetIcon className="h-5 w-5 text-primary" />}
        >
          <div className="grid gap-2 sm:gap-3 grid-cols-3 sm:grid-cols-5">
            {[
              { id: 'lifestyle', label: PILLAR_DISPLAY.lifestyle.short, icon: Activity, color: 'text-primary', bg: 'bg-brand-light' },
              { id: 'bodycomp', label: PILLAR_DISPLAY.bodyComp.short, icon: Scan, color: 'text-primary', bg: 'bg-brand-light' },
              { id: 'posture', label: PILLAR_DISPLAY.movementQuality.short, icon: UserCheck, color: 'text-primary', bg: 'bg-brand-light' },
              { id: 'strength', label: PILLAR_DISPLAY.strength.short, icon: Dumbbell, color: 'text-primary', bg: 'bg-brand-light' },
              { id: 'fitness', label: PILLAR_DISPLAY.cardio.short, icon: Heart, color: 'text-primary', bg: 'bg-brand-light' },
            ].map((action) => (
              <Button
                key={action.id}
                variant="outline"
                onClick={() => handleNewAssessment(action.id as 'lifestyle' | 'bodycomp' | 'posture' | 'strength' | 'fitness')}
                className="flex flex-col items-center gap-2 h-auto py-3 sm:py-4 rounded-xl border-slate-100 hover:border-primary/20 hover:bg-brand-light transition-all group"
              >
                <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg ${action.bg} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <action.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${action.color}`} />
                </div>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em] leading-tight text-center">{action.label}</span>
              </Button>
            ))}
          </div>
        </CollapsibleSection>

        {/* 4. Client Achievements */}
        {profile?.shareToken && (
          <CollapsibleSection
            title="Client Achievements"
            icon={<Trophy className="h-4 w-4 text-amber-500" />}
            defaultOpen={false}
          >
            <ClientAchievementsSummary shareToken={profile.shareToken} />
          </CollapsibleSection>
        )}
      </div>

      {/* Client Profile & Settings Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Client Profile: {clientName}</DialogTitle>
            <DialogDescription>
              Contact info, scheduling, and coaching notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1 -mx-6 px-6">
            <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 flex items-center gap-2">
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
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 flex items-center gap-2">
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
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" /> Phone Number
              </label>
              <Input
                value={editData.phone || ''}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 flex items-center gap-2">
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
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 flex items-center gap-2">
                  <CalendarClock className="h-3.5 w-3.5" /> Training Start
                </label>
                <Input
                  type="date"
                  value={editData.trainingStartDate || ''}
                  onChange={(e) => setEditData({ ...editData, trainingStartDate: e.target.value })}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Internal Coaching Notes</label>
              <Textarea
                value={editData.notes || ''}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                placeholder="Add medical history, training preferences, or other important details..."
                rows={3}
                className="rounded-xl resize-none"
              />
            </div>

            {/* Assessment Schedule Settings */}
            {authProfile?.organizationId && (
              <div className="pt-2 border-t border-slate-100">
                <RetestScheduleCard
                  profile={profile}
                  clientName={clientName}
                  organizationId={authProfile.organizationId}
                  orgDefaultIntervals={orgSettings?.defaultCadence?.intervals}
                  orgDefaultActivePillars={orgSettings?.defaultCadence?.activePillars}
                />
              </div>
            )}
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

      <PauseClientDialog
        open={pauseDialogOpen}
        onOpenChange={setPauseDialogOpen}
        clientName={clientName}
        isPaused={isPaused}
        onPause={handlePauseClient}
        onUnpause={handleUnpauseClient}
      />
      <ArchiveClientDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        clientName={clientName}
        isArchived={isArchived}
        onArchive={handleArchiveClient}
        onReactivate={handleReactivateClient}
      />
    </AppShell>
  );
};

export default ClientDetail;
