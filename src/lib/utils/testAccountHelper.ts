/**
 * Development Helper: Test Account Management
 * 
 * In development mode, automatically makes test emails unique by appending a timestamp
 * so you can reuse test@test.com without conflicts when testing onboarding flow.
 */

import { logger } from '@/lib/utils/logger';

const TEST_EMAIL_PATTERNS = [
  /^test@test\.com$/i,
  /^test\+.*@test\.com$/i,
  /^.*test.*@test\.com$/i,
];

/**
 * Checks if an email is a test email pattern
 */
export function isTestEmail(email: string): boolean {
  if (!import.meta.env.DEV) return false;
  return TEST_EMAIL_PATTERNS.some(pattern => pattern.test(email.trim()));
}

/**
 * Makes a test email unique by appending a timestamp suffix
 * Example: test@test.com -> test+20250101120000@test.com
 */
export function makeTestEmailUnique(email: string): string {
  if (!import.meta.env.DEV || !isTestEmail(email)) {
    return email;
  }

  const trimmed = email.trim();
  const timestamp = Date.now().toString().slice(-10); // Last 10 digits (milliseconds)
  
  // If email is exactly test@test.com, convert to test+timestamp@test.com
  if (trimmed.toLowerCase() === 'test@test.com') {
    return `test+${timestamp}@test.com`;
  }
  
  // If it already has a + suffix, replace it
  const match = trimmed.match(/^(.+?)\+(\d+)@(.+)$/i);
  if (match) {
    return `${match[1]}+${timestamp}@${match[3]}`;
  }
  
  // Otherwise add timestamp before @
  const parts = trimmed.split('@');
  if (parts.length === 2) {
    return `${parts[0]}+${timestamp}@${parts[1]}`;
  }
  
  return email;
}

/**
 * Development-only: Delete test accounts from Firestore
 * Note: This does NOT delete Firebase Auth users (requires Admin SDK/Cloud Function)
 * Call from browser console: window.deleteTestAccounts()
 */
export async function deleteTestAccounts(): Promise<void> {
  if (!import.meta.env.DEV) {
    logger.warn('deleteTestAccounts is only available in development mode');
    return;
  }

  logger.info('🧹 Test account cleanup helper');
  logger.info('⚠️ Note: For security reasons, Firestore data can only be deleted through:');
  logger.info('   1. Firebase Console (manual deletion)');
  logger.info('   2. Cloud Functions with admin privileges');
  logger.info('   3. Authenticated user deleting their own data');
  logger.info('');
  logger.info('💡 Tip: Use unique test emails (test+timestamp@test.com) to avoid conflicts');
  logger.info('💡 To manually clean up:');
  logger.info('   - Go to Firebase Console > Firestore Database');
  logger.info('   - Delete organizations and userProfiles documents for test accounts');
  logger.info('   - Go to Firebase Console > Authentication to delete Auth users');
  
  // Don't attempt to delete - this would require admin privileges
  // The function now just provides helpful instructions
}

// Expose to window in development for easy console access
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { deleteTestAccounts: () => Promise<void> }).deleteTestAccounts = deleteTestAccounts;
  
  logger.info('🧪 Test Account Helper Loaded!');
  logger.info('Use: window.deleteTestAccounts() to clean up Firestore test data');
  logger.info('Note: Firebase Auth users must be deleted from Firebase Console');
}
