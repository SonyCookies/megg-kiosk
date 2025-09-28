// services/calibrationService.ts - Firebase calibration data management

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

export interface CalibrationData {
  accountId: string
  uid: string
  component: string
  status: 'unknown' | 'calibrated' | 'calibrating'
  success: boolean
  message: string
  timestamp: string
  createdAt: string
}

export interface UserCalibration {
  accountId: string
  uid: string
  component: string
  status: 'unknown' | 'calibrated' | 'calibrating'
  success: boolean
  message: string
  timestamp: string
  createdAt: any // Firestore serverTimestamp
}

class CalibrationService {
  private collectionName = 'user_calibration'

  /**
   * Save calibration result to Firebase
   */
  async saveCalibrationResult(
    accountId: string,
    uid: string,
    component: string,
    status: 'unknown' | 'calibrated' | 'calibrating',
    success: boolean,
    message: string
  ): Promise<boolean> {
    try {
      // Get existing calibration document for this account
      const calibrationDocRef = doc(db, this.collectionName, accountId)
      const existingDoc = await getDoc(calibrationDocRef)
      const existingData = existingDoc.exists() ? existingDoc.data() : {}

      // Create calibration data with accountId and uid
      const calibrationData = {
        accountId,
        uid,
        calibrations: {
          ...existingData.calibrations,
          [component]: {
            status,
            success,
            message,
            timestamp: new Date().toISOString()
          }
        },
        metadata: {
          lastModifiedAt: new Date().toISOString(),
          totalCalibrations: Object.keys({ ...existingData.calibrations, [component]: true }).length
        }
      }

      await setDoc(calibrationDocRef, calibrationData, { merge: true })
      return true
    } catch (error) {
      console.error('❌ Error saving calibration result:', error)
      return false
    }
  }

  /**
   * Get latest calibration results for a user
   */
  async getLatestCalibrations(accountId: string, limitCount: number = 10): Promise<CalibrationData[]> {
    try {
      // Get the calibration document for this account
      const calibrationDocRef = doc(db, this.collectionName, accountId)
      const calibrationDoc = await getDoc(calibrationDocRef)
      
      if (!calibrationDoc.exists()) {
        return []
      }
      
      const data = calibrationDoc.data()
      
      if (!data.calibrations) {
        return []
      }
      
      // Convert nested calibrations to array format
      const calibrations: CalibrationData[] = []
      
      Object.entries(data.calibrations).forEach(([component, calibrationData]: [string, any]) => {
        calibrations.push({
          accountId: data.accountId,
          uid: data.uid,
          component: component,
          status: calibrationData.status,
          success: calibrationData.success,
          message: calibrationData.message,
          timestamp: calibrationData.timestamp,
          createdAt: calibrationData.timestamp // Use timestamp as createdAt since we don't store separate createdAt
        })
      })
      
      // Sort by timestamp (most recent first) and limit results
      calibrations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      const limitedCalibrations = calibrations.slice(0, limitCount)
      
      return limitedCalibrations
    } catch (error) {
      console.error('❌ Error fetching calibration data:', error)
      return []
    }
  }

  /**
   * Get latest calibration for a specific component
   */
  async getLatestComponentCalibration(accountId: string, component: string): Promise<CalibrationData | null> {
    try {
      // Get the calibration document for this account
      const calibrationDocRef = doc(db, this.collectionName, accountId)
      const calibrationDoc = await getDoc(calibrationDocRef)
      
      if (!calibrationDoc.exists()) {
        return null
      }
      
      const data = calibrationDoc.data()
      
      if (!data.calibrations || !data.calibrations[component]) {
        return null
      }
      
      const calibrationData = data.calibrations[component]
      
      return {
        accountId: data.accountId,
        uid: data.uid,
        component: component,
        status: calibrationData.status,
        success: calibrationData.success,
        message: calibrationData.message,
        timestamp: calibrationData.timestamp,
        createdAt: calibrationData.timestamp // Use timestamp as createdAt since we don't store separate createdAt
      }
    } catch (error) {
      console.error('❌ Error fetching component calibration:', error)
      return null
    }
  }

  /**
   * Get UID by account ID
   */
  async getUIDByAccountId(accountId: string): Promise<string | null> {
    try {
      const uid = await userService.getUIDByAccountId(accountId)
      return uid
    } catch (error) {
      console.error('❌ Error getting UID by account ID:', error)
      return null
    }
  }

  /**
   * Ensure user configuration has UID, add if missing
   */
  async ensureUserHasUID(accountId: string): Promise<boolean> {
    try {
      return await userService.ensureUserConfigurationHasUID(accountId)
    } catch (error) {
      console.error('❌ Error ensuring user has UID:', error)
      return false
    }
  }
}

export default new CalibrationService()
