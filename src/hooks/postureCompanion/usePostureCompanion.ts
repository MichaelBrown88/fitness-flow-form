import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';
import { VIEWS } from './types';
import type { UsePostureCompanionOptions, UsePostureCompanionResult } from './types';
import { usePostureCompanionSession } from './usePostureCompanionSession';
import { usePostureCompanionConnection } from './usePostureCompanionConnection';
import { usePostureCompanionUpload } from './usePostureCompanionUpload';

export function usePostureCompanion({
  isOpen,
  onComplete,
  onClose,
  onRequestDeviceCapture,
}: UsePostureCompanionOptions): UsePostureCompanionResult {
  const { profile } = useAuth();

  const {
    session,
    setSession,
    error,
    companionUrl,
    placeholderImages,
    hasAllImages,
    isComplete,
  } = usePostureCompanionSession({ isOpen, profile });

  const { isOnline, connectionState } = usePostureCompanionConnection({
    isOpen,
    session,
    setSession,
  });

  const {
    isLoadingTestImages,
    processingStatus,
    previewImage,
    setPreviewImage,
    fileInputRef,
    handleLoadTestImages,
    handleFileUpload,
  } = usePostureCompanionUpload({ isOpen, session, profile });

  const handleApply = useCallback(() => {
    if (!session) return;

    const storageUrls: Record<string, string> = {};

    VIEWS.forEach((view) => {
      const storageUrl = session[`postureImagesStorage_${view}`] || session[`postureImagesFull_${view}`];
      if (typeof storageUrl === 'string') {
        storageUrls[view] = storageUrl;
      } else {
        logger.warn(`[APPLY] No Storage URL found for ${view} - image may not be stored yet`);
      }
    });

    const findings = {
      postureAiResults: session.analysis,
      postureImages: session.postureImages,
      postureImagesStorage: storageUrls,
      postureHeadOverall:
        session.analysis['side-right']?.forward_head?.status === 'Neutral'
          ? ['neutral']
          : ['forward-head'],
      postureShouldersOverall:
        session.analysis.front?.shoulder_alignment?.status === 'Neutral' ? ['neutral'] : ['rounded'],
      postureBackOverall:
        session.analysis['side-right']?.kyphosis?.status !== 'Within range'
          ? ['increased-kyphosis']
          : ['neutral'],
    };

    onComplete(findings);
    onClose();
  }, [session, onComplete, onClose]);

  const handleDirectScan = useCallback(() => {
    onRequestDeviceCapture?.();
  }, [onRequestDeviceCapture]);

  return {
    session,
    companionUrl,
    isOnline,
    connectionState,
    error,
    isLoadingTestImages,
    processingStatus,
    previewImage,
    setPreviewImage,
    fileInputRef,
    placeholderImages,
    hasAllImages,
    isComplete,
    views: VIEWS,
    handleLoadTestImages,
    handleFileUpload,
    handleApply,
    handleDirectScan,
  };
}
