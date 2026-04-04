# Companion posture: Gemini Live + MediaPipe Tasks

This document describes the **posture** Companion upgrade (Gemini 3.1 Flash Live spoken framing + MediaPipe Tasks `PoseLandmarker` on captures). **OCR / body-comp** flows and core posture **analysis math** were intentionally left unchanged.

## Goals

- **Gemini Live (Vertex):** One-way, natural spoken framing guidance; client stays relaxed; exact trigger phrase **“Perfect — capturing now”** arms capture.
- **MediaPipe Tasks:** Final **high-res screenshot** runs through the shared `PoseLandmarker` for consistent landmarks (not the live preview stream for save).
- **Repeat scans:** Optional **`postureFraming_${view}`** on `live_sessions` supports future “match previous” style guidance.

## What changed (posture / pipeline)

| Area | Change |
|------|--------|
| **Dependencies** | Removed classic `@mediapipe/pose` (+ camera/drawing utils). Kept `@mediapipe/tasks-vision` (WASM URL pinned in `CONFIG`). |
| **Config** | `TASKS_WASM_BASE`, `POSE_LANDMARKER_MODEL_URL`, `LIVE_POSE_TARGET_FPS`, `LIVE_MODEL_NAME` / `VITE_GEMINI_LIVE_MODEL`, `LIVE_FRAME_INTERVAL_MS`, `minConfidence`, `POSTURE_GEMINI_NEXT_VIEW_MS`. |
| **Singleton** | `src/lib/ai/mediapipeSingleton.ts` — `PoseLandmarker`, GPU → CPU fallback, `queueDetection`, `prewarmMediaPipe`, `detectPoseFromImageSource`. |
| **Static detection** | `src/lib/ai/postureLandmarks.ts` — queued image path + timeout. |
| **Live preview** | `src/hooks/usePoseDetection.ts` — throttled ~7 FPS, `suppressAudioFeedback` for posture (Gemini speaks), optional `disablePosePipeline`, **no** `close()` on unmount. |
| **Processing** | `src/services/postureProcessing.ts` — `POSTURE_STRUCTURAL_LANDMARK_INDICES`, `averageStructuralLandmarkVisibility`, gate uses `CONFIG` `minConfidence`. |
| **Framing metadata** | `src/lib/utils/postureFramingMetadata.ts` + `updatePostureImage(..., framingMetadata?)` → `postureFraming_${view}` in `src/services/liveSessions.ts`. |
| **Gemini hook** | `src/hooks/useGeminiFramingGuide.ts` + `src/constants/geminiFramingPrompt.ts` — audio 24 kHz PCM, ~1 FPS JPEG, mirrored canvas when front camera matches UI, warmup / `armShot` / `shutdown` / `retry`, `connectionStatus` / `connectionError` for UI. |
| **Companion page** | `src/pages/Companion.tsx` — posture: warmup → ready → `armShot` + `captureWithRetries` (3 tries, 500 ms between tries, **best** visibility snapshot if below threshold), 3 s between views, `shutdown` on complete / cancel+reconnect pattern. |
| **Companion UI** | `src/components/companion/CompanionUI.tsx` — no posture countdown when Gemini path; Gemini status / error chip + Retry. |

## What did **not** change (OCR / body-comp)

- **`src/lib/ai/ocrEngine.ts`** and body-comp OCR in **`src/hooks/useCameraHandler.ts`** (assessment flows) — unchanged relative to this posture migration.
- **Body-comp Companion path** — still uses **5 s countdown** and existing capture/upload flow.
- **`CompanionUI`** OCR screens (“Reading your report…”, “Check the Numbers”) remain; **`Companion.tsx`** may pass stubs for OCR props where the simplified page does not wire full OCR state.

## How to test

### Posture (iPhone Safari recommended)

1. Open Companion session in **posture** mode (`?mode=posture` or default).
2. Grant **camera + motion + audio** (audio primes `AudioContext` for Gemini playback).
3. **Level phone** → **waiting_pose** → wait for **Gemini warmup** (first model turn complete) → **ready**.
4. Tap **Start capture** → listen for framing → on **“Perfect — capturing now”** the app captures (up to 3 silent retries if landmark confidence is low).
5. Complete **four views**; confirm **`live_sessions`** has updated `postureImages.*`, `landmarks_*`, and **`postureFraming_*`** when framing was computed.

### Body-comp / OCR

1. Open Companion in **bodycomp** mode.
2. Confirm **countdown** capture and **OCR / review** behavior matches pre-migration expectations.

### Desktop / Chrome

- Repeat posture flow to verify **Live WebSocket** connects and **jsDelivr WASM** loads (Network tab).

## Operational checklist (no code required)

1. **Model name** — Confirm `gemini-3.1-flash-live-preview` (or your region’s Live model) is available on **Vertex** for the project/location. If connect fails, set **`VITE_GEMINI_LIVE_MODEL`** to the model ID Google documents for Live in your region.
2. **CSP / hosting** — If you enforce **Content-Security-Policy**, allow **`wss:`** for the Firebase / Vertex Live WebSocket, plus **`https://cdn.jsdelivr.net`** (Tasks WASM) and **`https://storage.googleapis.com`** (`.task` model) in **`connect-src`** as needed.
3. **iOS Safari** — Smoke test **AudioContext** after user gesture, **WebGL** vs **CPU** landmarker fallback, and **end-to-end capture latency**.

## Key files

- `src/pages/Companion.tsx` — Posture vs bodycomp branching.
- `src/hooks/useGeminiFramingGuide.ts` — Live session lifecycle.
- `src/lib/ai/mediapipeSingleton.ts` — Shared landmarker.
- `src/config/index.ts` — All tunables and env overrides.

## Repository note: `npm run typecheck`

Full-project `tsc -p tsconfig.app.json --noEmit` may still report errors in **unrelated** areas (e.g. reports, roadmap, PDF export deps, client profiles). The Companion / Gemini / MediaPipe migration files are intended to be clean under ESLint; fix or exclude the above when you need a **green** CI typecheck for the whole app.
