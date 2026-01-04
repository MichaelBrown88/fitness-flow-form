/**
 * ClientReport Score Overview Component
 * Overall score, category circles, and radar chart
 */

import React from 'react';
import OverallRadarChart from './OverallRadarChart';
import { circleColor, niceLabel, CATEGORY_HEX } from './ClientReportConstants';
import type { ScoreSummary } from '@/lib/scoring';

interface ClientReportScoreOverviewProps {
  scores: ScoreSummary;
  orderedCats: ScoreSummary['categories'];
  overallRadarData: Array<{
    name: string;
    fullLabel: string;
    value: number;
    color: string;
  }>;
}

export function ClientReportScoreOverview({
  scores,
  orderedCats,
  overallRadarData,
}: ClientReportScoreOverviewProps) {
  return (
    <section className="space-y-10 py-4">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Your Fitness Score</h2>
          <p className="text-slate-500 font-medium">A comprehensive snapshot of your current physical condition.</p>
        </div>
        
        {/* Overall score centered and prominent */}
        <div className={`flex h-40 w-40 items-center justify-center rounded-full border-8 bg-white shadow-xl ${circleColor(scores.overall)} transition-transform hover:scale-105 duration-500`}>
          <div className="flex flex-col items-center">
            <span className="text-5xl font-black">{scores.overall}</span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-70">Overall</span>
          </div>
        </div>
      </div>

      {/* Category circles in a row */}
      <div className="flex flex-wrap items-start justify-center gap-6 md:gap-10">
        {orderedCats.map((cat) => (
          <div key={cat.id} className="flex flex-col items-center group">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 bg-white shadow-sm transition-all group-hover:shadow-md group-hover:-translate-y-1 ${circleColor(cat.score)}`}>
              <span className="text-lg font-bold">{cat.score}</span>
            </div>
            <span className="mt-3 w-24 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">
              {niceLabel(cat.id)}
            </span>
          </div>
        ))}
      </div>

      {/* Overall Profile Radar */}
      <div className="max-w-2xl mx-auto mt-12 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
        <div className="text-center mb-6">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Profile Balance</h3>
        </div>
        <OverallRadarChart data={overallRadarData} />
        <p className="text-center text-xs text-slate-400 mt-4 italic">
          This graph shows how balanced your fitness is across all categories.
        </p>
      </div>

      {/* Synthesis Section */}
      {scores.synthesis && scores.synthesis.length > 0 && (
        <div className="max-w-2xl mx-auto mt-12 space-y-4">
          <div className="text-center mb-6">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Expert Synthesis</h3>
            <p className="text-xs text-slate-500 mt-1">How your different results interact</p>
          </div>
          {scores.synthesis.map((item, idx) => (
            <div 
              key={idx} 
              className={`rounded-2xl border p-5 shadow-sm ${
                item.severity === 'high' ? 'border-rose-200 bg-rose-50' : 
                item.severity === 'medium' ? 'border-amber-200 bg-amber-50' : 
                'border-blue-200 bg-blue-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">
                  {item.severity === 'high' ? '🚨' : item.severity === 'medium' ? '⚠️' : 'ℹ️'}
                </span>
                <h4 className={`font-bold ${
                  item.severity === 'high' ? 'text-rose-900' : 
                  item.severity === 'medium' ? 'text-amber-900' : 
                  'text-blue-900'
                }`}>
                  {item.title}
                </h4>
              </div>
              <p className={`text-sm leading-relaxed ${
                item.severity === 'high' ? 'text-rose-800' : 
                item.severity === 'medium' ? 'text-amber-800' : 
                'text-blue-800'
              }`}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

