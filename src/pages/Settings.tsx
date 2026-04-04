import React, { useState, useEffect, useMemo, useRef } from 'react';
import { updateProfile } from 'firebase/auth';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { useSettings } from '@/hooks/useSettings';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { updateOrgSettings, uploadOrgLogo, type OrgSettings, DEFAULT_EQUIPMENT_CONFIG } from '@/services/organizations';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Palette, ShieldCheck, Box, Settings as SettingsIcon, User, Building2, Calendar, ArrowLeft, Bell, CreditCard } from 'lucide-react';
import { getAllGradients, type GradientId } from '@/lib/design/gradients';
import { doc, setDoc } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { STRIPE_CONFIG } from '@/constants/platform';
import { DEFAULT_REGION, REGION_TO_CURRENCY, type Region } from '@/constants/pricing';
import { formatPrice, getLocaleForRegion } from '@/lib/utils/currency';
import { getCustomBrandingPrice } from '@/lib/pricing/config';
import { DefaultCadenceSettings } from '@/components/settings/DefaultCadenceSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { OrgSettingSwitch } from '@/components/settings/OrgSettingSwitch';
import { ROUTES } from '@/constants/routes';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { ASSESSMENT_COPY } from '@/constants/assessmentCopy';
import { SETTINGS_COPY } from '@/constants/settingsCopy';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile, orgSettings, refreshSettings } = useAuth();
  const [localDisplayName, setLocalDisplayName] = useState(profile?.displayName ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const { toast } = useToast();
  const [localOrgName, setLocalOrgName] = useState(orgSettings?.name || '');
  const [localGradientId, setLocalGradientId] = useState<GradientId>((orgSettings?.gradientId as GradientId) || 'volt');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [brandingCheckoutLoading, setBrandingCheckoutLoading] = useState(false);
  const brandingPurchaseSuccessHandled = useRef(false);
  const gradients = getAllGradients();

  const [coachGuidanceAssessment, setCoachGuidanceAssessment] = useState(true);
  useEffect(() => {
    try {
      setCoachGuidanceAssessment(localStorage.getItem(STORAGE_KEYS.COACH_GUIDANCE_IN_ASSESSMENT) !== '0');
    } catch {
      setCoachGuidanceAssessment(true);
    }
  }, []);

  // Check if user is an organization admin (coaches have limited access)
  const isAdmin = profile?.role === 'org_admin';

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const orgTabParam = searchParams.get('orgTab');

  const mainTab = useMemo(() => {
    if (tabParam === 'notifications') return 'notifications';
    if (tabParam === 'organization' && isAdmin) return 'organization';
    return 'profile';
  }, [tabParam, isAdmin]);

  const orgTab = useMemo(() => {
    const t = orgTabParam ?? 'branding';
    if (t === 'modules' || t === 'equipment' || t === 'schedule' || t === 'branding') return t;
    return 'branding';
  }, [orgTabParam]);

  useEffect(() => {
    if (orgSettings) {
      setLocalOrgName(orgSettings.name);
      setLocalGradientId((orgSettings.gradientId as GradientId) || 'volt');
    }
  }, [orgSettings]);

  useEffect(() => {
    setLocalDisplayName(profile?.displayName ?? '');
  }, [profile?.displayName]);

  useEffect(() => {
    if (searchParams.get('branding_purchase') !== 'success') return;
    if (brandingPurchaseSuccessHandled.current) return;
    brandingPurchaseSuccessHandled.current = true;
    toast({
      title: SETTINGS_COPY.BRANDING_PURCHASE_SUCCESS,
      description: SETTINGS_COPY.BRANDING_PURCHASE_SUCCESS_DETAIL,
    });
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete('branding_purchase');
        return p;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams, toast]);

  const brandingDirty = useMemo(() => {
    if (!orgSettings) return false;
    return localOrgName !== orgSettings.name || localGradientId !== (orgSettings.gradientId || 'volt');
  }, [orgSettings, localOrgName, localGradientId]);

  const profileDirty = useMemo(() => {
    const saved = (profile?.displayName ?? '').trim();
    return localDisplayName.trim() !== saved;
  }, [profile?.displayName, localDisplayName]);

  const anyUnsaved = brandingDirty || profileDirty;

  const brandingPriceFormatted = useMemo(() => {
    const r = (orgSettings?.subscription?.region ?? orgSettings?.region ?? DEFAULT_REGION) as Region;
    const currency = REGION_TO_CURRENCY[r] ?? 'GBP';
    return formatPrice(getCustomBrandingPrice(r), currency, getLocaleForRegion(r));
  }, [orgSettings?.subscription?.region, orgSettings?.region]);

  const { guardedNavigate } = useUnsavedChangesGuard(
    anyUnsaved,
    navigate,
    'You have unsaved changes. Leave anyway?',
  );

  const handlePurchaseCustomBranding = async () => {
    if (!profile?.organizationId) return;
    if (!STRIPE_CONFIG.isEnabled) {
      toast({ title: SETTINGS_COPY.BRANDING_STRIPE_DISABLED, variant: 'destructive' });
      return;
    }
    setBrandingCheckoutLoading(true);
    try {
      const fn = getFunctions();
      const createBranding = httpsCallable<
        { organizationId: string; returnTarget?: 'billing' | 'settings' },
        { sessionUrl: string | null }
      >(fn, 'createBrandingCheckoutSession');
      const result = await createBranding({
        organizationId: profile.organizationId,
        returnTarget: 'settings',
      });
      const sessionUrl = result.data.sessionUrl;
      if (!sessionUrl || !/^https?:\/\//i.test(sessionUrl)) {
        throw new Error('No checkout URL returned.');
      }
      window.location.assign(sessionUrl);
    } catch (err) {
      logger.error('Branding checkout failed:', err);
      const message = err instanceof Error ? err.message : SETTINGS_COPY.BRANDING_PURCHASE_ERROR;
      toast({ title: SETTINGS_COPY.BRANDING_PURCHASE_ERROR, description: message, variant: 'destructive' });
      setBrandingCheckoutLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const next = localDisplayName.trim();
      await updateProfile(user, { displayName: next });
      await setDoc(
        doc(getDb(), 'userProfiles', user.uid),
        { displayName: next, updatedAt: new Date() },
        { merge: true },
      );
      toast({ title: SETTINGS_COPY.PROFILE_SAVED });
    } catch (err) {
      logger.error('Profile save error:', err);
      toast({ title: SETTINGS_COPY.PROFILE_SAVE_ERROR, variant: 'destructive' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveOrgInfo = async () => {
    if (!profile?.organizationId) return;
    setIsSaving(true);
    try {
      await updateOrgSettings(profile.organizationId, {
        name: localOrgName,
        gradientId: localGradientId,
      });
      await refreshSettings();
      toast({ title: 'Settings saved to database' });
    } catch (err) {
      logger.error('Save error:', err);
      toast({ 
        title: 'Database Permission Error', 
        description: 'Your changes were applied locally but could not be saved to the cloud. Please update your Firestore Rules.',
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleModuleToggle = async (moduleId: keyof OrgSettings['modules'], enabled: boolean) => {
    if (!profile?.organizationId || !orgSettings) return;
    try {
      const updatedModules = { ...orgSettings.modules, [moduleId]: enabled };
      await updateOrgSettings(profile.organizationId, { modules: updatedModules });
      await refreshSettings();
      toast({ title: `${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)} module updated` });
    } catch (err) {
      toast({ title: 'Permission Error', description: 'Cloud sync failed.', variant: 'destructive' });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.organizationId) return;
    
    setIsUploading(true);
    try {
      await uploadOrgLogo(profile.organizationId, file);
      await refreshSettings();
      toast({ title: 'Logo uploaded successfully' });
    } catch (err) {
      toast({ title: 'Upload failed', description: 'Storage permissions restricted.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AppShell
      title="Settings"
      actions={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => guardedNavigate(ROUTES.DASHBOARD)}
          className="h-9 w-9 sm:h-8 sm:w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      }
    >
      <div className="max-w-4xl pb-20">
        {/* Tab Navigation */}
        <Tabs
          value={mainTab}
          onValueChange={(v) => {
            setSearchParams(
              (prev) => {
                const p = new URLSearchParams(prev);
                p.set('tab', v);
                if (v !== 'organization') {
                  p.delete('orgTab');
                }
                return p;
              },
              { replace: true },
            );
          }}
          className="w-full"
        >
          <TabsList className="w-full mb-6 p-1 h-auto bg-muted rounded-xl grid grid-cols-3 gap-1">
            <TabsTrigger
              value="profile"
              className="flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold data-[state=active]:bg-card"
            >
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger
                value="organization"
                className="flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold data-[state=active]:bg-card"
              >
                <Building2 className="h-4 w-4" />
                Organization
              </TabsTrigger>
            )}
            <TabsTrigger
              value="notifications"
              className="flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold data-[state=active]:bg-card"
            >
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-8 mt-0">
            {/* User Info & Role */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4 rounded-2xl bg-foreground text-background shadow-xl">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-primary mb-1 opacity-80">Current Account</p>
                <h2 className="text-base sm:text-lg font-bold leading-none truncate">{profile?.displayName || user?.email}</h2>
              </div>
              <div className="sm:text-right flex flex-col sm:items-end gap-1 shrink-0">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-primary opacity-80">Access Level</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-primary-foreground w-fit">
                  {isAdmin ? 'Organization Admin' : 'Coach'}
                </span>
              </div>
            </div>

            {/* Profile Information */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-foreground mb-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">{isAdmin ? 'Admin Profile' : 'Coach Profile'}</h2>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Email</Label>
                    <Input
                      value={user?.email || ''}
                      disabled
                      readOnly
                      className="rounded-xl border-border h-11 bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">{SETTINGS_COPY.PROFILE_EMAIL_MANAGED}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Display Name</Label>
                    <Input
                      value={localDisplayName}
                      onChange={(e) => setLocalDisplayName(e.target.value)}
                      className="rounded-xl border-border h-11"
                      autoComplete="name"
                      maxLength={120}
                    />
                    <p className="text-xs text-muted-foreground">{SETTINGS_COPY.PROFILE_DISPLAY_NAME_HELP}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Organization</Label>
                  <Input
                    value={orgSettings?.name || 'Not assigned'}
                    disabled
                    readOnly
                    className="rounded-xl border-border h-11 bg-muted"
                  />
                  {isAdmin ? (
                    <Button type="button" variant="link" className="h-auto p-0 text-sm" asChild>
                      <Link to={`${ROUTES.SETTINGS}?tab=organization&orgTab=branding`}>
                        {SETTINGS_COPY.PROFILE_ORG_LINK}
                      </Link>
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">{SETTINGS_COPY.PROFILE_ORG_READONLY_COACH}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={!profileDirty || isSavingProfile}
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                        Saving…
                      </>
                    ) : (
                      SETTINGS_COPY.PROFILE_SAVE
                    )}
                  </Button>
                </div>
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Contact your organization admin to change organisation-wide settings.
                  </p>
                )}
              </div>
            </section>

            {isAdmin && (
              <section className="space-y-4">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary shrink-0" aria-hidden />
                      <h2 className="text-lg font-bold text-foreground">{SETTINGS_COPY.BILLING_CARD_TITLE}</h2>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-lg">{SETTINGS_COPY.BILLING_CARD_DESCRIPTION}</p>
                  </div>
                  <Button type="button" variant="default" className="shrink-0" asChild>
                    <Link to={ROUTES.BILLING}>{SETTINGS_COPY.BILLING_CARD_CTA}</Link>
                  </Button>
                </div>
              </section>
            )}

            <section className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-bold text-foreground">{ASSESSMENT_COPY.COACH_GUIDANCE_TOGGLE}</Label>
                  <p className="text-xs text-muted-foreground max-w-md">
                    When off, the subtle guidance strip is hidden during assessments (this device only).
                  </p>
                </div>
                <Switch
                  checked={coachGuidanceAssessment}
                  onCheckedChange={(checked) => {
                    try {
                      localStorage.setItem(STORAGE_KEYS.COACH_GUIDANCE_IN_ASSESSMENT, checked ? '1' : '0');
                    } catch {
                      // noop
                    }
                    setCoachGuidanceAssessment(checked);
                  }}
                />
              </div>
            </section>

            {/* Active Coach Toggle (Admin Only, non-solo) */}
            {isAdmin && orgSettings?.type !== 'solo_coach' && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-foreground mb-2">
                  <User className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold">Coaching Role</h2>
                </div>
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <Label className="text-sm font-bold text-foreground">I also coach clients myself</Label>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                        {profile?.isActiveCoach
                          ? 'You see your own client list alongside team management tools.'
                          : 'You manage your coaching team without a personal client list.'}
                      </p>
                    </div>
                    <Switch
                      checked={profile?.isActiveCoach ?? true}
                      onCheckedChange={async (checked) => {
                        if (!user) return;
                        try {
                          await setDoc(doc(getDb(), 'userProfiles', user.uid), {
                            isActiveCoach: checked,
                            updatedAt: new Date(),
                          }, { merge: true });
                          await refreshSettings();
                          toast({
                            title: checked
                              ? 'Coaching mode enabled'
                              : 'Coaching mode disabled',
                            description: checked
                              ? 'Your personal client list is now visible.'
                              : 'You will only see team management tools.',
                          });
                        } catch (err) {
                          logger.error('Failed to update coaching role:', err);
                          toast({ title: 'Failed to update', variant: 'destructive' });
                        }
                      }}
                    />
                  </div>
                </div>
              </section>
            )}
          </TabsContent>

          {/* Organization Tab (Admin Only) */}
          {isAdmin && (
            <TabsContent value="organization" className="mt-0">
            <Tabs
              value={orgTab}
              onValueChange={(v) => {
                setSearchParams(
                  (prev) => {
                    const p = new URLSearchParams(prev);
                    p.set('tab', 'organization');
                    p.set('orgTab', v);
                    return p;
                  },
                  { replace: true },
                );
              }}
              className="w-full"
            >
              <TabsList className="w-full mb-6 p-1 h-auto bg-muted rounded-xl grid grid-cols-4 gap-1">
                <TabsTrigger value="branding" className="py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:bg-card">Branding</TabsTrigger>
                <TabsTrigger value="modules" className="py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:bg-card">Modules</TabsTrigger>
                <TabsTrigger value="equipment" className="py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:bg-card">Equipment</TabsTrigger>
                <TabsTrigger value="schedule" className="py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold data-[state=active]:bg-card">Schedule</TabsTrigger>
              </TabsList>
              <TabsContent value="branding" className="space-y-8 mt-0">
            {orgSettings?.customBrandingEnabled === false ? (
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-foreground mb-2">
                <Palette className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Custom Branding</h2>
              </div>
              <p className="text-sm text-foreground-secondary">
                Custom branding (your logo and brand colours on reports and in the app) is a paid add-on. All reports show &ldquo;Powered by One Assess&rdquo; so clients know the assessment platform behind your brand.
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{brandingPriceFormatted}</span> one-time —{' '}
                {SETTINGS_COPY.BRANDING_PURCHASE_HELP}
              </p>
              <Button
                type="button"
                className="rounded-xl font-semibold"
                disabled={brandingCheckoutLoading}
                onClick={() => void handlePurchaseCustomBranding()}
              >
                {brandingCheckoutLoading ? SETTINGS_COPY.BRANDING_PURCHASE_LOADING : SETTINGS_COPY.BRANDING_PURCHASE_CTA}
              </Button>
              <p className="text-xs text-muted-foreground">
                Questions?{' '}
                <a
                  href="mailto:support@one-assess.com?subject=Custom%20branding%20add-on"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Email support
                </a>{' '}
                or{' '}
                <Link to={`${ROUTES.CONTACT}?interest=custom-branding`} className="font-semibold text-primary underline-offset-4 hover:underline">
                  contact form
                </Link>
                .
              </p>

              <div className="rounded-2xl border border-dashed border-border bg-muted/80 p-6 space-y-4 mt-6">
                <h3 className="text-sm font-bold text-foreground">Preview branding (optional)</h3>
                <p className="text-xs text-muted-foreground">
                  Save a name and gradient for when you purchase. Clients and navigation still show One Assess
                  branding until the add-on is active.
                </p>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                    Organization name
                  </Label>
                  <Input
                    value={localOrgName}
                    onChange={(e) => setLocalOrgName(e.target.value)}
                    placeholder="Organization name"
                    className="rounded-xl border-border h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                    Brand gradient
                  </Label>
                  <Select value={localGradientId} onValueChange={(value) => setLocalGradientId(value as GradientId)}>
                    <SelectTrigger className="w-full rounded-xl border-border h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gradients.map((gradient) => (
                        <SelectItem key={gradient.id} value={gradient.id}>
                          {gradient.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  className="rounded-xl"
                  disabled={isSaving || !brandingDirty}
                  onClick={() => void handleSaveOrgInfo()}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save preview'}
                </Button>
              </div>
            </section>
            ) : (
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-foreground mb-2">
                <Palette className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Organization Branding</h2>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                {/* Name and Gradient */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Organization Name</Label>
                    <Input 
                      value={localOrgName} 
                      onChange={(e) => setLocalOrgName(e.target.value)}
                      placeholder="Organization Name"
                      className="rounded-xl border-border h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Brand Gradient</Label>
                    <Select value={localGradientId} onValueChange={(value) => setLocalGradientId(value as GradientId)}>
                      <SelectTrigger className="w-full rounded-xl border-border h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {gradients.map((gradient) => (
                          <SelectItem key={gradient.id} value={gradient.id}>
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-6 h-6 rounded-md"
                                style={{
                                  background: `linear-gradient(to right, ${gradient.fromHex}, ${gradient.toHex})`
                                }}
                              />
                              <span>{gradient.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                      {gradients.map((gradient) => (
                        <button
                          key={gradient.id}
                          type="button"
                          onClick={() => setLocalGradientId(gradient.id)}
                          className={`relative h-12 rounded-xl border-2 transition-all ${
                            localGradientId === gradient.id
                              ? 'border-foreground shadow-md scale-105'
                              : 'border-border hover:border-muted-foreground/40'
                          }`}
                          style={{
                            background: `linear-gradient(to right, ${gradient.fromHex}, ${gradient.toHex})`
                          }}
                          title={gradient.name}
                        >
                          {localGradientId === gradient.id && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-5 h-5 rounded-full bg-card/90 flex items-center justify-center">
                                <svg className="w-3 h-3 text-foreground" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button 
                    onClick={handleSaveOrgInfo} 
                    disabled={isSaving}
                    className="w-full rounded-xl bg-foreground text-background font-bold h-11 shadow-lg transition-all hover:bg-foreground/90"
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Branding
                  </Button>
                </div>

                {/* Logo Upload */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground self-start">Organization Logo</Label>
                  <div className="h-28 w-full flex items-center justify-center rounded-xl bg-muted">
                    {orgSettings?.logoUrl ? (
                      <img src={orgSettings.logoUrl} alt="Org Logo" className="h-20 w-auto object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                        <Upload className="h-6 w-6 opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-[0.15em]">No Logo</span>
                      </div>
                    )}
                  </div>
                  <div className="relative w-full">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      disabled={isUploading}
                    />
                    <Button variant="outline" className="w-full rounded-xl font-bold h-11 gap-2 border-border bg-card hover:bg-muted">
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {orgSettings?.logoUrl ? 'Change Logo' : 'Upload New Logo'}
                    </Button>
                  </div>
                </div>
              </div>
            </section>
            )}
              </TabsContent>
              <TabsContent value="modules" className="mt-0">
            {/* Assessment Modules */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-foreground mb-2">
                <Box className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Assessment Modules</h2>
              </div>
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="divide-y divide-border">
                  {Object.entries(orgSettings?.modules || {}).map(([moduleId, enabled]) => {
                    const assessmentLabels: Record<string, { label: string; description: string }> = {
                      parq: { label: 'PAR-Q', description: 'Health screening questionnaire required before physical testing.' },
                      bodycomp: { label: 'Body Composition', description: 'Body composition, muscle mass, and fat analysis using your configured equipment.' },
                      fitness: { label: 'Metabolic Fitness', description: 'Resting heart rate and VO2 Max estimates via cardio tests.' },
                      posture: { label: 'Posture Analysis', description: 'AI posture analysis and alignment checks.' },
                      overheadSquat: { label: 'Overhead Squat', description: 'Movement quality assessment for overhead squat pattern.' },
                      hinge: { label: 'Hinge Assessment', description: 'Hip hinge movement quality and range of motion.' },
                      lunge: { label: 'Lunge Assessment', description: 'Lunge movement quality, balance, and knee tracking.' },
                      mobility: { label: 'Mobility Screening', description: 'Joint mobility assessment for hips, shoulders, and ankles.' },
                      strength: { label: 'Functional Strength', description: 'Grip strength, pushups, planks, and foundational power.' },
                      lifestyle: { label: 'Lifestyle Factors', description: 'Sleep, stress, nutrition, hydration, and recovery habits.' },
                    };
                    const info = assessmentLabels[moduleId] || { label: moduleId, description: '' };
                    return (
                      <div key={moduleId} className="flex items-center justify-between gap-4 p-4 sm:p-5 hover:bg-muted/50 transition-colors">
                        <div className="space-y-1">
                          <Label className="text-sm font-bold text-foreground">{info.label}</Label>
                          <p className="text-xs text-muted-foreground font-medium leading-relaxed max-w-md">
                            {info.description}
                          </p>
                        </div>
                        <Switch 
                          checked={enabled as boolean}
                          onCheckedChange={(checked) => handleModuleToggle(moduleId as keyof OrgSettings['modules'], checked)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
              </TabsContent>
              <TabsContent value="equipment" className="mt-0">
            {/* Equipment Configuration */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-foreground mb-2">
                <SettingsIcon className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Equipment Configuration</h2>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 space-y-8 shadow-sm">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Configure the equipment available at your facility. Enable equipment to unlock advanced assessment protocols. You can add equipment at any time.
                </p>

                {/* 1. Body Composition Analyser */}
                <div className="space-y-4 pb-6 border-b border-border">
                  <OrgSettingSwitch
                    label="Body Composition Analyser"
                    description={orgSettings?.equipmentConfig?.bodyComposition?.enabled
                      ? 'Enabled: Assessments will use a professional body composition analyser (BIA, DEXA, etc.)'
                      : 'Disabled: Assessments will use body measurements + skinfold test (clients can still bring their own reports)'}
                    checked={orgSettings?.equipmentConfig?.bodyComposition?.enabled ?? false}
                    onToggle={async (enabled) => {
                      if (!profile?.organizationId || !orgSettings) return;
                      try {
                        await updateOrgSettings(profile.organizationId, {
                          equipmentConfig: {
                            ...(orgSettings.equipmentConfig || DEFAULT_EQUIPMENT_CONFIG),
                            bodyComposition: { enabled },
                          },
                        });
                        await refreshSettings();
                        toast({
                          title: enabled ? 'Body composition analyser enabled' : 'Body composition analyser disabled - using equipment-free alternatives',
                        });
                      } catch (err) {
                        toast({ title: 'Failed to update', variant: 'destructive' });
                      }
                    }}
                  />
                </div>

                {/* 2. Dynamometer / Grip Strength */}
                <div className="space-y-4 pb-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label className="text-sm font-bold text-foreground">Dynamometer / Grip Strength Equipment</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {orgSettings?.equipmentConfig?.gripStrength?.enabled 
                          ? 'Enabled: Assessments will use dynamometer'
                          : 'Disabled: Assessments will use deadhang + pinch test options (equipment-free)'}
                      </p>
                    </div>
                    <Switch
                      checked={orgSettings?.equipmentConfig?.gripStrength?.enabled ?? false}
                      onCheckedChange={async (enabled) => {
                        if (!profile?.organizationId || !orgSettings) return;
                        try {
                          await updateOrgSettings(profile.organizationId, {
                            equipmentConfig: {
                              ...(orgSettings.equipmentConfig || DEFAULT_EQUIPMENT_CONFIG),
                              gripStrength: {
                                enabled,
                              }
                            }
                          });
                          await refreshSettings();
                          toast({ 
                            title: enabled 
                              ? 'Grip strength equipment enabled' 
                              : 'Grip strength equipment disabled - using equipment-free alternatives',
                            description: enabled 
                              ? 'Future assessments will use dynamometer' 
                              : 'Future assessments will use deadhang + pinch test options'
                          });
                        } catch (err) {
                          toast({ title: 'Failed to update', variant: 'destructive' });
                        }
                      }}
                    />
                  </div>
                </div>

                {/* 3. Heart Rate Sensor */}
                <div className="space-y-4 pb-6 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label className="text-sm font-bold text-foreground">Heart Rate Sensor</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {orgSettings?.equipmentConfig?.heartRateSensor?.enabled 
                          ? 'Enabled: Assessments will use HR sensor integration'
                          : 'Disabled: Assessments will use manual pulse counting (equipment-free)'}
                      </p>
                    </div>
                    <Switch
                      checked={orgSettings?.equipmentConfig?.heartRateSensor?.enabled ?? false}
                      onCheckedChange={async (enabled) => {
                        if (!profile?.organizationId || !orgSettings) return;
                        try {
                          await updateOrgSettings(profile.organizationId, {
                            equipmentConfig: {
                              ...(orgSettings.equipmentConfig || DEFAULT_EQUIPMENT_CONFIG),
                              heartRateSensor: {
                                enabled
                              }
                            }
                          });
                          await refreshSettings();
                          toast({ 
                            title: enabled 
                              ? 'Heart rate sensor enabled' 
                              : 'Heart rate sensor disabled - using manual pulse counting',
                            description: enabled 
                              ? 'Future assessments will use HR sensor integration' 
                              : 'Future assessments will use manual pulse counting'
                          });
                        } catch (err) {
                          toast({ title: 'Failed to update', variant: 'destructive' });
                        }
                      }}
                    />
                  </div>
                </div>

                {/* 4. Cardio Equipment */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label className="text-sm font-bold text-foreground">Cardio Equipment</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {orgSettings?.equipmentConfig?.cardioEquipment?.enabled
                          ? 'Enabled: Assessments will use treadmill/bike/rower protocols'
                          : 'Disabled: Assessments will use step test (equipment-free)'}
                      </p>
                    </div>
                    <Switch
                      checked={orgSettings?.equipmentConfig?.cardioEquipment?.enabled ?? false}
                      onCheckedChange={async (enabled) => {
                        if (!profile?.organizationId || !orgSettings) return;
                        try {
                          await updateOrgSettings(profile.organizationId, {
                            equipmentConfig: {
                              ...(orgSettings.equipmentConfig || DEFAULT_EQUIPMENT_CONFIG),
                              cardioEquipment: {
                                enabled
                              }
                            }
                          });
                          await refreshSettings();
                          toast({
                            title: enabled
                              ? 'Cardio equipment enabled'
                              : 'Cardio equipment disabled - using step test',
                            description: enabled
                              ? 'Future assessments will use treadmill/bike/rower'
                              : 'Future assessments will use step test'
                          });
                        } catch (err) {
                          toast({ title: 'Failed to update', variant: 'destructive' });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>
              </TabsContent>
              <TabsContent value="schedule" className="mt-0">
            {/* Default Retest Schedule */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-foreground mb-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Default Retest Schedule</h2>
              </div>
              <DefaultCadenceSettings
                orgSettings={orgSettings}
                organizationId={profile.organizationId}
                onSave={refreshSettings}
              />
            </section>
              </TabsContent>
            </Tabs>
            </TabsContent>
          )}

          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};

export default Settings;
