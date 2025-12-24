import { db, storage } from '@/lib/firebase';
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export interface LiveSession {
  id: string;
  clientId: string;
  companionToken: string;
  status: 'active' | 'completed';
  companionJoined: boolean;
  postureImages: Record<string, string>;
  analysis: Record<string, any>;
  createdAt: Timestamp;
}

const SESSIONS_COLLECTION = 'live_sessions';

export const createLiveSession = async (clientId: string): Promise<LiveSession> => {
  const sessionId = Math.random().toString(36).substring(2, 12).toUpperCase();
  const companionToken = Math.random().toString(36).substring(2, 12);
  
  const session: LiveSession = {
    id: sessionId,
    clientId,
    companionToken,
    status: 'active',
    companionJoined: false,
    postureImages: {},
    analysis: {},
    createdAt: Timestamp.now()
  };

  try {
    await setDoc(doc(db, SESSIONS_COLLECTION, sessionId), session);
    return session;
  } catch (err) {
    console.error('[SYNC] Init Error:', err);
    throw err;
  }
};

export const joinLiveSession = async (sessionId: string) => {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(sessionRef, { companionJoined: true });
};

export const subscribeToLiveSession = (sessionId: string, callback: (session: LiveSession) => void) => {
  return onSnapshot(doc(db, SESSIONS_COLLECTION, sessionId), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as LiveSession);
    }
  });
};

export const updatePostureImage = async (sessionId: string, view: string, imageData: string) => {
  try {
    // 1. Instant Firestore Sync (for real-time dashboard)
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    await setDoc(sessionRef, {
      postureImages: {
        [view]: imageData
      }
    }, { merge: true });

    // 2. Background Storage Upload (for long-term persistence)
    // We don't await this to keep the iPhone sequence fast
    const storagePath = `posture_scans/${sessionId}/${view}.jpg`;
    const storageRef = ref(storage, storagePath);
    
    // Convert base64 to storage
    const base64Data = imageData.split(',')[1] || imageData;
    uploadString(storageRef, base64Data, 'base64', { contentType: 'image/jpeg' })
      .then(async (snapshot) => {
        const downloadUrl = await getDownloadURL(snapshot.ref);
        console.log(`[STORAGE] Uploaded ${view}:`, downloadUrl);
        // Optional: Store the permanent URL back to Firestore later
      })
      .catch(err => console.error('[STORAGE] Upload Error:', err));

    return true;
  } catch (err) {
    console.error('[SYNC] Pipe Error:', err);
    throw err;
  }
};

export const updatePostureAnalysis = async (sessionId: string, view: string, analysis: any) => {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await setDoc(sessionRef, {
    analysis: {
      [view]: analysis
    }
  }, { merge: true });
};

export const validateCompanionToken = async (sessionId: string, token: string): Promise<boolean> => {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const sessionSnap = await getDoc(sessionRef);
  if (sessionSnap.exists()) {
    const data = sessionSnap.data() as LiveSession;
    return data.companionToken === token;
  }
  return false;
};
