import type { LucideIcon } from 'lucide-react';

export interface ChecklistStepItem {
  done: boolean;
  icon: LucideIcon;
  label: string;
  description: string;
  href?: string;
}
