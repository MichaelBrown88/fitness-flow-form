/**
 * Test images for posture analysis
 * These are sample images from the internet for testing AI analysis
 */

import { getHardcodedTestImages, hasHardcodedImages } from './hardcodedPostureImages';
import { imageFileToDataUrl } from '@/lib/utils/imageFileToDataUrl';
import { logger } from '@/lib/utils/logger';

// Sample posture images - using publicly available test images
// These are placeholder URLs that work for testing the AI analysis flow
// For better results, replace with actual posture analysis test images
const TEST_IMAGE_URLS = {
  // Using generic person images - AI will analyze what it can see
  // In production, these should be replaced with proper posture test images
  front: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=1200&fit=crop&q=80',
  'side-right': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=1200&fit=crop&q=80',
  'side-left': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=1200&fit=crop&q=80',
  back: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=1200&fit=crop&q=80',
};

/**
 * Convert an image URL to base64 data URL
 */
async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    logger.error('Error converting image to base64:', error);
    throw error;
  }
}

/**
 * Load test images and convert to base64
 * Returns images ready to be injected into a posture session
 * 
 * If URLs are not set, will prompt user to upload files
 */
export async function loadTestPostureImages(): Promise<Record<string, string>> {
  // First, try to use hard-coded images if available
  if (hasHardcodedImages()) {
    logger.debug('[TEST] Using hard-coded test images');
    return getHardcodedTestImages();
  }
  
  // Otherwise, try to load from URLs
  const images: Record<string, string> = {};
  const views: ('front' | 'side-right' | 'side-left' | 'back')[] = [
    'front',
    'side-left',
    'back',
    'side-right',
  ];
  
  // Check if URLs are configured
  const hasUrls = views.some(view => TEST_IMAGE_URLS[view] && TEST_IMAGE_URLS[view].trim() !== '');
  
  if (!hasUrls) {
    // If no URLs, try to load from embedded base64 images or prompt for files
    throw new Error(
      'Test image URLs not configured. Please either:\n' +
      '1. Add base64 images to hardcodedPostureImages.ts, or\n' +
      '2. Add image URLs to TEST_IMAGE_URLS in postureTestImages.ts, or\n' +
      '3. Use the file upload option in the UI'
    );
  }
  
  for (const view of views) {
    const url = TEST_IMAGE_URLS[view];
    if (!url || url.trim() === '') {
      logger.warn(`[TEST] No URL configured for ${view}, skipping`);
      continue;
    }
    
    try {
      logger.debug(`[TEST] Loading test image for ${view} from ${url}...`);
      const base64 = await imageUrlToBase64(url);
      images[view] = base64;
      logger.debug(`[TEST] Loaded test image for ${view}`);
    } catch (error) {
      logger.error(`[TEST] Failed to load test image for ${view}:`, error);
      throw new Error(`Failed to load test image for ${view}. Check the URL is accessible and CORS-enabled.`);
    }
  }
  
  if (Object.keys(images).length === 0) {
    throw new Error('No test images could be loaded. Please configure image URLs.');
  }
  
  return images;
}

/**
 * Alternative: Load images from File objects (for file upload)
 */
export async function loadImagesFromFiles(files: {
  front?: File;
  'side-right'?: File;
  'side-left'?: File;
  back?: File;
}): Promise<Record<string, string>> {
  const images: Record<string, string> = {};
  const views: ('front' | 'side-right' | 'side-left' | 'back')[] = [
    'front',
    'side-left',
    'back',
    'side-right',
  ];
  
  // Validate that we have at least one file
  const fileCount = Object.values(files).filter(f => f !== undefined).length;
  if (fileCount === 0) {
    throw new Error('No files provided. Please select at least one image file.');
  }
  
  const loadErrors: string[] = [];

  for (const view of views) {
    const file = files[view];
    if (!file) continue;

    const isValidImage =
      file.type.startsWith('image/') ||
      file.name.toLowerCase().match(/\.(jpg|jpeg|png|heic|heif|webp)$/i);
    if (!isValidImage) {
      loadErrors.push(`${file.name}: not a supported image (use JPEG, PNG, HEIC, or WebP)`);
      continue;
    }

    try {
      logger.debug(
        `[UPLOAD] Processing ${view} from file: ${file.name} (${file.type || 'unknown type'}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      );
      const base64 = await imageFileToDataUrl(file);

      if (!base64 || !base64.startsWith('data:image')) {
        loadErrors.push(`${file.name}: file may be corrupted`);
        continue;
      }

      images[view] = base64;
      logger.debug(`[UPLOAD] Successfully loaded ${view} from file: ${file.name}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[UPLOAD] Failed to load ${view} from file ${file.name}:`, error);
      loadErrors.push(`${view} (${file.name}): ${msg}`);
    }
  }

  if (Object.keys(images).length === 0) {
    const detail = loadErrors.length > 0 ? ` ${loadErrors.join(' · ')}` : '';
    throw new Error(
      `No images could be loaded from the uploaded files.${detail}`,
    );
  }

  if (loadErrors.length > 0) {
    logger.warn('[UPLOAD] Some files failed', { loadErrors });
  }
  
  logger.debug(`[UPLOAD] Successfully loaded ${Object.keys(images).length} images:`, Object.keys(images));
  return images;
}

/**

 * Better test images - using more specific posture analysis examples
 * These are placeholder URLs that should be replaced with actual posture test images
 */
export const POSTURE_TEST_IMAGES = {
  // Good posture examples
  good: {
    front: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=1200&fit=crop',
    side: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=1200&fit=crop',
    back: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=1200&fit=crop',
  },
  // Poor posture examples (forward head, rounded shoulders)
  poor: {
    front: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=1200&fit=crop',
    side: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=1200&fit=crop',
    back: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=1200&fit=crop',
  },
};

