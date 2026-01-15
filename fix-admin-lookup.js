/**
 * Fix Platform Admin Lookup Document
 * 
 * This script fixes the platform_admin_lookup document ID to match
 * the expected format (email with @ and . replaced by _)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixAdminLookup() {
  const email = 'michaeljbrown88@gmail.com';
  const uid = 'YdnNfYGwGkQvesM4MyVe41tajS2'; // Your actual UID from Firestore
  
  // Transform email to match the expected format
  const lookupKey = email.toLowerCase().replace(/[.@]/g, '_');
  
  console.log('🔧 Fixing platform admin lookup...');
  console.log('Email:', email);
  console.log('UID:', uid);
  console.log('Lookup key:', lookupKey);
  console.log('');
  
  try {
    // Check if old document exists (with @ and .)
    const oldDocRef = doc(db, 'platform_admin_lookup', email);
    const oldDocSnap = await getDoc(oldDocRef);
    
    if (oldDocSnap.exists()) {
      console.log('✓ Found old lookup document with email as ID');
      console.log('  Deleting old document...');
      await deleteDoc(oldDocRef);
      console.log('  ✓ Deleted');
    }
    
    // Create new document with correct ID format
    const newDocRef = doc(db, 'platform_admin_lookup', lookupKey);
    console.log('');
    console.log('Creating new lookup document...');
    console.log('  Collection: platform_admin_lookup');
    console.log('  Document ID:', lookupKey);
    
    await setDoc(newDocRef, {
      uid: uid,
      email: email.toLowerCase(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log('');
    console.log('✅ SUCCESS! Platform admin lookup fixed!');
    console.log('');
    console.log('You can now login at: http://localhost:8082/admin/platform-login');
    console.log('Email:', email);
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Error fixing admin lookup:', error);
    console.error('');
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

fixAdminLookup();
