/**
 * Image compression utilities
 * Compresses images for display while preserving full-size versions for AI analysis
 */

export interface CompressedImageResult {
  compressed: string; // Base64 data URL - compressed for display
  fullSize: string;  // Base64 data URL - original for AI analysis
}

/**
 * Compress an image for display while keeping original for AI
 * @param imageData Base64 image data URL
 * @param maxWidth Maximum width for compressed version (default: 800px)
 * @param quality JPEG quality 0-1 (default: 0.8)
 * @returns Compressed and full-size versions
 */
export async function compressImageForDisplay(
  imageData: string,
  maxWidth: number = 800,
  quality: number = 0.8
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        // Create canvas for compressed version
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        
        // Return both versions
        resolve({
          compressed,
          fullSize: imageData // Keep original for AI
        });
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    // Load the image
    img.src = imageData;
  });
}

/**
 * Get full-size image from base64 data URL
 * Useful when you only have compressed version and need original
 */
export function getFullSizeFromBase64(base64Data: string): string {
  // If it's already a data URL, return as-is
  if (base64Data.startsWith('data:')) {
    return base64Data;
  }
  // Otherwise, assume it's raw base64 and add data URL prefix
  return `data:image/jpeg;base64,${base64Data}`;
}

/**
 * Generate a small thumbnail for instant preview in Firestore
 * Used for Storage-first image handling - thumbnail goes to Firestore,
 * full-size goes to Firebase Storage
 * 
 * @param imageData Base64 image data URL
 * @param maxWidth Maximum width (default: 400px)
 * @param quality JPEG quality 0-1 (default: 0.5 for small file size)
 * @returns Base64 thumbnail data URL
 */
export async function generateThumbnail(
  imageData: string,
  maxWidth: number = 400,
  quality: number = 0.5
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        // Create canvas for thumbnail
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw and compress to small size
        ctx.drawImage(img, 0, 0, width, height);
        const thumbnail = canvas.toDataURL('image/jpeg', quality);
        
        resolve(thumbnail);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for thumbnail generation'));
    };
    
    // Load the image
    img.src = imageData;
  });
}

/**
 * Load an image from URL or data URL
 * Useful for canvas operations
 */
export function loadImage(imageUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      img.src = imageUrl;
    } else if (imageUrl.startsWith('data:')) {
      img.src = imageUrl;
    } else {
      // Assume it's base64
      img.src = `data:image/jpeg;base64,${imageUrl}`;
    }
  });
}

