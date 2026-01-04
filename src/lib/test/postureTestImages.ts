/**
 * Test images for posture analysis
 * These are sample images from the internet for testing AI analysis
 */

import { getHardcodedTestImages, hasHardcodedImages } from './hardcodedPostureImages';

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
    console.error('Error converting image to base64:', error);
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
    console.log('[TEST] Using hard-coded test images');
    return getHardcodedTestImages();
  }
  
  // Otherwise, try to load from URLs
  const images: Record<string, string> = {};
  const views: ('front' | 'side-right' | 'side-left' | 'back')[] = ['front', 'back', 'side-left', 'side-right'];
  
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
      console.warn(`[TEST] No URL configured for ${view}, skipping`);
      continue;
    }
    
    try {
      console.log(`[TEST] Loading test image for ${view} from ${url}...`);
      const base64 = await imageUrlToBase64(url);
      images[view] = base64;
      console.log(`[TEST] Loaded test image for ${view}`);
    } catch (error) {
      console.error(`[TEST] Failed to load test image for ${view}:`, error);
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
  const views: ('front' | 'side-right' | 'side-left' | 'back')[] = ['front', 'back', 'side-left', 'side-right'];
  
  // Validate that we have at least one file
  const fileCount = Object.values(files).filter(f => f !== undefined).length;
  if (fileCount === 0) {
    throw new Error('No files provided. Please select at least one image file.');
  }
  
  for (const view of views) {
    const file = files[view];
    if (file) {
      try {
        // Validate file type
        const isValidImage = file.type.startsWith('image/') || 
                            file.name.toLowerCase().match(/\.(jpg|jpeg|png|heic|heif|webp)$/i);
        if (!isValidImage) {
          throw new Error(`File ${file.name} is not a valid image format. Please use JPEG, PNG, HEIC, or WebP.`);
        }
        
        console.log(`[UPLOAD] Processing ${view} from file: ${file.name} (${file.type || 'unknown type'}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        const base64 = await fileToBase64(file);
        
        // Validate the result
        if (!base64 || !base64.startsWith('data:image')) {
          throw new Error(`Invalid image data returned for ${view}. File may be corrupted.`);
        }
        
        images[view] = base64;
        console.log(`[UPLOAD] Successfully loaded ${view} from file: ${file.name} (${base64.substring(0, 50)}...)`);
      } catch (error) {
        console.error(`[UPLOAD] Failed to load ${view} from file ${file.name}:`, error);
        throw new Error(`Failed to load ${view} image (${file.name}): ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
  
  if (Object.keys(images).length === 0) {
    throw new Error('No images were successfully loaded from the uploaded files. Please check that the files are valid images.');
  }
  
  console.log(`[UPLOAD] Successfully loaded ${Object.keys(images).length} images:`, Object.keys(images));
  return images;
}

/**
 * Convert File to base64, handling HEIC files
 */
async function fileToBase64(file: File): Promise<string> {
  // Check if file is HEIC/HEIF
  const isHeic = file.type === 'image/heic' || 
                 file.type === 'image/heif' ||
                 file.name.toLowerCase().endsWith('.heic') ||
                 file.name.toLowerCase().endsWith('.heif');
  
  if (isHeic) {
    try {
      console.log(`[HEIC] Converting HEIC file: ${file.name}`);
      // Convert HEIC to JPEG using heic2any
      const heic2any = (await import('heic2any')).default;
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.92
      });
      
      // heic2any returns an array, get the first result
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      
      if (!blob) {
        throw new Error('HEIC conversion returned no blob');
      }
      
      // Ensure the blob is a JPEG blob
      if (!(blob instanceof Blob)) {
        throw new Error('HEIC conversion did not return a valid Blob');
      }
      
      // Create a new Blob explicitly as JPEG to ensure correct MIME type
      const jpegBlob = new Blob([blob], { type: 'image/jpeg' });
      
      // Convert blob to base64, ensuring it's marked as JPEG
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          let base64String = reader.result as string;
          if (!base64String) {
            reject(new Error('FileReader returned no result'));
            return;
          }
          
          // Force the MIME type to be JPEG, regardless of what FileReader detected
          // Extract just the base64 data part
          const base64Part = base64String.includes(',') ? base64String.split(',')[1] : base64String;
          
          // Create a proper JPEG data URL
          base64String = `data:image/jpeg;base64,${base64Part}`;
          
          console.log(`[HEIC] Successfully converted ${file.name} to JPEG (${base64String.substring(0, 50)}...)`);
          resolve(base64String);
        };
        reader.onerror = (err) => {
          console.error('[HEIC] FileReader error:', err);
          reject(new Error('Failed to read converted HEIC file'));
        };
        reader.readAsDataURL(jpegBlob);
      });
    } catch (error) {
      console.error('[HEIC] Failed to convert HEIC file:', error);
      throw new Error(`Failed to convert HEIC file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Regular file conversion for non-HEIC files
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (!base64String || !base64String.startsWith('data:image')) {
        reject(new Error('Invalid image file'));
        return;
      }
      resolve(base64String);
    };
    reader.onerror = (err) => {
      console.error('[FILE] FileReader error:', err);
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Create a simple placeholder image (1x1 pixel) as fallback
 */
function createPlaceholderImage(): string {
  // Create a minimal 1x1 pixel image
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1, 1);
  }
  return canvas.toDataURL('image/jpeg');
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

