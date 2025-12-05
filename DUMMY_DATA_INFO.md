# Dummy Data Generator - Updated Specifications

## 📊 What Gets Created

### Batches
- **Count**: 22 batches
- **IDs**: BATCH-679622-0001 through BATCH-679622-0022
- **Eggs per batch**: 30-60 (random)
- **Status**: All marked as 'completed'

### Eggs
- **Total**: ~880-1,320 eggs (depending on random distribution)
- **IDs**: EGG-6796220001-xxxxx, EGG-6796220002-xxxxx, etc.
- **Weight**: 38-62 grams (random, realistic range)
- **Quality**: 70% good, 20% dirty, 10% cracked

## ⏱️ Realistic Processing Times

### Time Calculation
```
Processing Time = Number of Eggs × 11 seconds
```

### Examples:
- **30 eggs** → 330 seconds (5.5 minutes)
- **45 eggs** → 495 seconds (8.25 minutes)
- **60 eggs** → 660 seconds (11 minutes)

### Batch Spacing
- **Date range**: November 3 - December 4, 2025 (31 days)
- **Distribution**: 22 batches spread evenly (~34 hours between batches)
- **Start time**: November 3, 2025 at 8:00 AM
- **End time**: December 4, 2025 around 6:00 PM

## 📅 Timeline Example

**Date Range:** November 3, 2025 - December 4, 2025 (31 days)

```
Nov 3 - 8:00 AM
├─ BATCH-679622-0001 (45 eggs) → 8.25 min processing
│
Nov 5 - 10:00 AM
├─ BATCH-679622-0002 (52 eggs) → 9.5 min processing
│
... (batches spread evenly across dates)
│
Dec 2 - 2:00 PM
├─ BATCH-679622-0021 (41 eggs) → 7.5 min processing
│
Dec 4 - 4:00 PM
└─ BATCH-679622-0022 (38 eggs) → 7 min processing
```

**Batches are evenly distributed** across the entire month, approximately one batch every ~1.4 days.

## 🎯 Data Distribution

### Size (based on weight)
- **Small** (<43g): ~33%
- **Medium** (43-53g): ~40%
- **Large** (>53g): ~27%

### Quality (high quality production)
- **Good**: 88%
- **Dirty**: 5% (< 6%)
- **Cracked**: 7% (< 8%)

## 📈 Performance Metrics You'll See

Based on 22 batches with average 45 eggs each:

```
Total Eggs: ~990
Total Batches: 22
Avg Eggs/Batch: 45
Processing Speed: ~327 eggs/hour (5.45 eggs/min = 11 sec/egg)
Avg Batch Time: 8.25 minutes
Quality Score: ~88%
Defect Rate: ~12%
```

## 🔧 How to Run

### Step 1: Delete Old Batches
Go to Firebase Console and delete:
- BATCH-679622-0000
- BATCH-679622-0001
- BATCH-679622-0002
- BATCH-679622-0003

### Step 2: Run Script
```bash
cd E:\MEGG-FINAL\kiosk-next-frontend
node scripts/uploadDummyDataSimple.js
```

### Step 3: Wait
The script will:
1. Generate 22 batches (~1 second)
2. Generate 880-1,320 eggs (~3 seconds)
3. Upload batches to Firestore (~5 seconds)
4. Upload eggs to Firestore in batches of 500 (~10 seconds)

**Total time**: ~20-30 seconds

## 📊 Expected Output

```
🚀 Starting dummy data generation...
📦 Account ID: MEGG-679622
🎯 Creating 22 batches
🥚 Each batch: 30-60 eggs
⏱️  Processing speed: 4 seconds per egg

📦 Generating Batch 1/22: BATCH-679622-0001 with 45 eggs...
   ✅ 45 eggs | Time: 3min | Good: 32, Dirty: 9, Cracked: 4
📦 Generating Batch 2/22: BATCH-679622-0002 with 52 eggs...
   ✅ 52 eggs | Time: 3min | Good: 36, Dirty: 11, Cracked: 5
...

📊 Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Account ID: MEGG-679622
Batches Created: 22
Total Eggs: 990
Total Processing Time: 66 minutes (1.1 hours)
Average Processing Speed: 900 eggs/hour

Quality:
  Good:    693 (70.0%)
  Dirty:   198 (20.0%)
  Cracked: 99 (10.0%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🎨 What You'll See on Dashboard

### Performance Metrics
- **Processing Speed**: ~900 eggs/hour
- **Avg Batch Time**: 2-4 minutes (varies by batch size)
- **Quality Score**: ~70%
- **Total Processed**: ~990 eggs

### Charts
- **Line Charts**: 22 data points showing trends
- **Area Charts**: Smooth gradients showing eggs per batch over time
- **Table**: All 22 batches listed with individual stats

## ✅ Verification

After running, check in Firebase Console:
- `batches` collection should have 22 documents
- `eggs` collection should have ~990 documents
- Each batch's `createdAt` and `updatedAt` should differ by (numEggs × 4 seconds)

---

**Updated**: December 4, 2025  
**Processing Model**: 4 seconds per egg (realistic machine timing)

