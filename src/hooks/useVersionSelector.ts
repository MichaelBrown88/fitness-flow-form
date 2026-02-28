import { useState, useMemo, useCallback } from 'react';
import { computeScores, buildRoadmap, type ScoreSummary, type RoadmapPhase } from '@/lib/scoring';
import type { FormData } from '@/contexts/FormContext';
import type { VersionSelectorSnapshot } from '@/components/reports/AssessmentVersionSelector';

export interface SnapshotInput {
  id: string;
  score: number;
  date: Date;
  type: string;
  formData: FormData;
}

interface UseVersionSelectorResult {
  selectedIndex: number;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  gridItems: VersionSelectorSnapshot[];
  initialAssessment: VersionSelectorSnapshot | null;
  initialAssessmentGlobalIndex: number;
  selectedFormData: FormData | null;
  selectedScores: ScoreSummary | null;
  selectedRoadmap: RoadmapPhase[] | null;
  previousFormData: FormData | null;
  previousScores: ScoreSummary | null;
  handleSelect: (index: number) => void;
  handlePageChange: (page: number) => void;
  getTrend: (globalIndex: number) => 'up' | 'down' | 'neutral';
  isTransitioning: boolean;
}

const PAGE_SIZE = 9;

export function useVersionSelector(allSnapshots: SnapshotInput[]): UseVersionSelectorResult {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const totalCount = allSnapshots.length;
  const hasInitial = totalCount >= 2;
  const paginableSnapshots = hasInitial ? allSnapshots.slice(0, -1) : allSnapshots;
  const totalPages = Math.max(1, Math.ceil(paginableSnapshots.length / PAGE_SIZE));

  const initialAssessment = useMemo<VersionSelectorSnapshot | null>(() => {
    if (!hasInitial) return null;
    const last = allSnapshots[allSnapshots.length - 1];
    return { id: last.id, score: last.score, date: last.date, type: last.type };
  }, [allSnapshots, hasInitial]);

  const initialAssessmentGlobalIndex = totalCount - 1;

  const gridItems = useMemo<VersionSelectorSnapshot[]>(() => {
    const start = currentPage * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return paginableSnapshots.slice(start, end).map(s => ({
      id: s.id, score: s.score, date: s.date, type: s.type,
    }));
  }, [paginableSnapshots, currentPage]);

  const getTrend = useCallback((globalIndex: number): 'up' | 'down' | 'neutral' => {
    if (globalIndex >= totalCount - 1) return 'neutral';
    const current = allSnapshots[globalIndex];
    const previous = allSnapshots[globalIndex + 1];
    if (!current || !previous) return 'neutral';
    if (current.score > previous.score) return 'up';
    if (current.score < previous.score) return 'down';
    return 'neutral';
  }, [allSnapshots, totalCount]);

  const { selectedFormData, selectedScores, selectedRoadmap, previousFormData, previousScores } = useMemo(() => {
    const snap = allSnapshots[selectedIndex];
    if (!snap?.formData) {
      return { selectedFormData: null, selectedScores: null, selectedRoadmap: null, previousFormData: null, previousScores: null };
    }

    const scores = computeScores(snap.formData);
    const roadmap = buildRoadmap(scores, snap.formData);

    let prevFd: FormData | null = null;
    let prevScores: ScoreSummary | null = null;
    if (selectedIndex < totalCount - 1 && allSnapshots[selectedIndex + 1]?.formData) {
      prevFd = allSnapshots[selectedIndex + 1].formData;
      prevScores = computeScores(prevFd);
    }

    return {
      selectedFormData: snap.formData,
      selectedScores: scores,
      selectedRoadmap: roadmap,
      previousFormData: prevFd,
      previousScores: prevScores,
    };
  }, [allSnapshots, selectedIndex, totalCount]);

  const handleSelect = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, totalCount - 1));
    if (clamped === selectedIndex) return;

    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedIndex(clamped);
      const newPage = clamped >= paginableSnapshots.length
        ? Math.max(0, totalPages - 1)
        : Math.floor(clamped / PAGE_SIZE);
      setCurrentPage(newPage);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 100);
  }, [selectedIndex, totalCount, paginableSnapshots.length, totalPages]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  }, [totalPages]);

  return {
    selectedIndex,
    currentPage,
    totalPages,
    totalCount,
    pageSize: PAGE_SIZE,
    gridItems,
    initialAssessment,
    initialAssessmentGlobalIndex,
    selectedFormData,
    selectedScores,
    selectedRoadmap,
    previousFormData,
    previousScores,
    handleSelect,
    handlePageChange,
    getTrend,
    isTransitioning,
  };
}
