/**
 * ClientReport Header Component
 * Status badges, client name, and introduction
 */

import React from 'react';

interface ClientReportHeaderProps {
  clientName: string;
  needsMedicalClearance: boolean;
  goalLabel?: string;
  lifestyleFocus: string[];
}

export function ClientReportHeader({
  clientName,
  needsMedicalClearance,
  goalLabel,
  lifestyleFocus,
}: ClientReportHeaderProps) {
  return (
    <>
      {/* Status badges at top */}
      <section className="flex flex-wrap items-center gap-2 mb-4">
        {needsMedicalClearance && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-medium text-red-800 border border-red-200">
            <span>⚠️</span>
            <span>Medical clearance recommended</span>
          </div>
        )}
        {goalLabel && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1.5 text-xs font-medium text-primary border border-primary/20">
            <span>🎯</span>
            <span>Primary goal: {goalLabel}</span>
          </div>
        )}
        {lifestyleFocus.length > 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 border border-amber-200">
            <span>💪</span>
            <span>Lifestyle focus: {lifestyleFocus.join(', ')}</span>
          </div>
        )}
      </section>

      <section className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">
          {clientName ? `${clientName}, your report is ready` : 'Your report is ready'}
        </h2>
        <p className="text-sm text-slate-600">
          Here's a clear overview of where you are now, what we'll focus on first, and how we'll move you toward your goals.
        </p>
      </section>

      {/* Medical clearance warning */}
      {needsMedicalClearance && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h3 className="text-sm font-semibold text-red-800 mb-1">Medical Clearance Required</h3>
              <p className="text-sm text-red-700">
                Based on your PAR-Q responses, please consult with a healthcare professional before starting your training program. 
                You can still review your assessment results and plan, but obtain medical clearance before beginning exercise.
              </p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

