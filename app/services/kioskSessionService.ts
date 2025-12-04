// services/kioskSessionService.ts - Kiosk Session Management Service

import { db } from '../libs/firebaseConfig'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp, FieldValue } from 'firebase/firestore'

export interface KioskSessionData {
  kioskId: string
  userId: string
  userName: string
  userEmail: string
  startTime: Timestamp | Date | FieldValue
  lastHeartbeat: Timestamp | Date | FieldValue
  status: 'active' | 'disconnected'
}

export interface UserData {
  accountId?: string
  fullname?: string
  username?: string
  email?: string
  [key: string]: any
}

class KioskSessionService {
  private sessionsCollection = 'kioskSessions'

  /**
   * Generate kiosk session document ID from user ID
   * @param userId - User's account ID (e.g., "MEGG-679622")
   * @returns Kiosk session document ID (e.g., "KIOSK-MEGG-679622")
   */
  private getKioskDocId(userId: string): string {
    return `KIOSK-${userId}`
  }

  /**
   * Create a new kiosk session or update existing one
   * @param userId - User's account ID (e.g., "MEGG-679622")
   * @param userData - User data object containing user information
   * @returns Promise<boolean> - Success status
   */
  async createSession(userId: string, userData: UserData): Promise<boolean> {
    try {
      const kioskId = this.getKioskDocId(userId)
      const sessionDocRef = doc(db, this.sessionsCollection, kioskId)
      
      const sessionData: KioskSessionData = {
        kioskId,
        userId,
        userName: userData.fullname || userData.username || 'Unknown User',
        userEmail: userData.email || 'No email',
        startTime: serverTimestamp(),
        lastHeartbeat: serverTimestamp(),
        status: 'active'
      }

      await setDoc(sessionDocRef, sessionData)
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Kiosk session created:', kioskId)
      }
      return true
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Error creating kiosk session:', error)
      }
      return false
    }
  }

  /**
   * Update the heartbeat timestamp for an active session
   * @param userId - User's account ID (e.g., "MEGG-679622")
   * @returns Promise<boolean> - Success status
   */
  async updateHeartbeat(userId: string): Promise<boolean> {
    try {
      const kioskId = this.getKioskDocId(userId)
      const sessionDocRef = doc(db, this.sessionsCollection, kioskId)

      await updateDoc(sessionDocRef, {
        lastHeartbeat: serverTimestamp(),
        status: 'active' // Ensure status is active when heartbeat updates
      })
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('💓 Heartbeat updated for:', kioskId)
      }
      return true
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Error updating heartbeat:', error)
      }
      return false
    }
  }

  /**
   * End a kiosk session by setting status to disconnected
   * @param userId - User's account ID (e.g., "MEGG-679622")
   * @returns Promise<boolean> - Success status
   */
  async endSession(userId: string): Promise<boolean> {
    try {
      const kioskId = this.getKioskDocId(userId)
      const sessionDocRef = doc(db, this.sessionsCollection, kioskId)

      await updateDoc(sessionDocRef, {
        status: 'disconnected',
        lastHeartbeat: serverTimestamp() // Update one last time
      })
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔌 Kiosk session ended:', kioskId)
      }
      return true
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Error ending kiosk session:', error)
      }
      return false
    }
  }

  /**
   * Get active session data for a user
   * @param userId - User's account ID (e.g., "MEGG-679622")
   * @returns Promise<KioskSessionData | null> - Session data or null if not found
   */
  async getActiveSession(userId: string): Promise<KioskSessionData | null> {
    try {
      const kioskId = this.getKioskDocId(userId)
      const sessionDocRef = doc(db, this.sessionsCollection, kioskId)
      
      const sessionDoc = await getDoc(sessionDocRef)
      
      if (sessionDoc.exists()) {
        const data = sessionDoc.data() as KioskSessionData
        if (process.env.NODE_ENV !== 'production') {
          console.log('📋 Active session found:', kioskId, 'Status:', data.status)
        }
        return data
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.log('📋 No active session found for:', kioskId)
        }
        return null
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Error getting active session:', error)
      }
      return null
    }
  }

  /**
   * Check if a session exists and is active
   * @param userId - User's account ID (e.g., "MEGG-679622")
   * @returns Promise<boolean> - True if active session exists
   */
  async isSessionActive(userId: string): Promise<boolean> {
    try {
      const session = await this.getActiveSession(userId)
      return session !== null && session.status === 'active'
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Error checking if session is active:', error)
      }
      return false
    }
  }
}

// Create singleton instance
const kioskSessionService = new KioskSessionService()

export default kioskSessionService

