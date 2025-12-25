/**
 * Hard-coded posture test images
 * These are the actual test images you uploaded, stored as base64
 * 
 * To update these images:
 * 1. Upload new images via the UI
 * 2. Check browser console for base64 data
 * 3. Copy the base64 strings here
 * 
 * Or use the extract-base64.html tool in the project root
 */

// TODO: Replace these with your actual base64 image data
// You can get the base64 by:
// 1. Opening browser console when images are loaded
// 2. Looking for [TEST] logs that show the base64
// 3. Or use the extract-base64.html helper

export const HARDCODED_TEST_IMAGES: Record<string, string> = {
  // Front view - replace with your actual base64
  front: '',
  // Back view - replace with your actual base64
  back: '',
  // Left side view - replace with your actual base64
  'side-left': '',
  // Right side view - replace with your actual base64
  'side-right': '',
};

/**
 * Check if hard-coded images are available
 */
export function hasHardcodedImages(): boolean {
  return Object.values(HARDCODED_TEST_IMAGES).every(img => img && img.trim() !== '');
}

/**
 * Get hard-coded test images
 */
export function getHardcodedTestImages(): Record<string, string> {
  if (!hasHardcodedImages()) {
    throw new Error('Hard-coded images not set. Please add base64 image data to HARDCODED_TEST_IMAGES.');
  }
  return HARDCODED_TEST_IMAGES;
}

