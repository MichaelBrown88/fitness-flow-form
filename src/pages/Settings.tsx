import AppShell from '@/components/layout/AppShell';
import { useSettings } from '@/hooks/useSettings';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const Settings = () => {
  const { settings, updateSettings } = useSettings();

  return (
    <AppShell
      title="Assessment settings"
      subtitle="Configure assessment options and features."
    >
      <div className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Feature Toggles</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="demo-auto-fill" className="text-sm font-medium text-slate-700">
                  Auto-fill Demo Persona
                </Label>
                <p className="text-xs text-slate-500">
                  Enable the AI-powered demo persona auto-fill feature in the assessment form.
                  Each demo generates unique, realistic client data.
                </p>
              </div>
              <Switch
                id="demo-auto-fill"
                checked={settings.demoAutoFillEnabled}
                onCheckedChange={(checked) => updateSettings({ demoAutoFillEnabled: checked })}
              />
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Assessment Blocks</h3>
          <p>
            This area will let you customise which assessment blocks are active in your flow
            (for example, disabling grip strength or InBody scan on certain packages).
          </p>
          <p className="mt-2">
            For now, all blocks are enabled by default. We&apos;ll add per-coach toggles and
            presets in a later iteration.
          </p>
        </div>
      </div>
    </AppShell>
  );
};

export default Settings;


