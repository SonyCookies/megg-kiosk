// services/smsService.ts - SMS Service using Phone HTTP Server
// Sends SMS notifications via a phone HTTP server endpoint

import userService from './userService'

export interface SMSResult {
  success: boolean
  error?: string
}

// ============================================
// SMS CONFIGURATION - EMBEDDED IN CODE
// ============================================
// Update this value with your ngrok URL
const SMS_CONFIG = {
  phoneServerUrl: 'https://subornative-effectually-vanna.ngrok-free.dev' // Replace with your ngrok URL
}

/**
 * Get SMS configuration (embedded in code)
 */
function getSMSConfig() {
  return SMS_CONFIG
}

/**
 * Get recipient phone number from user data by accountId
 */
async function getRecipientPhoneNumber(accountId: string | null): Promise<string | null> {
  if (!accountId) {
    return null
  }

  try {
    const userData = await userService.getUserByAccountId(accountId)
    return userData?.phone || null
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error fetching user phone number:', error)
    }
    return null
  }
}

/**
 * Send SMS via phone HTTP server
 * @param message - Message to send
 * @param accountId - Account ID to fetch phone number from users collection
 * @param component - Component name (optional, for logging)
 * @returns Promise<SMSResult>
 */
export async function sendSMS(
  message: string,
  accountId: string | null,
  component?: string
): Promise<SMSResult> {
  const config = getSMSConfig()

  // SMS is always enabled - no need to check enabled flag
  // Validate configuration
  if (!config.phoneServerUrl) {
    // Silently fail if not configured - don't show errors
    return { success: false, error: 'Phone server URL not configured' }
  }

  // Get phone number from user data
  const recipientPhoneNumber = await getRecipientPhoneNumber(accountId)
  
  if (!recipientPhoneNumber) {
    // Silently fail if phone number not found - don't show errors
    return { success: false, error: 'Recipient phone number not found in user data' }
  }

  // Validate phone number format (basic validation)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  if (!phoneRegex.test(recipientPhoneNumber.replace(/[\s\-\(\)]/g, ''))) {
    return { success: false, error: 'Invalid phone number format' }
  }

  try {
    const url = `${config.phoneServerUrl}/send-sms`
    const payload = {
      phone: recipientPhoneNumber,
      message: message
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `Phone server error: ${response.status} - ${errorText}`
      }
    }

    const result = await response.json()

    if (result.success) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`✅ SMS sent${component ? ` for ${component}` : ''}:`, message.substring(0, 50))
      }
      return { success: true }
    } else {
      return {
        success: false,
        error: result.error || 'Unknown error from phone server'
      }
    }
  } catch (error) {
    // Handle network errors gracefully
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Request timeout - phone server not responding' }
      }
      if (error.message.includes('Failed to fetch')) {
        return { success: false, error: 'Cannot reach phone server - check URL and network' }
      }
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Unknown error sending SMS' }
  }
}

/**
 * Send calibration success SMS
 */
export async function sendCalibrationSuccessSMS(
  component: string,
  accountId: string | null,
  details?: string
): Promise<SMSResult> {
  const timestamp = new Date().toLocaleString()
  const message = `✅ ${component} calibration completed successfully${details ? ` - ${details}` : ''}. Timestamp: ${timestamp}`
  return sendSMS(message, accountId, component)
}

/**
 * Send calibration failure SMS
 */
export async function sendCalibrationFailureSMS(
  component: string,
  accountId: string | null,
  errorMessage?: string
): Promise<SMSResult> {
  const timestamp = new Date().toLocaleString()
  const message = `❌ ${component} calibration failed${errorMessage ? `: ${errorMessage}` : ''}. Timestamp: ${timestamp}`
  return sendSMS(message, accountId, component)
}

/**
 * Send calibration start SMS (optional, can be noisy)
 */
export async function sendCalibrationStartSMS(
  component: string,
  accountId: string | null
): Promise<SMSResult> {
  const timestamp = new Date().toLocaleString()
  const message = `🔄 ${component} calibration started. Timestamp: ${timestamp}`
  return sendSMS(message, accountId, component)
}

/**
 * Test SMS connection
 */
export async function testSMSConnection(accountId: string | null): Promise<SMSResult> {
  const testMessage = 'Test SMS from Kiosk - If you receive this, SMS is working correctly!'
  return sendSMS(testMessage, accountId, 'TEST')
}

/**
 * Get current SMS configuration (for debugging/info)
 */
export function getSMSConfigInfo() {
  const config = getSMSConfig()
  return {
    phoneServerUrl: config.phoneServerUrl
  }
}

