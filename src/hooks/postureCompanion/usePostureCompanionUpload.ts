import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import { updatePostureImage, type LiveSession } from '@/services/liveSessions';
import { loadImagesFromFiles } from '@/lib/test/postureTestImages';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types/auth';
import { logger } from '@/lib/utils/logger';
import { UI_TOASTS } from '@/constants/ui';
import {
  VIEWS,
  type ProcessingStage,
  type ProcessingStatus,
  type PreviewImage,
  type ViewType,
  IDLE_PROCESSING_STATUS,
} from './types';

export interface UsePostureCompanionUploadArgs {
  isOpen: boolean;
  session: LiveSession | null;
  profile: UserProfile | null | undefined;
}

export interface UsePostureCompanionUploadResult {
  isLoadingTestImages: boolean;
  processingStatus: ProcessingStatus;
  previewImage: PreviewImage | null;
  setPreviewImage: Dispatch<SetStateAction<PreviewImage | null>>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleLoadTestImages: () => void;
  handleFileUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function usePostureCompanionUpload({
  isOpen,
  session,
  profile,
}: UsePostureCompanionUploadArgs): UsePostureCompanionUploadResult {
  const { toast } = useToast();
  const [isLoadingTestImages, setIsLoadingTestImages] = useState(false);
  const [processingStatus, setProcessingStatus] =
    useState<ProcessingStatus>(IDLE_PROCESSING_STATUS);
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProcessingStatus = useCallback((view: ViewType, stage: ProcessingStage) => {
    setProcessingStatus((prev) => ({ ...prev, [view]: stage }));
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setProcessingStatus(IDLE_PROCESSING_STATUS);
      setPreviewImage(null);
      setIsLoadingTestImages(false);
    }
  }, [isOpen]);

  const handleLoadTestImages = useCallback(() => {
    if (!session?.id) {
      toast({
        title: UI_TOASTS.ERROR.SESSION_NOT_READY,
        description: UI_TOASTS.ERROR.SESSION_NOT_READY_DESC,
        variant: 'destructive',
      });
      return;
    }

    if (isLoadingTestImages) {
      toast({
        title: UI_TOASTS.ERROR.UPLOAD_IN_PROGRESS,
        description: UI_TOASTS.ERROR.UPLOAD_IN_PROGRESS_DESC,
        variant: 'destructive',
      });
      return;
    }

    try {
      fileInputRef.current?.click();
    } catch (err) {
      logger.error('[UPLOAD] Failed to trigger file input:', err);
      toast({
        title: UI_TOASTS.ERROR.UPLOAD_FAILED,
        description: UI_TOASTS.ERROR.UPLOAD_FAILED_DESC,
        variant: 'destructive',
      });
    }
  }, [session?.id, isLoadingTestImages, toast]);

  const handleFileUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      if (!session?.id) {
        toast({
          title: UI_TOASTS.ERROR.NO_ACTIVE_SESSION,
          description: UI_TOASTS.ERROR.NO_ACTIVE_SESSION_DESC,
          variant: 'destructive',
        });
        return;
      }

      const files = event.target.files;
      if (!files || files.length === 0) {
        toast({
          title: UI_TOASTS.ERROR.NO_FILES_SELECTED,
          description: UI_TOASTS.ERROR.NO_FILES_SELECTED_DESC,
          variant: 'destructive',
        });
        return;
      }

      setIsLoadingTestImages(true);
      setProcessingStatus(IDLE_PROCESSING_STATUS);

      try {
        toast({
          title: UI_TOASTS.SUCCESS.LOADING_IMAGES,
          description: `Processing ${files.length} uploaded file(s)...`,
        });

        const fileArray = Array.from(files);
        const fileMap: Record<string, File> = {};

        fileArray.forEach((file, index) => {
          const fileName = file.name.toLowerCase();
          let matchedView: string | null = null;

          if (fileName.includes('front')) {
            matchedView = 'front';
          } else if (
            fileName.includes('right side') ||
            fileName.includes('side-right') ||
            (fileName.includes('right') && !fileName.includes('left'))
          ) {
            matchedView = 'side-right';
          } else if (
            fileName.includes('left side') ||
            fileName.includes('side-left') ||
            (fileName.includes('left') && !fileName.includes('right'))
          ) {
            matchedView = 'side-left';
          } else if (fileName.includes('back') || fileName.includes('rear')) {
            matchedView = 'back';
          } else if (index < VIEWS.length) {
            matchedView = VIEWS[index];
          }

          if (matchedView) {
            fileMap[matchedView] = file;
          }
        });

        if (Object.keys(fileMap).length === 0) {
          throw new Error(
            'Could not match uploaded files to views. Please name files with "front", "side-left", "back", or "side-right" in the filename, or upload them in order: Front, Left side, Back, Right side.',
          );
        }

        Object.keys(fileMap).forEach((view) => {
          updateProcessingStatus(view as ViewType, 'converting');
        });

        const testImages = await loadImagesFromFiles(fileMap);

        if (Object.keys(testImages).length === 0) {
          throw new Error(
            'No images could be loaded from the uploaded files. Please check that the files are valid images (JPEG, PNG, HEIC, etc.).',
          );
        }

        const processView = async (
          view: ViewType,
        ): Promise<{ view: ViewType; success: boolean; error?: string }> => {
          if (!testImages[view]) {
            return { view, success: false, error: 'No image data' };
          }

          if (!testImages[view].startsWith('data:image')) {
            updateProcessingStatus(view, 'error');
            return { view, success: false, error: 'Invalid image data format' };
          }

          try {
            updateProcessingStatus(view, 'detecting');

            const processingPromise = (async () => {
              const result = updatePostureImage(
                session.id,
                view,
                testImages[view],
                undefined,
                'manual',
                profile?.organizationId,
                profile,
              );

              setTimeout(() => updateProcessingStatus(view, 'analyzing'), 2000);

              return result;
            })();

            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Processing timeout after 180 seconds')), 180000),
            );

            await Promise.race([processingPromise, timeoutPromise]);

            updateProcessingStatus(view, 'complete');
            return { view, success: true };
          } catch (err) {
            updateProcessingStatus(view, 'error');
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            return { view, success: false, error: errorMsg };
          }
        };

        const viewsToProcess = VIEWS.filter((view) => testImages[view]);

        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        for (const view of viewsToProcess) {
          const result = await processView(view);

          if (result.success) {
            successCount++;
          } else {
            failCount++;
            if (result.error) {
              errors.push(`${view}: ${result.error}`);
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (successCount > 0) {
          toast({
            title: UI_TOASTS.SUCCESS.IMAGES_UPLOADED,
            description: `${successCount} image(s) processed successfully.${failCount > 0 ? ` ${failCount} failed.` : ''}`,
          });
        } else {
          const errorDetails = errors.length > 0 ? ` Errors: ${errors.join('; ')}` : '';
          throw new Error(
            `All ${failCount} image(s) failed to process.${errorDetails} Check browser console for details.`,
          );
        }
      } catch (error) {
        logger.error('[UPLOAD] Failed to upload images:', error);
        toast({
          title: UI_TOASTS.ERROR.UPLOAD_FAILED,
          description:
            error instanceof Error
              ? error.message
              : 'Could not upload images. Check console for details.',
          variant: 'destructive',
        });

        setProcessingStatus({
          front: 'error',
          back: 'error',
          'side-left': 'error',
          'side-right': 'error',
        });
      } finally {
        setIsLoadingTestImages(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [session?.id, toast, profile, updateProcessingStatus],
  );

  return {
    isLoadingTestImages,
    processingStatus,
    previewImage,
    setPreviewImage,
    fileInputRef,
    handleLoadTestImages,
    handleFileUpload,
  };
}
