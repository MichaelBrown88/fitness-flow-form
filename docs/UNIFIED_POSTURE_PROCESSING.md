# Unified Posture Processing System

## Overview

**ONE SYSTEM - ONE FLOW - ALL SOURCES**

The posture processing system has been unified into a single flow that handles images from ANY source:
- Manual file upload
- iPhone Companion App handoff
- This Device (iPad/Direct camera capture)

## Architecture

### Single Entry Point: `processPostureImage()`

Located in `src/services/postureProcessing.ts`, this function is the **ONLY** way posture images are processed.

### Unified Flow

1. **Detect Landmarks** - MediaPipe (or use provided landmarks)
2. **Align Image** - Green reference lines at fixed positions (50% X, 25% shoulder Y, 50% hip Y)
3. **Calculate Deviations** - Trigonometry (`postureMath.ts`) - deterministic, no AI
4. **AI for Descriptions Only** - Converts calculated numbers → user-friendly text (based on normative data)
5. **Draw Red Deviation Lines** - Visual overlay showing deviations from green reference lines

## Code Locations

### Core Processing
- `src/services/postureProcessing.ts` - Unified processing function
- `src/lib/utils/postureMath.ts` - Trigonometry calculations (deterministic)
- `src/lib/ai/postureAnalysis.ts` - AI description generation (numbers → text)

### Entry Points (All Call the Same System)

1. **Manual Upload**: `src/components/camera/PostureCompanionModal.tsx`
   ```typescript
   await updatePostureImage(session.id, view, imageData, undefined, 'manual');
   ```

2. **iPhone Capture**: `src/pages/Companion.tsx`
   ```typescript
   await updatePostureImage(sessionId, view, imageSrc, landmarks, 'iphone');
   ```

3. **This Device (iPad)**: `src/components/MultiStepForm.tsx`
   ```typescript
   const processed = await processPostureImage(imageSrc, view, undefined, 'this-device');
   ```

### Storage Layer
- `src/services/liveSessions.ts` - `updatePostureImage()` - Handles storage and uses unified processing

## Key Principles

1. **No Duplication** - ONE function does everything
2. **Deterministic First** - MediaPipe + Trigonometry calculate metrics
3. **AI for Text Only** - AI converts numbers to descriptions, doesn't analyze images
4. **Same Output** - Identical alignment and analysis regardless of source

## Benefits

- ✅ Reduced code bloat (removed duplicate processing logic)
- ✅ Consistent alignment across all sources
- ✅ Easier to maintain (change once, affects all)
- ✅ Lower AI costs (calculations are deterministic)
- ✅ Same quality regardless of upload method

