// services/batchService.ts - Firebase batch data management

import { db } from '../libs/firebaseConfig'
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  updateDoc, 
  doc,
  getDoc,
  setDoc,
  serverTimestamp 
} from 'firebase/firestore'
import userService from './userService'

export interface BatchData {
  id: string
  accountId: string
  uid: string
  name: string
  status: 'idle' | 'ready' | 'processing' | 'completed'
  stats: {
    totalEggs: number
    smallEggs: number
    mediumEggs: number
    largeEggs: number
    goodEggs: number
    dirtyEggs: number
    badEggs: number
  }
  createdAt: string
  updatedAt: string
}

class BatchService {
  private collectionName = 'batches'

  /**
   * Create a new batch in Firebase
   */
  async createBatch(
    batchId: string,
    accountId: string,
    uid: string,
    name: string
  ): Promise<BatchData | null> {
    try {
      const batchData: BatchData = {
        id: batchId,
        accountId,
        uid,
        name,
        status: 'ready',
        stats: {
          totalEggs: 0,
          smallEggs: 0,
          mediumEggs: 0,
          largeEggs: 0,
          goodEggs: 0,
          dirtyEggs: 0,
          badEggs: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Save to Firebase using batch ID as document ID
      const batchDocRef = doc(db, this.collectionName, batchId)
      await setDoc(batchDocRef, batchData)

      return batchData
    } catch (error) {
      console.error('❌ Error creating batch:', error)
      return null
    }
  }

  /**
   * Get batch by ID
   */
  async getBatch(batchId: string): Promise<BatchData | null> {
    try {
      const batchDocRef = doc(db, this.collectionName, batchId)
      const batchDoc = await getDoc(batchDocRef)
      
      if (batchDoc.exists()) {
        return batchDoc.data() as BatchData
      }
      
      return null
    } catch (error) {
      console.error('❌ Error fetching batch:', error)
      return null
    }
  }

  /**
   * Update batch data
   */
  async updateBatch(
    batchId: string,
    updates: Partial<BatchData>
  ): Promise<boolean> {
    try {
      const batchDocRef = doc(db, this.collectionName, batchId)
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      }
      
      await updateDoc(batchDocRef, updateData)
      return true
    } catch (error) {
      console.error('❌ Error updating batch:', error)
      return false
    }
  }

  /**
   * Update batch statistics
   */
  async updateBatchStats(
    batchId: string,
    stats: BatchData['stats']
  ): Promise<boolean> {
    try {
      const batchDocRef = doc(db, this.collectionName, batchId)
      await updateDoc(batchDocRef, {
        stats,
        updatedAt: new Date().toISOString()
      })
      return true
    } catch (error) {
      console.error('❌ Error updating batch stats:', error)
      return false
    }
  }

  /**
   * Update batch status
   */
  async updateBatchStatus(
    batchId: string,
    status: BatchData['status']
  ): Promise<boolean> {
    try {
      const batchDocRef = doc(db, this.collectionName, batchId)
      await updateDoc(batchDocRef, {
        status,
        updatedAt: new Date().toISOString()
      })
      return true
    } catch (error) {
      console.error('❌ Error updating batch status:', error)
      return false
    }
  }

  /**
   * Get batches for a specific account
   */
  async getBatchesForAccount(
    accountId: string,
    limitCount: number = 10
  ): Promise<BatchData[]> {
    try {
      const batchesRef = collection(db, this.collectionName)
      const q = query(
        batchesRef,
        where('accountId', '==', accountId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )
      
      const querySnapshot = await getDocs(q)
      const batches: BatchData[] = []
      
      querySnapshot.forEach((doc) => {
        batches.push(doc.data() as BatchData)
      })
      
      return batches
    } catch (error) {
      console.error('❌ Error fetching batches for account:', error)
      return []
    }
  }

  /**
   * Check if batch exists
   */
  async batchExists(batchId: string): Promise<boolean> {
    try {
      const batch = await this.getBatch(batchId)
      return batch !== null
    } catch (error) {
      console.error('❌ Error checking batch existence:', error)
      return false
    }
  }

  /**
   * Delete batch
   */
  async deleteBatch(batchId: string): Promise<boolean> {
    try {
      const batchDocRef = doc(db, this.collectionName, batchId)
      await updateDoc(batchDocRef, {
        status: 'deleted',
        updatedAt: new Date().toISOString()
      })
      return true
    } catch (error) {
      console.error('❌ Error deleting batch:', error)
      return false
    }
  }
}

export default new BatchService()


