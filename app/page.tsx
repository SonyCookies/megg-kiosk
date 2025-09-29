// app/page.tsx
"use client"

import React, { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { 
  Camera, 
  User,
  Package,
  Settings,
  Target
} from "lucide-react"

import { useInternetConnection, useWebSocket } from "./contexts/NetworkContext"
import { db } from './libs/firebaseConfig'
import { collection, query, where, getDocs } from 'firebase/firestore'
import iotService from './services/iotService'
import calibrationService from './services/calibrationService'
import { useAccount } from './services/accountService'
import { useCalibrationStatus } from './services/calibrationManager'
import batchService from './services/batchService'
import { 
  getConfigurationWithFallback, 
  saveConfigurationWithFallback, 
  deleteUserConfiguration,
  EggSizeRanges,
  validateRanges,
  getNextRangeType,
  RangeValidation
} from './utils/configurationService'

// Import tab components
import CameraTab from "./components/CameraTab"
import BatchTab from "./components/BatchTab"
import ConfigurationTab from "./components/ConfigurationTab"
import CalibrationTab from "./components/CalibrationTab"
import AccountTab from "./components/AccountTab"

// Import modal components
import PinModal from "./components/PinModal"
import RangeModal from "./components/RangeModal"
import BatchModal from "./components/BatchModal"
import Toaster from "./components/Toaster"

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<'camera' | 'configuration' | 'account' | 'batch' | 'calibration'>('camera')
  const [isProcessing, setIsProcessing] = useState(false)
  const [systemPhase, setSystemPhase] = useState<'idle' | 'getting_ready' | 'load_eggs' | 'ready_to_process' | 'processing'>('idle')
  const [processingStats, setProcessingStats] = useState({
    totalProcessed: 0,
    goodEggs: 0,
    badEggs: 0,
    smallEggs: 0,
    mediumEggs: 0,
    largeEggs: 0
  })

  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Account management using clean service
  const {
    accountId: currentAccountId,
    userData,
    isLoading: isLoadingUser,
    error: accountError,
    loadAccount,
    clearAccount,
    ensureUID
  } = useAccount()

  // Calibration status management using clean service
  const {
    status: calibrationStatus,
    updateStatus: updateCalibrationStatus,
    saveCalibrationResult: saveCalibrationToFirebase,
    loadFromFirebase: loadCalibrationFromFirebase
  } = useCalibrationStatus()

  // UI states
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')

  // Configuration states
  const [showRangeModal, setShowRangeModal] = useState(false)
  const [editingRange, setEditingRange] = useState<'small' | 'medium' | 'large' | null>(null)
  const [minInput, setMinInput] = useState('')
  const [maxInput, setMaxInput] = useState('')
  const [rangeError, setRangeError] = useState('')
  const [eggRanges, setEggRanges] = useState<EggSizeRanges>({
    small: { min: 35, max: 42 },
    medium: { min: 43, max: 50 },
    large: { min: 51, max: 58 }
  })
  const [configSource, setConfigSource] = useState<'user' | 'global' | 'local'>('local')
  const [isCustomized, setIsCustomized] = useState(false)
  const [isLoadingConfig, setIsLoadingConfig] = useState(false)
  const [rangeValidation, setRangeValidation] = useState<RangeValidation | null>(null)
  const [showGapWarning, setShowGapWarning] = useState(false)
  const [currentInputField, setCurrentInputField] = useState<'min' | 'max'>('min')
  const [isSavingRange, setIsSavingRange] = useState(false)

  // Batch states
  const [currentBatch, setCurrentBatch] = useState<any>(null)
  const [batchStatus, setBatchStatus] = useState<'idle' | 'ready' | 'processing' | 'completed'>('idle')
  const [batchStats, setBatchStats] = useState({
    totalEggs: 0,
    smallEggs: 0,
    mediumEggs: 0,
    largeEggs: 0,
    goodEggs: 0,
    dirtyEggs: 0,
    badEggs: 0
  })
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false)
  const [batchIdInput, setBatchIdInput] = useState('')
  const [batchIdError, setBatchIdError] = useState('')
  const [existingBatch, setExistingBatch] = useState<any>(null)
  const [isCheckingBatch, setIsCheckingBatch] = useState(false)
  const [activeStatsView, setActiveStatsView] = useState<'overview' | 'size' | 'quality'>('overview')

  // Calibration states
  const [isCalibratingUno, setIsCalibratingUno] = useState(false)
  const [isCalibratingHX711, setIsCalibratingHX711] = useState(false)
  const [isCalibratingNema23, setIsCalibratingNema23] = useState(false)
  const [isCalibratingSG90, setIsCalibratingSG90] = useState(false)
  const [isCalibratingMG996R, setIsCalibratingMG996R] = useState(false)
  const [toaster, setToaster] = useState<{
    show: boolean
    type: 'success' | 'error' | 'info'
    message: string
  }>({ show: false, type: 'info', message: '' })

  // IoT connection state
  const [iotConnected, setIotConnected] = useState(false)

  // Load calibration data when account changes
  useEffect(() => {
    if (currentAccountId) {
      loadCalibrationFromFirebase(currentAccountId)
    }
  }, [currentAccountId, loadCalibrationFromFirebase])


  // Load batches when account ID changes
  const loadBatches = async (accountId: string) => {
    if (!accountId) return
    
    try {
      const batches = await batchService.getBatchesForAccount(accountId, 5)
      // You can use this to show recent batches or set a default batch
      if (batches.length > 0) {
        // Optionally set the most recent batch as current
        // setCurrentBatch(batches[0])
      }
    } catch (error) {
      console.error('Error loading batches:', error)
    }
  }

  // Load batches when account ID changes
  useEffect(() => {
    if (currentAccountId) {
      loadBatches(currentAccountId)
    }
  }, [currentAccountId])

  // Set initial tab based on account status
  useEffect(() => {
    if (currentAccountId && userData) {
      setActiveTab('camera')
    } else if (!isLoadingUser) {
      setActiveTab('account')
    }
  }, [currentAccountId, userData, isLoadingUser])

  // Network status
  const isOnline = useInternetConnection()
  const { readyState } = useWebSocket()
  const isWebSocketConnected = readyState === WebSocket.OPEN

  // Entrance fade-in animation
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // This effect is handled by the more comprehensive loadAccountFromStorage effect above

  // IoT connection management
  useEffect(() => {
    const connectIoT = async () => {
      try {
        await iotService.connect()
        setIotConnected(true)
        
             // Get initial system status after a delay to ensure connection is stable
             setTimeout(async () => {
               try {
                 const status = await iotService.getSystemStatus()
                 
                 // DISABLED: IoT system status update overwrites Firebase data
                 // We get real calibration data from Firebase, not from IoT system status
                 // updateCalibrationStatus calls removed to prevent overwriting Firebase data
               } catch (error) {
                 console.error('Failed to get initial system status:', error)
               }
             }, 2000)
      } catch (error) {
        console.error('Failed to connect to IoT backend:', error)
        setIotConnected(false)
      }
    }

    // Event handlers
    const handleConnected = () => {
      setIotConnected(true)
    }

    const handleDisconnected = () => {
      setIotConnected(false)
    }

    const handleCalibrationResult = async (data: any) => {
      
      // Update calibration status in real-time
      if (data.component && data.status) {
        const component = data.component.toUpperCase()
        let frontendStatus: 'unknown' | 'calibrated' | 'calibrating'
        
        if (data.status === 'completed') {
          frontendStatus = 'calibrated'
        } else if (data.status === 'started') {
          frontendStatus = 'calibrating'
        } else {
          frontendStatus = 'unknown' // For 'failed' or any other status
        }
        
        const timestamp = (data.status === 'completed' || data.status === 'failed') ? 
                         new Date().toISOString() : undefined
        
        updateCalibrationStatus(component, frontendStatus, timestamp)
      }
      
      // Save to Firebase if we have an account
      if (currentAccountId) {
        try {
          const component = data.component.toUpperCase()
          const status = data.status === 'completed' ? 'calibrated' : 
                        data.status === 'started' ? 'calibrating' : 'unknown'
          
          await saveCalibrationToFirebase(
            component,
            status,
            data.success || false,
            data.message || `${component} calibration ${data.success ? 'completed' : 'failed'}`
          )
          
          // Ensure UID exists
          await ensureUID()
          
        } catch (error) {
          console.error('Failed to save calibration result to Firebase:', error)
          showToaster('error', 'Failed to save calibration result to Firebase.')
        }
      } else {
        showToaster('info', 'Calibration completed! Enter your Account ID to save results to Firebase.')
      }
      
      // Show user feedback
      if (data.status === 'completed') {
        if (data.success) {
          showToaster('success', data.message || `${data.component} calibration completed successfully`)
        } else {
          showToaster('error', data.message || `${data.component} calibration failed`)
        }
        resetCalibrationState(data.component)
      } else if (data.status === 'failed' || !data.success) {
        showToaster('error', data.message || `${data.component} calibration failed: ${data.error || 'Unknown error'}`)
        resetCalibrationState(data.component)
      } else if (data.status === 'started') {
      }
    }

    // Connect to IoT backend
    connectIoT()

    // Set up event listeners
    iotService.on('connected', handleConnected)
    iotService.on('disconnected', handleDisconnected)
    iotService.on('calibrationResult', handleCalibrationResult)

    return () => {
      // Cleanup event listeners
      iotService.off('connected', handleConnected)
      iotService.off('disconnected', handleDisconnected)
      iotService.off('calibrationResult', handleCalibrationResult)
      iotService.disconnect()
    }
  }, [])

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Account functions
  const handleInputId = () => {
    setShowPinModal(true)
    setPinInput('')
    setPinError('')
    
    // Auto-focus on the first number button after modal opens
    setTimeout(() => {
      const firstButton = document.querySelector('[data-number="1"]') as HTMLButtonElement
      if (firstButton) {
        firstButton.focus()
      }
    }, 100)
  }

  // Account functions using clean service
  const handlePinSubmit = async () => {
    if (pinInput.length !== 6) {
      setPinError('PIN must be 6 digits')
      return
    }
    
    const accountId = `MEGG-${pinInput}`
    const success = await loadAccount(accountId)
    
    if (success) {
      setShowPinModal(false)
      setPinInput('')
      setPinError('')
    } else {
      setPinError('Account ID not found. Please check your ID and try again.')
    }
  }

  const loadConfiguration = async (accountId: string) => {
    try {
      setIsLoadingConfig(true)
      const config = await getConfigurationWithFallback(accountId)
      setEggRanges(config.ranges)
      setConfigSource(config.source)
      setIsCustomized(config.isCustomized)
      
      // Validate ranges for gaps and overlaps
      const validation = validateRanges(config.ranges)
      setRangeValidation(validation)
      setShowGapWarning(validation.hasGaps)
    } catch (error) {
      console.error('Error loading configuration:', error)
    } finally {
      setIsLoadingConfig(false)
    }
  }


  const handlePinChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6)
    setPinInput(digitsOnly)
    setPinError('')
  }

  const clearAccountId = () => {
    clearAccount()
    // Navigate to account tab when account is cleared
    setActiveTab('account')
  }

  // Configuration functions
  const handleRangeEdit = (rangeType: 'small' | 'medium' | 'large') => {
    setEditingRange(rangeType)
    setCurrentInputField('min') // Start with min input
    
    // Check if we should auto-fill based on previous range
    const currentRange = eggRanges[rangeType]
    const nextRangeType = getNextRangeType(rangeType)
    
    if (nextRangeType && rangeType !== 'small') {
      // Auto-fill min with max of previous range + 0.01
      const previousRangeType = rangeType === 'medium' ? 'small' : 'medium'
      const previousRange = eggRanges[previousRangeType]
      const suggestedMin = Math.round((previousRange.max + 0.01) * 100) / 100
      
      setMinInput(suggestedMin.toString())
      setMaxInput(currentRange.max.toString())
    } else {
      setMinInput(currentRange.min.toString())
      setMaxInput(currentRange.max.toString())
    }
    
    setRangeError('')
    setShowRangeModal(true)
  }

  const handleRangeSubmit = async () => {
    if (minInput.length === 0 || maxInput.length === 0) {
      setRangeError('Please enter both minimum and maximum values')
      return
    }
    
    const min = parseFloat(minInput)
    const max = parseFloat(maxInput)

    if (isNaN(min) || isNaN(max)) {
      setRangeError('Please enter valid numbers')
      return
    }
    
    if (min >= max) {
      setRangeError('Minimum must be less than maximum')
      return
    }
    
    setIsSavingRange(true)
    setRangeError('')

    try {
      if (editingRange && currentAccountId) {
        const updatedRanges = {
          ...eggRanges,
          [editingRange]: { min, max }
        }
        
        // Validate the updated ranges
        const validation = validateRanges(updatedRanges)
        setRangeValidation(validation)
        
        setEggRanges(updatedRanges)
        setIsCustomized(true)
        setConfigSource('user')
        
        // Save to Firebase with fallback to localStorage
        await saveConfigurationWithFallback(currentAccountId, updatedRanges)
        
        // Show gap warning if there are gaps
        if (validation.hasGaps) {
          setShowGapWarning(true)
        }
      }

      setShowRangeModal(false)
      setEditingRange(null)
      setMinInput('')
      setMaxInput('')
    } catch (error) {
      console.error('Error saving range:', error)
      setRangeError('Failed to save configuration. Please try again.')
    } finally {
      setIsSavingRange(false)
    }
  }

  const handleMinChange = (value: string) => {
    // Allow digits and one decimal point, limit to 5 characters (e.g., "99.99")
    const decimalOnly = value.replace(/[^\d.]/g, '')
    const parts = decimalOnly.split('.')
    let finalValue = decimalOnly
    
    if (parts.length > 2) {
      // Only allow one decimal point
      finalValue = parts[0] + '.' + parts.slice(1).join('')
    } else if (parts[1] && parts[1].length > 2) {
      // Limit decimal places to 2
      finalValue = parts[0] + '.' + parts[1].slice(0, 2)
    } else if (decimalOnly.length <= 5) {
      finalValue = decimalOnly
    }
    
    setMinInput(finalValue)
    setRangeError('')
    
    // Auto-switch to max input if min is complete (has decimal and 2 decimal places)
    if (finalValue.includes('.') && finalValue.split('.')[1].length === 2 && currentInputField === 'min') {
      setCurrentInputField('max')
    }
  }

  const handleMaxChange = (value: string) => {
    // Allow digits and one decimal point, limit to 5 characters (e.g., "99.99")
    const decimalOnly = value.replace(/[^\d.]/g, '')
    const parts = decimalOnly.split('.')
    let finalValue = decimalOnly
    
    if (parts.length > 2) {
      // Only allow one decimal point
      finalValue = parts[0] + '.' + parts.slice(1).join('')
    } else if (parts[1] && parts[1].length > 2) {
      // Limit decimal places to 2
      finalValue = parts[0] + '.' + parts[1].slice(0, 2)
    } else if (decimalOnly.length <= 5) {
      finalValue = decimalOnly
    }
    
    setMaxInput(finalValue)
    setRangeError('')
  }

  const resetToDefaults = async () => {
    if (currentAccountId) {
      try {
        setIsLoadingConfig(true)
        // Delete user configuration to reset to defaults
        await deleteUserConfiguration(currentAccountId)
        
        // Reload configuration (will fetch global defaults)
        await loadConfiguration(currentAccountId)
        
      } catch (error) {
        console.error('Error resetting to defaults:', error)
      } finally {
        setIsLoadingConfig(false)
      }
    }
  }

  // Batch functions
  const handleBatchIdChange = (value: string) => {
    // Only allow digits and limit to 4 characters
    const digitsOnly = value.replace(/\D/g, '').slice(0, 4)
    setBatchIdInput(digitsOnly)
    setBatchIdError('')
    setExistingBatch(null) // Reset existing batch when input changes
    
    // Auto-check when 4 digits are entered and account ID exists
    if (digitsOnly.length === 4 && currentAccountId) {
      const accountDigits = currentAccountId.replace('MEGG-', '')
      const batchId = `B-${accountDigits}-${digitsOnly}`
      checkBatchExists(batchId)
    } else if (digitsOnly.length === 4 && !currentAccountId) {
      setBatchIdError('Account ID required to check batch')
    }
  }

  const checkBatchExists = async (batchId: string) => {
    if (!currentAccountId) {
      setBatchIdError('Account ID required to check batch')
      return null
    }
    
    try {
      setIsCheckingBatch(true)
      const foundBatch = await batchService.getBatch(batchId)
      
      if (foundBatch) {
        setExistingBatch(foundBatch)
        return foundBatch
      } else {
        setExistingBatch(null)
        return null
      }
    } catch (error) {
      console.error('Error checking batch existence:', error)
      setExistingBatch(null)
      return null
    } finally {
      setIsCheckingBatch(false)
    }
  }

  const proceedWithBatch = async () => {
    if (!currentAccountId) {
      setBatchIdError('No account ID found. Please log in first.')
      setShowCreateBatchModal(false)
      setActiveTab('account')
      return
    }
    
    if (batchIdInput.length !== 4) {
      setBatchIdError('Batch ID must be 4 digits')
      return
    }
    
    // Extract account ID digits (remove MEGG- prefix)
    const accountDigits = currentAccountId.replace('MEGG-', '')
    const batchId = `B-${accountDigits}-${batchIdInput}`
    
    // Check if batch exists
    const existingBatchData = await checkBatchExists(batchId)
    
    if (existingBatchData) {
      // Load existing batch
      setCurrentBatch(existingBatchData)
      setBatchStatus(existingBatchData.status || 'ready')
      setBatchStats(existingBatchData.stats || {
        totalEggs: 0,
        smallEggs: 0,
        mediumEggs: 0,
        largeEggs: 0,
        goodEggs: 0,
        dirtyEggs: 0,
        badEggs: 0
      })
    } else {
      // Get UID for the batch
      const uid = await calibrationService.getUIDByAccountId(currentAccountId)
      if (!uid) {
        setBatchIdError('Unable to get user UID. Please check account setup.')
        return
      }
      
      // Create new batch in Firebase
      const newBatch = await batchService.createBatch(
        batchId,
        currentAccountId,
        uid,
        `Batch ${batchId}`
      )
      
      if (newBatch) {
        setCurrentBatch(newBatch)
        setBatchStatus('ready')
        setBatchStats(newBatch.stats)
      } else {
        setBatchIdError('Failed to create batch. Please try again.')
        return
      }
    }
    
    setShowCreateBatchModal(false)
    setBatchIdInput('')
    setBatchIdError('')
    setExistingBatch(null)
  }

  const startBatchProcessing = async () => {
    if (currentBatch) {
      setBatchStatus('processing')
      await batchService.updateBatchStatus(currentBatch.id, 'processing')
    }
  }

  const stopBatchProcessing = async () => {
    if (currentBatch) {
      setBatchStatus('completed')
      await batchService.updateBatchStatus(currentBatch.id, 'completed')
    }
  }

  const completeBatch = async () => {
    if (currentBatch) {
      setBatchStatus('completed')
      await batchService.updateBatchStatus(currentBatch.id, 'completed')
    }
  }

  const resetBatch = () => {
    setCurrentBatch(null)
    setBatchStatus('idle')
    setBatchStats({
      totalEggs: 0,
      smallEggs: 0,
      mediumEggs: 0,
      largeEggs: 0,
      goodEggs: 0,
      dirtyEggs: 0,
      badEggs: 0
    })
    setActiveStatsView('overview')
  }

  // Update batch stats when eggs are processed
  const updateBatchStats = async (newStats: typeof batchStats) => {
    if (!currentBatch) return
    
    try {
      // Update local state
      setBatchStats(newStats)
      
      // Update Firebase
      await batchService.updateBatchStats(currentBatch.id, newStats)
    } catch (error) {
      console.error('❌ Error updating batch stats:', error)
    }
  }

  // Add egg to batch (call this when an egg is processed)
  const addEggToBatch = async (eggData: {
    size: 'small' | 'medium' | 'large'
    quality: 'good' | 'dirty' | 'bad'
  }) => {
    if (!currentBatch) return
    
    const newStats = {
      ...batchStats,
      totalEggs: batchStats.totalEggs + 1,
      [`${eggData.size}Eggs`]: batchStats[`${eggData.size}Eggs`] + 1,
      [`${eggData.quality}Eggs`]: batchStats[`${eggData.quality}Eggs`] + 1
    }
    
    await updateBatchStats(newStats)
  }

  const toggleStatsView = (view: 'size' | 'quality') => {
    if (activeStatsView === view) {
      setActiveStatsView('overview')
    } else {
      setActiveStatsView(view)
    }
  }

  const showToaster = (type: 'success' | 'error' | 'info', message: string) => {
    setToaster({ show: true, type, message })
    setTimeout(() => {
      setToaster({ show: false, type: 'info', message: '' })
    }, 4000)
  }

  const resetCalibrationState = (component: string) => {
    switch (component) {
      case 'UNO':
        setIsCalibratingUno(false)
        break
      case 'HX711':
        setIsCalibratingHX711(false)
        break
      case 'NEMA23':
        setIsCalibratingNema23(false)
        break
      case 'SG90':
        setIsCalibratingSG90(false)
        break
      case 'MG996R':
        setIsCalibratingMG996R(false)
        break
      default:
    }
  }

  // Calibration functions - Real hardware calibration
  const handleUnoCalibration = async () => {
    setIsCalibratingUno(true)
    
    // Check if IoT backend is connected
    if (!iotService.isConnected()) {
      setIsCalibratingUno(false)
      showToaster('error', 'IoT Backend not connected. Please check connection and try again.')
      return
    }
    
    // Send calibration request to IoT backend
    try {
      const result = await iotService.calibrateComponent('UNO')
      
      if (!result.success) {
        setIsCalibratingUno(false)
        showToaster('error', `UNO Calibration failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('UNO calibration error:', error)
      setIsCalibratingUno(false)
      showToaster('error', `UNO Calibration failed: ${error instanceof Error ? error.message : 'Connection timeout or server error'}`)
    }
  }

  const handleHX711Calibration = async () => {
    setIsCalibratingHX711(true)
    
    // Check if IoT backend is connected
    if (!iotService.isConnected()) {
      setIsCalibratingHX711(false)
      showToaster('error', 'IoT Backend not connected. Please check connection and try again.')
      return
    }
    
    // Send calibration request to IoT backend
    try {
      const result = await iotService.calibrateComponent('HX711')
      
      if (!result.success) {
        setIsCalibratingHX711(false)
        showToaster('error', `HX711 Calibration failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('HX711 calibration error:', error)
      setIsCalibratingHX711(false)
      showToaster('error', `HX711 Calibration failed: ${error instanceof Error ? error.message : 'Connection timeout or server error'}`)
    }
  }

  const handleNema23Calibration = async () => {
    setIsCalibratingNema23(true)
    
    // Check if IoT backend is connected
    if (!iotService.isConnected()) {
      setIsCalibratingNema23(false)
      showToaster('error', 'IoT Backend not connected. Please check connection and try again.')
      return
    }
    
    // Send calibration request to IoT backend
    try {
      const result = await iotService.calibrateComponent('NEMA23')
      
      if (!result.success) {
        setIsCalibratingNema23(false)
        showToaster('error', `NEMA23 Calibration failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('NEMA23 calibration error:', error)
      setIsCalibratingNema23(false)
      showToaster('error', `NEMA23 Calibration failed: ${error instanceof Error ? error.message : 'Connection timeout or server error'}`)
    }
  }

  const handleSG90Calibration = async () => {
    setIsCalibratingSG90(true)
    
    // Check if IoT backend is connected
    if (!iotService.isConnected()) {
      setIsCalibratingSG90(false)
      showToaster('error', 'IoT Backend not connected. Please check connection and try again.')
      return
    }
    
    // Send calibration request to IoT backend
    try {
      const result = await iotService.calibrateComponent('SG90')
      
      if (!result.success) {
        setIsCalibratingSG90(false)
        showToaster('error', `SG90 Calibration failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('SG90 calibration error:', error)
      setIsCalibratingSG90(false)
      showToaster('error', `SG90 Calibration failed: ${error instanceof Error ? error.message : 'Connection timeout or server error'}`)
    }
  }

  const handleMG996RCalibration = async () => {
    setIsCalibratingMG996R(true)
    
    // Check if IoT backend is connected
    if (!iotService.isConnected()) {
      setIsCalibratingMG996R(false)
      showToaster('error', 'IoT Backend not connected. Please check connection and try again.')
      return
    }
    
    // Send calibration request to IoT backend
    try {
      const result = await iotService.calibrateComponent('MG996R')
      
      if (!result.success) {
        setIsCalibratingMG996R(false)
        showToaster('error', `MG996R Calibration failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('MG996R calibration error:', error)
      setIsCalibratingMG996R(false)
      showToaster('error', `MG996R Calibration failed: ${error instanceof Error ? error.message : 'Connection timeout or server error'}`)
    }
  }

  // Handle keyboard input for number pad
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (showPinModal) {
      const key = event.key
      if (key >= '1' && key <= '9' && pinInput.length < 6) {
        handlePinChange(pinInput + key)
      } else if (key === 'Backspace' && pinInput.length > 0) {
        handlePinChange(pinInput.slice(0, -1))
      } else if (key === 'Enter' && pinInput.length === 6) {
        handlePinSubmit()
      } else if (key === 'Escape') {
        setShowPinModal(false)
      }
    } else if (showCreateBatchModal) {
      const key = event.key
      if (key >= '0' && key <= '9' && batchIdInput.length < 4) {
        handleBatchIdChange(batchIdInput + key)
      } else if (key === 'Backspace' && batchIdInput.length > 0) {
        handleBatchIdChange(batchIdInput.slice(0, -1))
      } else if (key === 'Enter' && batchIdInput.length === 4) {
        proceedWithBatch()
      } else if (key === 'Escape') {
        setShowCreateBatchModal(false)
      }
    }
  }

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 overflow-hidden">
      {/* Header - Fixed height for 5" landscape display */}
      <div className={`transition-all duration-1000 ${
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      } ${isFullscreen ? 'h-8' : 'h-12'}`}>
        {/* Top Navigation Bar - Professional design */}
        <div className={`bg-slate-800/90 backdrop-blur-md border-b border-blue-500/30 px-3 ${isFullscreen ? 'py-1 h-8' : 'py-2 h-12'}`}>
          <div className="flex items-center justify-between">
            {/* Logo and Title - Professional */}
            <div className="flex items-center gap-3">
                      <Image
                src="/Logos/logowhite.png"
                        alt="MEGG Logo"
                width={isFullscreen ? 20 : 32}
                height={isFullscreen ? 20 : 32}
                  className="object-contain"
                />
              <div>
                <h1 className={`font-bold text-white tracking-wide ${isFullscreen ? 'text-sm' : 'text-lg'}`}>MEGG</h1>
                  </div>
                </div>

            {/* Minimal Status Indicators */}
            <div className={`flex items-center ${isFullscreen ? 'gap-2' : 'gap-3'}`}>
              {/* Account ID Status */}
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${currentAccountId ? "bg-blue-400" : "bg-red-400"}`} />
                <span className={`font-medium text-slate-300 ${isFullscreen ? 'text-xs' : 'text-xs'}`}>
                  {currentAccountId ? currentAccountId : "NO ACCOUNT"}
                </span>
              </div>
              
              {/* Network Status */}
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-400" : "bg-red-400"}`} />
                <span className={`font-medium text-slate-300 ${isFullscreen ? 'text-xs' : 'text-xs'}`}>NET</span>
              </div>

              {/* IoT Status */}
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${iotConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
                <span className={`font-medium text-slate-300 ${isFullscreen ? 'text-xs' : 'text-xs'}`}>IOT</span>
              </div>
            </div>
              </div>
            </div>

        {/* Tab Navigation - Professional design */}
        <div className={`bg-slate-700/50 backdrop-blur-sm border-b border-slate-600/50 px-3 h-16 ${isFullscreen ? 'hidden' : ''}`}>
          <div className="flex space-x-1 h-full">
            {([
              { id: 'camera' as const, label: 'Camera', icon: Camera },
              { id: 'batch' as const, label: 'Batch', icon: Package },
              { id: 'configuration' as const, label: 'Configuration', icon: Settings },
              { id: 'calibration' as const, label: 'Calibration', icon: Target },
              { id: 'account' as const, label: 'Account', icon: User }
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'camera' | 'batch' | 'configuration' | 'calibration' | 'account')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg border-b-2 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content - Fixed height for 5" landscape display */}
      <div className={`h-[calc(100vh-5.5rem)] overflow-hidden ${isFullscreen ? 'mt-0 h-[calc(100vh-2rem)]' : 'mt-16'}`}>
        {activeTab === 'camera' && (
          <CameraTab 
            isOnline={isOnline}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        )}

        {activeTab === 'batch' && (
          <BatchTab
            currentAccountId={currentAccountId}
            currentBatch={currentBatch}
            batchStatus={batchStatus}
            batchStats={batchStats}
            activeStatsView={activeStatsView}
            onSetActiveTab={(tab: string) => setActiveTab(tab as 'camera' | 'batch' | 'configuration' | 'calibration' | 'account')}
            onShowCreateBatchModal={() => setShowCreateBatchModal(true)}
            onResetBatch={resetBatch}
            onToggleStatsView={toggleStatsView}
          />
        )}

        {activeTab === 'configuration' && (
          <ConfigurationTab
            eggRanges={eggRanges}
            configSource={configSource}
            isLoadingConfig={isLoadingConfig}
            showGapWarning={showGapWarning}
            rangeValidation={rangeValidation}
            isCustomized={isCustomized}
            onHandleRangeEdit={handleRangeEdit}
            onResetToDefaults={resetToDefaults}
            onSetShowGapWarning={setShowGapWarning}
          />
        )}

               {activeTab === 'calibration' && (
        <CalibrationTab
          isCalibratingUno={isCalibratingUno}
          isCalibratingHX711={isCalibratingHX711}
          isCalibratingNema23={isCalibratingNema23}
          isCalibratingSG90={isCalibratingSG90}
          isCalibratingMG996R={isCalibratingMG996R}
          onHandleUnoCalibration={handleUnoCalibration}
          onHandleHX711Calibration={handleHX711Calibration}
          onHandleNema23Calibration={handleNema23Calibration}
          onHandleSG90Calibration={handleSG90Calibration}
          onHandleMG996RCalibration={handleMG996RCalibration}
          showToaster={showToaster}
          onResetCalibrationState={resetCalibrationState}
          iotConnected={iotConnected}
          hasAccountId={!!(currentAccountId || userData?.accountId)}
          calibrationStatus={calibrationStatus}
        />
               )}

        {activeTab === 'account' && (
          <AccountTab
            currentAccountId={currentAccountId}
            userData={userData}
            isLoadingUser={isLoadingUser}
            onHandleInputId={handleInputId}
            onClearAccountId={clearAccountId}
          />
        )}
          </div>

      {/* Modals */}
      <PinModal
        showPinModal={showPinModal}
        pinInput={pinInput}
        pinError={pinError}
        onHandlePinChange={handlePinChange}
        onHandlePinSubmit={handlePinSubmit}
        onSetShowPinModal={setShowPinModal}
        onHandleKeyPress={handleKeyPress}
      />

      <RangeModal
        showRangeModal={showRangeModal}
        editingRange={editingRange}
        minInput={minInput}
        maxInput={maxInput}
        rangeError={rangeError}
        currentInputField={currentInputField}
        isSavingRange={isSavingRange}
        onHandleRangeSubmit={handleRangeSubmit}
        onSetShowRangeModal={setShowRangeModal}
        onSetCurrentInputField={setCurrentInputField}
        onHandleMinChange={handleMinChange}
        onHandleMaxChange={handleMaxChange}
        onHandleKeyPress={handleKeyPress}
      />

      <BatchModal
        showCreateBatchModal={showCreateBatchModal}
        batchIdInput={batchIdInput}
        batchIdError={batchIdError}
        currentAccountId={currentAccountId}
        isCheckingBatch={isCheckingBatch}
        existingBatch={existingBatch}
        onHandleBatchIdChange={handleBatchIdChange}
        onProceedWithBatch={proceedWithBatch}
        onSetShowCreateBatchModal={setShowCreateBatchModal}
        onHandleKeyPress={handleKeyPress}
      />

      <Toaster
        toaster={toaster}
        onSetToaster={setToaster}
      />
      </div>
    )
  }
