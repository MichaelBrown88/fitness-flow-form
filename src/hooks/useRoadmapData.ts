import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';
import type { RoadmapItem, RoadmapBlock, ProgressSuggestion } from '@/lib/roadmap/types';
import {
  getRoadmapForClient,
  createRoadmap,
  updateRoadmap,
  setRoadmapShareToken,
  generateShareToken,
} from '@/services/roadmaps';
import { generateRoadmapBlocks } from '@/lib/roadmap/generateBlocks';
import { compareRoadmapProgress, applyProgressSuggestions } from '@/lib/roadmap/compareProgress';
import { generatePhaseTargets, extractBaselineScores, determineActivePhase, computePhaseProgress } from '@/lib/roadmap/phaseTargets';
import type { RoadmapPhase, PhaseTarget } from '@/lib/roadmap/types';
import { copyTextToClipboard } from '@/lib/utils/clipboard';
import { CONFIG } from '@/config';
import { getDb } from '@/services/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { ORGANIZATION } from '@/lib/database/paths';
import { computeScores } from '@/lib/scoring';
import type { ScoreSummary } from '@/lib/scoring/types';
import type { FormData } from '@/contexts/FormContext';

const SAVE_DELAY_MS = 1500;
const COPIED_FEEDBACK_MS = 2000;

async function loadLatestAssessment(orgId: string, clientName: string) {
  const q = query(
    collection(getDb(), ORGANIZATION.assessments.collection(orgId)),
    where('clientNameLower', '==', clientName.toLowerCase()),
    orderBy('createdAt', 'desc'),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, formData: d.data().formData as FormData };
}

export function useRoadmapData(clientName: string) {
  const { user, effectiveOrgId } = useAuth();

  const [roadmapId, setRoadmapId] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');
  const [shareToken, setShareToken] = useState<string | undefined>();
  const [progressSuggestions, setProgressSuggestions] = useState<ProgressSuggestion[]>([]);
  const [generatedBlocks, setGeneratedBlocks] = useState<RoadmapBlock[]>([]);
  const [needsCreation, setNeedsCreation] = useState(false);
  const [latestAssessmentId, setLatestAssessmentId] = useState<string | null>(null);
  const [latestScores, setLatestScores] = useState<ScoreSummary | null>(null);
  const [clientGoals, setClientGoals] = useState<string[]>([]);
  const [phaseTargets, setPhaseTargets] = useState<Record<RoadmapPhase, PhaseTarget[]> | null>(null);
  const [baselineScores, setBaselineScores] = useState<Record<string, number> | null>(null);
  const [activePhase, setActivePhase] = useState<RoadmapPhase>('foundation');

  const initialLoadDone = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!effectiveOrgId || !user || !clientName) return;
    let cancelled = false;

    (async () => {
      try {
        const existing = await getRoadmapForClient(effectiveOrgId, clientName);
        if (cancelled) return;

        const assessment = await loadLatestAssessment(effectiveOrgId, clientName);

        if (existing) {
          setRoadmapId(existing.id);
          setSummary(existing.summary);
          setItems(existing.items);
          setShareToken(existing.shareToken);
          if (existing.phaseTargets) setPhaseTargets(existing.phaseTargets);
          if (existing.baselineScores) setBaselineScores(existing.baselineScores);
          if (existing.activePhase) setActivePhase(existing.activePhase);

          if (!cancelled && assessment) {
            const scores = computeScores(assessment.formData);
            setGeneratedBlocks(generateRoadmapBlocks(scores, assessment.formData));
            setLatestScores(scores);
            setClientGoals(assessment.formData?.clientGoals ?? []);

            if (existing.phaseTargets && assessment.id !== existing.assessmentId) {
              const currentScoreMap: Record<string, number> = {};
              for (const cat of scores.categories) currentScoreMap[cat.id] = cat.score;
              const newActivePhase = determineActivePhase(existing.phaseTargets, currentScoreMap);
              if (newActivePhase !== (existing.activePhase ?? 'foundation')) {
                setActivePhase(newActivePhase);
                updateRoadmap(effectiveOrgId, existing.id, { activePhase: newActivePhase } as Record<string, unknown>).catch(() => {});
              }
            }

            if (existing.previousScores && assessment.id !== existing.assessmentId) {
              const suggestions = compareRoadmapProgress(existing.previousScores, scores, existing.items);
              if (suggestions.length > 0) setProgressSuggestions(suggestions);
            }
          }
        } else if (assessment) {
          const scores = computeScores(assessment.formData);
          setGeneratedBlocks(generateRoadmapBlocks(scores, assessment.formData));
          setLatestAssessmentId(assessment.id);
          setLatestScores(scores);
          setClientGoals(assessment.formData?.clientGoals ?? []);
          setNeedsCreation(true);
        }
      } catch (err) {
        logger.error('Failed to load roadmap', 'ROADMAP_PAGE', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          requestAnimationFrame(() => { initialLoadDone.current = true; });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [effectiveOrgId, user, clientName]);

  const buildCreatePayload = useCallback((newItems: RoadmapItem[]) => {
    const targets = latestScores ? generatePhaseTargets(newItems, latestScores) : undefined;
    const baselines = latestScores ? extractBaselineScores(latestScores) : undefined;
    const active = targets && baselines ? determineActivePhase(targets, baselines) : 'foundation' as RoadmapPhase;
    return { targets, baselines, active };
  }, [latestScores]);

  const handleCreateRoadmap = useCallback(
    async (newItems: RoadmapItem[], newSummary: string) => {
      if (!effectiveOrgId || !user || !latestAssessmentId) return;
      try {
        setSaving(true);
        const { targets, baselines, active } = buildCreatePayload(newItems);
        const newId = await createRoadmap({
          organizationId: effectiveOrgId,
          clientName,
          assessmentId: latestAssessmentId,
          coachUid: user.uid,
          summary: newSummary,
          items: newItems,
          previousScores: latestScores ?? undefined,
          phaseTargets: targets,
          baselineScores: baselines,
          activePhase: active,
        });
        setRoadmapId(newId);
        setSummary(newSummary);
        setItems(newItems);
        setNeedsCreation(false);
        if (targets) setPhaseTargets(targets);
        if (baselines) setBaselineScores(baselines);
        setActivePhase(active);
        initialLoadDone.current = true;
      } catch (err) {
        logger.error('Failed to create roadmap', 'ROADMAP_PAGE', err);
      } finally {
        setSaving(false);
      }
    },
    [effectiveOrgId, user, clientName, latestAssessmentId, latestScores, buildCreatePayload],
  );

  const handleCreateAndShare = useCallback(
    async (newItems: RoadmapItem[], newSummary: string) => {
      if (!effectiveOrgId || !user || !latestAssessmentId) return;
      try {
        setSaving(true);
        const { targets, baselines, active } = buildCreatePayload(newItems);
        const newId = await createRoadmap({
          organizationId: effectiveOrgId,
          clientName,
          assessmentId: latestAssessmentId,
          coachUid: user.uid,
          summary: newSummary,
          items: newItems,
          previousScores: latestScores ?? undefined,
          phaseTargets: targets,
          baselineScores: baselines,
          activePhase: active,
        });
        const token = generateShareToken();
        await setRoadmapShareToken(effectiveOrgId, newId, token);
        setRoadmapId(newId);
        setSummary(newSummary);
        setItems(newItems);
        setShareToken(token);
        setNeedsCreation(false);
        if (targets) setPhaseTargets(targets);
        if (baselines) setBaselineScores(baselines);
        setActivePhase(active);
        initialLoadDone.current = true;
        await copyTextToClipboard(`${CONFIG.APP.HOST}/r/${token}/roadmap`);
        setShareState('copied');
        setTimeout(() => setShareState('idle'), COPIED_FEEDBACK_MS);
      } catch (err) {
        logger.error('Failed to create and share roadmap', 'ROADMAP_PAGE', err);
      } finally {
        setSaving(false);
      }
    },
    [effectiveOrgId, user, clientName, latestAssessmentId, latestScores, buildCreatePayload],
  );

  const debouncedSave = useCallback(
    (newSummary: string, newItems: RoadmapItem[]) => {
      if (!initialLoadDone.current || !effectiveOrgId || !roadmapId) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          await updateRoadmap(effectiveOrgId, roadmapId, { summary: newSummary, items: newItems });
        } catch (err) {
          logger.error('Auto-save failed', 'ROADMAP_PAGE', err);
        } finally {
          setSaving(false);
        }
      }, SAVE_DELAY_MS);
    },
    [effectiveOrgId, roadmapId],
  );

  const handleSummaryChange = useCallback(
    (v: string) => { setSummary(v); debouncedSave(v, items); },
    [items, debouncedSave],
  );

  const handleItemsChange = useCallback(
    (v: RoadmapItem[]) => { setItems(v); debouncedSave(summary, v); },
    [summary, debouncedSave],
  );

  const handleShare = useCallback(async () => {
    if (!effectiveOrgId || !roadmapId) return;
    let token = shareToken;
    if (!token) {
      token = generateShareToken();
      await setRoadmapShareToken(effectiveOrgId, roadmapId, token);
      setShareToken(token);
    }
    await copyTextToClipboard(`${CONFIG.APP.HOST}/r/${token}/roadmap`);
    setShareState('copied');
    setTimeout(() => setShareState('idle'), COPIED_FEEDBACK_MS);
  }, [effectiveOrgId, roadmapId, shareToken]);

  const handleProgressConfirm = useCallback(
    (accepted: Set<string>) => {
      const updated = applyProgressSuggestions(items, accepted, progressSuggestions);
      setItems(updated);
      debouncedSave(summary, updated);
      setProgressSuggestions([]);
    },
    [items, progressSuggestions, summary, debouncedSave],
  );

  const currentScoreMap = useMemo(() => {
    if (!latestScores) return baselineScores ?? {};
    const m: Record<string, number> = { overall: latestScores.overall };
    for (const c of latestScores.categories) m[c.id] = c.score;
    return m;
  }, [latestScores, baselineScores]);

  const phaseProgress = useMemo(() => {
    if (!phaseTargets) return { foundation: 0, development: 0, performance: 0 };
    return {
      foundation: computePhaseProgress(phaseTargets.foundation, currentScoreMap),
      development: computePhaseProgress(phaseTargets.development, currentScoreMap),
      performance: computePhaseProgress(phaseTargets.performance, currentScoreMap),
    };
  }, [phaseTargets, currentScoreMap]);

  const scoreDeltas = useMemo(() => {
    if (!baselineScores) return {};
    const deltas: Record<string, number> = {};
    for (const [cat, base] of Object.entries(baselineScores)) {
      const current = currentScoreMap[cat];
      if (current !== undefined) deltas[cat] = current - base;
    }
    return deltas;
  }, [baselineScores, currentScoreMap]);

  return {
    roadmapId,
    summary,
    items,
    loading,
    saving,
    shareState,
    progressSuggestions,
    generatedBlocks,
    needsCreation,
    clientGoals,
    phaseTargets,
    baselineScores,
    activePhase,
    latestScores,
    phaseProgress,
    scoreDeltas,
    currentScoreMap,
    handleCreateRoadmap,
    handleCreateAndShare,
    handleSummaryChange,
    handleItemsChange,
    handleShare,
    handleProgressConfirm,
    dismissSuggestions: () => setProgressSuggestions([]),
  };
}
