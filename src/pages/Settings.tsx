import React, { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useSettings } from '@/hooks/useSettings';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { updateOrgSettings, uploadOrgLogo, type OrgSettings, DEFAULT_EQUIPMENT_CONFIG } from '@/services/organizations';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, Palette, ShieldCheck, Box, Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  const { settings, updateSettings } = useSettings();
  const { user, profile, orgSettings, refreshSettings } = useAuth();
  const { toast } = useToast();
  const [localOrgName, setLocalOrgName] = useState(orgSettings?.name || '');
  const [localBrandColor, setLocalBrandColor] = useState(orgSettings?.brandColor || '#4f46e5');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Owners are always admins
  const isAdmin = profile?.role === 'org_admin' || !profile;

  useEffect(() => {
    if (orgSettings) {
      setLocalOrgName(orgSettings.name);
      setLocalBrandColor(orgSettings.brandColor || '#4f46e5');
    }
  }, [orgSettings]);

  const handleSaveOrgInfo = async () => {
    if (!profile?.organizationId) return;
    setIsSaving(true);
    try {
      await updateOrgSettings(profile.organizationId, {
        name: localOrgName,
        brandColor: localBrandColor,
      });
      await refreshSettings();
      toast({ title: 'Settings saved to database' });
    } catch (err) {
      console.error('Save error:', err);
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
      subtitle="Manage your organization branding and assessment modules."
    >
      <div className="max-w-4xl space-y-8 pb-20">
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
                🛡️ Organization Admin
              </span>
            </div>
          </div>
        </div>

        {/* Personal Preferences */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900 mb-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Coach Preferences</h2>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="demo-auto-fill" className="text-sm font-bold text-slate-800">
                  Auto-fill Demo Persona
                </Label>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Enable the AI-powered demo persona auto-fill feature.
                </p>
              </div>
              <Switch
                id="demo-auto-fill"
                checked={settings.demoAutoFillEnabled}
                onCheckedChange={(checked) => updateSettings({ demoAutoFillEnabled: checked })}
              />
            </div>
          </div>
        </section>

        {/* Organization Settings */}
        {isAdmin && (
          <>
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 mb-2">
                <Palette className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Organization Branding</h2>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                {/* Name and Color */}
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
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Brand Primary Color</Label>
                    <div className="flex gap-3">
                      <Input 
                        type="color" 
                        value={localBrandColor} 
                        onChange={(e) => setLocalBrandColor(e.target.value)}
                        className="h-11 w-20 p-1 rounded-xl border-slate-200 cursor-pointer"
                      />
                      <Input 
                        value={localBrandColor} 
                        onChange={(e) => setLocalBrandColor(e.target.value)}
                        className="flex-1 rounded-xl border-slate-200 font-mono h-11"
                      />
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
                      inbody: { label: 'InBody Scan', description: 'Body composition, muscle mass, and fat analysis.' },
                      fitness: { label: 'Metabolic Fitness', description: 'Resting heart rate and VO2 Max estimates via cardio tests.' },
                      posture: { label: 'Posture Analysis', description: 'AI posture analysis and alignment checks.' },
                      overheadSquat: { label: 'Overhead Squat', description: 'Movement quality assessment for overhead squat pattern.' },
                      hinge: { label: 'Hinge Assessment', description: 'Hip hinge movement quality and range of motion.' },
                      lunge: { label: 'Lunge Assessment', description: 'Lunge movement quality, balance, and knee tracking.' },
                      mobility: { label: 'Mobility Screening', description: 'Joint mobility assessment for hips, shoulders, and ankles.' },
                      strength: { label: 'Muscular Strength', description: 'Grip strength, pushups, planks, and foundational power.' },
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
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6 shadow-sm">
                {/* Grip Strength Method */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-slate-800">Grip Strength Test Method</Label>
                  <p className="text-xs text-slate-500">Select the equipment you use for grip strength testing.</p>
                  <Select
                    value={orgSettings?.equipmentConfig?.gripStrength?.method || DEFAULT_EQUIPMENT_CONFIG.gripStrength.method}
                    onValueChange={async (value: 'dynamometer' | 'deadhang' | 'farmerswalk' | 'platepinch') => {
                      if (!profile?.organizationId || !orgSettings) return;
                      try {
                        await updateOrgSettings(profile.organizationId, {
                          equipmentConfig: {
                            ...(orgSettings.equipmentConfig || DEFAULT_EQUIPMENT_CONFIG),
                            gripStrength: { method: value }
                          }
                        });
                        await refreshSettings();
                        toast({ title: 'Grip strength method updated' });
                      } catch (err) {
                        toast({ title: 'Failed to update', variant: 'destructive' });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dynamometer">Dynamometer (Handgrip) - Standard kg measurement</SelectItem>
                      <SelectItem value="deadhang">Dead Hang - Maximum hang time (seconds)</SelectItem>
                      <SelectItem value="farmerswalk">Farmer's Walk - Distance/time with load</SelectItem>
                      <SelectItem value="platepinch">Plate Pinch - Pinch grip weight (kg)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Body Composition Method */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-slate-800">Body Composition Method</Label>
                  <p className="text-xs text-slate-500">Select how you measure body composition.</p>
                  <Select
                    value={orgSettings?.equipmentConfig?.bodyComposition?.method || DEFAULT_EQUIPMENT_CONFIG.bodyComposition.method}
                    onValueChange={async (value: 'inbody' | 'dexa' | 'bodpod' | 'skinfold' | 'bioimpedance' | 'measurements') => {
                      if (!profile?.organizationId || !orgSettings) return;
                      try {
                        await updateOrgSettings(profile.organizationId, {
                          equipmentConfig: {
                            ...(orgSettings.equipmentConfig || DEFAULT_EQUIPMENT_CONFIG),
                            bodyComposition: {
                              method: value,
                              skinfoldMethod: value === 'skinfold' ? (orgSettings.equipmentConfig?.bodyComposition?.skinfoldMethod || 'jackson-pollock-7') : undefined
                            }
                          }
                        });
                        await refreshSettings();
                        toast({ title: 'Body composition method updated' });
                      } catch (err) {
                        toast({ title: 'Failed to update', variant: 'destructive' });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inbody">InBody - Bioimpedance analysis</SelectItem>
                      <SelectItem value="dexa">DEXA - Dual-energy X-ray absorptiometry</SelectItem>
                      <SelectItem value="bodpod">BodPod - Air displacement plethysmography</SelectItem>
                      <SelectItem value="bioimpedance">Bioimpedance Scale - Other BIA devices</SelectItem>
                      <SelectItem value="skinfold">Skinfold Calipers - Body fat from skinfold measurements</SelectItem>
                      <SelectItem value="measurements">Body Measurements - Tape measure (US Navy method)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Skinfold Method (conditional) */}
                {orgSettings?.equipmentConfig?.bodyComposition?.method === 'skinfold' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-800">Skinfold Method</Label>
                    <p className="text-xs text-slate-500">Select the skinfold measurement protocol you use.</p>
                    <Select
                      value={orgSettings?.equipmentConfig?.bodyComposition?.skinfoldMethod || 'jackson-pollock-7'}
                      onValueChange={async (value: 'jackson-pollock-7' | 'jackson-pollock-3' | 'durnin-womersley-4') => {
                        if (!profile?.organizationId || !orgSettings) return;
                        try {
                          await updateOrgSettings(profile.organizationId, {
                            equipmentConfig: {
                              ...(orgSettings.equipmentConfig || DEFAULT_EQUIPMENT_CONFIG),
                              bodyComposition: {
                                method: 'skinfold',
                                skinfoldMethod: value
                              }
                            }
                          });
                          await refreshSettings();
                          toast({ title: 'Skinfold method updated' });
                        } catch (err) {
                          toast({ title: 'Failed to update', variant: 'destructive' });
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jackson-pollock-7">Jackson-Pollock 7-Site (Chest, Axilla, Tricep, Subscapular, Abdomen, Suprailiac, Thigh)</SelectItem>
                        <SelectItem value="jackson-pollock-3">Jackson-Pollock 3-Site (Men: Chest/Abdomen/Thigh, Women: Tricep/Suprailiac/Thigh)</SelectItem>
                        <SelectItem value="durnin-womersley-4">Durnin-Womersley 4-Site (Bicep, Tricep, Subscapular, Suprailiac)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default Settings;
