/**
 * CoachReport Posture Analysis Component
 * Displays comprehensive AI posture analysis results
 */

import React from 'react';
import { Activity } from 'lucide-react';
import { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import type { FormData } from '@/contexts/FormContext';

interface CoachReportPostureAnalysisProps {
  formData: FormData;
}

export function CoachReportPostureAnalysis({ formData }: CoachReportPostureAnalysisProps) {
  if (!formData?.postureAiResults) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary p-2 rounded-lg">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">AI Posture Analysis</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(['front', 'back', 'side-left', 'side-right'] as const)
          .filter((view) => formData.postureAiResults?.[view])
          .map((view) => {
            const analysis = formData.postureAiResults![view] as PostureAnalysisResult;
            const imageUrl = formData.postureImages?.[view];
            return (
              <div key={view} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-primary">
                    {view.toUpperCase()} VIEW
                  </span>
                </div>

                {(imageUrl || formData.postureImagesStorage?.[view]) && (
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50">
                    <img
                      src={formData.postureImagesStorage?.[view] || imageUrl}
                      alt={view}
                      className="w-full h-full object-cover"
                      title="Reference lines: Red vertical (midline/plumb), Red horizontal (shoulders/hips)"
                    />
                    <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      Reference lines: Vertical midline/plumb | Horizontal shoulder & hip lines
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  {/* Unified Top-to-Bottom Order */}
                  {analysis.head_alignment && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Head Tilt</span>
                        <span className="text-xs font-black text-slate-900">
                          {analysis.head_alignment.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-tight">
                        {analysis.head_alignment.description}
                      </p>
                    </div>
                  )}

                  {analysis.forward_head && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Forward Head Posture</span>
                        <span className="text-xs font-black text-slate-900">
                          {analysis.forward_head.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-tight">
                        {analysis.forward_head.description}
                      </p>
                    </div>
                  )}

                  {analysis.shoulder_alignment && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Shoulder Alignment</span>
                        <span className="text-xs font-black text-slate-900">
                          {analysis.shoulder_alignment.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-tight">
                        {analysis.shoulder_alignment.description}
                      </p>
                    </div>
                  )}

                  {analysis.kyphosis && analysis.kyphosis.status !== 'Normal' && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Thoracic Kyphosis</span>
                        <span className="text-xs font-black text-slate-900">
                          {analysis.kyphosis.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-tight">{analysis.kyphosis.description}</p>
                    </div>
                  )}

                  {analysis.spinal_curvature && analysis.spinal_curvature.status !== 'Normal' && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Spinal Curvature</span>
                        <span className="text-xs font-black text-slate-900">
                          {analysis.spinal_curvature.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-tight">{analysis.spinal_curvature.description}</p>
                    </div>
                  )}

                  {analysis.lordosis && analysis.lordosis.status !== 'Normal' && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Lumbar Lordosis</span>
                        <span className="text-xs font-black text-slate-900">
                          {analysis.lordosis.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-tight">{analysis.lordosis.description}</p>
                    </div>
                  )}

                  {analysis.hip_alignment && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Hip Alignment</span>
                        <span className="text-xs font-black text-slate-900">
                          {analysis.hip_alignment.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-tight">{analysis.hip_alignment.description}</p>
                    </div>
                  )}

                  {analysis.pelvic_tilt && analysis.pelvic_tilt.status !== 'Neutral' && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Pelvic Tilt</span>
                        <span className="text-xs font-black text-slate-900">{analysis.pelvic_tilt.status}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-tight">{analysis.pelvic_tilt.description}</p>
                    </div>
                  )}

                  {analysis.knee_alignment && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Knee Alignment</span>
                        <span className="text-xs font-black text-slate-900">{analysis.knee_alignment.status}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-tight">{analysis.knee_alignment.description}</p>
                    </div>
                  )}

                  {analysis.knee_position && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Knee Position</span>
                        <span className="text-xs font-black text-slate-900">{analysis.knee_position.status}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-tight">{analysis.knee_position.description}</p>
                    </div>
                  )}

                  {analysis.overall_assessment && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs font-semibold text-slate-700 mb-1">Overall Assessment:</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{analysis.overall_assessment}</p>
                    </div>
                  )}

                  {analysis.deviations && analysis.deviations.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">Identified Deviations:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {analysis.deviations.map((dev, idx) => (
                          <li key={idx} className="text-xs text-slate-600">
                            {dev}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}

