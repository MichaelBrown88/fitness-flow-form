import type { ReactNode } from 'react';

export interface PhaseFormShellProps {
  sidebar: ReactNode;
  main: ReactNode;
}

/**
 * Assessment phase layout: optional sidebar + scrollable main column.
 */
export function PhaseFormShell({ sidebar, main }: PhaseFormShellProps) {
  return (
    <div className="relative flex min-h-[calc(100vh-64px)] flex-col lg:flex-row">
      {sidebar}
      {main}
    </div>
  );
}
