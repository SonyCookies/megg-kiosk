# Dummy Data Generator

Scripts to generate test data for the MEGG kiosk application.

## Quick Setup

### Option 1: Using Firebase Admin (Recommended)

1. **Download Service Account Key**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `serviceAccountKey.json` in this `scripts` folder

2. **Install Dependencies**
   ```bash
   cd E:\MEGG-FINAL\kiosk-next-frontend
   npm install firebase-admin
   ```

3. **Run Script**
   ```bash
   node scripts/uploadDummyData.js
   ```

### Option 2: Manual Upload via Firebase Console

Use the provided `dummyData.json` file to manually create documents in Firestore.

## What Gets Created

### Batch Document
- **Collection**: `batches`
- **Document ID**: `BATCH-679622-0003`
- **Fields**:
  - `id`: "BATCH-679622-0003"
  - `accountId`: "MEGG-679622"
  - `name`: "BATCH-679622-0003"
  - `status`: "completed"
  - `stats`: Object with egg counts
  - `createdAt`: Timestamp
  - `updatedAt`: Timestamp

### Egg Documents (50 eggs)
- **Collection**: `eggs`
- **Document IDs**: `EGG-6796220003-xxxxx` (random 5-char suffix)
- **Fields**:
  - `eggId`: "EGG-6796220003-xxxxx"
  - `accountId`: "MEGG-679622"
  - `batchId`: "BATCH-679622-0003"
  - `weight`: Number (38-58g)
  - `size`: "small" | "medium" | "large"
  - `quality`: "good" | "dirty" | "cracked"
  - `createdAt`: Timestamp

## Configuration

Edit the constants in `uploadDummyData.js` to customize:

```javascript
const ACCOUNT_ID = "MEGG-679622"
const BATCH_NUMBER = "0003"
const NUM_EGGS = 50
```

## Troubleshooting

**Error: Cannot find module './serviceAccountKey.json'**
- Make sure you downloaded the service account key from Firebase Console
- Place it in the `scripts` folder
- Filename must be exactly `serviceAccountKey.json`

**Error: Permission denied**
- Check that your service account has Firestore read/write permissions
- In Firebase Console: IAM & Admin → grant "Cloud Datastore User" role

**Firestore rules blocking writes**
- Temporarily update Firestore rules to allow writes from admin SDK
- Or run script with proper authentication

