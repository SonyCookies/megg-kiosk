// services/notificationService.ts - Kiosk Notification Service
// Integrates with the main MEGG notification system

import { db } from '../libs/firebaseConfig'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

/**
 * Create a notification in the Firestore notifications collection
 * Compatible with the main MEGG notification system
 * 
 * @param accountId - User's account ID (e.g., "MEGG-679622")
 * @param message - Notification message
 * @param type - Notification type
 * @param icon - Icon name (optional, will be auto-assigned based on type)
 * @returns Promise<boolean> - Success status
 */
export async function createKioskNotification(
  accountId: string,
  message: string,
  type: string,
  icon?: string
): Promise<boolean> {
  try {
    // Icon mapping for kiosk-related notifications
    const iconMap: { [key: string]: string } = {
      'kiosk_connected': 'monitor',
      'kiosk_disconnected': 'monitor',
      'kiosk_session_timeout': 'alert',
      'kiosk_network_recovered': 'wifi',
    }

    // Get icon from map or use provided icon
    const notificationIcon = icon || iconMap[type] || 'bell'

    // Create notification document with same structure as main system
    const notificationData = {
      accountId,
      message,
      type,
      icon: notificationIcon,
      createdAt: serverTimestamp(),
      read: false,
      source: 'kiosk' // Optional: identify that this came from kiosk
    }

    const notificationsRef = collection(db, 'notifications')
    await addDoc(notificationsRef, notificationData)

    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Kiosk notification created:', type)
    }
    return true
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('❌ Error creating kiosk notification:', error)
    }
    // Don't throw error - notifications should never block main functionality
    return false
  }
}

/**
 * Create notification when kiosk connects
 */
export async function notifyKioskConnected(
  accountId: string,
  userName: string
): Promise<boolean> {
  const message = `Kiosk connected successfully. Welcome, ${userName}!`
  return createKioskNotification(accountId, message, 'kiosk_connected')
}

/**
 * Create notification when kiosk disconnects
 */
export async function notifyKioskDisconnected(
  accountId: string,
  userName: string
): Promise<boolean> {
  const message = `Kiosk session ended for ${userName}`
  return createKioskNotification(accountId, message, 'kiosk_disconnected')
}

/**
 * Create notification when session times out
 */
export async function notifyKioskTimeout(
  accountId: string
): Promise<boolean> {
  const message = 'Your kiosk session has timed out due to inactivity'
  return createKioskNotification(accountId, message, 'kiosk_session_timeout')
}

/**
 * Create notification when network is recovered
 */
export async function notifyNetworkRecovered(
  accountId: string
): Promise<boolean> {
  const message = 'Network connection restored - kiosk session reactivated'
  return createKioskNotification(accountId, message, 'kiosk_network_recovered')
}

