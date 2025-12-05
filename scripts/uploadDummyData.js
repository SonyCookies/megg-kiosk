/**
 * Simple script to upload dummy data to Firestore
 * Run with: node scripts/uploadDummyData.js
 * 
 * Make sure to install dependencies first:
 * npm install firebase-admin
 */

const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

// Initialize Firebase Admin
// You need to download your service account key from Firebase Console
// and save it as serviceAccountKey.json in the scripts folder
const serviceAccount = require('./serviceAccountKey.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

const ACCOUNT_ID = "MEGG-679622"
const BATCH_NUMBER = "0003"
const BATCH_ID = `BATCH-679622-${BATCH_NUMBER}`
const NUM_EGGS = 50

// Helper to generate random egg
function generateRandomEgg(index) {
  const weights = [38, 40, 42, 45, 48, 50, 52, 55, 58]
  const qualities = ['good', 'good', 'good', 'good', 'good', 'good', 'dirty', 'cracked']
  const sizes = ['small', 'small', 'medium', 'medium', 'medium', 'large', 'large']
  
  const weight = weights[Math.floor(Math.random() * weights.length)] + Math.random() * 2
  const quality = qualities[Math.floor(Math.random() * qualities.length)]
  const size = sizes[Math.floor(Math.random() * sizes.length)]
  
  // Generate random 5-character suffix
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const randomSuffix = Array.from({ length: 5 }, () => 
    alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join('')
  
  const eggId = `EGG-679622${BATCH_NUMBER}-${randomSuffix}`
  
  // Random timestamp within last 2 hours
  const now = new Date()
  const randomMinutes = Math.floor(Math.random() * 120)
  const createdAt = new Date(now.getTime() - randomMinutes * 60000).toISOString()
  
  return {
    eggId,
    accountId: ACCOUNT_ID,
    batchId: BATCH_ID,
    weight: Math.round(weight * 100) / 100,
    size,
    quality,
    createdAt
  }
}

async function uploadDummyData() {
  console.log('🚀 Starting dummy data upload...')
  console.log(`📦 Account ID: ${ACCOUNT_ID}`)
  console.log(`🥚 Batch ID: ${BATCH_ID}`)
  console.log(`🔢 Generating ${NUM_EGGS} eggs...\n`)

  try {
    // Generate eggs first
    const eggs = Array.from({ length: NUM_EGGS }, (_, i) => generateRandomEgg(i))
    
    // Calculate stats
    const stats = eggs.reduce((acc, egg) => {
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

    // 1. Create batch
    console.log('📝 Creating batch document...')
    const batchDoc = {
      id: BATCH_ID,
      accountId: ACCOUNT_ID,
      name: BATCH_ID,
      status: 'completed',
      stats,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    await db.collection('batches').doc(BATCH_ID).set(batchDoc)
    console.log('✅ Batch created')
    console.log(`   Total: ${stats.totalEggs}, Good: ${stats.goodEggs}, Dirty: ${stats.dirtyEggs}, Cracked: ${stats.crackEggs}\n`)

    // 2. Create eggs in batches of 10
    console.log('🥚 Creating egg documents...')
    const batchWrites = []
    let batchWrite = db.batch()
    let count = 0

    for (const egg of eggs) {
      const eggRef = db.collection('eggs').doc(egg.eggId)
      batchWrite.set(eggRef, egg)
      count++
      
      if (count % 10 === 0) {
        batchWrites.push(batchWrite.commit())
        batchWrite = db.batch()
        console.log(`   Created ${count}/${NUM_EGGS} eggs...`)
      }
    }
    
    // Commit remaining
    if (count % 10 !== 0) {
      batchWrites.push(batchWrite.commit())
    }
    
    await Promise.all(batchWrites)
    console.log(`✅ All ${NUM_EGGS} eggs created\n`)
    
    // Summary
    console.log('📊 Summary:')
    console.log('━'.repeat(50))
    console.log(`Batch: ${BATCH_ID}`)
    console.log(`Total: ${stats.totalEggs}`)
    console.log(`\nSizes: Small=${stats.smallEggs}, Medium=${stats.mediumEggs}, Large=${stats.largeEggs}`)
    console.log(`Quality: Good=${stats.goodEggs}, Dirty=${stats.dirtyEggs}, Cracked=${stats.crackEggs}`)
    console.log('━'.repeat(50))
    console.log('\n✨ Upload complete!')

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

// Run
uploadDummyData()
  .then(() => {
    console.log('\n👋 Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error)
    process.exit(1)
  })

