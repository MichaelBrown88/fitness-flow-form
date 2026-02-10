import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, Palette, ShieldCheck, Box, Settings as SettingsIcon, User, Building2, Calendar, ArrowLeft } from 'lucide-react';
import { getAllGradients, type GradientId } from '@/lib/design/gradients';
import { doc, setDoc } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';
import { DefaultCadenceSettings } from '@/components/settings/DefaultCadenceSettings';
import { ROUTES } from '@/constants/routes';

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile, orgSettings, refreshSettings } = useAuth();
  const { toast } = useToast();
  const [localOrgName, setLocalOrgName] = useState(orgSettings?.name || '');
  const [localGradientId, setLocalGradientId] = useState<GradientId>((orgSettings?.gradientId as GradientId) || 'purple-indigo');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const gradients = getAllGradients();

  // Check if user is an organization admin (coaches have limited access)
  const isAdmin = profile?.role === 'org_admin';

  useEffect(() => {
    if (orgSettings) {
      setLocalOrgName(orgSettings.name);
      setLocalGradientId((orgSettings.gradientId as GradientId) || 'purple-indigo');
    }
  }, [orgSettings]);

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
      subtitle="Manage your profile and organization settings."
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(ROUTES.DASHBOARD)}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      }
    >
      <div className="max-w-4xl pb-20">
        {/* Tab Navigation */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full mb-6 p-1 h-auto bg-slate-100 rounded-xl grid grid-cols-2 gap-1">
            <TabsTrigger 
              value="profile" 
              className="flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger 
                value="organization" 
                className="flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Building2 className="h-4 w-4" />
                Organization
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-8 mt-0">
            {/* User Info & Role */}
            <div className="flex items-center justify-between px-6 py-4 rounded-2xl bg-slate-900 text-white shadow-xl">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1 opacity-80">Current Account</p>
                <h2 className="text-lg font-bold leading-none">{profile?.displayName || user?.email}</h2>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary opacity-80">Access Level</p>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-white shadow-sm shadow-primary/20">
                    {isAdmin ? 'Organization Admin' : 'Coach'}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Information */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 mb-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">{isAdmin ? 'Admin Profile' : 'Coach Profile'}</h2>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Email</Label>
                    <Input 
                      value={user?.email || ''} 
                      disabled
                      className="rounded-xl border-slate-200 h-11 bg-slate-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Display Name</Label>
                    <Input 
                      value={profile?.displayName || ''} 
                      disabled
                      className="rounded-xl border-slate-200 h-11 bg-slate-50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Organization</Label>
                  <Input 
                    value={orgSettings?.name || 'Not assigned'} 
                    disabled
                    className="rounded-xl border-slate-200 h-11 bg-slate-50"
                  />
                </div>
                {!isAdmin && (
                  <p className="text-xs text-slate-500 mt-2">
                    Contact your organization admin to update your profile or change organization settings.
                  </p>
                )}
              </div>
            </section>

            {/* Active Coach Toggle (Admin Only, non-solo) */}
            {isAdmin && orgSettings?.type !== 'solo_coach' && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 mb-2">
                  <User className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold">Coaching Role</h2>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <Label className="text-sm font-bold text-slate-800">I also coach clients myself</Label>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-md">
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
            <TabsContent value="organization" className="space-y-8 mt-0">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 mb-2">
                <Palette className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Organization Branding</h2>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                {/* Name and Gradient */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Organization Name</Label>
                    <Input 
                      value={localOrgName} 
                      onChange={(e) => setLocalOrgName(e.target.value)}
                      placeholder="Organization Name"
                      className="rounded-xl border-slate-200 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Brand Gradient</Label>
                    <Select value={localGradientId} onValueChange={(value) => setLocalGradientId(value as GradientId)}>
                      <SelectTrigger className="w-full rounded-xl border-slate-200 h-11">
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
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {gradients.map((gradient) => (
                        <button
                          key={gradient.id}
                          type="button"
                          onClick={() => setLocalGradientId(gradient.id)}
                          className={`relative h-12 rounded-xl border-2 transition-all ${
                            localGradientId === gradient.id
                              ? 'border-foreground shadow-md scale-105'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          style={{
                            background: `linear-gradient(to right, ${gradient.fromHex}, ${gradient.toHex})`
                          }}
                          title={gradient.name}
                        >
                          {localGradientId === gradient.id && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center">
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
                    className="w-full rounded-xl bg-slate-900 text-white font-bold h-11 shadow-lg shadow-slate-200 hover:bg-black transition-all"
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Branding
                  </Button>
                </div>

                {/* Logo Upload */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400 self-start">Organization Logo</Label>
                  <div className="h-28 w-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                    {orgSettings?.logoUrl ? (
                      <img src={orgSettings.logoUrl} alt="Org Logo" className="h-20 w-auto object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-300">
                        <Upload className="h-6 w-6 opacity-20" />
                        <span className="text-xs font-bold uppercase tracking-tighter">No Logo</span>
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
                    <Button variant="outline" className="w-full rounded-xl font-bold h-11 gap-2 border-slate-200 bg-white hover:bg-slate-50">
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {orgSettings?.logoUrl ? 'Change Logo' : 'Upload New Logo'}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* Assessment Modules */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 mb-2">
                <Box className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Assessment Modules</h2>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="divide-y divide-slate-100">
                  {Object.entries(orgSettings?.modules || {}).map(([moduleId, enabled]) => {
                    const assessmentLabels: Record<string, { label: string; description: string }> = {
                      parq: { label: 'PAR-Q', description: 'Health screening questionnaire required before physical testing.' },
                      inbody: { label: 'Body Composition', description: 'Body composition, muscle mass, and fat analysis using your configured equipment.' },
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
                      <div key={moduleId} className="flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors">
                        <div className="space-y-1">
                          <Label className="text-sm font-bold text-slate-800">{info.label}</Label>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-md">
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

            {/* Equipment Configuration */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 mb-2">
                <SettingsIcon className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Equipment Configuration</h2>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-8 shadow-sm">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Configure the equipment available at your facility. Enable equipment to unlock advanced assessment protocols. You can add equipment at any time.
                </p>

                {/* 1. Body Composition Analyser */}
                <div className="space-y-4 pb-6 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label className="text-sm font-bold text-slate-800">Body Composition Analyser</Label>
                      <p className="text-xs text-slate-500 mt-1">
                        {orgSettings?.equipmentConfig?.bodyComposition?.enabled 
                          ? 'Enabled: Assessments will use analyzer (InBody, DEXA, etc.)'
                          : 'Disabled: Assessments will use body measurements + skinfold test (clients can still bring their own reports)'}
                      </p>
                    </div>
                    <Switch
                      checked={orgSettings?.equipmentConfig?.bodyComposition?.enabled ?? false}
                      onCheckedChange={async (enabled) => {
                        if (!profile?.organizationId || !orgSettings) return;
                        try {
                          await updateOrgSettings(profile.organizationId, {
                            equipmentConfig: {
                              ...(orgSettings.equipmentConfig || DEFAULT_EQUIPMENT_CONFIG),
                              bodyComposition: {
                                enabled,
                              }
                            }
                          });
                          await refreshSettings();
                          toast({ 
                            title: enabled 
                              ? 'Body composition analyser enabled' 
                              : 'Body composition analyser disabled - using equipment-free alternatives',
                            description: enabled 
                              ? 'Future assessments will use analyzer fields' 
                              : 'Future assessments will use body measurements + skinfold (clients can bring reports)'
                          });
                        } catch (err) {
                          toast({ title: 'Failed to update', variant: 'destructive' });
                        }
                      }}
                    />
                  </div>
                </div>

                {/* 2. Dynamometer / Grip Strength */}
                <div className="space-y-4 pb-6 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label className="text-sm font-bold text-slate-800">Dynamometer / Grip Strength Equipment</Label>
                      <p className="text-xs text-slate-500 mt-1">
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
                <div className="space-y-4 pb-6 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label className="text-sm font-bold text-slate-800">Heart Rate Sensor</Label>
                      <p className="text-xs text-slate-500 mt-1">
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
                      <Label className="text-sm font-bold text-slate-800">Cardio Equipment</Label>
                      <p className="text-xs text-slate-500 mt-1">
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

            {/* Default Retest Schedule */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 mb-2">
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
          )}
        </Tabs>
      </div>
    </AppShell>
  );
};

export default Settings;
