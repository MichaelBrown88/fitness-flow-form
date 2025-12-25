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
import { compressImageForDisplay } from '@/lib/utils/imageCompression';
import { addPostureOverlay } from '@/lib/utils/postureOverlay';

export interface LiveSession {
  id: string;
  clientId: string;
  companionToken: string;
  status: 'active' | 'completed';
  companionJoined: boolean;
  postureImages: Record<string, string>;
  inbodyImage?: string; // For InBody scan
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
    // 1. Add overlay with reference lines to full-size image
    let imageWithOverlay = imageData;
    let fullSizeImage = imageData;
    
    try {
      // Add green reference lines overlay to full-size image (before AI analysis)
      imageWithOverlay = await addPostureOverlay(imageData, view as 'front' | 'side-right' | 'side-left' | 'back', {
        showMidline: true,
        showShoulderLine: true,
        showHipLine: true,
        lineColor: '#00ff00', // Green for reference lines
        lineWidth: 2
      });
      console.log(`[OVERLAY] Added reference lines to ${view}`);
    } catch (overlayError) {
      console.warn(`[OVERLAY] Overlay failed for ${view}, using original:`, overlayError);
      // Continue without overlay if it fails
    }

    // 2. Compress image for display (fast Firestore sync)
    let compressedImage = imageWithOverlay;
    
    try {
      const compressed = await compressImageForDisplay(imageWithOverlay, 800, 0.8);
      compressedImage = compressed.compressed;
      fullSizeImage = compressed.fullSize; // Keep original full-size for storage
      console.log(`[COMPRESS] Compressed ${view} for display`);
    } catch (compressError) {
      console.warn(`[COMPRESS] Compression failed for ${view}, using original:`, compressError);
      // Continue with original if compression fails
      fullSizeImage = imageWithOverlay;
    }

    // 3. Store compressed version WITH OVERLAY in Firestore (for fast real-time dashboard display)
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    await setDoc(sessionRef, {
      postureImages: {
        [view]: compressedImage // Compressed with overlay for fast loading
      }
    }, { merge: true });

    // 4. Upload FULL-SIZE version WITH OVERLAY to Storage (for AI analysis and reports)
    // IMPORTANT: Get clientId from session to organize by client
    const sessionDoc = await getDoc(doc(db, SESSIONS_COLLECTION, sessionId));
    const clientId = sessionDoc.exists() ? (sessionDoc.data() as LiveSession).clientId : 'unknown';
    
    // IMPORTANT: Await this to ensure it completes and we can track errors
    // New structure: clients/{clientId}/sessions/{sessionId}/{view}_full.jpg
    const storagePath = `clients/${clientId}/sessions/${sessionId}/${view}_full.jpg`;
    const storageRef = ref(storage, storagePath);
    
    // Use full-size image with overlay for storage
    const fullSizeBase64 = fullSizeImage.split(',')[1] || fullSizeImage;
    
    try {
      const snapshot = await uploadString(storageRef, fullSizeBase64, 'base64', { contentType: 'image/jpeg' });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log(`[STORAGE] Successfully uploaded full-size ${view} to:`, downloadUrl);
      
      // Store full-size URL in Firestore for AI analysis and future reports
      await setDoc(sessionRef, {
        [`postureImagesFull_${view}`]: downloadUrl, // Store full-size URL for AI
        [`postureImagesStorage_${view}`]: downloadUrl // Also store for reports/comparisons
      }, { merge: true });
      
      console.log(`[STORAGE] Stored Storage URL for ${view} in Firestore`);
    } catch (storageError) {
      console.error(`[STORAGE] Failed to upload ${view} to Storage:`, storageError);
      // Don't throw - allow Firestore sync to complete even if Storage fails
      // But log the error so we know about it
    }

    return true;
  } catch (err) {
    console.error('[SYNC] Pipe Error:', err);
    throw err;
  }
};

export const updateInBodyImage = async (sessionId: string, imageData: string) => {
  try {
    // Compress image for display (fast Firestore sync)
    let compressedImage = imageData;
    let fullSizeImage = imageData;
    
    try {
      const compressed = await compressImageForDisplay(imageData, 1200, 0.85);
      compressedImage = compressed.compressed;
      fullSizeImage = compressed.fullSize;
      console.log(`[COMPRESS] Compressed InBody scan for display`);
    } catch (compressError) {
      console.warn(`[COMPRESS] Compression failed for InBody, using original:`, compressError);
      fullSizeImage = imageData;
    }

    // Store compressed version in Firestore (for fast real-time display)
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    await setDoc(sessionRef, {
      inbodyImage: compressedImage,
      inbodyImageUpdated: Timestamp.now() // Add timestamp to trigger updates
    }, { merge: true });

    // Upload FULL-SIZE version to Storage (for OCR analysis)
    const sessionDoc = await getDoc(doc(db, SESSIONS_COLLECTION, sessionId));
    const clientId = sessionDoc.exists() ? (sessionDoc.data() as LiveSession).clientId : 'unknown';
    
    const storagePath = `clients/${clientId}/sessions/${sessionId}/inbody_scan.jpg`;
    const storageRef = ref(storage, storagePath);
    
    const fullSizeBase64 = fullSizeImage.split(',')[1] || fullSizeImage;
    
    try {
      const snapshot = await uploadString(storageRef, fullSizeBase64, 'base64', { contentType: 'image/jpeg' });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log(`[STORAGE] Successfully uploaded InBody scan to:`, downloadUrl);
      
      // Store full-size URL in Firestore for OCR analysis
      await setDoc(sessionRef, {
        inbodyImageFull: downloadUrl,
        inbodyImageStorage: downloadUrl
      }, { merge: true });
      
      console.log(`[STORAGE] Stored InBody Storage URL in Firestore`);
    } catch (storageError) {
      console.error(`[STORAGE] Failed to upload InBody scan to Storage:`, storageError);
    }

    return true;
  } catch (err) {
    console.error('[SYNC] InBody Image Error:', err);
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

/**
 * Get all sessions for a specific client (for comparison features)
 */
export const getClientSessions = async (clientId: string): Promise<LiveSession[]> => {
  const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
  const sessionsRef = collection(db, SESSIONS_COLLECTION);
  const q = query(
    sessionsRef,
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as LiveSession);
};

/**
 * Get all storage URLs for a client's sessions (for before/after comparisons)
 */
export const getClientPostureImages = async (clientId: string): Promise<Record<string, {
  sessionId: string;
  createdAt: Timestamp;
  images: Record<string, string>; // view -> storage URL
  analysis: Record<string, any>; // view -> analysis
}>> => {
  const sessions = await getClientSessions(clientId);
  const result: Record<string, any> = {};
  
  for (const session of sessions) {
    const images: Record<string, string> = {};
    const analysis: Record<string, any> = {};
    
    // Get full-size storage URLs for each view
    const views: ('front' | 'back' | 'side-left' | 'side-right')[] = ['front', 'back', 'side-left', 'side-right'];
    for (const view of views) {
      const storageUrl = (session as any)[`postureImagesFull_${view}`] || 
                        (session as any)[`postureImagesStorage_${view}`];
      if (storageUrl) {
        images[view] = storageUrl;
      }
      
      if (session.analysis[view]) {
        analysis[view] = session.analysis[view];
      }
    }
    
    if (Object.keys(images).length > 0) {
      result[session.id] = {
        sessionId: session.id,
        createdAt: session.createdAt,
        images,
        analysis
      };
    }
  }
  
  return result;
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
