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

export const updatePostureImage = async (sessionId: string, view: string, imageData: string, providedLandmarks?: LandmarkResult) => {
  try {
    // Validate image data first
    if (!imageData || (!imageData.startsWith('data:image') && !imageData.startsWith('http'))) {
      throw new Error(`Invalid image data format for ${view}. Expected data URL or HTTP URL.`);
    }
    
    // STEP 1: Detect or use provided landmarks to align the image
    // We need to know where the body is before we can align it with fixed green line positions
    let landmarks = providedLandmarks;
    
    // Only try landmark detection if we don't have them yet
    if (!landmarks && (imageData.startsWith('data:image') || imageData.startsWith('http'))) {
      try {
        const { detectPostureLandmarks } = await import('@/lib/ai/postureLandmarks');
        landmarks = await detectPostureLandmarks(imageData, view as 'front' | 'side-right' | 'side-left' | 'back');
        console.log(`[ALIGN] Detected landmarks for ${view} (fallback):`, landmarks);
      } catch (landmarkError) {
        console.warn(`[ALIGN] Failed to detect landmarks for ${view}, will skip alignment:`, landmarkError);
        // Continue without alignment if landmark detection fails
        landmarks = undefined;
      }
    }
    
    // STEP 2: Align image and draw green reference lines at FIXED positions
    // The green lines are always at the same positions (center X, 25% Y for shoulders, 50% Y for hips)
    // We crop/zoom the image so the client's body aligns with these fixed positions
    let imageWithGreenLines = imageData;
    let fullSizeImage = imageData;
    
    try {
      const { addPostureOverlay } = await import('@/lib/utils/postureOverlay');
      if (landmarks) {
        // ALIGN MODE: Crop/zoom image so body aligns with fixed green line positions, then draw green lines
        imageWithGreenLines = await addPostureOverlay(imageData, view as 'front' | 'side-right' | 'side-left' | 'back', {
          showMidline: true,
          showShoulderLine: true,
          showHipLine: true,
          lineColor: '#00ff00',
          lineWidth: 4, // Increased from 2 to 4 for better visibility
          mode: 'align', // Align image, then draw green lines at fixed positions
          landmarks, // Use detected landmarks for alignment
        });
        console.log(`[ALIGN] Aligned image and added green reference lines to ${view} using landmarks`);
      } else {
        // If no landmarks, still draw green lines at fixed positions (no alignment, but green lines are the reference)
        // This ensures green lines are always present as the reference point
        imageWithGreenLines = await addPostureOverlay(imageData, view as 'front' | 'side-right' | 'side-left' | 'back', {
          showMidline: true,
          showShoulderLine: true,
          showHipLine: true,
          lineColor: '#00ff00',
          lineWidth: 4, // Increased from 2 to 4 for better visibility
          mode: 'reference', // Just draw green lines at fixed positions (hardcoded reference)
        });
        console.log(`[ALIGN] Added green reference lines to ${view} at fixed positions (no alignment - landmarks not detected)`);
      }
      fullSizeImage = imageWithGreenLines;
    } catch (overlayError) {
      console.error(`[ALIGN] Failed to align/add green lines for ${view}:`, overlayError);
      // Try one more time with just reference mode (no alignment) to ensure green lines are drawn
      try {
        const { addPostureOverlay } = await import('@/lib/utils/postureOverlay');
        imageWithGreenLines = await addPostureOverlay(imageData, view as 'front' | 'side-right' | 'side-left' | 'back', {
          showMidline: true,
          showShoulderLine: true,
          showHipLine: true,
          lineColor: '#00ff00',
          lineWidth: 4, // Increased from 2 to 4 for better visibility
          mode: 'reference', // Fallback: just draw green lines at fixed positions
        });
        fullSizeImage = imageWithGreenLines;
        console.log(`[ALIGN] Fallback: Added green reference lines to ${view} (alignment failed but green lines drawn)`);
      } catch (fallbackError) {
        console.error(`[ALIGN] Fallback also failed for ${view}, using original image:`, fallbackError);
        // Last resort: use original image (no green lines, but at least we have an image)
        imageWithGreenLines = imageData;
        fullSizeImage = imageData;
      }
    }

    // STEP 2: Compress image with green lines for display (fast Firestore sync)
    let compressedImage = imageWithGreenLines;
    
    try {
      const compressed = await compressImageForDisplay(imageWithGreenLines, 800, 0.8);
      compressedImage = compressed.compressed;
      fullSizeImage = compressed.fullSize; // Keep full-size with green lines for storage
      console.log(`[COMPRESS] Compressed ${view} with green lines for display`);
    } catch (compressError) {
      console.warn(`[COMPRESS] Compression failed for ${view}, using original:`, compressError);
      // Continue with original if compression fails
      fullSizeImage = imageWithGreenLines;
    }

    // STEP 3: Store compressed version WITH green lines in Firestore
    // Use updateDoc with dot notation to avoid nested entity issues
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    console.log(`[SYNC] Updating Firestore for ${view} in session ${sessionId}`);
    
    const updatePayload: Record<string, string | Record<string, any>> = {
      [`postureImages.${view}`]: compressedImage
    };
    
    // Store landmarks in session so they can be passed to AI
    if (landmarks) {
      updatePayload[`landmarks_${view}`] = sanitizeForFirestore(landmarks);
    }
    
    await updateDoc(sessionRef, updatePayload);

    // STEP 4: Upload FULL-SIZE image WITH GREEN LINES to Storage (for AI analysis)
    // The AI will see the green reference lines and measure deviations FROM them
    // IMPORTANT: Get clientId from session to organize by client
    const sessionDoc = await getDoc(doc(db, SESSIONS_COLLECTION, sessionId));
    const clientId = sessionDoc.exists() ? (sessionDoc.data() as LiveSession).clientId : 'unknown';
    
    // IMPORTANT: Await this to ensure it completes and we can track errors
    // New structure: clients/{clientId}/sessions/{sessionId}/{view}_full.jpg
    const storagePath = `clients/${clientId}/sessions/${sessionId}/${view}_full.jpg`;
    const storageRef = ref(storage, storagePath);
    
    // Use full-size image WITH green reference lines (AI needs to see these)
    const fullSizeBase64 = fullSizeImage.split(',')[1] || fullSizeImage;
    
    try {
      const snapshot = await uploadString(storageRef, fullSizeBase64, 'base64', { contentType: 'image/jpeg' });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log(`[STORAGE] Successfully uploaded full-size ${view} to:`, downloadUrl);
      
      // Store full-size URL in Firestore for AI analysis and future reports
      // This image has green reference lines - AI will measure deviations FROM these lines
      await setDoc(sessionRef, {
        [`postureImagesFull_${view}`]: downloadUrl, // Full-size WITH green lines (for AI)
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
