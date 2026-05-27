import React from 'react';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';

interface MovementPatternsBlockProps {
  children: React.ReactNode;
}

export function MovementPatternsBlock({ children }: MovementPatternsBlockProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-foreground">{CLIENT_REPORT_COPY.movementPatterns}</h4>
      {children}
    </div>
  );
}
