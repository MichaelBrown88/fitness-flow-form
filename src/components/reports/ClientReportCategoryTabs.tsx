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
import { scoreGrade, SCORE_COLORS } from '@/lib/scoring/scoreColor';
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
      <h2 className="text-2xl font-bold text-foreground">Your fitness assessment</h2>
      <p className="text-sm text-muted-foreground">
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
          const grade = scoreGrade(cat.score);
          const bgColor = `bg-score-${grade}`;
          const jargon = CATEGORY_EXPLANATIONS[cat.id] || '';

          return (
            <TabsContent key={cat.id} value={cat.id} className="mt-4">
              <div className="space-y-4">
                {/* Category header with score */}
                <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-16 w-16 rounded-full border-4 ${circleColor(cat.score)} flex items-center justify-center`}>
                        <span className="text-xl font-bold">{cat.score}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground">{niceLabel(cat.id)}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{jargon}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${bgColor} transition-all`}
                        style={{ width: `${scorePercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Radar chart & Posture Viewer */}
                <div className="space-y-6">
                  <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground-tertiary mb-6 text-center">
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
                      <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground-tertiary mb-2 px-1">
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
                      <div className={`rounded-lg p-4 shadow-sm ${SCORE_COLORS.green.pill}`}>
                        <h4 className={`text-base font-semibold mb-2 ${SCORE_COLORS.green.text}`}>What's working well</h4>
                        <ul className={`list-disc pl-5 text-sm space-y-1 ${SCORE_COLORS.green.text}`}>
                          {cat.strengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {cat.weaknesses.length > 0 && cat.score > 0 && (
                      <div className={`rounded-lg p-4 shadow-sm ${SCORE_COLORS.red.pill}`}>
                        <h4 className={`text-base font-semibold mb-2 ${SCORE_COLORS.red.text}`}>Areas for improvement</h4>
                        <ul className={`list-disc pl-5 text-sm space-y-1 ${SCORE_COLORS.red.text}`}>
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

