import { useState, useEffect, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ROUTES } from '@/constants/routes';
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
  Map,
} from 'lucide-react';
import { useTokenAchievements } from '@/hooks/useTokenAchievements';
import { ACHIEVEMENT_DEFINITIONS } from '@/constants/achievements';
import { getRoadmapForClient } from '@/services/roadmaps';
import { formatSnapshotTypeLabel } from '@/services/assessmentHistory';
import { ClipboardCheck, History, Pencil, Trash2, ExternalLink } from 'lucide-react';

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
    <div className="rounded-2xl bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 p-4 sm:p-6 hover:bg-muted/50 transition-colors"
      >
        <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2 min-w-0 truncate">
          <span className="shrink-0">{icon}</span>
          <span className="truncate">{title}</span>
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          {badge}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
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
    return <p className="text-sm text-muted-foreground py-4 text-center">Loading achievements...</p>;
  }
  
  if (achievements.length === 0) {
    return (
      <div className="py-6 text-center">
        <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No achievements yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Achievements will appear after assessments are evaluated</p>
      </div>
    );
  }

  const unlocked = achievements.filter(a => a.unlockedAt !== null);
  const totalDefs = ACHIEVEMENT_DEFINITIONS.length;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground-secondary">{unlockedCount}</span> of {totalDefs} unlocked
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
        <p className="text-[10px] text-muted-foreground pt-1">
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
    displayClientName,
    user,
    loading,
    loadingSnapshots,
    assessments,
    profile,
    snapshots,
    currentAssessment,
    categoryBreakdown,
    categoryChanges,
    stats,
    isEditing,
    editData,
    deleteDialog,
    deleteSnapshotDialog,
    setIsEditing,
    setEditData,
    setDeleteDialog,
    setDeleteSnapshotDialog,
    handleSaveProfile,
    handleNewAssessment,
    handleFinishAssessment,
    handleDeleteAssessment,
    handleEditSnapshot,
    handleDeleteSnapshot,
    handleTransferClient,
    incompleteDraft,
    handlePauseClient,
    handleUnpauseClient,
    handleArchiveClient,
    handleReactivateClient,
    navigateBack,
  } = useClientDetail();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [transferOpen, setTransferOpen] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [roadmapStatus, setRoadmapStatus] = useState<'loading' | 'none' | 'draft' | 'sent'>('loading');
  const isPaused = profile?.status === 'paused';
  const isArchived = profile?.status === 'archived';
  const { effectiveOrgId } = useAuth();

  useEffect(() => {
    if (!loading && clientName) {
      const edit = searchParams.get('edit');
      const transfer = searchParams.get('transfer');
      const next = new URLSearchParams(searchParams);
      let updated = false;
      if (edit === 'true') {
        setIsEditing(true);
        next.delete('edit');
        updated = true;
      }
      if (transfer === 'true') {
        setTransferOpen(true);
        next.delete('transfer');
        updated = true;
      }
      if (updated) {
        setSearchParams(next, { replace: true });
      }
    }
  }, [loading, clientName, searchParams, setSearchParams, setIsEditing]);

  useEffect(() => {
    if (!effectiveOrgId || !clientName) return;
    let cancelled = false;
    getRoadmapForClient(effectiveOrgId, clientName).then((doc) => {
      if (cancelled) return;
      if (!doc) setRoadmapStatus('none');
      else if (doc.shareToken) setRoadmapStatus('sent');
      else setRoadmapStatus('draft');
    }).catch(() => { if (!cancelled) setRoadmapStatus('none'); });
    return () => { cancelled = true; };
  }, [effectiveOrgId, clientName]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-foreground-secondary">
        Loading…
      </div>
    );
  }

  if (loading) {
    return (
      <AppShell 
        title={displayClientName}
      >
        <div className="py-10 text-sm text-foreground-secondary">Loading client data…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={displayClientName}
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
      <Breadcrumb items={[
        { label: 'Dashboard', href: ROUTES.DASHBOARD },
        { label: displayClientName },
      ]} />

      {incompleteDraft && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-amber-900">
            This client has an incomplete assessment saved. Finish it to update their live report.
          </p>
          <Button
            size="sm"
            onClick={handleFinishAssessment}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
          >
            Finish assessment
          </Button>
        </div>
      )}

      {/* Custom header row: client name + Report button */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground truncate">
          {displayClientName}
        </h1>
        {currentAssessment && assessments.length > 0 && (
          <Button
            size="sm"
            className="h-8 px-3 rounded-lg bg-foreground text-white font-bold hover:bg-foreground/90 gap-1.5 text-xs shrink-0"
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
            <div className="rounded-xl bg-muted p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">Total</div>
              <div className="text-2xl font-bold text-foreground">{stats.totalAssessments}</div>
            </div>
            <div className="rounded-xl bg-muted p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">Latest</div>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-bold text-foreground">{stats.latestScore}</div>
                {stats.trend !== 'neutral' && (
                  <div className={`flex items-center mb-0.5 ${stats.trend === 'up' ? 'text-score-green' : 'text-score-red'}`}>
                    {stats.trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-xl bg-muted p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">Average</div>
              <div className="text-2xl font-bold text-foreground">{stats.averageScore}</div>
            </div>
            <div className="rounded-xl bg-muted p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">Change</div>
              <div className={`text-2xl font-bold ${
                stats.scoreChange > 0 ? 'text-score-green-fg' : stats.scoreChange < 0 ? 'text-score-red-fg' : 'text-foreground'
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
            <div className="py-12 text-center bg-muted rounded-xl">
              <p className="text-sm text-muted-foreground mb-6">No assessment data found for this client.</p>
              <Button onClick={() => handleNewAssessment()} className="bg-foreground text-white rounded-xl h-12 px-8">
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
                <div key={cat.id} className={`text-center p-4 sm:p-5 rounded-xl bg-muted transition-all hover:bg-muted ${
                  idx === arr.length - 1 && arr.length % 2 !== 0 ? 'col-span-2 sm:col-span-1' : ''
                }`}>
                  <div className="flex justify-center mb-3">
                    <cat.icon className={`h-6 w-6 ${cat.color} opacity-80`} />
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">
                    {cat.label}
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">
                    {categoryBreakdown[cat.id] || 0}
                  </div>
                  {categoryChanges[cat.id] !== undefined && categoryChanges[cat.id] !== 0 && (
                    <div className={`text-[10px] font-bold flex items-center justify-center gap-0.5 mb-2 ${categoryChanges[cat.id] > 0 ? 'text-score-green-fg' : 'text-score-red-fg'}`}>
                      {categoryChanges[cat.id] > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                      {categoryChanges[cat.id] > 0 ? '+' : ''}{categoryChanges[cat.id]}
                    </div>
                  )}
                  {(!categoryChanges[cat.id] || categoryChanges[cat.id] === 0) && <div className="h-4 mb-2" />}
                  <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
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
                className="flex flex-col items-center gap-2 h-auto py-3 sm:py-4 rounded-xl border-border hover:border-primary/20 hover:bg-brand-light transition-all group"
              >
                <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg ${action.bg} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <action.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${action.color}`} />
                </div>
                <span className="text-[10px] font-bold text-foreground-secondary uppercase tracking-[0.15em] leading-tight text-center">{action.label}</span>
              </Button>
            ))}
          </div>
        </CollapsibleSection>

        {/* 4. Coach Findings */}
        <CollapsibleSection
          title="Coach Findings"
          icon={<FileText className="h-5 w-5 text-primary" />}
          defaultOpen={false}
        >
          {assessments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Complete an assessment to see coach findings.</p>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Latest score: {stats.latestScore}/100</p>
                {currentAssessment?.formData && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {Object.entries(categoryBreakdown).filter(([, v]) => v > 0 && v < 60).map(([k]) => {
                      const labels: Record<string, string> = { bodyComp: 'Body Comp', movementQuality: 'Movement', strength: 'Strength', cardio: 'Cardio', lifestyle: 'Lifestyle' };
                      return labels[k] || k;
                    }).slice(0, 2).join(', ') || 'No priority areas'}{' '}
                    {Object.entries(categoryBreakdown).filter(([, v]) => v > 0 && v < 60).length > 0 ? 'need attention' : ''}
                  </p>
                )}
              </div>
              <Button size="sm" variant="outline" className="rounded-lg text-xs shrink-0" asChild>
                <Link to={`/coach/assessments/${assessments[0].id}`}>
                  <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
                  View Report
                </Link>
              </Button>
            </div>
          )}
        </CollapsibleSection>

        {/* 5. Assessment history */}
        <CollapsibleSection
          title="Assessment history"
          icon={<History className="h-5 w-5 text-primary" />}
          defaultOpen={true}
        >
          {loadingSnapshots ? (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            </div>
          ) : snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No assessment history yet. Complete an assessment to see past snapshots here.</p>
          ) : (
            <ul className="space-y-2">
              {snapshots.map((snapshot) => (
                <li
                  key={snapshot.id ?? snapshot.timestamp.toMillis()}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-medium text-foreground">
                      {snapshot.timestamp?.toDate?.()?.toLocaleDateString?.() ?? '—'}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium tracking-wide">
                      {formatSnapshotTypeLabel(snapshot.type)}
                    </span>
                    <span className="text-sm font-semibold text-foreground-secondary">{snapshot.overallScore}/100</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {assessments[0]?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-foreground-secondary"
                        asChild
                      >
                        <Link to={`/coach/assessments/${assessments[0].id}?clientName=${encodeURIComponent(clientName)}`}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          View
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs text-foreground-secondary"
                      onClick={() => handleEditSnapshot(snapshot)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteSnapshotDialog({ snapshotId: snapshot.id ?? '' })}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>

        {/* 6. Client Roadmap */}
        <CollapsibleSection
          title="Client Roadmap"
          icon={<Map className="h-5 w-5 text-primary" />}
          badge={roadmapStatus === 'sent' ? <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Sent</span>
            : roadmapStatus === 'draft' ? <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Draft</span>
            : undefined}
        >
          {assessments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Complete an assessment first.</p>
          ) : roadmapStatus === 'loading' ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Checking roadmap status...</p>
          ) : roadmapStatus === 'none' ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Roadmap not yet created for this client.</p>
              <Button size="sm" className="rounded-lg text-xs shrink-0 bg-foreground text-white" asChild>
                <Link to={`/coach/clients/${encodeURIComponent(clientName)}/roadmap`}>Create Roadmap</Link>
              </Button>
            </div>
          ) : roadmapStatus === 'draft' ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Roadmap created but not sent to client.</p>
              <Button size="sm" variant="outline" className="rounded-lg text-xs shrink-0" asChild>
                <Link to={`/coach/clients/${encodeURIComponent(clientName)}/roadmap`}>Review & Send</Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Roadmap has been shared with client.</p>
              <Button size="sm" variant="outline" className="rounded-lg text-xs shrink-0" asChild>
                <Link to={`/coach/clients/${encodeURIComponent(clientName)}/roadmap`}>View / Edit</Link>
              </Button>
            </div>
          )}
        </CollapsibleSection>

        {/* 6. Client Achievements */}
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
            <DialogTitle>Client Profile: {displayClientName}</DialogTitle>
            <DialogDescription>
              Contact info, scheduling, and coaching notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1 -mx-6 px-6">
            <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
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
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
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
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
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
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
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
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
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
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Internal Coaching Notes</label>
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
              <div className="pt-2 border-t border-border">
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
            <Button onClick={handleSaveProfile} className="bg-foreground text-white rounded-xl h-11 px-6 font-bold">
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

      {/* Delete snapshot confirmation */}
      <Dialog open={!!deleteSnapshotDialog} onOpenChange={(open) => !open && setDeleteSnapshotDialog(null)}>
        <DialogContent className="rounded-2xl max-w-[90vw] sm:max-w-[425px]">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-bold tracking-tight">Remove snapshot</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground pt-2">
              Remove this assessment snapshot from history? If it was the latest, current will be restored from the previous snapshot.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 mt-6">
            <Button variant="outline" onClick={() => setDeleteSnapshotDialog(null)} className="flex-1 rounded-xl font-bold h-11">
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDeleteSnapshot()} className="flex-1 rounded-xl font-bold h-11">
              Remove
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
