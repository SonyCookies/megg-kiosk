# Dummy Data Generator (Simplified)

## ✨ No Service Account Key Needed!

This version uses your existing Firebase configuration from `.env.local`

## Quick Setup

1. **Install dependencies** (if not already installed):
   ```bash
   cd E:\MEGG-FINAL\kiosk-next-frontend
   npm install firebase dotenv
   ```

2. **Make sure your `.env.local` file has Firebase config**:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

3. **Run the script**:
   ```bash
   node scripts/uploadDummyDataSimple.js
   ```

## What Gets Created

✅ **1 Batch**: `BATCH-679622-0003`
- 50 total eggs
- Mixed sizes: small, medium, large
- Mixed qualities: good, dirty, cracked

✅ **50 Eggs**: `EGG-6796220003-xxxxx`
- Realistic weights (38-58g)
- Random timestamps over 2 hours
- All linked to account `MEGG-679622`

## Important Note About Firestore Rules

⚠️ **This script uses the client SDK**, so your Firestore security rules must allow writes.

If you get a permission error, you have two options:

### Option A: Temporarily allow writes (for testing only)
```javascript
// Firestore Rules - TESTING ONLY
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // ⚠️ INSECURE - only for testing!
    }
  }
}
```

### Option B: Use authenticated context
Add authentication to the script (requires Firebase Auth setup)

## The Difference

**Client SDK** (this script):
- ✅ Uses existing Firebase config
- ✅ No service account key needed
- ❌ Subject to Firestore security rules

**Admin SDK** (uploadDummyData.js):
- ✅ Bypasses security rules
- ✅ Full admin access
- ❌ Requires service account key

For local testing/development, the client SDK approach is simpler!

