# Repomix Command for Posture Scan & InBody OCR Files

## Command

```bash
repomix --include "src/lib/ai/postureLandmarks.ts,src/services/postureProcessing.ts,src/lib/ai/postureAnalysis.ts,src/lib/utils/postureOverlay.ts,src/lib/utils/postureMath.ts,src/components/camera/PostureCompanionModal.tsx,src/pages/Companion.tsx,src/hooks/usePoseDetection.ts,src/hooks/useCameraCapture.ts,src/hooks/useOrientationDetection.ts,src/components/companion/CompanionUI.tsx,src/services/liveSessions.ts,src/lib/ai/ocrEngine.ts,src/components/camera/InBodyCompanionModal.tsx,src/components/assessment/OcrReviewDialog.tsx,src/hooks/useCameraHandler.ts,src/components/assessment/SingleFieldFlow.tsx,src/lib/types/companion.ts,src/config/index.ts" --output scan-features-output.md --style markdown
```

**Alternative (using glob patterns if direct paths don't work):**

```bash
repomix --include "src/lib/ai/{postureLandmarks,postureAnalysis,ocrEngine}.ts,src/services/{postureProcessing,liveSessions}.ts,src/lib/utils/{postureOverlay,postureMath}.ts,src/components/camera/{PostureCompanionModal,InBodyCompanionModal}.tsx,src/pages/Companion.tsx,src/hooks/{usePoseDetection,useCameraCapture,useOrientationDetection,useCameraHandler}.ts,src/components/companion/CompanionUI.tsx,src/components/assessment/{OcrReviewDialog,SingleFieldFlow}.tsx,src/lib/types/companion.ts,src/config/index.ts" --output scan-features-output.md --style markdown
```

**Note:** This will output all **full file contents** into a single `scan-features-output.md` file. Repomix defaults to single-file output unless `--split-output` is specified.

## Files Included

### Posture Scan Files:
1. `src/lib/ai/postureLandmarks.ts` - MediaPipe landmark detection
2. `src/services/postureProcessing.ts` - Unified posture processing system
3. `src/lib/ai/postureAnalysis.ts` - AI analysis for posture
4. `src/lib/utils/postureOverlay.ts` - Image overlay utilities
5. `src/lib/utils/postureMath.ts` - Posture calculation math
6. `src/components/camera/PostureCompanionModal.tsx` - Posture modal UI
7. `src/pages/Companion.tsx` - Mobile companion page
8. `src/hooks/usePoseDetection.ts` - Pose detection hook
9. `src/hooks/useCameraCapture.ts` - Camera capture logic
10. `src/hooks/useOrientationDetection.ts` - Orientation detection
11. `src/components/companion/CompanionUI.tsx` - Companion UI component
12. `src/services/liveSessions.ts` - Live session management (updatePostureImage)

### InBody OCR Files:
1. `src/lib/ai/ocrEngine.ts` - OCR engine for InBody scans
2. `src/components/camera/InBodyCompanionModal.tsx` - InBody modal UI
3. `src/components/assessment/OcrReviewDialog.tsx` - OCR review dialog
4. `src/services/liveSessions.ts` - Live session management (updateInBodyImage)

### Supporting Files:
1. `src/hooks/useCameraHandler.ts` - Camera handler hook
2. `src/components/assessment/SingleFieldFlow.tsx` - Field flow component
3. `src/lib/types/companion.ts` - Companion types
4. `src/config/index.ts` - Configuration (MediaPipe/CDN settings)
