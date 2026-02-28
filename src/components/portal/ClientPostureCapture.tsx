/**
 * Client Posture Capture
 * 
 * Air-gapped client-facing component for capturing posture images.
 * Guides the client through front/right/back/left photos.
 * Stores as a client submission for coach review.
 */

import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Camera, Check, X, RotateCcw, ChevronRight } from 'lucide-react';
import { savePostureSubmission } from '@/services/clientSubmissions';
import { useToast } from '@/hooks/use-toast';

const VIEWS = [
  { id: 'front', label: 'Front View', instruction: 'Stand facing the camera, arms at your sides.' },
  { id: 'right', label: 'Right Side', instruction: 'Turn to face your right. Keep your arms relaxed.' },
  { id: 'back', label: 'Back View', instruction: 'Turn around so your back faces the camera.' },
  { id: 'left', label: 'Left Side', instruction: 'Turn to face your left. Keep your arms relaxed.' },
] as const;

interface ClientPostureCaptureProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function ClientPostureCapture({ onComplete, onCancel }: ClientPostureCaptureProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const webcamRef = useRef<Webcam>(null);

  const [viewIdx, setViewIdx] = useState(0);
  const [images, setImages] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const currentView = VIEWS[viewIdx];
  const capturedCount = Object.keys(images).length;
  const allCaptured = capturedCount === VIEWS.length;

  const handleCapture = useCallback(() => {
    if (!webcamRef.current) return;
    const screenshot = webcamRef.current.getScreenshot();
    if (!screenshot) return;

    const viewId = VIEWS[viewIdx].id;
    setImages((prev) => ({ ...prev, [viewId]: screenshot }));

    // Auto-advance to next view
    if (viewIdx < VIEWS.length - 1) {
      setTimeout(() => setViewIdx((v) => v + 1), 500);
    }
  }, [viewIdx]);

  const handleRetake = useCallback(() => {
    const viewId = VIEWS[viewIdx].id;
    setImages((prev) => {
      const next = { ...prev };
      delete next[viewId];
      return next;
    });
  }, [viewIdx]);

  const handleSubmit = useCallback(async () => {
    if (!user || !profile) return;
    setSaving(true);

    try {
      await savePostureSubmission(
        user.uid,
        profile.organizationId,
        {
          front: images.front,
          right: images.right,
          back: images.back,
          left: images.left,
        },
        capturedCount
      );

      // Notify assigned coach (non-blocking)
      if (profile.assignedCoachUid) {
        import('@/services/notificationWriter').then(({ writeNotification }) =>
          writeNotification({
            recipientUid: profile.assignedCoachUid!,
            type: 'client_submission',
            title: `${profile.displayName || 'A client'} submitted posture images`,
            priority: 'medium',
            actionUrl: `/client/${encodeURIComponent(profile.displayName || '')}`,
          })
        ).catch(() => { /* non-fatal */ });
      }

      toast({
        title: 'Posture images submitted',
        description: 'Your coach will review the photos.',
      });
      onComplete();
    } catch {
      toast({
        title: 'Failed to save',
        description: 'Please try again.',
        variant: 'destructive',
      });
      setSaving(false);
    }
  }, [user, profile, images, capturedCount, toast, onComplete]);

  const currentCaptured = currentView ? !!images[currentView.id] : false;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Posture Photos</h3>
          <p className="text-[10px] text-slate-400">{capturedCount}/{VIEWS.length} views captured</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* View progress dots */}
        <div className="flex items-center justify-center gap-2">
          {VIEWS.map((view, idx) => (
            <button
              key={view.id}
              onClick={() => setViewIdx(idx)}
              className={`w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition-colors ${
                images[view.id]
                  ? 'bg-emerald-100 text-emerald-700'
                  : idx === viewIdx
                  ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-300'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {images[view.id] ? <Check className="w-3 h-3" /> : idx + 1}
            </button>
          ))}
        </div>

        {/* Camera or captured preview */}
        {!allCaptured && currentView && (
          <>
            <div className="text-center mb-2">
              <p className="text-sm font-medium text-slate-700">{currentView.label}</p>
              <p className="text-xs text-slate-400">{currentView.instruction}</p>
            </div>

            <div className="relative aspect-[3/4] bg-slate-900 rounded-xl overflow-hidden">
              {currentCaptured ? (
                <img
                  src={images[currentView.id]}
                  alt={currentView.label}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    facingMode: 'user',
                    width: { ideal: 720 },
                    height: { ideal: 960 },
                  }}
                  onUserMedia={() => setCameraReady(true)}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Guide overlay */}
              {!currentCaptured && cameraReady && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-8 border-2 border-white/30 rounded-2xl" />
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <span className="text-xs text-white/80 bg-black/40 px-3 py-1 rounded-full">
                      Position yourself within the guide
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {currentCaptured ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleRetake}
                    className="flex-1 h-11 rounded-xl"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Retake
                  </Button>
                  {viewIdx < VIEWS.length - 1 && (
                    <Button
                      onClick={() => setViewIdx((v) => v + 1)}
                      className="flex-1 h-11 rounded-xl bg-violet-600 hover:bg-violet-500"
                    >
                      Next View
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  onClick={handleCapture}
                  disabled={!cameraReady}
                  className="flex-1 h-11 rounded-xl bg-violet-600 hover:bg-violet-500"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capture {currentView.label}
                </Button>
              )}
            </div>
          </>
        )}

        {/* All captured — review and submit */}
        {allCaptured && (
          <div className="space-y-4">
            <div className="bg-emerald-50 rounded-xl p-3 flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs font-medium text-emerald-800">
                All 4 views captured. Review below and submit.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {VIEWS.map((view) => (
                <div key={view.id} className="relative aspect-[3/4] rounded-lg overflow-hidden bg-slate-100">
                  {images[view.id] && (
                    <img
                      src={images[view.id]}
                      alt={view.label}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-[10px] font-medium text-white">{view.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setImages({});
                  setViewIdx(0);
                }}
                className="flex-1 h-11 rounded-xl"
              >
                Start Over
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 h-11 rounded-xl bg-violet-600 hover:bg-violet-500"
              >
                {saving ? 'Submitting...' : 'Submit for Review'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
