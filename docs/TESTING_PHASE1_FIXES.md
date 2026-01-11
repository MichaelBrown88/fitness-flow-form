# Testing Guide: Phase 1 Fixes

## 🧹 **Step 1: Clear Stale Authentication**

Before testing, you need to clear the stale "test" user session:

### **Option A: Browser Console (Recommended)**
1. Open your app in the browser (e.g., `http://localhost:8082`)
2. Open Developer Tools (F12 or Cmd+Option+I)
3. Go to **Application/Storage** tab
4. In the left sidebar, find:
   - **Local Storage** → Click your domain → Delete all keys
   - **Session Storage** → Click your domain → Delete all keys
   - **IndexedDB** → Look for `firebaseLocalStorageDb` → Delete it
5. **OR** run in Console:
```javascript
// Clear all Firebase Auth state
localStorage.clear();
sessionStorage.clear();
// Refresh page
window.location.reload();
```

### **Option B: Incognito/Private Window**
1. Open a new incognito/private window
2. Navigate to your app
3. Test fresh (no cached auth)

---

## ✅ **Fix #1: Assessment ID Mismatch**

### **Test: Full Assessment Flow**

1. **Start Fresh:**
   - Clear auth state (see Step 1)
   - Navigate to landing page
   - Click "Start Free Trial" → Should go to `/onboarding`

2. **Complete Onboarding:**
   - Fill out all 8 steps
   - Complete onboarding → Should redirect to dashboard

3. **Create Assessment:**
   - From dashboard, click "New Assessment" or "New Client"
   - Fill out assessment form (can use minimal data or demo fill)
   - Navigate through all phases
   - Click "View Results" at the end

4. **Verify Report Loads:**
   - ✅ Report should load immediately (no "Assessment not found" error)
   - ✅ Check browser console - should see assessment loaded successfully
   - ✅ URL should be `/coach/assessments/{actual-document-id}` (not a constructed ID)

5. **Check Firestore:**
   - Go to Firebase Console → Firestore
   - Navigate to: `coaches/{your-uid}/assessments/{document-id}`
   - ✅ Document ID should be a Firestore auto-generated ID (like `abc123xyz456`)
   - ✅ Should NOT be a constructed ID like `coach-uid-client-name-current`

### **Expected Result:**
✅ Report loads successfully using actual Firestore document ID

### **If It Fails:**
- Check browser console for errors
- Verify assessment was saved (check Firestore)
- Note the assessment ID format in console

---

## ✅ **Fix #2: Onboarding Race Condition**

### **Test: Onboarding Completion & Settings Load**

1. **Complete Onboarding:**
   - Go through all 8 steps of onboarding
   - Pay attention to the final step (Success screen)

2. **Check Settings Load:**
   - After clicking "Enter Dashboard" on success screen
   - ✅ Dashboard should load immediately with correct organization branding
   - ✅ Organization name should appear correctly
   - ✅ Brand color/gradient should be applied
   - ✅ No "default" or "New Organization" names

3. **Check Browser Console:**
   - ✅ Should see log: "Onboarding completed successfully - settings refreshed"
   - ✅ No errors about missing organization settings
   - ✅ No warnings about settings not loaded

4. **Verify Settings Immediately:**
   - Navigate to Settings page immediately after onboarding
   - ✅ All settings should be loaded (not defaults)
   - ✅ Brand color picker should show your selected gradient
   - ✅ Organization name should be correct

### **Expected Result:**
✅ Dashboard loads with correct organization settings immediately (no default values)

### **If It Fails:**
- Check if settings eventually load (might just be slow)
- Check browser console for errors
- Verify organization document exists in Firestore with correct data

---

## ✅ **Fix #3: organizationId Validation**

### **Test: Assessment Save with Valid organizationId**

1. **Create Assessment (Normal Flow):**
   - From dashboard, create a new assessment
   - Fill out form and save
   - ✅ Assessment should save successfully
   - ✅ No error messages about organization ID

2. **Verify in Firestore:**
   - Go to Firebase Console → Firestore
   - Find your assessment: `coaches/{your-uid}/assessments/{id}`
   - ✅ `organizationId` field should exist and have a valid value
   - ✅ Should NOT be `null`

3. **Verify Dashboard Shows Assessment:**
   - ✅ Assessment should appear in dashboard list
   - ✅ Filtering by organization should work (if applicable)

### **Test: Edge Case - Missing organizationId**

⚠️ **This should show an error (this is correct behavior):**

1. **Simulate Missing organizationId (for testing only):**
   - Temporarily modify profile to have `organizationId: null` (via console)
   - Try to save an assessment
   - ✅ Should show error toast: "Organization ID is required..."
   - ✅ Assessment should NOT be saved

2. **Restore Profile:**
   - Restore profile with valid `organizationId`
   - Save should work again

### **Expected Result:**
✅ All assessments have valid `organizationId` - no null values in database

### **If It Fails:**
- Check Firestore for assessments with `organizationId: null`
- Check browser console for validation errors
- Verify user profile has valid `organizationId`

---

## 🔄 **Full End-to-End Test Flow**

### **Complete Journey Test:**

1. **Clear Auth & Start Fresh**
   ```javascript
   // In browser console:
   localStorage.clear();
   sessionStorage.clear();
   window.location.reload();
   ```

2. **Landing Page**
   - ✅ Should not be logged in
   - ✅ "Start Free Trial" button works
   - ✅ Should go to `/onboarding`

3. **Onboarding (Steps 0-8)**
   - ✅ Step 0: Welcome screen
   - ✅ Step 1: Identity (creates account)
   - ✅ Steps 2-7: Business info, location, marketing, branding, equipment, capacity
   - ✅ Step 8: Success screen with correct organization name
   - ✅ Click "Enter Dashboard" → Should load dashboard with correct settings

4. **Dashboard**
   - ✅ Should show your organization name (not "New Organization")
   - ✅ Should show correct branding/colors
   - ✅ "New Assessment" button works

5. **Create Assessment**
   - ✅ Click "New Assessment"
   - ✅ Fill out form (or use demo fill)
   - ✅ Navigate through all phases
   - ✅ Click "View Results"

6. **Report Generation**
   - ✅ Report loads successfully
   - ✅ No "Assessment not found" errors
   - ✅ All sections display correctly
   - ✅ Can share/download report

7. **Verify Data in Firestore**
   - ✅ Organization document exists with all onboarding data
   - ✅ User profile has `onboardingCompleted: true`
   - ✅ Assessment document exists with valid `organizationId`
   - ✅ Assessment ID is a Firestore document ID (not constructed)

---

## 📊 **What to Check in Browser Console**

Open DevTools Console and look for:

✅ **Success Indicators:**
- `[RESTORE]` or similar success logs
- "Onboarding completed successfully - settings refreshed"
- "Assessment Saved" toast appears
- No error messages

❌ **Error Indicators:**
- Red error messages
- "Assessment not found" errors
- "Organization ID is required" (unless testing edge case)
- Network errors (404, 403, etc.)

---

## 🔍 **Firebase Console Checks**

1. **Firestore Database:**
   - `organizations/{orgId}` → Should have all onboarding data
   - `userProfiles/{uid}` → Should have `onboardingCompleted: true` and `organizationId`
   - `coaches/{uid}/assessments/{id}` → Should have `organizationId` field (not null)

2. **Authentication:**
   - Should see your new test account
   - Should NOT see old "test" account

---

## 🐛 **Common Issues & Solutions**

### **Issue: Still logged in as old test user**
**Solution:** Clear localStorage/sessionStorage (see Step 1)

### **Issue: "Assessment not found" after saving**
**Solution:** Check if Fix #1 was applied - assessment ID should be Firestore document ID

### **Issue: Dashboard shows "New Organization"**
**Solution:** Check if Fix #2 was applied - onboarding should await settings refresh

### **Issue: Assessment has `organizationId: null`**
**Solution:** Check if Fix #3 was applied - validation should prevent this

---

## ✅ **Success Criteria**

After completing all tests, you should have:

1. ✅ **New account created** via onboarding
2. ✅ **Organization properly configured** with all onboarding data
3. ✅ **Dashboard loads** with correct organization branding immediately
4. ✅ **Assessment created** and saved successfully
5. ✅ **Report loads** without errors using actual Firestore document ID
6. ✅ **All data in Firestore** has valid `organizationId` (no null values)

---

**Ready to test? Start with Step 1 (Clear Auth) and work through each test methodically!**
