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
import { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import { sanitizeForFirestore } from '@/lib/utils/firebaseUtils';
import { LandmarkResult } from '@/lib/ai/postureLandmarks';

export interface LiveSession {
// ...
  id: string;
  clientId: string;
  organizationId?: string; // SaaS readiness
  companionToken: string;
  status: 'active' | 'completed';
  companionJoined: boolean;
  postureImages: Record<string, string>;
  inbodyImage?: string; // For InBody scan
  analysis: Record<string, PostureAnalysisResult>;
  createdAt: Timestamp;
  // Dynamic properties from Firestore snapshots
  [key: string]: string | number | boolean | Timestamp | Record<string, string> | Record<string, PostureAnalysisResult> | undefined | null;
}

const SESSIONS_COLLECTION = 'live_sessions';

export const createLiveSession = async (clientId: string, organizationId?: string): Promise<LiveSession> => {
  const sessionId = Math.random().toString(36).substring(2, 12).toUpperCase();
  const companionToken = Math.random().toString(36).substring(2, 12);
  
  const session: LiveSession = {
    id: sessionId,
    clientId,
    organizationId: organizationId || null,
    companionToken,
    status: 'active',
    companionJoined: false,
    postureImages: {},
    analysis: {},
    createdAt: Timestamp.now()
  };

  try {
    await setDoc(doc(db, SESSIONS_COLLECTION, sessionId), sanitizeForFirestore(session));
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

/**
 * UNIFIED POSTURE PROCESSING FUNCTION
 * 
 * ONE SYSTEM - ONE FLOW - ALL SOURCES
 * 
 * This function processes posture images from ANY source:
 * 1. Manual file upload
 * 2. iPhone Companion App handoff (with real-time MediaPipe landmarks)
 * 3. This Device (iPad/Direct camera)
 * 
 * Unified Flow:
 * 1. Detect landmarks with MediaPipe (or use provided)
 * 2. Align image with green reference lines
 * 3. Calculate deviations using trigonometry (postureMath.ts)
 * 4. Use AI ONLY to convert numbers → user-friendly text (based on normative data)
 * 5. Draw red deviation lines
 * 6. Store everything (compressed + full-size + analysis)
 */
export const updatePostureImage = async (
  sessionId: string, 
  view: string, 
  imageData: string, 
  providedLandmarks?: LandmarkResult,
  source: 'manual' | 'iphone' | 'this-device' = 'manual'
) => {
  try {
    // Validate image data first
    if (!imageData || (!imageData.startsWith('data:image') && !imageData.startsWith('http'))) {
      throw new Error(`Invalid image data format for ${view}. Expected data URL or HTTP URL.`);
    }
    
    // Use unified processing system (ONE FLOW FOR ALL SOURCES)
    const { processPostureImage } = await import('@/services/postureProcessing');
    const processed = await processPostureImage(
      imageData,
      view as 'front' | 'side-right' | 'side-left' | 'back',
      providedLandmarks,
      source
    );

    // Compress image with deviations for display (fast Firestore sync)
    let compressedImage = processed.imageWithDeviations;
    let fullSizeImage = processed.imageWithDeviations;
    
    try {
      const compressed = await compressImageForDisplay(processed.imageWithDeviations, 800, 0.8);
      compressedImage = compressed.compressed;
      fullSizeImage = compressed.fullSize;
      console.log(`[COMPRESS] Compressed ${view} with deviations for display`);
    } catch (compressError) {
      console.warn(`[COMPRESS] Compression failed for ${view}, using original:`, compressError);
      fullSizeImage = processed.imageWithDeviations;
    }

    // Store everything in Firestore
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    console.log(`[SYNC] Storing processed ${view} image and analysis...`);
    
    const updatePayload: Record<string, string | Record<string, any>> = {
      [`postureImages.${view}`]: compressedImage, // Compressed version with green + red lines
      [`analysis.${view}`]: sanitizeForFirestore(processed.analysis), // Complete analysis
    };
    
    // Store landmarks for future reference
    if (processed.landmarks) {
      updatePayload[`landmarks_${view}`] = sanitizeForFirestore(processed.landmarks);
    }
    
    await updateDoc(sessionRef, updatePayload);

    // Upload FULL-SIZE image with green + red lines to Storage (for reports/comparisons)
    const sessionDoc = await getDoc(doc(db, SESSIONS_COLLECTION, sessionId));
    const clientId = sessionDoc.exists() ? (sessionDoc.data() as LiveSession).clientId : 'unknown';
    
    const storagePath = `clients/${clientId}/sessions/${sessionId}/${view}_full.jpg`;
    const storageRef = ref(storage, storagePath);
    
    const fullSizeBase64 = fullSizeImage.split(',')[1] || fullSizeImage;
    
    try {
      const snapshot = await uploadString(storageRef, fullSizeBase64, 'base64', { contentType: 'image/jpeg' });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log(`[STORAGE] Successfully uploaded full-size ${view} to:`, downloadUrl);
      
      await setDoc(sessionRef, {
        [`postureImagesFull_${view}`]: downloadUrl,
        [`postureImagesStorage_${view}`]: downloadUrl
      }, { merge: true });
      
      console.log(`[STORAGE] Stored Storage URL for ${view} in Firestore`);
    } catch (storageError) {
      console.error(`[STORAGE] Failed to upload ${view} to Storage:`, storageError);
      // Don't throw - allow Firestore sync to complete even if Storage fails
    }

    return true;
  } catch (err) {
    console.error('[UNIFIED] Posture Processing Error:', err);
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

export const updatePostureAnalysis = async (sessionId: string, view: string, analysis: PostureAnalysisResult) => {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  // Use updateDoc with dot notation to avoid nested entity issues
  await updateDoc(sessionRef, {
    [`analysis.${view}`]: sanitizeForFirestore(analysis)
  });
};

/**
 * Get all sessions for a specific client (for comparison features)
 */
export const getClientSessions = async (clientId: string, organizationId?: string): Promise<LiveSession[]> => {
  const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
  const sessionsRef = collection(db, SESSIONS_COLLECTION);
  
  let q;
  if (organizationId) {
    q = query(
      sessionsRef,
      where('clientId', '==', clientId),
      where('organizationId', '==', organizationId),
      orderBy('createdAt', 'desc')
    );
  } else {
    q = query(
    sessionsRef,
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
  );
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as LiveSession);
};

/**
 * Get all storage URLs for a client's sessions (for before/after comparisons)
 */
export interface ClientSessionSummary {
  sessionId: string;
  createdAt: Timestamp;
  images: Record<string, string>; // view -> storage URL
  analysis: Record<string, PostureAnalysisResult>; // view -> analysis
}

export const getClientPostureImages = async (clientId: string, organizationId?: string): Promise<Record<string, ClientSessionSummary>> => {
  const sessions = await getClientSessions(clientId, organizationId);
  const result: Record<string, ClientSessionSummary> = {};
  
  for (const session of sessions) {
    const images: Record<string, string> = {};
    const analysis: Record<string, PostureAnalysisResult> = {};
    
    // Get full-size storage URLs for each view
    const views: ('front' | 'back' | 'side-left' | 'side-right')[] = ['front', 'back', 'side-left', 'side-right'];
    for (const view of views) {
      const storageUrl = session[`postureImagesFull_${view}`] || 
                        session[`postureImagesStorage_${view}`];
      if (typeof storageUrl === 'string') {
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
