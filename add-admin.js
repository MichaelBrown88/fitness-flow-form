// Temporary script to add platform admin
// Run with: node add-admin.js

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Your Firebase config (get from src/services/firebase.ts)
const firebaseConfig = {
  // TODO: Copy your Firebase config here
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addPlatformAdmin() {
  const email = 'michaeljbrown88@gmail.com'; // Change to your email
  const displayName = 'Michael Brown'; // Change to your name
  const uid = 'pending_admin_001';
  
  try {
    // Create admin record
    await setDoc(doc(db, 'platform/admin/admins', uid), {
      email: email.toLowerCase(),
      displayName: displayName,
      permissions: ['view_metrics', 'view_organizations', 'view_ai_costs', 'manage_organizations', 'manage_admins'],
      isPasswordSet: false,
      createdAt: new Date()
    });
    
    // Create lookup record
    await setDoc(doc(db, 'platform/admin/admin_lookup', email.toLowerCase()), {
      uid: uid,
      email: email.toLowerCase(),
      createdAt: new Date()
    });
    
    console.log('✅ Platform admin added successfully!');
    console.log('Email:', email);
    console.log('You can now login at /admin/platform-login');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding platform admin:', error);
    process.exit(1);
  }
}

addPlatformAdmin();
