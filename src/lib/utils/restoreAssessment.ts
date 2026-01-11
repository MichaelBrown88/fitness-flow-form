/**
 * Utility to restore a client's assessment from Firebase
 * Use this to recover accidentally deleted assessments
 */

import { getCurrentAssessment, updateCurrentAssessment } from '@/services/assessmentHistory';
import { saveCoachAssessment } from '@/services/coachAssessments';
import type { FormData } from '@/contexts/FormContext';
import { computeScores } from '@/lib/scoring';

export interface RestoreResult {
  success: boolean;
  formData?: FormData;
  overallScore?: number;
  error?: string;
  message?: string;
}

/**
 * Restore assessment data for a client from Firebase and reload it into the app
 * 
 * @param coachUid - The coach's user ID (optional, will try to get from auth if not provided)
 * @param clientName - The client's full name (e.g., "Hisham MM Abdoh")
 * @param organizationId - Optional organization ID
 * @param reloadIntoForm - If true, will save to sessionStorage to reload into form
 * @returns Promise with the restored assessment data
 */
export async function restoreClientAssessment(
  coachUid?: string,
  clientName: string = 'Hisham MM Abdoh',
  organizationId?: string,
  reloadIntoForm: boolean = true
): Promise<RestoreResult> {
  try {
    console.log(`[RESTORE] Attempting to restore assessment for: ${clientName}`);
    
    // Try to get coachUid and organizationId from auth if not provided
    let finalCoachUid = coachUid;
    let finalOrgId = organizationId;
    
    if (typeof window !== 'undefined') {
      // Try to get from Firebase auth
      try {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        if (auth.currentUser) {
          finalCoachUid = finalCoachUid || auth.currentUser.uid;
          console.log(`[RESTORE] Using authenticated user: ${finalCoachUid}`);
          
          // Try to get organizationId from user profile
          if (!finalOrgId) {
            try {
              const { doc, getDoc } = await import('firebase/firestore');
              const { getDb } = await import('@/services/firebase');
              const profileDoc = await getDoc(doc(getDb(), 'userProfiles', auth.currentUser.uid));
              if (profileDoc.exists()) {
                const profileData = profileDoc.data();
                finalOrgId = profileData.organizationId;
                if (finalOrgId) {
                  console.log(`[RESTORE] Using organization ID: ${finalOrgId}`);
                }
              }
            } catch (profileError) {
              console.warn('[RESTORE] Could not get organization ID from profile:', profileError);
            }
          }
        }
      } catch (e) {
        console.warn('[RESTORE] Could not get auth user:', e);
      }
    }
    
    if (!finalCoachUid) {
      return {
        success: false,
        error: 'Coach UID is required. Please provide it or ensure you are logged in.'
      };
    }
    
    // Get the current assessment from Firebase
    const current = await getCurrentAssessment(finalCoachUid, clientName, finalOrgId);
    
    if (!current) {
      // Try to check snapshots as backup
      try {
        const { getSnapshots } = await import('@/services/assessmentHistory');
        const snapshots = await getSnapshots(finalCoachUid, clientName, 10, finalOrgId);
        if (snapshots.length > 0) {
          const latestSnapshot = snapshots[0];
          console.log(`[RESTORE] Found snapshot from ${latestSnapshot.timestamp.toDate().toISOString()}`);
          
          // Re-save the snapshot as current assessment AND create dashboard entry
          try {
            await updateCurrentAssessment(
              finalCoachUid,
              clientName,
              latestSnapshot.formData,
              latestSnapshot.overallScore,
              'full',
              'all',
              finalOrgId
            );
            console.log('[RESTORE] ✓ Restored snapshot to current assessment');
            
            // Create a new assessment entry in the assessments collection so it shows up in dashboard
            try {
              const { saveCoachAssessment } = await import('@/services/coachAssessments');
              const assessmentId = await saveCoachAssessment(
                finalCoachUid,
                null,
                latestSnapshot.formData,
                latestSnapshot.overallScore,
                finalOrgId,
                null // profile - not available in utility function, relying on explicit orgId
              );
              console.log('[RESTORE] ✓ Created new assessment entry in dashboard');
              console.log('[RESTORE] ✓ Refresh the dashboard page to see it!');
            } catch (saveError) {
              console.warn('[RESTORE] Could not create new assessment entry:', saveError);
            }
          } catch (updateError) {
            console.warn('[RESTORE] Could not restore snapshot to current:', updateError);
          }
          
          if (reloadIntoForm) {
            // Save to sessionStorage to reload into form
            sessionStorage.setItem('editAssessmentData', JSON.stringify({
              formData: latestSnapshot.formData,
              overallScore: latestSnapshot.overallScore
            }));
            console.log('[RESTORE] ✓ Saved to sessionStorage. Navigate to assessment form to load it.');
          }
          
          return {
            success: true,
            formData: latestSnapshot.formData,
            overallScore: latestSnapshot.overallScore,
            message: `Found snapshot from ${latestSnapshot.timestamp.toDate().toLocaleDateString()}. Assessment restored and should appear in dashboard.`
          };
        }
      } catch (snapshotError) {
        console.warn('[RESTORE] Could not check snapshots:', snapshotError);
      }
      
      return {
        success: false,
        error: `No assessment found for client: ${clientName}. The assessment may have been permanently deleted.`
      };
    }
    
    console.log(`[RESTORE] ✓ Found assessment data for ${clientName}`);
    console.log(`[RESTORE] Overall Score: ${current.overallScore}`);
    console.log(`[RESTORE] Last Updated: ${current.lastUpdated?.toDate().toISOString() || 'Unknown'}`);
    
    // If reloadIntoForm is true, save to sessionStorage so it can be loaded into the form
    if (reloadIntoForm && typeof window !== 'undefined') {
      // Calculate scores to ensure we have them
      const scores = computeScores(current.formData);
      
      // Save to sessionStorage for form loading
      sessionStorage.setItem('editAssessmentData', JSON.stringify({
        formData: current.formData,
        overallScore: current.overallScore,
        scores: scores
      }));
      
      console.log('[RESTORE] ✓ Assessment data saved to sessionStorage');
      console.log('[RESTORE] To load it:');
      console.log('[RESTORE] 1. Navigate to the assessment form');
      console.log('[RESTORE] 2. Or use: window.loadRestoredAssessment()');
      
      // Also try to re-save it to ensure it's in the current assessment AND create a new assessment entry
      try {
        // First, update the current assessment
        await updateCurrentAssessment(
          finalCoachUid,
          clientName,
          current.formData,
          current.overallScore,
          'full',
          'all',
          finalOrgId
        );
        console.log('[RESTORE] ✓ Re-saved to current assessment in Firebase');
        
        // Also create a new assessment entry in the assessments collection so it shows up in the dashboard
        try {
          const { saveCoachAssessment } = await import('@/services/coachAssessments');
          const assessmentId = await saveCoachAssessment(
            finalCoachUid,
            null, // coachEmail - not needed
            current.formData,
            current.overallScore,
            finalOrgId,
            null // profile - not available in utility function, relying on explicit orgId
          );
          console.log('[RESTORE] ✓ Created new assessment entry in dashboard');
          console.log('[RESTORE] ✓ Assessment ID:', assessmentId);
          console.log('[RESTORE] ✓ The assessment should now appear in your dashboard!');
          console.log('[RESTORE] Refresh the dashboard page to see it.');
        } catch (saveError) {
          console.warn('[RESTORE] Could not create new assessment entry:', saveError);
          console.log('[RESTORE] But the data is saved to current assessment and sessionStorage');
        }
      } catch (saveError) {
        console.warn('[RESTORE] Could not re-save to Firebase:', saveError);
      }
    }
    
    return {
      success: true,
      formData: current.formData,
      overallScore: current.overallScore,
      message: 'Assessment restored successfully! Data saved to sessionStorage. Navigate to assessment form to load it.'
    };
  } catch (error) {
    console.error('[RESTORE] Error restoring assessment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred while restoring assessment'
    };
  }
}

/**
 * Load restored assessment from sessionStorage into the form
 */
export function loadRestoredAssessment(): boolean {
  if (typeof window === 'undefined') return false;
  
  const stored = sessionStorage.getItem('editAssessmentData');
  if (!stored) {
    console.warn('[RESTORE] No restored assessment found in sessionStorage');
    return false;
  }
  
  try {
    const data = JSON.parse(stored);
    console.log('[RESTORE] Found restored assessment data');
    console.log('[RESTORE] Client:', data.formData?.fullName || 'Unknown');
    console.log('[RESTORE] Score:', data.overallScore || 'Unknown');
    console.log('[RESTORE] Data is ready to load. Navigate to assessment form.');
    return true;
  } catch (e) {
    console.error('[RESTORE] Error parsing stored data:', e);
    return false;
  }
}

/**
 * Recover missing posture images from live sessions
 * This is useful when an assessment is missing some posture images
 */
export async function recoverMissingPostureImages(
  clientName: string,
  organizationId?: string
): Promise<{ recovered: string[]; missing: string[] }> {
  try {
    const { auth } = await import('@/services/firebase');
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User must be logged in');
    }
    
    // Auto-detect organizationId if not provided
    let finalOrgId = organizationId;
    if (!finalOrgId && user) {
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const { getDb } = await import('@/services/firebase');
        const profileRef = doc(getDb(), 'users', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          finalOrgId = profileData.organizationId || `org-${user.uid}`;
        }
      } catch (e) {
        console.warn('[RECOVER] Could not get organization ID:', e);
      }
    }
    
    // Get current assessment
    const { getCurrentAssessment, updateCurrentAssessment } = await import('@/services/assessmentHistory');
    const current = await getCurrentAssessment(user.uid, clientName, finalOrgId);
    
    if (!current) {
      throw new Error(`No assessment found for client: ${clientName}`);
    }
    
    const views: Array<'front' | 'back' | 'side-left' | 'side-right'> = ['front', 'back', 'side-left', 'side-right'];
    const postureImages = current.formData.postureImagesStorage || current.formData.postureImages || {};
    const missing: string[] = [];
    const recovered: string[] = [];
    
    // Check which images are missing
    for (const view of views) {
      if (!postureImages[view] || !postureImages[view].trim()) {
        missing.push(view);
      }
    }
    
    if (missing.length === 0) {
      console.log('[RECOVER] ✓ All posture images are present in assessment document');
      console.log('[RECOVER] Current postureImagesStorage:', current.formData.postureImagesStorage);
      console.log('[RECOVER] Current postureImages:', current.formData.postureImages);
      
      // Verify the side-right image URL is accessible
      const sideRightUrl = current.formData.postureImagesStorage?.['side-right'] || current.formData.postureImages?.['side-right'];
      if (sideRightUrl) {
        console.log('[RECOVER] Side-right URL found:', sideRightUrl);
        try {
          const testResponse = await fetch(sideRightUrl, { method: 'HEAD' });
          if (testResponse.ok) {
            console.log('[RECOVER] ✓ Side-right image URL is accessible');
            return { recovered: [], missing: [] };
          } else {
            console.warn(`[RECOVER] ⚠️ Side-right image URL returned HTTP ${testResponse.status} - searching for working URL...`);
            // URL is saved but not accessible - search for a working one
            missing.push('side-right');
            // Remove the broken URL so we can search for a new one
            delete current.formData.postureImagesStorage?.['side-right'];
            delete current.formData.postureImages?.['side-right'];
          }
        } catch (fetchError) {
          console.error('[RECOVER] ✗ Side-right image URL is not accessible:', fetchError);
          console.log('[RECOVER] Searching for a working URL...');
          // URL is not accessible - search for a working one
          missing.push('side-right');
          // Remove the broken URL so we can search for a new one
          delete current.formData.postureImagesStorage?.['side-right'];
          delete current.formData.postureImages?.['side-right'];
        }
      } else {
        console.warn('[RECOVER] ⚠️ No side-right URL found in assessment document');
        missing.push('side-right');
      }
      
      // Continue to search for missing images
      if (missing.length === 0) {
        return { recovered: [], missing: [] };
      }
    }
    
    console.log(`[RECOVER] Missing images: ${missing.join(', ')}`);
    console.log('[RECOVER] Searching Firebase Storage directly...');
    
    // Collect recovered images
    const recoveredImages: Record<string, string> = {};
    
    // Search Storage directly by trying different client ID formats and listing sessions
    try {
      const { storage } = await import('@/services/firebase');
      const { ref, listAll, getDownloadURL } = await import('firebase/storage');
      
      // Try different client ID formats
      const possibleClientIds = [
        clientName,
        clientName.toLowerCase(),
        clientName.toLowerCase().replace(/\s+/g, '-'),
        clientName.toLowerCase().replace(/\s+/g, '_'),
        clientName.replace(/\s+/g, ''),
        'current-client', // Sometimes used as a placeholder
      ];
      
      console.log('[RECOVER] Trying client ID formats:', possibleClientIds);
      
      for (const clientId of possibleClientIds) {
        if (missing.every(v => recoveredImages[v])) break; // Found all missing images
        
        try {
          const clientsPath = `clients/${clientId}`;
          const clientsRef = ref(storage, clientsPath);
          const clientsList = await listAll(clientsRef);
          
          console.log(`[RECOVER] Checking client path: ${clientsPath}`);
          
          // Look for sessions folder
          const sessionsFolder = clientsList.prefixes.find(f => f.name === 'sessions');
          if (sessionsFolder) {
            const sessionsRef = ref(storage, `${clientsPath}/sessions`);
            const sessionsList = await listAll(sessionsRef);
            
            console.log(`[RECOVER] Found ${sessionsList.prefixes.length} session(s) in ${clientsPath}/sessions`);
            
            // Check each session for missing images
            for (const sessionFolder of sessionsList.prefixes) {
              const sessionId = sessionFolder.name;
              
              for (const view of missing) {
                if (recoveredImages[view]) continue; // Already found
                
              try {
                const imagePath = `${clientsPath}/sessions/${sessionId}/${view}_full.jpg`;
                const imageRef = ref(storage, imagePath);
                
                // Verify the file exists and get the download URL
                try {
                  const downloadUrl = await getDownloadURL(imageRef);
                  
                  // Verify the URL is accessible
                  const testResponse = await fetch(downloadUrl, { method: 'HEAD' });
                  if (testResponse.ok) {
                    recoveredImages[view] = downloadUrl;
                    recovered.push(view);
                    console.log(`[RECOVER] ✓ Found ${view} image in Storage: ${imagePath}`);
                    console.log(`[RECOVER] Download URL: ${downloadUrl}`);
                  } else {
                    console.warn(`[RECOVER] Image exists but not accessible: ${imagePath} (HTTP ${testResponse.status})`);
                  }
                } catch (urlError) {
                  console.warn(`[RECOVER] Could not get download URL for ${imagePath}:`, urlError);
                  // Try alternative path formats
                  const altPaths = [
                    `${clientsPath}/sessions/${sessionId}/${view}.jpg`,
                    `${clientsPath}/sessions/${sessionId}/side_right_full.jpg`,
                    `${clientsPath}/sessions/${sessionId}/side-right.jpg`,
                  ];
                  
                  for (const altPath of altPaths) {
                    try {
                      const altRef = ref(storage, altPath);
                      const altUrl = await getDownloadURL(altRef);
                      const testResponse = await fetch(altUrl, { method: 'HEAD' });
                      if (testResponse.ok) {
                        recoveredImages[view] = altUrl;
                        recovered.push(view);
                        console.log(`[RECOVER] ✓ Found ${view} image at alternative path: ${altPath}`);
                        break;
                      }
                    } catch (altError) {
                      // Continue trying other paths
                    }
                  }
                }
              } catch (urlError) {
                // This image doesn't exist in this session, continue
              }
              }
              
              // If we found all missing images, we can stop
              if (missing.every(v => recoveredImages[v])) {
                break;
              }
            }
          }
        } catch (listError) {
          // This client ID format doesn't exist, try next one
          console.log(`[RECOVER] Client path "clients/${clientId}" not found, trying next...`);
        }
      }
      
      // Also try to get from Firestore sessions as a fallback
      if (missing.some(v => !recoveredImages[v])) {
        console.log('[RECOVER] Also checking Firestore sessions...');
        try {
          const { getClientPostureImages, getClientSessions } = await import('@/services/liveSessions');
          const sessions = await getClientPostureImages(clientName, finalOrgId);
          
          if (Object.keys(sessions).length > 0) {
            const sessionEntries = Object.values(sessions).sort(
              (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
            );
            
            for (const sessionEntry of sessionEntries) {
              for (const view of missing) {
                if (!recoveredImages[view] && sessionEntry.images[view]) {
                  recoveredImages[view] = sessionEntry.images[view];
                  recovered.push(view);
                  console.log(`[RECOVER] ✓ Found ${view} image in Firestore session data`);
                }
              }
            }
          }
        } catch (firestoreError) {
          console.warn('[RECOVER] Error checking Firestore sessions:', firestoreError);
        }
      }
    } catch (error) {
      console.error('[RECOVER] Error searching Storage:', error);
    }
    
    if (recovered.length > 0) {
      // Update the assessment with recovered images
      const updatedPostureImagesStorage = {
        ...(current.formData.postureImagesStorage || {}),
        ...recoveredImages
      };
      
      const updatedFormData = {
        ...current.formData,
        postureImagesStorage: updatedPostureImagesStorage
      };
      
      console.log(`[RECOVER] Recovered images:`, recoveredImages);
      console.log(`[RECOVER] Updated postureImagesStorage:`, updatedPostureImagesStorage);
      
      await updateCurrentAssessment(
        user.uid,
        clientName,
        updatedFormData,
        current.overallScore,
        'full',
        'all',
        finalOrgId
      );
      
      console.log(`[RECOVER] ✓ Updated current assessment with ${recovered.length} recovered image(s)`);
      console.log(`[RECOVER] Recovered: ${recovered.join(', ')}`);
      
      // Update ALL existing assessment documents for this client in the dashboard
      try {
        const { getDb } = await import('@/services/firebase');
        const { collection, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');
        
        // Find all assessment documents for this client
        const assessmentsRef = collection(getDb(), 'coaches', user.uid, 'assessments');
        const q = query(
          assessmentsRef,
          where('clientName', '==', clientName)
        );
        
        const snapshot = await getDocs(q);
        const updatePromises: Promise<void>[] = [];
        
        snapshot.forEach((docSnap) => {
          const assessmentRef = doc(getDb(), 'coaches', user.uid, 'assessments', docSnap.id);
          const existingFormData = docSnap.data().formData || {};
          const existingImages = existingFormData.postureImagesStorage || existingFormData.postureImages || {};
          
          // Merge the recovered images into existing images
          const mergedImages = {
            ...existingImages,
            ...recoveredImages
          };
          
          updatePromises.push(
            updateDoc(assessmentRef, {
              formData: {
                ...existingFormData,
                postureImagesStorage: mergedImages
              },
              overallScore: current.overallScore
            })
          );
        });
        
        await Promise.all(updatePromises);
        console.log(`[RECOVER] ✓ Updated ${updatePromises.length} existing assessment document(s) in dashboard`);
        console.log(`[RECOVER] Image URL that was saved:`, recoveredImages['side-right']);
        
        // Also create a new one to ensure it's in the list
        const { saveCoachAssessment } = await import('@/services/coachAssessments');
        await saveCoachAssessment(
          user.uid,
          null, // coachEmail
          updatedFormData,
          current.overallScore,
          finalOrgId,
          null // profile - not available in utility function, relying on explicit orgId
        );
        console.log('[RECOVER] ✓ Created new assessment entry');
        console.log('[RECOVER] ⚠️ IMPORTANT: Please do a HARD REFRESH (Cmd+Shift+R or Ctrl+Shift+R) to see the recovered image!');
        console.log('[RECOVER] If it still doesn\'t appear, check the browser console for image loading errors.');
      } catch (saveError) {
        console.warn('[RECOVER] Could not update dashboard entries:', saveError);
      }
    }
    
    const stillMissing = missing.filter(v => !recovered.includes(v));
    if (stillMissing.length > 0) {
      console.warn(`[RECOVER] Still missing: ${stillMissing.join(', ')}`);
    }
    
    return { recovered, missing: stillMissing };
  } catch (error) {
    console.error('[RECOVER] Error recovering images:', error);
    throw error;
  }
}

/**
 * Restore assessment and return as JSON string for easy copying
 */
export async function restoreAssessmentAsJSON(
  coachUid?: string,
  clientName: string = 'Hisham MM Abdoh',
  organizationId?: string
): Promise<string> {
  const result = await restoreClientAssessment(coachUid, clientName, organizationId, false);
  
  if (!result.success) {
    return JSON.stringify({ error: result.error }, null, 2);
  }
  
  return JSON.stringify({
    success: true,
    clientName,
    overallScore: result.overallScore,
    formData: result.formData,
    restoredAt: new Date().toISOString()
  }, null, 2);
}

declare global {
  interface Window {
    restoreClientAssessment: typeof restoreClientAssessment;
    restoreAssessmentAsJSON: typeof restoreAssessmentAsJSON;
    loadRestoredAssessment: typeof loadRestoredAssessment;
    recoverMissingPostureImages: typeof recoverMissingPostureImages;
  }
}

// Make it available globally for console access
if (typeof window !== 'undefined') {
  window.restoreClientAssessment = restoreClientAssessment;
  window.restoreAssessmentAsJSON = restoreAssessmentAsJSON;
  window.loadRestoredAssessment = loadRestoredAssessment;
  window.recoverMissingPostureImages = recoverMissingPostureImages;
  console.log('💾 Restore utility loaded!');
  console.log('💾 Use: restoreClientAssessment(undefined, "Hisham MM Abdoh")');
  console.log('💾 Or: restoreClientAssessment("your-coach-uid", "Hisham MM Abdoh")');
  console.log('💾 Recover missing images: recoverMissingPostureImages("Hisham MM Abdoh")');
}

