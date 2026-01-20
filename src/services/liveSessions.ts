import { db, storage } from '@/services/firebase';
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
import { logger } from '@/lib/utils/logger';

export interface LiveSession {
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
  lastHeartbeat?: Timestamp; // Updated every 5s by mobile companion for connection monitoring
  companionLogs?: Array<{ timestamp: Timestamp; message: string; level: 'info' | 'warn' | 'error' }>; // Mobile companion logs
  // Dynamic properties from Firestore snapshots
  [key: string]: string | number | boolean | Timestamp | Record<string, string> | Record<string, PostureAnalysisResult> | Array<{ timestamp: Timestamp; message: string; level: 'info' | 'warn' | 'error' }> | undefined | null;
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
    logger.error('Session init error', 'LIVE_SESSIONS', err);
    throw err;
  }
};

export const joinLiveSession = async (sessionId: string) => {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(sessionRef, { companionJoined: true });
};

/**
 * Update session heartbeat - called every 5 seconds from mobile companion
 * Allows desktop to detect connection drops
 */
export const updateHeartbeat = async (sessionId: string): Promise<void> => {
  try {
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    await updateDoc(sessionRef, { 
      lastHeartbeat: Timestamp.now(),
      companionJoined: true 
    });
  } catch (err) {
    // Silently fail - heartbeat is non-critical
    console.warn('[HEARTBEAT] Update failed:', err);
  }
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
    
    logger.debug(`Starting processing for ${view} (source: ${source})`, 'LIVE_SESSIONS');
    
    // Use unified processing system (ONE FLOW FOR ALL SOURCES)
    const { processPostureImage } = await import('@/services/postureProcessing');
    
    let processed;
    try {
      processed = await processPostureImage(
        imageData,
        view as 'front' | 'side-right' | 'side-left' | 'back',
        providedLandmarks,
        source
      );
      logger.debug(`Successfully processed ${view} image`, 'LIVE_SESSIONS');
    } catch (processError) {
      logger.error(`Processing failed for ${view}`, 'LIVE_SESSIONS', processError);
      throw new Error(`Failed to process ${view} image: ${processError instanceof Error ? processError.message : 'Unknown processing error'}`);
    }

    // Compress image with deviations for display (fast Firestore sync)
    let compressedImage = processed.imageWithDeviations;
    let fullSizeImage = processed.imageWithDeviations;
    
    try {
      const compressed = await compressImageForDisplay(processed.imageWithDeviations, 800, 0.8);
      compressedImage = compressed.compressed;
      fullSizeImage = compressed.fullSize;
      // Compressed image with deviations for display
    } catch (compressError) {
      logger.warn(`Compression failed for ${view}, using original`, 'LIVE_SESSIONS', compressError);
      fullSizeImage = processed.imageWithDeviations;
    }

    // Store everything in Firestore
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    // Storing processed image and analysis
    
    const updatePayload: Record<string, unknown> = {
      [`postureImages.${view}`]: compressedImage, // Compressed version with green + red lines
      [`analysis.${view}`]: sanitizeForFirestore(processed.analysis), // Complete analysis
    };
    
    // Store landmarks for future reference
    if (processed.landmarks) {
      updatePayload[`landmarks_${view}`] = sanitizeForFirestore(processed.landmarks) as Record<string, unknown>;
    }
    
    await updateDoc(sessionRef, updatePayload);

    // Upload FULL-SIZE image with green + red lines to Storage (for reports/comparisons)
    const sessionDoc = await getDoc(doc(db, SESSIONS_COLLECTION, sessionId));
    const sessionData = sessionDoc.exists() ? (sessionDoc.data() as LiveSession) : null;
    const clientId = sessionData?.clientId || 'unknown';
    const orgId = sessionData?.organizationId || 'default';
    
    // SaaS-isolated storage path: organizations/{orgId}/clients/{clientId}/sessions/{sessionId}/...
    const storagePath = `organizations/${orgId}/clients/${clientId}/sessions/${sessionId}/${view}_full.jpg`;
    const storageRef = ref(storage, storagePath);
    
    const fullSizeBase64 = fullSizeImage.split(',')[1] || fullSizeImage;
    
    try {
      const snapshot = await uploadString(storageRef, fullSizeBase64, 'base64', { contentType: 'image/jpeg' });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      // Successfully uploaded full-size image to Storage
      
      await setDoc(sessionRef, {
        [`postureImagesFull_${view}`]: downloadUrl,
        [`postureImagesStorage_${view}`]: downloadUrl
      }, { merge: true });
      
      // Stored Storage URL in Firestore
    } catch (storageError) {
      logger.error(`Failed to upload ${view} to Storage`, 'LIVE_SESSIONS', storageError);
    }

    return true;
  } catch (err) {
    logger.error('Posture processing error', 'LIVE_SESSIONS', err);
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
      // Compressed InBody scan for display
    } catch (compressError) {
      logger.warn('Compression failed for InBody, using original', 'LIVE_SESSIONS', compressError);
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
    const sessionData = sessionDoc.exists() ? (sessionDoc.data() as LiveSession) : null;
    const clientId = sessionData?.clientId || 'unknown';
    const orgId = sessionData?.organizationId || 'default';
    
    // SaaS-isolated storage path: organizations/{orgId}/clients/{clientId}/sessions/{sessionId}/...
    const storagePath = `organizations/${orgId}/clients/${clientId}/sessions/${sessionId}/inbody_scan.jpg`;
    const storageRef = ref(storage, storagePath);
    
    const fullSizeBase64 = fullSizeImage.split(',')[1] || fullSizeImage;
    
    try {
      const snapshot = await uploadString(storageRef, fullSizeBase64, 'base64', { contentType: 'image/jpeg' });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      // Successfully uploaded InBody scan to Storage
      
      // Store full-size URL in Firestore for OCR analysis
      await setDoc(sessionRef, {
        inbodyImageFull: downloadUrl,
        inbodyImageStorage: downloadUrl
      }, { merge: true });
      
      // Stored InBody Storage URL in Firestore
    } catch (storageError) {
      logger.error('Failed to upload InBody scan to Storage', 'LIVE_SESSIONS', storageError);
    }

    return true;
  } catch (err) {
    logger.error('InBody image error', 'LIVE_SESSIONS', err);
    throw err;
  }
};

// REMOVED: updatePostureAnalysis is now redundant - analysis is handled by updatePostureImage (unified system)

/**
 * Get sessions for a specific client (for comparison features)
 * Limited to most recent sessions to prevent unbounded queries
 */
export const getClientSessions = async (clientId: string, organizationId?: string, maxResults = 20): Promise<LiveSession[]> => {
  const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
  const sessionsRef = collection(db, SESSIONS_COLLECTION);
  
  let q;
  if (organizationId) {
    // Query without orderBy to avoid index requirement - we'll sort in memory
    q = query(
      sessionsRef,
      where('clientId', '==', clientId),
      where('organizationId', '==', organizationId),
      limit(maxResults)
    );
  } else {
    // Query without orderBy to avoid index requirement - we'll sort in memory
    q = query(
      sessionsRef,
      where('clientId', '==', clientId),
      limit(maxResults)
    );
  }
  
  const snapshot = await getDocs(q);
  const sessions = snapshot.docs.map(doc => doc.data() as LiveSession);
  
  // Sort in memory by createdAt (descending - most recent first)
  sessions.sort((a, b) => {
    const aTime = a.createdAt?.toMillis() || 0;
    const bTime = b.createdAt?.toMillis() || 0;
    return bTime - aTime;
  });
  
  return sessions;
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

/**
 * Re-analyze an existing posture image with updated AI logic
 * This is useful when the analysis logic has been improved/corrected
 * Updates both the live session and the assessment document if the client has one
 */
/**
 * Log a message from the mobile companion app to Firestore
 * This allows desktop to see what's happening on mobile
 */
export const logCompanionMessage = async (
  sessionId: string,
  message: string,
  level: 'info' | 'warn' | 'error' = 'info'
): Promise<void> => {
  try {
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const sessionSnap = await getDoc(sessionRef);
    
    if (!sessionSnap.exists()) {
      console.warn(`[COMPANION LOG] Session ${sessionId} not found, cannot log message`);
      return;
    }
    
    const existingLogs = (sessionSnap.data() as LiveSession).companionLogs || [];
    const newLog = {
      timestamp: Timestamp.now(),
      message,
      level
    };
    
    // Keep only last 50 logs to avoid document size issues
    const updatedLogs = [...existingLogs.slice(-49), newLog];
    
    await updateDoc(sessionRef, {
      companionLogs: updatedLogs
    });
    
    // Also log to console for immediate visibility
    const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    logMethod(`[COMPANION ${sessionId}] ${message}`);
  } catch (err) {
    console.error('[COMPANION LOG] Failed to log message:', err);
  }
};

export const reanalyzePostureImage = async (
  sessionId: string,
  view: 'front' | 'back' | 'side-left' | 'side-right',
  organizationId?: string
): Promise<boolean> => {
  try {
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const sessionSnap = await getDoc(sessionRef);
    
    if (!sessionSnap.exists()) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const sessionData = sessionSnap.data() as LiveSession;
    
    // Get the full-size image URL from storage
    const imageUrl = sessionData[`postureImagesFull_${view}`] || 
                     sessionData[`postureImagesStorage_${view}`] ||
                     sessionData.postureImages?.[view];
    
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error(`No image found for ${view} view in session ${sessionId}`);
    }
    
    // Get stored landmarks if available (for faster processing)
    const storedLandmarks = sessionData[`landmarks_${view}`] as LandmarkResult | undefined;
    
    // Fetch the image and convert to base64
    let imageData: string;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const blob = await response.blob();
      imageData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // Assume it's already a data URL
      imageData = imageUrl;
    }
    
    // Re-process the image with updated logic
    const { processPostureImage } = await import('@/services/postureProcessing');
    const processed = await processPostureImage(
      imageData,
      view,
      storedLandmarks,
      'manual'
    );
    
    // Update the session with new analysis
    const updatePayload: Record<string, unknown> = {
      [`analysis.${view}`]: sanitizeForFirestore(processed.analysis),
    };
    
    // Update landmarks if we have them
    if (processed.landmarks) {
      updatePayload[`landmarks_${view}`] = sanitizeForFirestore(processed.landmarks) as Record<string, unknown>;
    }
    
    await updateDoc(sessionRef, updatePayload);
    
    // Also update the assessment document if it exists
    try {
      const { updatePostureAnalysis } = await import('@/services/assessmentHistory');
      const { auth } = await import('@/services/firebase');
      const coachUid = auth.currentUser?.uid;
      
      if (coachUid && sessionData.clientId) {
        await updatePostureAnalysis(
          coachUid,
          sessionData.clientId,
          view,
          processed.analysis,
          organizationId
        );
        logger.debug(`Also updated assessment document for client ${sessionData.clientId}`, 'LIVE_SESSIONS');
      }
    } catch (assessmentError) {
      logger.warn('Could not update assessment document (non-critical)', 'LIVE_SESSIONS', assessmentError);
    }
    
    logger.debug(`Successfully re-analyzed ${view} view for session ${sessionId}`, 'LIVE_SESSIONS');
    return true;
  } catch (error) {
    logger.error(`Failed to re-analyze ${view} view`, 'LIVE_SESSIONS', error);
    throw error;
  }
};
