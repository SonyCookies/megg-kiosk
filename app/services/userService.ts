// services/userService.ts - User data management and UID retrieval

import { db } from '../libs/firebaseConfig'
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore'

export interface UserData {
  accountId: string
  uid: string
  email: string
  fullname: string
  username: string
  phone: string
  provider: string
  verified: boolean
  createdAt: string
  lastLogin: string
  deviceId?: string
  devicedId?: string
  otpExpiry?: string | null
  verificationOTP?: string | null
}

class UserService {
  private usersCollection = 'users'
  private userConfigurationsCollection = 'user_configurations'

  /**
   * Get user UID by account ID
   */
  async getUIDByAccountId(accountId: string): Promise<string | null> {
    try {
      const usersRef = collection(db, this.usersCollection)
      const q = query(usersRef, where('accountId', '==', accountId))
      
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0]
        const userData = userDoc.data() as UserData
        return userData.uid
      } else {
        return null
      }
    } catch (error) {
      console.error('❌ Error fetching UID by account ID:', error)
      return null
    }
  }

  /**
   * Get full user data by account ID
   */
  async getUserByAccountId(accountId: string): Promise<UserData | null> {
    try {
      const usersRef = collection(db, this.usersCollection)
      const q = query(usersRef, where('accountId', '==', accountId))
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0]
        const userData = userDoc.data() as UserData
        return userData
      } else {
        return null
      }
    } catch (error) {
      console.error('❌ Error fetching user by account ID:', error)
      return null
    }
  }

  /**
   * Ensure user configuration has UID field
   */
  async ensureUserConfigurationHasUID(accountId: string): Promise<boolean> {
    try {
      // First get the UID
      const uid = await this.getUIDByAccountId(accountId)
      
      if (!uid) {
        return false
      }

      // Check if user configuration exists
      const configDocRef = doc(db, this.userConfigurationsCollection, accountId)
      const configDoc = await getDoc(configDocRef)
      
      if (configDoc.exists()) {
        const configData = configDoc.data()
        
        // Check if UID is missing or different
        if (!configData.uid || configData.uid !== uid) {
          const updateData = {
            uid: uid,
            'metadata.lastModifiedAt': new Date().toISOString()
          }
          
          await updateDoc(configDocRef, updateData)
          return true
        } else {
          return true
        }
      } else {
        return true
      }
    } catch (error) {
      console.error('❌ Error ensuring user configuration has UID:', error)
      return false
    }
  }

  /**
   * Create or update user configuration with UID
   */
  async createOrUpdateUserConfiguration(accountId: string, configData: any): Promise<boolean> {
    try {
      // Get the UID
      const uid = await this.getUIDByAccountId(accountId)
      if (!uid) {
        return false
      }

      const configDocRef = doc(db, this.userConfigurationsCollection, accountId)
      
      const userConfig = {
        accountId: accountId,
        uid: uid,
        ...configData,
        metadata: {
          ...configData.metadata,
          lastModifiedAt: new Date().toISOString()
        }
      }

      await setDoc(configDocRef, userConfig, { merge: true })
      return true
    } catch (error) {
      console.error('❌ Error creating/updating user configuration:', error)
      return false
    }
  }

  /**
   * Get user configuration with UID
   */
  async getUserConfiguration(accountId: string): Promise<any | null> {
    try {
      const configDocRef = doc(db, this.userConfigurationsCollection, accountId)
      const configDoc = await getDoc(configDocRef)
      
      if (configDoc.exists()) {
        const configData = configDoc.data()
        return configData
      } else {
        return null
      }
    } catch (error) {
      console.error('❌ Error fetching user configuration:', error)
      return null
    }
  }
}

export default new UserService()
