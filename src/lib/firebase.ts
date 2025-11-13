import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

function hasValidConfig(cfg: typeof firebaseConfig): cfg is Required<typeof firebaseConfig> {
  return Boolean(
    cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.storageBucket && cfg.messagingSenderId && cfg.appId
  );
}

let appInstance: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (appInstance) return appInstance;
  if (!hasValidConfig(firebaseConfig)) {
    const missing = Object.entries(firebaseConfig)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    const msg = `Firebase config missing: ${missing.join(', ')}. Add VITE_FIREBASE_* values to .env`;
    throw new Error(msg);
  }
  appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return appInstance;
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export default getFirebaseApp;


