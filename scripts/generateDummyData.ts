/**
 * Script to generate dummy data for testing
 * Run with: npx ts-node scripts/generateDummyData.ts
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore'

// Firebase configuration - UPDATE WITH YOUR CONFIG
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const ACCOUNT_ID = "MEGG-679622"
const BATCH_NUMBER = "0003"
const BATCH_ID = `BATCH-679622-${BATCH_NUMBER}`
const NUM_EGGS = 50 // Number of eggs to generate

// Helper function to generate random egg data
function generateRandomEgg(index: number) {
  const weights = [38, 42, 45, 48, 52, 55, 58, 61] // Sample weights in grams
  const qualities: ('good' | 'dirty' | 'cracked')[] = ['good', 'good', 'good', 'good', 'good', 'dirty', 'cracked'] // 5 good, 1 dirty, 1 cracked
  const sizes: ('small' | 'medium' | 'large')[] = ['small', 'small', 'medium', 'medium', 'medium', 'large', 'large']
  
  const weight = weights[Math.floor(Math.random() * weights.length)]
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
    weight,
    size,
    quality,
    createdAt
  }
}

async function generateDummyData() {
  console.log('🚀 Starting dummy data generation...')
  console.log(`📦 Account ID: ${ACCOUNT_ID}`)
  console.log(`🥚 Batch ID: ${BATCH_ID}`)
  console.log(`🔢 Generating ${NUM_EGGS} eggs...\n`)

  try {
    // Generate eggs first to calculate stats
    const eggs = Array.from({ length: NUM_EGGS }, (_, i) => generateRandomEgg(i))
    
    // Calculate batch stats from generated eggs
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

    // 1. Create batch document
    console.log('📝 Creating batch document...')
    const batchDoc = {
      id: BATCH_ID,
      accountId: ACCOUNT_ID,
      name: BATCH_ID,
      status: 'completed',
      stats,
      createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      updatedAt: new Date().toISOString()
    }
    
    await setDoc(doc(db, 'batches', BATCH_ID), batchDoc)
    console.log('✅ Batch document created')
    console.log(`   Stats: ${stats.totalEggs} total, ${stats.goodEggs} good, ${stats.dirtyEggs} dirty, ${stats.crackEggs} cracked\n`)

    // 2. Create egg documents
    console.log('🥚 Creating egg documents...')
    let created = 0
    for (const egg of eggs) {
      await setDoc(doc(db, 'eggs', egg.eggId), egg)
      created++
      if (created % 10 === 0) {
        console.log(`   Created ${created}/${NUM_EGGS} eggs...`)
      }
    }
    
    console.log(`✅ All ${NUM_EGGS} egg documents created\n`)
    
    // 3. Summary
    console.log('📊 Summary:')
    console.log('━'.repeat(50))
    console.log(`Batch ID: ${BATCH_ID}`)
    console.log(`Total Eggs: ${stats.totalEggs}`)
    console.log(`\nSizes:`)
    console.log(`  Small:  ${stats.smallEggs}`)
    console.log(`  Medium: ${stats.mediumEggs}`)
    console.log(`  Large:  ${stats.largeEggs}`)
    console.log(`\nQualities:`)
    console.log(`  Good:    ${stats.goodEggs}`)
    console.log(`  Dirty:   ${stats.dirtyEggs}`)
    console.log(`  Cracked: ${stats.crackEggs}`)
    console.log('━'.repeat(50))
    console.log('\n✨ Dummy data generation complete!')

  } catch (error) {
    console.error('❌ Error generating dummy data:', error)
    throw error
  }
}

// Run the script
generateDummyData()
  .then(() => {
    console.log('\n👋 Done! You can now test with this data.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error)
    process.exit(1)
  })

