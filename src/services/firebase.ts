import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  type Firestore 
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, OAuthProvider, type Auth } from 'firebase/auth';
import { getFunctions, type Functions } from 'firebase/functions';
import { getStorage as getFirebaseStorageInstance, type FirebaseStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check';
import { CONFIG } from '@/config';

// Uses console.* here intentionally: Firebase bootstrap and DEV transport filtering run before app logger wiring.

// Suppress noisy Firebase transport warnings in development
// These are harmless network retry attempts that Firebase SDK handles automatically
if (import.meta.env.DEV) {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (
        message.includes('WebChannelConnection RPC') ||
        message.includes('transport errored') ||
        message.includes('ERR_QUIC_PROTOCOL_ERROR')
      )
    ) {
      // Suppress these specific Firebase transport warnings
      return;
    }
    originalWarn.apply(console, args);
  };
}

// SECURITY: Use environment variables for all sensitive configuration
// Never hardcode API keys, secrets, or credentials in source code
const firebaseConfig = {
  apiKey: CONFIG.FIREBASE.API_KEY,
  authDomain: CONFIG.FIREBASE.AUTH_DOMAIN,
  projectId: CONFIG.FIREBASE.PROJECT_ID,
  storageBucket: CONFIG.FIREBASE.STORAGE_BUCKET,
  messagingSenderId: CONFIG.FIREBASE.MESSAGING_SENDER_ID,
  appId: CONFIG.FIREBASE.APP_ID,
};

// Validate that all required environment variables are present
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const missingVars = requiredEnvVars.filter(
  (varName) => !import.meta.env[varName]
);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required Firebase environment variables: ${missingVars.join(', ')}. ` +
    'Please check your .env file and ensure all VITE_FIREBASE_* variables are set.'
  );
}

let appInstance: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (appInstance) return appInstance;
  appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return appInstance;
}

// Modern Firestore initialization with persistent cache (v10+)
// Safari/iPad can have issues with IndexedDB, so we detect and handle gracefully
const app = getFirebaseApp();

// Check if IndexedDB is available (required for persistent cache)
const isIndexedDBAvailable = (): boolean => {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
};

// Detect Safari/iPad - these browsers sometimes have IndexedDB issues
// Note: This check runs at module load time, so we need to handle browser detection safely
const detectSafariOrIPad = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  try {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIPad = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return isSafari || isIPad;
  } catch {
    return false;
  }
};

// Initialize Firestore with appropriate cache strategy
let db: Firestore;
try {
  const isSafariOrIPad = detectSafariOrIPad();
  
  // Use persistent cache if IndexedDB is available and not Safari/iPad
  // Safari/iPad can have IndexedDB issues, so we use a simpler approach
  if (isIndexedDBAvailable() && !isSafariOrIPad) {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } else {
    // For Safari/iPad or if IndexedDB unavailable, use memory cache
    // This is more reliable on these platforms
    if (isSafariOrIPad) {
      console.info('[FIREBASE] Using memory cache for Safari/iPad compatibility');
    }
    db = getFirestore(app);
  }
} catch (cacheError) {
  // Final fallback: try standard getFirestore
  console.warn('[FIREBASE] Cache initialization failed, using fallback:', cacheError);
  try {
    db = getFirestore(app);
  } catch (fallbackError) {
    console.error('[FIREBASE] Firestore initialization completely failed:', fallbackError);
    throw new Error(`Firestore initialization failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
  }
}

export { db };

export const auth = getAuth(app);
export const functions = getFunctions(app, CONFIG.FIREBASE.FUNCTIONS_REGION);
export const storage = getFirebaseStorageInstance(app);

export const getDb = () => db;
export const getFirebaseAuth = () => auth;
export const getFirebaseFunctions = () => functions;
export const getFirebaseStorage = () => storage;
export const getStorage = () => storage; // Alias for compatibility

export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

/**
 * Initialize Firebase App Check with reCAPTCHA v3.
 * Only active when VITE_RECAPTCHA_SITE_KEY is set in the environment.
 * In development, set VITE_APP_CHECK_DEBUG=true and use the debug token
 * printed to the console to allow local testing.
 *
 * To activate enforcement on Cloud Functions, flip `enforceAppCheck: true`
 * on each function in functions/src/index.ts after verifying the site key works.
 */
let appCheckInstance: AppCheck | null = null;

export function initAppCheck(): AppCheck | null {
  if (appCheckInstance) return appCheckInstance;

  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
  if (!siteKey) return null;

  try {
    if (import.meta.env.DEV || import.meta.env.VITE_APP_CHECK_DEBUG === 'true') {
      // @ts-expect-error — debug token registration for local development
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    return appCheckInstance;
  } catch (err) {
    console.warn('[FIREBASE] App Check initialization failed (non-fatal):', err);
    return null;
  }
}

export default getFirebaseApp;

