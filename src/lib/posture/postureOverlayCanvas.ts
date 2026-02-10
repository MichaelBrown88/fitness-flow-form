import type { PostureAnalysisResult } from '../ai/postureAnalysis';
import { CONFIG } from '@/config';
import type { OverlayOptions, PostureView, LandmarkData } from './types';
import { drawDeviations } from './postureDeviationRenderer';

/**
 * Adds posture reference or deviation lines to an image using HTML Canvas
 */
export async function addPostureOverlay(
  imageData: string,
  view: PostureView,
  options: OverlayOptions = {}
): Promise<string> {
  const {
    showMidline = true,
    showShoulderLine = true,
    showHipLine = true,
    lineColor = CONFIG.POSTURE_OVERLAY.STYLE.LINE_COLOR,
    lineWidth = CONFIG.POSTURE_OVERLAY.STYLE.LINE_WIDTH,
    analysis,
    mode = 'reference'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = CONFIG.POSTURE_OVERLAY.CANVAS_SIZE.WIDTH;
        const height = CONFIG.POSTURE_OVERLAY.CANVAS_SIZE.HEIGHT;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        const targetCenterX = canvas.width * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.CENTER_X_PCT / 100);
        const targetShoulderY = canvas.height * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.SHOULDER_Y_PCT / 100);
        const targetHipY = canvas.height * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.HIP_Y_PCT / 100);

        const landmarkData = options.landmarks || analysis?.landmarks;

        // Pure black background - matches dark mode UI
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (mode === 'align' && landmarkData) {
          drawAlignedImage(ctx, img, view, landmarkData, canvas.width, canvas.height);
        } else {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }

        ctx.strokeStyle = lineColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (showMidline) {
          ctx.beginPath();
          ctx.moveTo(targetCenterX, 0);
          ctx.lineTo(targetCenterX, canvas.height);
          ctx.stroke();
        }

        if (showShoulderLine) {
          ctx.beginPath();
          ctx.moveTo(0, targetShoulderY);
          ctx.lineTo(canvas.width, targetShoulderY);
          ctx.stroke();
        }

        if (showHipLine) {
          ctx.beginPath();
          ctx.moveTo(0, targetHipY);
          ctx.lineTo(canvas.width, targetHipY);
          ctx.stroke();
        }

        if (mode === 'deviation' && analysis) {
          drawDeviations(ctx, view, analysis, targetCenterX, targetShoulderY, targetHipY);
        }

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageData;
  });
}

function drawAlignedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  view: PostureView,
  landmarkData: LandmarkData,
  canvasWidth: number,
  canvasHeight: number
): void {
  const targetCenterX = canvasWidth * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.CENTER_X_PCT / 100);
  const targetShoulderY = canvasHeight * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.SHOULDER_Y_PCT / 100);
  const targetHipY = canvasHeight * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.HIP_Y_PCT / 100);

  let sourceLandmarkX: number;
  let sourceShoulderY: number;
  let sourceHipY: number;

  if (view === 'side-right' || view === 'side-left') {
    if (landmarkData.midfoot_x_percent !== undefined) {
      sourceLandmarkX = (landmarkData.midfoot_x_percent / 100) * img.width;
    } else {
      sourceLandmarkX = img.width / 2;
    }
  } else {
    if (landmarkData.center_x_percent !== undefined) {
      sourceLandmarkX = (landmarkData.center_x_percent / 100) * img.width;
    } else {
      sourceLandmarkX = img.width / 2;
    }
  }

  if (landmarkData.shoulder_y_percent !== undefined) {
    sourceShoulderY = (landmarkData.shoulder_y_percent / 100) * img.height;
  } else {
    sourceShoulderY = img.height * 0.25;
  }

  if (landmarkData.hip_y_percent !== undefined) {
    sourceHipY = (landmarkData.hip_y_percent / 100) * img.height;
  } else {
    sourceHipY = img.height * 0.5;
  }

  const sourceTorsoHeight = Math.abs(sourceHipY - sourceShoulderY);
  const targetTorsoHeight = Math.abs(targetHipY - targetShoulderY);

  let scale = sourceTorsoHeight > 0 ? targetTorsoHeight / sourceTorsoHeight : 1.0;
  scale = Math.max(0.3, Math.min(3.0, scale));

  const scaledLandmarkX = sourceLandmarkX * scale;
  const scaledShoulderY = sourceShoulderY * scale;
  const scaledHipY = sourceHipY * scale;

  const translateX = targetCenterX - scaledLandmarkX;
  const scaledBodyCenterY = (scaledShoulderY + scaledHipY) / 2;
  const targetBodyCenterY = (targetShoulderY + targetHipY) / 2;
  const translateY = targetBodyCenterY - scaledBodyCenterY;

  ctx.save();
  ctx.translate(translateX, translateY);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/**
 * Adds red deviation lines to an image that has already been aligned with green lines
 */
export async function addDeviationOverlay(
  imageData: string,
  view: PostureView,
  analysis: PostureAnalysisResult
): Promise<string> {
  return addPostureOverlay(imageData, view, {
    mode: 'deviation',
    analysis
  });
}

/**
 * Generates a clean placeholder image for the companion app
 */
export function generatePlaceholderWithGreenLines(
  view: PostureView,
  width: number = CONFIG.POSTURE_OVERLAY.CANVAS_SIZE.WIDTH,
  height: number = CONFIG.POSTURE_OVERLAY.CANVAS_SIZE.HEIGHT
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  // Dark gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(1, '#1e293b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = width / 2;

  // Subtle crosshairs
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 8]);

  // Vertical center line
  ctx.beginPath();
  ctx.moveTo(centerX, height * 0.6);
  ctx.lineTo(centerX, height * 0.85);
  ctx.stroke();

  // Horizontal line for feet position
  ctx.beginPath();
  ctx.moveTo(width * 0.3, height * 0.85);
  ctx.lineTo(width * 0.7, height * 0.85);
  ctx.stroke();

  ctx.setLineDash([]);

  // View label
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(view.toUpperCase().replace('-', ' '), centerX, height - 30);

  // Instruction text
  ctx.fillStyle = '#64748b';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('Upload or capture image', centerX, height - 12);

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Crop and center an image based on detected landmarks
 */
export async function cropAndCenterImage(
  imageData: string,
  view: PostureView,
  landmarks: LandmarkData
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = CONFIG.POSTURE_OVERLAY.CANVAS_SIZE.WIDTH;
        const height = CONFIG.POSTURE_OVERLAY.CANVAS_SIZE.HEIGHT;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        const targetCenterX = width * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.CENTER_X_PCT / 100);
        const targetShoulderY = height * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.SHOULDER_Y_PCT / 100);
        const targetHipY = height * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.HIP_Y_PCT / 100);

        let sourceLandmarkX: number;

        if (view === 'side-right' || view === 'side-left') {
          sourceLandmarkX = landmarks.midfoot_x_percent !== undefined
            ? (landmarks.midfoot_x_percent / 100) * img.width
            : img.width / 2;
        } else {
          sourceLandmarkX = landmarks.center_x_percent !== undefined
            ? (landmarks.center_x_percent / 100) * img.width
            : img.width / 2;
        }

        const sourceShoulderY = landmarks.shoulder_y_percent !== undefined
          ? (landmarks.shoulder_y_percent / 100) * img.height
          : img.height * 0.25;

        const sourceHipY = landmarks.hip_y_percent !== undefined
          ? (landmarks.hip_y_percent / 100) * img.height
          : img.height * 0.5;

        const sourceTorsoHeight = Math.abs(sourceHipY - sourceShoulderY);
        const targetTorsoHeight = Math.abs(targetHipY - targetShoulderY);

        let scale = sourceTorsoHeight > 0 ? targetTorsoHeight / sourceTorsoHeight : 1.0;
        scale = Math.max(0.3, Math.min(3.0, scale));

        const scaledLandmarkX = sourceLandmarkX * scale;
        const scaledShoulderY = sourceShoulderY * scale;
        const scaledHipY = sourceHipY * scale;

        const translateX = targetCenterX - scaledLandmarkX;
        const scaledBodyCenterY = (scaledShoulderY + scaledHipY) / 2;
        const targetBodyCenterY = (targetShoulderY + targetHipY) / 2;
        const translateY = targetBodyCenterY - scaledBodyCenterY;

        // Black background for gaps
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(translateX, translateY);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        ctx.restore();

        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageData;
  });
}
