import { useState, useCallback, useEffect, useRef } from 'react'

interface MotorStatus {
  status: string
  current_position: number
  current_weight: number
  mg996r_position: number
  sg90_position: number
  connected: boolean
  port?: string
  load_cell_ready?: boolean
  conveyor_moving?: boolean
  step_count?: number
  target_steps?: number
  direction?: string
  lastCheck?: Date
  consecutiveFailures?: number
  isOffline?: boolean
}

interface MotorControlHook {
  motorStatus: MotorStatus | null
  isLoading: boolean
  error: string | null
  startMotor: () => Promise<boolean>
  stopMotor: () => Promise<boolean>
  moveConveyor: () => Promise<boolean>
  measureWeight: () => Promise<number | null>
  sortEgg: (classification: number) => Promise<boolean>
  calibrateLoadCell: () => Promise<boolean>
  homeMotors: () => Promise<boolean>
  getStatus: () => Promise<void>
  processEgg: () => Promise<any>
  completeSorting: (classification: number) => Promise<boolean>
}

const IOT_BACKEND_URL = process.env.NEXT_PUBLIC_IOT_BACKEND_URL || 'http://localhost:8001'

export function useMotorControl(): MotorControlHook {
  const [motorStatus, setMotorStatus] = useState<MotorStatus | null>(() => {
    // Try to restore from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('motorStatus')
        if (saved) {
          const parsed = JSON.parse(saved)
          return { ...parsed, lastCheck: undefined }
        }
      } catch (e) {
        console.warn('Failed to restore motor status:', e)
      }
    }
    return null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Retry logic with exponential backoff
  const checkWithRetry = useCallback(async (url: string, maxRetries = 3): Promise<Response> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout for IoT
        
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        return response
      } catch (error: any) {
        if (i === maxRetries - 1) throw error
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = 1000 * Math.pow(2, i)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    throw new Error('Max retries exceeded')
  }, [])

  const makeRequest = useCallback(async (
    endpoint: string, 
    method: 'GET' | 'POST' = 'GET',
    body?: any,
    useRetry: boolean = false
  ) => {
    try {
      setIsLoading(true)
      setError(null)

      // Check if browser is offline
      const isOffline = !navigator.onLine
      if (isOffline) {
        throw new Error('Browser is offline')
      }

      const url = `${IOT_BACKEND_URL}${endpoint}`
      const response = useRetry ? 
        await checkWithRetry(url) :
        await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Motor control error:', errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [checkWithRetry])

  const startMotor = useCallback(async (): Promise<boolean> => {
    try {
      const result = await makeRequest('/motor/start', 'POST')
      if (result.status === 'success') {
        await getStatus() // Refresh status
        return true
      }
      return false
    } catch (err) {
      return false
    }
  }, [makeRequest])

  const stopMotor = useCallback(async (): Promise<boolean> => {
    try {
      const result = await makeRequest('/motor/stop', 'POST')
      if (result.status === 'success') {
        await getStatus() // Refresh status
        return true
      }
      return false
    } catch (err) {
      return false
    }
  }, [makeRequest])

  const moveConveyor = useCallback(async (): Promise<boolean> => {
    try {
      const result = await makeRequest('/motor/move', 'POST')
      if (result.status === 'success') {
        await getStatus() // Refresh status
        return true
      }
      return false
    } catch (err) {
      return false
    }
  }, [makeRequest])

  const measureWeight = useCallback(async (): Promise<number | null> => {
    try {
      const result = await makeRequest('/motor/weigh', 'POST')
      if (result.status === 'success') {
        return result.weight
      }
      return null
    } catch (err) {
      return null
    }
  }, [makeRequest])

  const sortEgg = useCallback(async (classification: number): Promise<boolean> => {
    try {
      const result = await makeRequest(`/motor/sort/${classification}`, 'POST')
      if (result.status === 'success') {
        await getStatus() // Refresh status
        return true
      }
      return false
    } catch (err) {
      return false
    }
  }, [makeRequest])

  const calibrateLoadCell = useCallback(async (): Promise<boolean> => {
    try {
      const result = await makeRequest('/motor/calibrate', 'POST')
      if (result.status === 'success') {
        return true
      }
      return false
    } catch (err) {
      return false
    }
  }, [makeRequest])

  const homeMotors = useCallback(async (): Promise<boolean> => {
    try {
      const result = await makeRequest('/motor/home', 'POST')
      if (result.status === 'success') {
        await getStatus() // Refresh status
        return true
      }
      return false
    } catch (err) {
      return false
    }
  }, [makeRequest])

  const getStatus = useCallback(async (): Promise<void> => {
    try {
      const result = await makeRequest('/motor/status', 'GET', undefined, true)
      const statusWithMetadata = {
        ...result,
        lastCheck: new Date(),
        consecutiveFailures: 0,
        isOffline: false,
      }
      setMotorStatus(statusWithMetadata)
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('motorStatus', JSON.stringify(statusWithMetadata))
        } catch (e) {
          console.warn('Failed to save motor status:', e)
        }
      }
    } catch (err) {
      // Update failure count
      setMotorStatus(prev => {
        const newStatus = {
          ...prev,
          connected: false,
          lastCheck: new Date(),
          consecutiveFailures: (prev?.consecutiveFailures || 0) + 1,
          isOffline: !navigator.onLine,
        }
        
        // Save failure state to localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('motorStatus', JSON.stringify(newStatus))
          } catch (e) {
            console.warn('Failed to save motor status:', e)
          }
        }
        
        return newStatus
      })
      console.warn('Failed to get motor status:', err)
    }
  }, [makeRequest])

  // Adaptive polling: faster when disconnected, slower when connected
  const getPollInterval = useCallback(() => {
    if (!navigator.onLine) return 30000 // 30 seconds when offline
    if (!motorStatus?.connected) return 3000 // 3 seconds when disconnected
    return 10000 // 10 seconds when connected
  }, [motorStatus?.connected])

  // Start polling with adaptive intervals
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
    }
    
    const poll = () => {
      getStatus()
      const nextInterval = getPollInterval()
      intervalRef.current = setTimeout(poll, nextInterval)
    }
    
    poll()
  }, [getStatus, getPollInterval])

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setMotorStatus(prev => prev ? { ...prev, isOffline: false } : null)
      startPolling()
    }
    
    const handleOffline = () => {
      setMotorStatus(prev => prev ? { 
        ...prev, 
        isOffline: true, 
        connected: false 
      } : null)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [startPolling])

  // Start polling on mount
  useEffect(() => {
    getStatus() // Initial status check
    startPolling()
    
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
      }
    }
  }, [getStatus, startPolling])

  const processEgg = useCallback(async (): Promise<any> => {
    try {
      const result = await makeRequest('/motor/process-egg', 'POST')
      return result
    } catch (err) {
      throw err
    }
  }, [makeRequest])

  const completeSorting = useCallback(async (classification: number): Promise<boolean> => {
    try {
      const result = await makeRequest(`/motor/complete-sorting/${classification}`, 'POST')
      if (result.status === 'success') {
        await getStatus() // Refresh status
        return true
      }
      return false
    } catch (err) {
      return false
    }
  }, [makeRequest])

  return {
    motorStatus,
    isLoading,
    error,
    startMotor,
    stopMotor,
    moveConveyor,
    measureWeight,
    sortEgg,
    calibrateLoadCell,
    homeMotors,
    getStatus,
    processEgg,
    completeSorting,
  }
}
