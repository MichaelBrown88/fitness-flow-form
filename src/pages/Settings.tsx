import AppShell from '@/components/layout/AppShell';

const Settings = () => {
  return (
    <AppShell
      title="Assessment settings"
      subtitle="Toggle optional blocks like InBody scan or grip strength (coming soon)."
    >
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-700">
        <p>
          This area will let you customise which assessment blocks are active in your flow
          (for example, disabling grip strength or InBody scan on certain packages).
        </p>
        <p>
          For now, all blocks are enabled by default. We&apos;ll add per-coach toggles and
          presets in a later iteration.
        </p>
      </div>
    </AppShell>
  );
};

export default Settings;


