import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { PostureCompanionData } from '@/lib/types/companion';
import type { LiveSession } from '@/services/liveSessions';

/** Connection state for 3-tier heartbeat monitoring */
export type ConnectionState = 'offline' | 'online' | 'unstable' | 'disconnected';

/** Processing stage for each view */
export type ProcessingStage =
  | 'idle'
  | 'converting'
  | 'detecting'
  | 'aligning'
  | 'analyzing'
  | 'complete'
  | 'error';

export const VIEWS = ['front', 'back', 'side-left', 'side-right'] as const;
export type ViewType = (typeof VIEWS)[number];

/** Processing status for all views */
export type ProcessingStatus = Record<ViewType, ProcessingStage>;

export interface PreviewImage {
  url: string;
  view: string;
}

export interface UsePostureCompanionOptions {
  isOpen: boolean;
  onComplete: (data: PostureCompanionData) => void;
  onClose: () => void;
  /** Open guided capture on the coach’s device (Gemini Live + same session sync). */
  onRequestDeviceCapture?: () => void;
}

export interface UsePostureCompanionResult {
  session: LiveSession | null;
  companionUrl: string;
  isOnline: boolean;
  connectionState: ConnectionState;
  error: string | null;
  isLoadingTestImages: boolean;
  processingStatus: ProcessingStatus;
  previewImage: PreviewImage | null;
  setPreviewImage: Dispatch<SetStateAction<PreviewImage | null>>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  placeholderImages: Record<string, string>;
  hasAllImages: boolean;
  isComplete: boolean;
  views: readonly ViewType[];
  handleLoadTestImages: () => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleApply: () => void;
  handleDirectScan: () => void;
}

export const IDLE_PROCESSING_STATUS: ProcessingStatus = {
  front: 'idle',
  back: 'idle',
  'side-left': 'idle',
  'side-right': 'idle',
};
