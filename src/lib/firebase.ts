import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getFunctions, type Functions } from 'firebase/functions';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// For simplicity, we inline the config directly instead of relying on env vars.
// These values come from your Firebase web app settings.
const firebaseConfig = {
  apiKey: 'AIzaSyBQ-ebw6zmdtQtJaQs-pjmOxNv-fchQKuc',
  authDomain: 'assessment-engine-8f633.firebaseapp.com',
  projectId: 'assessment-engine-8f633',
  storageBucket: 'assessment-engine-8f633.firebasestorage.app',
  messagingSenderId: '654489539628',
  appId: '1:654489539628:web:4118755f55e36b73016d89',
};

let appInstance: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (appInstance) return appInstance;
  appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return appInstance;
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirebaseFunctions(): Functions {
  return getFunctions(getFirebaseApp());
}

export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(getFirebaseApp());
}

export default getFirebaseApp;


