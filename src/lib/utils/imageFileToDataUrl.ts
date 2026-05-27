import { convertHeicOnServer } from '@/services/convertClientUploadHeic';
import { logger } from '@/lib/utils/logger';

const HEIC_EXTENSIONS = /\.(heic|heif)$/i;

type SniffedFormat = 'jpeg' | 'png' | 'webp' | 'heif' | 'unknown';

export function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === 'image/heic' || type === 'image/heif') return true;
  return HEIC_EXTENSIONS.test(file.name);
}

function sniffImageFormat(buffer: ArrayBuffer): SniffedFormat {
  const b = new Uint8Array(buffer.slice(0, 24));
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return 'png';
  }
  if (
    b.length >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return 'webp';
  }
  if (b.length >= 8 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    return 'heif';
  }
  return 'unknown';
}

function formatHeicError(err: unknown): string {
  if (err && typeof err === 'object') {
    const rec = err as { code?: number; message?: string };
    if (rec.message?.includes('format not supported') || rec.code === 2) {
      return 'This HEIC variant is not supported in the browser (often Live Photo, HDR, or 10-bit). Trying server conversion…';
    }
    if (typeof rec.message === 'string' && rec.message.length > 0) {
      return rec.message;
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Unknown error';
}

function blobToJpegDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const raw = reader.result;
      if (typeof raw !== 'string' || raw.length === 0) {
        reject(new Error('Could not read image data'));
        return;
      }
      const base64Part = raw.includes(',') ? raw.split(',')[1] : raw;
      resolve(`data:image/jpeg;base64,${base64Part}`);
    };
    reader.onerror = () => reject(new Error('Could not read image data'));
    reader.readAsDataURL(blob);
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Could not encode JPEG'));
      },
      'image/jpeg',
      quality,
    );
  });
}

async function rasterizeToJpegBlob(source: CanvasImageSource, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare image canvas');
  ctx.drawImage(source, 0, 0, width, height);
  return canvasToJpegBlob(canvas);
}

async function blobToJpegViaCanvas(blob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Image decode failed'));
      el.src = url;
    });
    return rasterizeToJpegBlob(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Safari / WebKit often decodes HEIC natively without WASM. */
async function tryNativeHeicDecode(file: File): Promise<Blob | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        return await rasterizeToJpegBlob(bitmap, bitmap.width, bitmap.height);
      } finally {
        bitmap.close();
      }
    } catch {
      // fall through
    }
  }

  try {
    return await blobToJpegViaCanvas(file);
  } catch {
    return null;
  }
}

async function convertHeicWithHeicToJpeg(file: File): Promise<Blob> {
  const { heicTo } = await import('heic-to');
  const converted = await heicTo({
    blob: file,
    type: 'image/jpeg',
    quality: 0.92,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  if (!(blob instanceof Blob)) {
    throw new Error('HEIC conversion returned no image');
  }
  return blob;
}

async function convertHeicWithHeicToBitmap(file: File): Promise<Blob> {
  const { heicTo } = await import('heic-to');
  const converted = await heicTo({
    blob: file,
    type: 'bitmap',
  });
  const bitmap = Array.isArray(converted) ? converted[0] : converted;
  if (!(bitmap instanceof ImageBitmap)) {
    throw new Error('HEIC bitmap conversion failed');
  }
  try {
    return await rasterizeToJpegBlob(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

async function convertHeicWithHeic2Any(file: File): Promise<Blob> {
  const heic2any = (await import('heic2any')).default;
  const converted = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.92,
    multiple: true,
  });
  const blobs = Array.isArray(converted) ? converted : [converted];
  for (const item of blobs) {
    if (item instanceof Blob && item.size > 0) {
      return new Blob([item], { type: 'image/jpeg' });
    }
  }
  throw new Error('HEIC conversion returned no frames');
}

export const HEIC_UPLOAD_HELP =
  'This Apple photo could not be opened. In Photos, choose Share → Save Image (JPEG), or on iPhone set Camera → Formats → Most Compatible, then retake or re-export.';

async function convertHeicFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const sniffed = sniffImageFormat(buffer);

  if (sniffed === 'jpeg') {
    return blobToJpegDataUrl(new Blob([buffer], { type: 'image/jpeg' }));
  }
  if (sniffed === 'png' || sniffed === 'webp') {
    const mime = sniffed === 'png' ? 'image/png' : 'image/webp';
    return blobToJpegDataUrl(await blobToJpegViaCanvas(new Blob([buffer], { type: mime })));
  }

  logger.debug('[HEIC] Converting', { name: file.name, size: file.size, type: file.type, sniffed });

  const errors: string[] = [];

  const native = await tryNativeHeicDecode(file);
  if (native) {
    logger.debug('[HEIC] Converted via native decoder', { name: file.name });
    return blobToJpegDataUrl(native);
  }
  errors.push('native decode');

  const attempts: Array<{ name: string; run: () => Promise<Blob> }> = [
    { name: 'heic-to-jpeg', run: () => convertHeicWithHeicToJpeg(file) },
    { name: 'heic-to-bitmap', run: () => convertHeicWithHeicToBitmap(file) },
    { name: 'heic2any', run: () => convertHeicWithHeic2Any(file) },
  ];

  for (const attempt of attempts) {
    try {
      const blob = await attempt.run();
      logger.debug('[HEIC] Converted', { name: file.name, via: attempt.name });
      return blobToJpegDataUrl(blob);
    } catch (err) {
      const msg = formatHeicError(err);
      logger.warn('[HEIC] Attempt failed', { name: file.name, via: attempt.name, error: msg });
      errors.push(`${attempt.name}: ${msg}`);
    }
  }

  try {
    const dataUrl = await convertHeicOnServer(file);
    logger.debug('[HEIC] Converted via server', { name: file.name });
    return dataUrl;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'server conversion failed';
    logger.warn('[HEIC] Server conversion failed', { name: file.name, error: msg });
    errors.push(`server: ${msg}`);
  }

  logger.error('[HEIC] All conversion strategies failed', { name: file.name, errors });
  throw new Error(HEIC_UPLOAD_HELP);
}

/**
 * Read any supported image File as a JPEG data URL (converts HEIC/HEIF when needed).
 */
export async function imageFileToDataUrl(file: File): Promise<string> {
  if (!isHeicFile(file)) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        if (typeof base64String !== 'string' || !base64String.startsWith('data:image')) {
          reject(new Error('Invalid image file — use JPEG or PNG'));
          return;
        }
        resolve(base64String);
      };
      reader.onerror = () => reject(new Error('Could not read image file'));
      reader.readAsDataURL(file);
    });
  }

  return convertHeicFile(file);
}
