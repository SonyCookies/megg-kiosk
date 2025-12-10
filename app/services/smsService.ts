// services/smsService.ts - SMS Service using TextBee.dev API
// Sends SMS notifications via TextBee.dev gateway

import userService from './userService'

export interface SMSResult {
  success: boolean
  error?: string
}

// ============================================
// SMS CONFIGURATION - EMBEDDED IN CODE
// ============================================
const SMS_CONFIG = {
  baseUrl: 'https://api.textbee.dev/api/v1',
  deviceId: '6938b5bf7394020462c61fa1',
  apiKey: '7b03c774-2def-4891-9cab-2a94b336c315'
}

/**
 * Get SMS configuration (embedded in code)
 */
function getSMSConfig() {
  return SMS_CONFIG
}

/**
 * Format phone number for TextBee API (remove + prefix and clean)
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters (including +)
  return phone.replace(/[^\d]/g, '')
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
 * Send SMS via TextBee.dev API
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

  // Validate configuration
  if (!config.baseUrl || !config.deviceId || !config.apiKey) {
    // Silently fail if not configured - don't show errors
    return { success: false, error: 'TextBee API not configured' }
  }

  // Get phone number from user data
  const recipientPhoneNumber = await getRecipientPhoneNumber(accountId)
  
  if (!recipientPhoneNumber) {
    // Silently fail if phone number not found - don't show errors
    return { success: false, error: 'Recipient phone number not found in user data' }
  }

  // Format phone number for TextBee API (remove + prefix and clean)
  const formattedPhone = formatPhoneNumber(recipientPhoneNumber)

  // Validate phone number format
  const phoneRegex = /^\d{8,15}$/ // Must have 8-15 digits
  if (!phoneRegex.test(formattedPhone)) {
    return { success: false, error: 'Invalid phone number format' }
  }

  try {
    const url = `${config.baseUrl}/gateway/devices/${config.deviceId}/send-sms`
    const payload = {
      recipients: [formattedPhone],
      message: message
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey
      },
      body: JSON.stringify(payload),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `TextBee API error: ${response.status} - ${errorText}`
      }
    }

    const result = await response.json()

    // TextBee API may return different response format, check for success
    // If the request was successful (status 200), consider it a success
    if (response.status === 200) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`✅ SMS sent${component ? ` for ${component}` : ''}:`, message.substring(0, 50))
      }
      return { success: true }
    } else {
      return {
        success: false,
        error: result.error || result.message || 'Unknown error from TextBee API'
      }
    }
  } catch (error) {
    // Handle network errors gracefully
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Request timeout - TextBee API not responding' }
      }
      if (error.message.includes('Failed to fetch')) {
        return { success: false, error: 'Cannot reach TextBee API - check URL and network' }
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
    baseUrl: config.baseUrl,
    deviceId: config.deviceId,
    apiKey: config.apiKey ? '***' + config.apiKey.slice(-4) : undefined // Mask API key for security
  }
}

