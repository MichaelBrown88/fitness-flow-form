import { auth, db } from '@/services/firebase';
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  Timestamp,
  getDoc,
  DocumentReference
} from 'firebase/firestore';
import { compressImageForDisplay } from '@/lib/utils/imageCompression';
import { PostureAnalysisResult, type PostureAiContext } from '@/lib/ai/postureAnalysis';
import { sanitizeForFirestore } from '@/lib/utils/firebaseUtils';
import { LandmarkResult } from '@/lib/ai/postureLandmarks';
import type { PostureFramingMetadata } from '@/lib/utils/postureFramingMetadata';
import { logger } from '@/lib/utils/logger';
import { validateOrganizationId } from '@/lib/utils/validateOrganizationId';
import type { UserProfile } from '@/types/auth';
import { updateDocWithRetry, uploadBodyCompScanFullSize, uploadPostureImageFullSize } from '@/services/backgroundUpload';
import {
  BODY_COMP_SCAN_FIRESTORE,
  normalizeLiveSessionFromFirestore,
} from '@/lib/utils/liveSessionBodyComp';

export interface LiveSession {
  id: string;
  clientId: string;
  organizationId?: string; // SaaS readiness
  companionToken: string;
  status: 'active' | 'completed';
  companionJoined: boolean;
  postureImages: Record<string, string>;
  /** Compressed body-comp scan preview (Firestore + real-time UI). */
  bodyCompScanImage?: string;
  bodyCompScanImageUpdated?: Timestamp;
  bodyCompScanImageFull?: string;
  bodyCompScanImageStorage?: string;
  analysis: Record<string, PostureAnalysisResult>;
  createdAt: Timestamp;
  lastHeartbeat?: Timestamp; // Updated every 5s by mobile companion for connection monitoring
  companionLogs?: Array<{ timestamp: Timestamp; message: string; level: 'info' | 'warn' | 'error' }>; // Mobile companion logs
  // Dynamic properties from Firestore snapshots
  [key: string]: string | number | boolean | Timestamp | Record<string, string> | Record<string, PostureAnalysisResult> | Array<{ timestamp: Timestamp; message: string; level: 'info' | 'warn' | 'error' }> | undefined | null;
}

const SESSIONS_COLLECTION = 'live_sessions';

/**
 * `createLiveSession` uses this clientId until sessions are keyed by real client slug.
 * Queries for posture merge / reanalyze must use the same value.
 */
export const LIVE_SESSION_PLACEHOLDER_CLIENT_ID = 'current-client' as const;

/**
 * URL-safe random id from full-entropy bytes (base64url), avoiding mod-36 bias.
 * @param byteLength number of random bytes (output length ~ ceil(4/3 * byteLength))
 */
function generateSecureId(byteLength: number): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues && typeof btoa === 'function') {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return Math.random().toString(36).slice(2, 2 + 22);
}

export const createLiveSession = async (
  clientId: string, 
  organizationId?: string,
  profile?: UserProfile | null
): Promise<LiveSession> => {
  // Validate organizationId before proceeding
  const validOrgId = validateOrganizationId(organizationId, profile);

  // Use cryptographically secure random IDs so session/companion tokens cannot be guessed
  const sessionId = generateSecureId(16);
  const companionToken = generateSecureId(16);
  
  const session: LiveSession = {
    id: sessionId,
    clientId,
    organizationId: validOrgId, // Use validated organizationId (never null)
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

export const joinLiveSession = async (
  sessionId: string,
  organizationId?: string,
  profile?: UserProfile | null
) => {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  
  // Fetch session first to verify ownership
  const sessionDoc = await getDoc(sessionRef);
  if (!sessionDoc.exists()) {
    throw new Error('Session not found');
  }
  
  const sessionData = sessionDoc.data() as LiveSession;
  
  // Validate organizationId if provided (desktop), or verify against session's orgId (mobile)
  if (organizationId && profile) {
    const validOrgId = validateOrganizationId(organizationId, profile);
    if (sessionData.organizationId && sessionData.organizationId !== validOrgId) {
      throw new Error('Cannot join session: Organization mismatch. This session belongs to a different organization.');
    }
  } else if (sessionData.organizationId) {
    // Mobile companion: session must have orgId (created by desktop with validation)
    // Token validation in validateCompanionToken already provides security
    // This check is defense in depth
  }
  
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
    logger.warn('[HEARTBEAT] Update failed:', err);
  }
};

export const subscribeToLiveSession = (sessionId: string, callback: (session: LiveSession) => void) => {
  return onSnapshot(doc(db, SESSIONS_COLLECTION, sessionId), (docSnap) => {
    if (docSnap.exists()) {
      callback(normalizeLiveSessionFromFirestore(docSnap.data() as Record<string, unknown>));
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
 * 2. Mobile companion handoff (with real-time MediaPipe landmarks)
 * 3. This device (tablet / desktop camera)
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
  source: 'manual' | 'companion' | 'this-device' = 'manual',
  organizationId?: string,
  profile?: UserProfile | null,
  framingMetadata?: PostureFramingMetadata | null
) => {
  try {
    // Validate image data first
    if (!imageData || (!imageData.startsWith('data:image') && !imageData.startsWith('http'))) {
      throw new Error(`Invalid image data format for ${view}. Expected data URL or HTTP URL.`);
    }
    
    // Fetch session first to verify ownership
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const sessionDoc = await getDoc(sessionRef);
    if (!sessionDoc.exists()) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const sessionData = sessionDoc.data() as LiveSession;

    if (!sessionData.organizationId || typeof sessionData.organizationId !== 'string') {
      throw new Error('Cannot update posture image: session has no organization.');
    }

    const isPlainObject = (value: unknown): value is Record<string, unknown> =>
      !!value && typeof value === 'object' && !Array.isArray(value);

    // Ensure postureImages is a map before nested updates
    if (!isPlainObject(sessionData.postureImages)) {
      await setDoc(sessionRef, { postureImages: {} }, { merge: true });
      sessionData.postureImages = {};
    }
    
    // Validate organizationId: use provided orgId+profile (desktop) or verify against session's orgId (mobile)
    if (organizationId && profile) {
      const validOrgId = validateOrganizationId(organizationId, profile);
      if (sessionData.organizationId && sessionData.organizationId !== validOrgId) {
        throw new Error('Cannot update posture image: Organization mismatch. This session belongs to a different organization.');
      }
    } else if (sessionData.organizationId) {
      // Mobile companion: session must have orgId (created by desktop with validation)
      // Token validation already provides security, this is defense in depth
    }
    
    logger.debug(`Starting processing for ${view} (source: ${source})`, 'LIVE_SESSIONS');

    const postureAiContext: PostureAiContext | undefined =
      auth.currentUser && organizationId && profile
        ? { organizationId: validateOrganizationId(organizationId, profile), profile }
        : undefined;
    
    // Use unified processing system (ONE FLOW FOR ALL SOURCES)
    const { processPostureImage } = await import('@/services/postureProcessing');
    
    let processed;
    try {
      processed = await processPostureImage(
        imageData,
        view as 'front' | 'side-right' | 'side-left' | 'back',
        providedLandmarks,
        source,
        // Progress callback - update Firestore with intermediate results
        async (progress) => {
          try {
            // When wireframe is ready, show it immediately in the UI
            if (progress.stage === 'wireframe' && typeof progress.wireframeImage === 'string' && progress.wireframeImage.length > 0) {
              logger.debug(`Storing wireframe for ${view} (intermediate)`, 'LIVE_SESSIONS');
              let wireframePreview = progress.wireframeImage;
              try {
                const compressed = await compressImageForDisplay(progress.wireframeImage, 800, 0.75);
                wireframePreview = compressed.compressed;
              } catch (compressError) {
                logger.warn(`Wireframe compression failed for ${view}, using original`, 'LIVE_SESSIONS', compressError);
              }
              await updateDocWithRetry(
                sessionRef,
                { [`postureImages.${view}`]: wireframePreview },
                3,
                `wireframe update for ${view}`
              );
              // Give UI time to render the wireframe (reduced from 1.5s to 0.75s to improve total processing time)
              await new Promise(resolve => setTimeout(resolve, 750));
            }
          } catch (progressError) {
            // Non-critical - don't fail the whole process
            logger.warn(`Failed to update progress for ${view}`, 'LIVE_SESSIONS', progressError);
          }
        },
        postureAiContext
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
    // Storing processed image and analysis
    
    const updatePayload: Record<string, unknown> = {
      [`postureImages.${view}`]: compressedImage, // Compressed version with green + red lines
      [`analysis.${view}`]: sanitizeForFirestore(processed.analysis), // Complete analysis
    };
    
    // Store landmarks for future reference
    if (processed.landmarks) {
      updatePayload[`landmarks_${view}`] = sanitizeForFirestore(processed.landmarks) as Record<string, unknown>;
    }

    if (framingMetadata) {
      updatePayload[`postureFraming_${view}`] = sanitizeForFirestore(framingMetadata) as Record<string, unknown>;
    }
    
    await updateDocWithRetry(sessionRef, updatePayload, 3, `final image update for ${view}`);

    // Upload FULL-SIZE image with green + red lines to Storage (for reports/comparisons)
    // sessionData already fetched above
    const clientId = sessionData.clientId || 'unknown';
    const orgId = sessionData.organizationId || 'default';

    void uploadPostureImageFullSize({
      sessionRef,
      sessionId,
      view: view as 'front' | 'back' | 'side-left' | 'side-right',
      fullSizeImage,
      clientId,
      organizationId: orgId
    });

    return true;
  } catch (err) {
    logger.error('Posture processing error', 'LIVE_SESSIONS', err);
    throw err;
  }
};

export const updateBodyCompImage = async (
  sessionId: string, 
  imageData: string,
  organizationId?: string,
  profile?: UserProfile | null
) => {
  try {
    // Fetch session first to verify ownership
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const sessionDoc = await getDoc(sessionRef);
    if (!sessionDoc.exists()) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const sessionData = sessionDoc.data() as LiveSession;
    
    // Validate organizationId: use provided orgId+profile (desktop) or verify against session's orgId (mobile)
    if (organizationId && profile) {
      const validOrgId = validateOrganizationId(organizationId, profile);
      if (sessionData.organizationId && sessionData.organizationId !== validOrgId) {
        throw new Error('Cannot update body comp image: Organization mismatch. This session belongs to a different organization.');
      }
    } else if (sessionData.organizationId) {
      // Mobile companion: session must have orgId (created by desktop with validation)
      // Token validation already provides security, this is defense in depth
    }
    
    // Compress image for display (fast Firestore sync)
    let compressedImage = imageData;
    let fullSizeImage = imageData;
    
    try {
      const compressed = await compressImageForDisplay(imageData, 1200, 0.85);
      compressedImage = compressed.compressed;
      fullSizeImage = compressed.fullSize;
      // Compressed body comp scan for display
    } catch (compressError) {
      logger.warn('Compression failed for body comp scan, using original', 'LIVE_SESSIONS', compressError);
      fullSizeImage = imageData;
    }

    // Store compressed version in Firestore (for fast real-time display)
    await setDoc(
      sessionRef,
      {
        [BODY_COMP_SCAN_FIRESTORE.image]: compressedImage,
        [BODY_COMP_SCAN_FIRESTORE.imageUpdated]: Timestamp.now(),
      },
      { merge: true },
    );

    // Upload FULL-SIZE version to Storage (for OCR analysis)
    // sessionData already fetched above
    const clientId = sessionData.clientId || 'unknown';
    const orgId = sessionData.organizationId || 'default';

    void uploadBodyCompScanFullSize({
      sessionRef,
      sessionId,
      fullSizeImage,
      clientId,
      organizationId: orgId
    });

    return true;
  } catch (err) {
    logger.error('Body comp image error', 'LIVE_SESSIONS', err);
    throw err;
  }
};

// REMOVED: updatePostureAnalysis is now redundant - analysis is handled by updatePostureImage (unified system)

/**
 * Get sessions for a specific client (for comparison features)
 * Limited to most recent sessions to prevent unbounded queries
 */
export const getClientSessions = async (
  clientId: string,
  organizationId: string,
  maxResults = 20,
): Promise<LiveSession[]> => {
  const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
  const sessionsRef = collection(db, SESSIONS_COLLECTION);

  const q = query(
    sessionsRef,
    where('clientId', '==', clientId),
    where('organizationId', '==', organizationId),
    limit(maxResults),
  );

  const snapshot = await getDocs(q);
  const sessions = snapshot.docs.map((d) =>
    normalizeLiveSessionFromFirestore(d.data() as Record<string, unknown>),
  );
  
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

export const getClientPostureImages = async (
  clientId: string,
  organizationId: string,
): Promise<Record<string, ClientSessionSummary>> => {
  const sessions = await getClientSessions(clientId, organizationId);
  const result: Record<string, ClientSessionSummary> = {};
  
  for (const session of sessions) {
    const images: Record<string, string> = {};
    const analysis: Record<string, PostureAnalysisResult> = {};
    
    // Get full-size storage URLs for each view
    const views: ('front' | 'back' | 'side-left' | 'side-right')[] = [
      'front',
      'side-left',
      'back',
      'side-right',
    ];
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
      logger.warn(`[COMPANION LOG] Session ${sessionId} not found, cannot log message`);
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
    
    const line = `[COMPANION ${sessionId}] ${message}`;
    if (level === 'error') logger.error(line);
    else if (level === 'warn') logger.warn(line);
    else logger.info(line);
  } catch (err) {
    logger.error('[COMPANION LOG] Failed to log message:', err);
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
    
    const coachUid = auth.currentUser?.uid;
    const postureAiContext: PostureAiContext | undefined =
      coachUid && organizationId
        ? { organizationId: validateOrganizationId(organizationId, undefined) }
        : undefined;

    // Re-process the image with updated logic
    const { processPostureImage } = await import('@/services/postureProcessing');
    const processed = await processPostureImage(
      imageData,
      view,
      storedLandmarks,
      'manual',
      undefined,
      postureAiContext
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
