/**
 * Camera Wizard
 *
 * Single-modal step flow for camera-based captures:
 * Step 1: Instructions → Step 2: Capture → Step 3: Review/Confirm
 *
 * Wraps CameraCapture and OcrReviewDialog into a unified wizard experience.
 * Logic is kept minimal — delegates to existing capture and review components.
 */

import { useState, useCallback, lazy, Suspense } from 'react';
import { Loader2, Camera, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { CameraCaptureErrorBoundary } from '@/components/camera/CameraCaptureErrorBoundary';

const CameraCapture = lazy(() =>
  import('./CameraCapture').then(m => ({ default: m.CameraCapture }))
);

type WizardStep = 'instructions' | 'capture' | 'review';

interface CameraWizardProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (imageSrc: string) => void;
  mode: 'ocr' | 'posture';
  title: string;
  instructions?: string[];
}

const STEP_LABELS: Record<WizardStep, string> = {
  instructions: 'Prepare',
  capture: 'Capture',
  review: 'Confirm',
};

const STEPS: WizardStep[] = ['instructions', 'capture', 'review'];

export function CameraWizard({
  open,
  onClose,
  onConfirm,
  mode,
  title,
  instructions,
}: CameraWizardProps) {
  const [step, setStep] = useState<WizardStep>('instructions');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const currentStepIdx = STEPS.indexOf(step);

  const handleCapture = useCallback((imageSrc: string) => {
    setCapturedImage(imageSrc);
    setStep('review');
  }, []);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setStep('capture');
  }, []);

  const handleConfirm = useCallback(() => {
    if (capturedImage) {
      onConfirm(capturedImage);
      setCapturedImage(null);
      setStep('instructions');
    }
  }, [capturedImage, onConfirm]);

  const handleClose = useCallback(() => {
    setCapturedImage(null);
    setStep('instructions');
    onClose();
  }, [onClose]);

  const defaultInstructions = mode === 'posture'
    ? [
        'Hold the phone vertically at chest height',
        'Stand 6-8 feet away from the subject',
        'Ensure good lighting with a plain background',
        'The subject should stand in a natural posture',
      ]
    : [
        'Place the scanner report on a flat surface',
        'Ensure the full report is visible in frame',
        'Avoid shadows and glare on the document',
        'Hold the phone steady and parallel to the report',
      ];

  const displayInstructions = instructions || defaultInstructions;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Step indicator */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`h-1.5 rounded-full transition-all ${
                  i <= currentStepIdx ? 'w-5 bg-primary' : 'w-1.5 bg-muted'
                }`} />
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground px-5 pb-3">
          {STEP_LABELS[step]}
        </p>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {step === 'instructions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <Camera className="w-7 h-7" />
                </div>
              </div>
              <ul className="space-y-3">
                {displayInstructions.map((instruction, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground-secondary">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    {instruction}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => setStep('capture')}
                className="w-full h-12 bg-foreground text-white hover:bg-foreground/90 mt-4"
              >
                Open Camera
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {step === 'capture' && (
            <div className="min-h-[300px]">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
                  </div>
                }
              >
                <CameraCaptureErrorBoundary onDismiss={() => setStep('instructions')}>
                  <CameraCapture
                    onCapture={handleCapture}
                    onClose={() => setStep('instructions')}
                    mode={mode}
                  />
                </CameraCaptureErrorBoundary>
              </Suspense>
            </div>
          )}

          {step === 'review' && capturedImage && (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border border-border">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-auto max-h-[400px] object-contain bg-muted/50"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Does this look good? You can retake if needed.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleRetake}
                  className="flex-1 h-11"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retake
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="flex-1 h-11 bg-foreground text-white hover:bg-foreground/90"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
