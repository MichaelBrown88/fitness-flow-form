# Alignment Code Path Verification

## ✅ Both Methods Use Identical Code

Both **iPhone Companion App capture** and **Manual File Upload** use the **EXACT SAME** alignment function.

## Code Flow

### iPhone Companion App Capture
```
Companion.tsx → performCapture()
  ↓
updatePostureImage(sessionId, view, imageSrc, capturedLandmarks)
  ↓
[Uses provided landmarks from real-time MediaPipe]
  ↓
addPostureOverlay(imageData, view, {
  showMidline: true,
  showShoulderLine: true,
  showHipLine: true,
  lineColor: '#00ff00',
  lineWidth: 4,
  mode: 'align',
  landmarks: providedLandmarks
})
```

### Manual File Upload
```
PostureCompanionModal.tsx → handleFileUpload()
  ↓
loadImagesFromFiles(fileMap)
  ↓
updatePostureImage(session.id, view, testImages[view])
  ↓
[Detects landmarks from static image using MediaPipe]
  ↓
addPostureOverlay(imageData, view, {
  showMidline: true,
  showShoulderLine: true,
  showHipLine: true,
  lineColor: '#00ff00',
  lineWidth: 4,
  mode: 'align',
  landmarks: detectedLandmarks
})
```

## Key Points

1. **Same Function**: Both call `updatePostureImage()` in `src/services/liveSessions.ts`
2. **Same Alignment**: Both call `addPostureOverlay()` with identical parameters
3. **Same Green Lines**: Both use the same target positions:
   - Vertical midline: 50% X
   - Shoulder line: 25% Y
   - Hip line: 50% Y
4. **Same Algorithm**: Both use the same scale/translate math in `postureOverlay.ts`

## Only Difference

- **iPhone**: Uses landmarks from real-time MediaPipe detection (passed as parameter)
- **Manual**: Detects landmarks from static image (if not provided)

Both end up with the same `LandmarkResult` structure and pass it to the same alignment function.

## Verification

Check browser console logs:
- `[ALIGN] Using provided landmarks for {view} (provided (iPhone capture))`
- `[ALIGN] Detected landmarks for {view} (detected (manual upload))`
- `[ALIGN] ✅ Aligned image and added green reference lines to {view} using landmarks`

Both will show the same alignment calculations and use the same `addPostureOverlay()` function.

