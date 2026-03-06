/**
 * Reusable org setting toggle: label, description, and Switch that updates a nested path
 * and refreshes settings + toast. Use for equipment toggles and module toggles.
 */

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { OrgSettings } from '@/services/organizations';

export interface OrgSettingSwitchProps {
  label: string;
  description: string;
  checked: boolean;
  onToggle: (enabled: boolean) => Promise<void>;
  disabled?: boolean;
}

export function OrgSettingSwitch({
  label,
  description,
  checked,
  onToggle,
  disabled = false,
}: OrgSettingSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 sm:p-5 hover:bg-zinc-50/50 transition-colors">
      <div className="space-y-1 flex-1 min-w-0">
        <Label className="text-sm font-bold text-slate-800">{label}</Label>
        <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-md">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={(enabled) => void onToggle(enabled)}
        disabled={disabled}
      />
    </div>
  );
}
