import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  type Firestore 
} from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getFunctions, type Functions } from 'firebase/functions';
import { getStorage as getFirebaseStorageInstance, type FirebaseStorage } from 'firebase/storage';
import { CONFIG } from '@/config';

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
const app = getFirebaseApp();
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);
export const functions = getFunctions(app);
export const storage = getFirebaseStorageInstance(app);

export const getDb = () => db;
export const getFirebaseAuth = () => auth;
export const getFirebaseFunctions = () => functions;
export const getFirebaseStorage = () => storage;
export const getStorage = () => storage; // Alias for compatibility

export default getFirebaseApp;


