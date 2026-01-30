/**
 * ClientReport Category Tabs Component
 * Displays detailed category breakdowns with radar charts
 */

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import CategoryRadarChart from './CategoryRadarChart';
import { PostureAnalysisViewer } from './PostureAnalysisViewer';
import { circleColor, niceLabel, CATEGORY_EXPLANATIONS } from './ClientReportConstants';
import type { ScoreSummary } from '@/lib/scoring';
import type { FormData } from '@/contexts/FormContext';

interface ClientReportCategoryTabsProps {
  orderedCats: ScoreSummary['categories'];
  tempHighlight?: string;
  formData?: FormData;
}

export function ClientReportCategoryTabs({
  orderedCats,
  tempHighlight,
  formData,
}: ClientReportCategoryTabsProps) {
  if (orderedCats.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Your fitness assessment</h2>
      <p className="text-sm text-slate-600">
        Explore each area of your assessment. Each category shows a detailed breakdown of your performance:
      </p>
      <Tabs defaultValue={orderedCats[0].id} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 h-auto">
          {orderedCats.map((cat) => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className={`text-xs sm:text-sm capitalize transition-all duration-1000 ${
                tempHighlight === cat.id ? 'ring-2 ring-primary ring-offset-2 animate-pulse bg-brand-light' : ''
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <div className={`h-8 w-8 rounded-full border-2 ${circleColor(cat.score)} flex items-center justify-center`}>
                  <span className="text-xs font-semibold">{cat.score}</span>
                </div>
                <span className="text-center leading-tight">{niceLabel(cat.id)}</span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>
        {orderedCats.map((cat) => {
          const scorePercent = Math.min(100, (cat.score / 100) * 100);
          const bgColor = cat.score >= 75 ? 'bg-green-500' : cat.score >= 45 ? 'bg-amber-500' : 'bg-red-500';
          const jargon = CATEGORY_EXPLANATIONS[cat.id] || '';

          return (
            <TabsContent key={cat.id} value={cat.id} className="mt-4">
              <div className="space-y-4">
                {/* Category header with score */}
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-16 w-16 rounded-full border-4 ${circleColor(cat.score)} flex items-center justify-center`}>
                        <span className="text-xl font-bold">{cat.score}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{niceLabel(cat.id)}</h3>
                        <p className="text-sm text-slate-600 mt-1">{jargon}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full ${bgColor} transition-all`}
                        style={{ width: `${scorePercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Radar chart & Posture Viewer */}
                <div className="space-y-6">
                  <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 text-center">
                      Functional Mobility Breakdown
                    </h4>
                    <div className="flex justify-center">
                      <div className="w-full max-w-md">
                        <TooltipProvider>
                          <CategoryRadarChart details={cat.details} categoryName={niceLabel(cat.id)} />
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>

                  {cat.id === 'movementQuality' && formData?.postureAiResults && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 px-1">
                        Posture scan results
                      </h4>
                      <PostureAnalysisViewer
                        postureResults={formData.postureAiResults}
                        postureImages={(formData.postureImagesStorage || formData.postureImages || {}) as Record<string, string>}
                      />
                    </div>
                  )}
                </div>

                {/* Strengths and weaknesses for this category */}
                {(cat.strengths.length > 0 || cat.weaknesses.length > 0) && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {cat.strengths.length > 0 && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                        <h4 className="text-base font-semibold text-emerald-800 mb-2">What's working well</h4>
                        <ul className="list-disc pl-5 text-sm text-emerald-900 space-y-1">
                          {cat.strengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {cat.weaknesses.length > 0 && cat.score > 0 && (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 shadow-sm">
                        <h4 className="text-base font-semibold text-rose-800 mb-2">Areas for improvement</h4>
                        <ul className="list-disc pl-5 text-sm text-rose-900 space-y-1">
                          {cat.weaknesses.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
}

