// services/calibrationManager.ts - Clean Calibration Status Management

import { useState, useEffect, useCallback } from 'react'
import calibrationService from './calibrationService'
import accountService from './accountService'

export interface CalibrationStatus {
  UNO: { status: 'unknown' | 'calibrated' | 'calibrating' | 'failed', lastCalibration: string | null }
  HX711: { status: 'unknown' | 'calibrated' | 'calibrating' | 'failed', lastCalibration: string | null }
  NEMA23: { status: 'unknown' | 'calibrated' | 'calibrating' | 'failed', lastCalibration: string | null }
  SG90: { status: 'unknown' | 'calibrated' | 'calibrating' | 'failed', lastCalibration: string | null }
  MG996R: { status: 'unknown' | 'calibrated' | 'calibrating' | 'failed', lastCalibration: string | null }
}

class CalibrationManager {
  private listeners: Set<(status: CalibrationStatus) => void> = new Set()
  private status: CalibrationStatus = {
    UNO: { status: 'unknown', lastCalibration: null },
    HX711: { status: 'unknown', lastCalibration: null },
    NEMA23: { status: 'unknown', lastCalibration: null },
    SG90: { status: 'unknown', lastCalibration: null },
    MG996R: { status: 'unknown', lastCalibration: null }
  }

  constructor() {
    this.initializeFromAccount()
  }

  // Subscribe to calibration status changes
  subscribe(listener: (status: CalibrationStatus) => void) {
    this.listeners.add(listener)
    listener(this.status)
    
    return () => {
      this.listeners.delete(listener)
    }
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.status))
  }

  // Update status
  private setStatus(newStatus: CalibrationStatus) {
    this.status = { ...newStatus }
    this.notifyListeners()
  }

  // Initialize calibration status from account
  private async initializeFromAccount() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      const accountId = accountService.getAccountId()
      if (accountId) {
        await this.loadFromFirebase(accountId)
      }
    }
  }

  // Load calibration status from Firebase
  async loadFromFirebase(accountId: string): Promise<void> {
    try {
      const calibrations = await calibrationService.getLatestCalibrations(accountId, 5)
      
      const newStatus = { ...this.status }
      
      calibrations.forEach(calibration => {
        if (calibration.component in newStatus) {
          // Map Firebase status to frontend status
          let frontendStatus: 'unknown' | 'calibrated' | 'calibrating' | 'failed'
          if (calibration.status === 'calibrated') {
            frontendStatus = 'calibrated'
          } else if (calibration.status === 'calibrating') {
            frontendStatus = 'calibrating'
          } else if (calibration.status === 'failed') {
            frontendStatus = 'failed'
          } else {
            frontendStatus = 'unknown'
          }
          
          newStatus[calibration.component as keyof CalibrationStatus] = {
            status: frontendStatus,
            lastCalibration: calibration.timestamp
          }
          
        }
      })
      
      this.setStatus(newStatus)
      
    } catch (error) {
      console.error('❌ Error loading calibration status from Firebase:', error)
    }
  }

  // Update calibration status (for real-time updates)
  updateStatus(component: string, status: 'unknown' | 'calibrated' | 'calibrating' | 'failed', timestamp?: string) {
    const newStatus = { ...this.status }
    const componentKey = component.toUpperCase() as keyof CalibrationStatus
    
    if (componentKey in newStatus) {
      const currentStatus = newStatus[componentKey]
      const newTimestamp = timestamp || (status !== 'calibrating' ? new Date().toISOString() : currentStatus.lastCalibration)
      
      // Only update if:
      // 1. We don't have existing data, OR
      // 2. The new status is not 'unknown' (real calibration data), OR
      // 3. The new timestamp is more recent than existing data
      const shouldUpdate = 
        !currentStatus.lastCalibration || 
        status !== 'unknown' || 
        (newTimestamp && currentStatus.lastCalibration && new Date(newTimestamp) > new Date(currentStatus.lastCalibration))
      
      if (shouldUpdate) {
        newStatus[componentKey] = {
          status,
          lastCalibration: newTimestamp
        }
        
        this.setStatus(newStatus)
      }
    }
  }

  // Save calibration result to Firebase
  async saveCalibrationResult(
    component: string,
    status: 'unknown' | 'calibrated' | 'calibrating' | 'failed',
    success: boolean,
    message: string
  ): Promise<boolean> {
    const accountId = accountService.getAccountId()
    
    if (!accountId) {
      console.error('No account ID available for saving calibration result')
      return false
    }

    try {
      const uid = await calibrationService.getUIDByAccountId(accountId)
      
      if (!uid) {
        console.error('No UID available for saving calibration result')
        return false
      }

      const result = await calibrationService.saveCalibrationResult(
        accountId,
        uid,
        component.toUpperCase(),
        status,
        success,
        message
      )

      if (result) {
        // Update local status, keep 'failed' visible
        this.updateStatus(component, status)
      }

      return result
    } catch (error) {
      console.error('Error saving calibration result:', error)
      return false
    }
  }

  // Get current status
  getStatus(): CalibrationStatus {
    return { ...this.status }
  }

  // Reset all statuses
  reset() {
    const resetStatus: CalibrationStatus = {
      UNO: { status: 'unknown', lastCalibration: null },
      HX711: { status: 'unknown', lastCalibration: null },
      NEMA23: { status: 'unknown', lastCalibration: null },
      SG90: { status: 'unknown', lastCalibration: null },
      MG996R: { status: 'unknown', lastCalibration: null }
    }
    this.setStatus(resetStatus)
  }
}

// Create singleton instance
const calibrationManager = new CalibrationManager()

// React hook for using calibration manager
export function useCalibrationStatus() {
  const [status, setStatus] = useState<CalibrationStatus>(calibrationManager.getStatus())

  useEffect(() => {
    const unsubscribe = calibrationManager.subscribe(setStatus)
    return unsubscribe
  }, [])

  const updateStatus = useCallback((component: string, status: 'unknown' | 'calibrated' | 'calibrating' | 'failed', timestamp?: string) => {
    calibrationManager.updateStatus(component, status, timestamp)
  }, [])

  const saveCalibrationResult = useCallback((
    component: string,
    status: 'unknown' | 'calibrated' | 'calibrating' | 'failed',
    success: boolean,
    message: string
  ) => {
    return calibrationManager.saveCalibrationResult(component, status, success, message)
  }, [])

  const loadFromFirebase = useCallback((accountId: string) => {
    return calibrationManager.loadFromFirebase(accountId)
  }, [])

  const reset = useCallback(() => {
    calibrationManager.reset()
  }, [])

  return {
    status,
    updateStatus,
    saveCalibrationResult,
    loadFromFirebase,
    reset
  }
}

export default calibrationManager
