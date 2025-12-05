/**
 * Simple script to upload dummy data using existing Firebase config
 * Run with: node scripts/uploadDummyDataSimple.js
 * 
 * Creates 22 batches (0001-0022) with 30-60 eggs each
 * Processing time: 4 seconds per egg
 */

const { initializeApp } = require('firebase/app')
const { getFirestore, doc, setDoc, writeBatch } = require('firebase/firestore')
require('dotenv').config({ path: '.env.local' })

// Use your existing Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const ACCOUNT_ID = "MEGG-679622"
const NUM_BATCHES = 22
const MIN_EGGS_PER_BATCH = 30
const MAX_EGGS_PER_BATCH = 60
const SECONDS_PER_EGG = 11 // 11 seconds to process each egg (realistic machine timing)

// Helper to generate random number in range
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Helper to generate random weight (38-62g)
function randomWeight() {
  return Math.round((38 + Math.random() * 24) * 100) / 100
}

// Helper to get size from weight
function getSizeFromWeight(weight) {
  if (weight < 43) return 'small'
  if (weight < 53) return 'medium'
  return 'large'
}

// Helper to generate random quality (88% good, <6% dirty, <8% cracked)
// High quality production with minimal defects
function randomQuality() {
  const rand = Math.random()
  if (rand < 0.88) return 'good'      // 88% good
  if (rand < 0.94) return 'dirty'     // 6% dirty
  return 'cracked'                     // 6% cracked
}

// Helper to generate random egg
function generateRandomEgg(batchNumber, batchStartTime, eggIndex, totalEggs) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const randomSuffix = Array.from({ length: 5 }, () => 
    alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join('')
  
  const eggId = `EGG-679622${batchNumber}-${randomSuffix}`
  const weight = randomWeight()
  const size = getSizeFromWeight(weight)
  const quality = randomQuality()
  
  // Calculate egg timestamp: batch start time + (egg index * 11 seconds)
  const eggTime = new Date(batchStartTime.getTime() + (eggIndex * SECONDS_PER_EGG * 1000))
  
  return {
    eggId,
    accountId: ACCOUNT_ID,
    batchId: `BATCH-679622-${batchNumber}`,
    weight,
    size,
    quality,
    createdAt: eggTime.toISOString()
  }
}

// Helper to pad batch number (e.g., 1 -> "0001")
function padBatchNumber(num) {
  return String(num).padStart(4, '0')
}

async function uploadDummyData() {
  console.log('🚀 Starting dummy data generation...')
  console.log(`📦 Account ID: ${ACCOUNT_ID}`)
  console.log(`🎯 Creating ${NUM_BATCHES} batches`)
  console.log(`📅 Date range: November 3, 2025 - December 4, 2025`)
  console.log(`🥚 Each batch: ${MIN_EGGS_PER_BATCH}-${MAX_EGGS_PER_BATCH} eggs`)
  console.log(`⏱️  Processing speed: ${SECONDS_PER_EGG} seconds per egg\n`)

  try {
    const allBatches = []
    const allEggs = []
    
    // Date range: November 3 to December 4, 2025
    const startDate = new Date('2025-11-03T08:00:00') // Nov 3, 2025, 8 AM
    const endDate = new Date('2025-12-04T18:00:00')   // Dec 4, 2025, 6 PM
    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24)
    const hoursPerBatch = (totalDays * 24) / NUM_BATCHES // Spread batches evenly
    
    let currentTime = new Date(startDate)

    // Generate all batches and eggs
    for (let batchNum = 1; batchNum <= NUM_BATCHES; batchNum++) {
      const batchNumber = padBatchNumber(batchNum)
      const batchId = `BATCH-679622-${batchNumber}`
      const numEggs = randomInt(MIN_EGGS_PER_BATCH, MAX_EGGS_PER_BATCH)
      
      console.log(`📦 Generating Batch ${batchNum}/${NUM_BATCHES}: ${batchId} with ${numEggs} eggs...`)

      // Calculate batch processing time based on number of eggs
      const processingTimeSeconds = numEggs * SECONDS_PER_EGG
      const processingTimeMinutes = processingTimeSeconds / 60
      
      const batchStartTime = new Date(currentTime)
      
      // Generate eggs for this batch with sequential timestamps
      const batchEggs = Array.from({ length: numEggs }, (_, i) => 
        generateRandomEgg(batchNumber, batchStartTime, i, numEggs)
      )

      // Calculate batch end time
      const batchEndTime = new Date(batchStartTime.getTime() + (processingTimeSeconds * 1000))

      // Calculate batch stats
      const stats = batchEggs.reduce((acc, egg) => {
        acc.totalEggs++
        if (egg.size === 'small') acc.smallEggs++
        if (egg.size === 'medium') acc.mediumEggs++
        if (egg.size === 'large') acc.largeEggs++
        if (egg.quality === 'good') acc.goodEggs++
        if (egg.quality === 'dirty') acc.dirtyEggs++
        if (egg.quality === 'cracked') acc.crackEggs++
        return acc
      }, {
        totalEggs: 0,
        smallEggs: 0,
        mediumEggs: 0,
        largeEggs: 0,
        goodEggs: 0,
        dirtyEggs: 0,
        crackEggs: 0
      })

      // Create batch document
      const batchDoc = {
        id: batchId,
        accountId: ACCOUNT_ID,
        name: batchId,
        status: 'completed',
        stats,
        createdAt: batchStartTime.toISOString(),
        updatedAt: batchEndTime.toISOString()
      }

      allBatches.push({ id: batchId, doc: batchDoc })
      allEggs.push(...batchEggs)

      const formattedDate = batchStartTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      console.log(`   ✅ ${formattedDate} | ${numEggs} eggs | ${Math.round(processingTimeMinutes)}min | Good: ${stats.goodEggs}, Dirty: ${stats.dirtyEggs}, Cracked: ${stats.crackEggs}`)
      
      // Move to next batch start time (spread evenly across date range)
      currentTime = new Date(currentTime.getTime() + (hoursPerBatch * 60 * 60 * 1000))
    }

    console.log('\n📝 Uploading to Firestore...\n')

    // Upload batches
    console.log('📦 Creating batch documents...')
    for (const batch of allBatches) {
      await setDoc(doc(db, 'batches', batch.id), batch.doc)
      console.log(`   ✅ ${batch.id}`)
    }

    // Upload eggs in batches of 500 (Firestore limit)
    console.log(`\n🥚 Creating ${allEggs.length} egg documents...`)
    let batch = writeBatch(db)
    let count = 0
    let batchCount = 0

    for (const egg of allEggs) {
      const eggRef = doc(db, 'eggs', egg.eggId)
      batch.set(eggRef, egg)
      count++
      
      // Commit every 500 documents
      if (count % 500 === 0) {
        await batch.commit()
        batchCount++
        console.log(`   Committed batch ${batchCount}: ${count}/${allEggs.length} eggs...`)
        batch = writeBatch(db)
      }
    }
    
    // Commit remaining
    if (count % 500 !== 0) {
      await batch.commit()
      batchCount++
      console.log(`   Committed final batch: ${count}/${allEggs.length} eggs`)
    }

    // Calculate totals
    const totalStats = allBatches.reduce((acc, b) => {
      acc.totalEggs += b.doc.stats.totalEggs
      acc.goodEggs += b.doc.stats.goodEggs
      acc.dirtyEggs += b.doc.stats.dirtyEggs
      acc.crackEggs += b.doc.stats.crackEggs
      return acc
    }, { totalEggs: 0, goodEggs: 0, dirtyEggs: 0, crackEggs: 0 })

    // Calculate total processing time
    const totalProcessingTime = allBatches.reduce((sum, b) => {
      const start = new Date(b.doc.createdAt)
      const end = new Date(b.doc.updatedAt)
      return sum + (end - start) / (1000 * 60) // in minutes
    }, 0)

    console.log('\n📊 Summary:')
    console.log('━'.repeat(60))
    console.log(`Account ID: ${ACCOUNT_ID}`)
    console.log(`Batches Created: ${allBatches.length}`)
    console.log(`Total Eggs: ${totalStats.totalEggs}`)
    console.log(`Total Processing Time: ${Math.round(totalProcessingTime)} minutes (${(totalProcessingTime / 60).toFixed(1)} hours)`)
    console.log(`Average Processing Speed: ${Math.round((totalStats.totalEggs / totalProcessingTime) * 60)} eggs/hour`)
    console.log(`\nQuality:`)
    console.log(`  Good:    ${totalStats.goodEggs} (${((totalStats.goodEggs/totalStats.totalEggs)*100).toFixed(1)}%)`)
    console.log(`  Dirty:   ${totalStats.dirtyEggs} (${((totalStats.dirtyEggs/totalStats.totalEggs)*100).toFixed(1)}%)`)
    console.log(`  Cracked: ${totalStats.crackEggs} (${((totalStats.crackEggs/totalStats.totalEggs)*100).toFixed(1)}%)`)
    console.log('━'.repeat(60))
    console.log('\n📝 Sample batches:')
    allBatches.slice(0, 5).forEach(b => {
      const s = b.doc.stats
      const start = new Date(b.doc.createdAt)
      const end = new Date(b.doc.updatedAt)
      const mins = Math.round((end - start) / (1000 * 60))
      console.log(`   ${b.id}: ${s.totalEggs} eggs in ${mins}min (Good: ${s.goodEggs}, Dirty: ${s.dirtyEggs}, Cracked: ${s.crackEggs})`)
    })
    console.log(`   ... and ${allBatches.length - 5} more batches`)

    console.log('\n✨ Dummy data generation complete!')

  } catch (error) {
    console.error('❌ Error generating dummy data:', error)
    throw error
  }
}

// Run the script
uploadDummyData()
  .then(() => {
    console.log('\n👋 Done! You can now view this data in your dashboard.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error)
    process.exit(1)
  })
